"""Orquestador del agente de verificacion.

Pipeline:
    1. Extraer claims (LLM)
    2. Recuperar evidencias por claim (web)
    3. Puntuar cada par (claim, evidence) con el NLI
    4. Agregar a un veredicto por claim
    5. Generar racional con citas (LLM)
    6. Agregar a veredicto global del texto

Todos los componentes externos se inyectan via protocolos para que los
tests puedan ejecutarse sin red ni modelos reales.
"""

from __future__ import annotations

import time
from dataclasses import dataclass, field
from typing import List, Optional

from .aggregation import AggregationConfig, aggregate, aggregate_overall
from .claim_extraction import LLMClient, extract_claims
from .evidence_adjudication import adjudicate_scored_evidences
from .inference import NLIClassifier, StubNLIClassifier
from .retrieval import StubSearcher, WebSearcher, fetch_evidences_for_claim
from .schemas import (
    Claim,
    ClaimVerdict,
    Evidence,
    NLIScore,
    ScoredEvidence,
    VerdictLabel,
    VerificationReport,
)


@dataclass
class AgentConfig:
    max_claims: int = 5
    max_evidences_per_claim: int = 5
    min_evidence_chars: int = 20
    aggregation: AggregationConfig = field(default_factory=AggregationConfig)


class VerificationAgent:
    """Agente que coordina LLM, buscador y NLI para verificar afirmaciones."""

    def __init__(
        self,
        *,
        llm: LLMClient,
        searcher: WebSearcher,
        nli: NLIClassifier,
        config: AgentConfig | None = None,
    ) -> None:
        self.llm = llm
        self.searcher = searcher
        self.nli = nli
        self.config = config or AgentConfig()

    @property
    def model_version(self) -> str:
        return f"fever-agent-{self.nli.model_version}"

    def verify(self, text: str) -> VerificationReport:
        started = time.perf_counter()
        claims = extract_claims(
            text, llm=self.llm, max_claims=self.config.max_claims,
        )
        verdicts: List[ClaimVerdict] = []
        for claim in claims:
            verdict = self._verify_one(claim)
            verdicts.append(verdict)

        overall = aggregate_overall([v.label for v in verdicts])
        summary = _build_summary(text, verdicts, overall)
        duration_ms = int((time.perf_counter() - started) * 1000)
        return VerificationReport(
            input_text=text,
            claims=verdicts,
            overall_label=overall,
            summary=summary,
            model_version=self.model_version,
            duration_ms=duration_ms,
        )

    def _verify_one(self, claim: Claim) -> ClaimVerdict:
        evidences = fetch_evidences_for_claim(
            claim,
            searcher=self.searcher,
            max_results=self.config.max_evidences_per_claim,
        )
        scored: List[ScoredEvidence] = []
        for ev in evidences:
            if len(ev.snippet) < self.config.min_evidence_chars:
                continue
            score = self.nli.predict(claim.text, ev.snippet)
            scored.append(ScoredEvidence(evidence=ev, nli=score))

        scored = adjudicate_scored_evidences(claim, scored, llm=self.llm)

        label, confidence = aggregate(scored, self.config.aggregation)
        rationale = _build_rationale(claim, scored, label)
        return ClaimVerdict(
            claim=claim,
            label=label,
            confidence=float(confidence),
            rationale=rationale,
            evidences=scored,
        )


def build_default_agent(
    *,
    llm: LLMClient,
    searcher: Optional[WebSearcher] = None,
    nli: Optional[NLIClassifier] = None,
    config: Optional[AgentConfig] = None,
) -> VerificationAgent:
    """Construye un agente con defaults seguros (stubs si falta algo).

    Util para arranque del backend cuando los servicios externos aun no
    estan disponibles.
    """
    return VerificationAgent(
        llm=llm,
        searcher=searcher or StubSearcher(),
        nli=nli or StubNLIClassifier(),
        config=config,
    )


def _build_rationale(claim: Claim, scored: List[ScoredEvidence],
                     label: VerdictLabel) -> str:
    if not scored:
        return (
            "No se encontraron evidencias web suficientes para verificar "
            "esta afirmacion."
        )
    citations = " ".join(
        f"[{i + 1}]" for i, _ in enumerate(scored)
    )
    return f"Veredicto {label.value} basado en {len(scored)} evidencia(s) {citations}."


def _build_summary(text: str, verdicts: List[ClaimVerdict],
                    overall: VerdictLabel) -> str:
    n_claims = len(verdicts)
    if n_claims == 0:
        return "No se pudieron extraer afirmaciones verificables del texto."
    return (
        f"Texto analizado: {n_claims} afirmacion(es) extraida(s). "
        f"Veredicto global: {overall.value}."
    )
