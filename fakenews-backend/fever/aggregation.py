"""Reglas de agregacion del veredicto por claim.

Mapea una lista de pares (evidence, NLI score) al veredicto final 4-way
(`SUPPORTED`, `REFUTED`, `NOT_ENOUGH_INFO`, `CONFLICTING`).

Las reglas se documentan formalmente en la memoria del TFG de Estadistica
(capitulo "Formalizacion probabilistica de la regla de agregacion").

Reglas resumidas:
- Sin evidencias o todas con score < `min_confidence`  -> NOT_ENOUGH_INFO
- Si hay >=1 SUPPORTS y >=1 REFUTES con score >= `conflict_threshold`
  -> CONFLICTING
- Si la suma de probabilidades agregada (mean por etiqueta) es maxima en:
    * SUPPORTS por encima de `decision_margin`  -> SUPPORTED
    * REFUTES por encima de `decision_margin`   -> REFUTED
    * En caso contrario                         -> NOT_ENOUGH_INFO
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import List, Sequence

from .schemas import ScoredEvidence, VerdictLabel


@dataclass(frozen=True)
class AggregationConfig:
    min_confidence: float = 0.5
    conflict_threshold: float = 0.6
    decision_margin: float = 0.05


def aggregate(
    scored: Sequence[ScoredEvidence],
    cfg: AggregationConfig | None = None,
) -> tuple[VerdictLabel, float]:
    """Devuelve (label, confidence) agregando las evidencias puntuadas."""
    cfg = cfg or AggregationConfig()
    confident = [s for s in scored if s.nli.score >= cfg.min_confidence]
    if not confident:
        return VerdictLabel.NOT_ENOUGH_INFO, _confidence_for_nei(scored)

    supports = [s for s in confident if s.nli.label == "SUPPORTS"]
    refutes = [s for s in confident if s.nli.label == "REFUTES"]
    nei = [s for s in confident if s.nli.label == "NOT ENOUGH INFO"]

    has_conflict = (
        any(s.nli.score >= cfg.conflict_threshold for s in supports)
        and any(s.nli.score >= cfg.conflict_threshold for s in refutes)
    )
    if has_conflict:
        # Confianza = max(media SUPPORTS, media REFUTES)
        conf = max(_mean_score(supports), _mean_score(refutes))
        return VerdictLabel.CONFLICTING, conf

    sup_mean = _mean_score(supports)
    ref_mean = _mean_score(refutes)
    nei_mean = _mean_score(nei)

    best_label = max(
        ((VerdictLabel.SUPPORTED, sup_mean),
         (VerdictLabel.REFUTED, ref_mean),
         (VerdictLabel.NOT_ENOUGH_INFO, nei_mean)),
        key=lambda pair: pair[1],
    )
    label, score = best_label

    # Margin check para evitar decisiones inseguras
    other_scores = [s for lbl, s in
                    [(VerdictLabel.SUPPORTED, sup_mean),
                     (VerdictLabel.REFUTED, ref_mean),
                     (VerdictLabel.NOT_ENOUGH_INFO, nei_mean)]
                    if lbl != label]
    runner_up = max(other_scores) if other_scores else 0.0
    if score - runner_up < cfg.decision_margin and label != VerdictLabel.NOT_ENOUGH_INFO:
        return VerdictLabel.NOT_ENOUGH_INFO, score
    return label, float(score)


def aggregate_overall(verdicts: List[VerdictLabel]) -> VerdictLabel:
    """Combina los veredictos por claim en un veredicto global del texto."""
    if not verdicts:
        return VerdictLabel.NOT_ENOUGH_INFO

    # Cualquier conflict en algun claim -> conflict global
    if VerdictLabel.CONFLICTING in verdicts:
        return VerdictLabel.CONFLICTING

    counts = {lbl: verdicts.count(lbl) for lbl in VerdictLabel}
    sup, ref = counts[VerdictLabel.SUPPORTED], counts[VerdictLabel.REFUTED]
    if sup > 0 and ref > 0:
        return VerdictLabel.CONFLICTING
    if sup > 0 and ref == 0:
        return VerdictLabel.SUPPORTED
    if ref > 0 and sup == 0:
        return VerdictLabel.REFUTED
    return VerdictLabel.NOT_ENOUGH_INFO


def _mean_score(items: Sequence[ScoredEvidence]) -> float:
    if not items:
        return 0.0
    return sum(s.nli.score for s in items) / len(items)


def _confidence_for_nei(scored: Sequence[ScoredEvidence]) -> float:
    """Confianza en el veredicto NEI: alta si no hay evidencias relevantes."""
    if not scored:
        return 0.9
    # Cuanto mas baja la confianza maxima del NLI, mas confianza en NEI.
    max_score = max(s.nli.score for s in scored)
    return max(0.5, 1.0 - max_score)
