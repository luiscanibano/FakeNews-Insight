"""Validacion semantica de evidencias recuperadas con ayuda del LLM.

El NLI local clasifica pares claim/evidencia, pero puede sobre-apoyar textos
con mucho solapamiento lexical, especialmente en español. Esta capa pide al
LLM una revision estructurada por evidencia para detectar si realmente apoya,
refuta o no permite decidir el claim completo.
"""

from __future__ import annotations

import json
import re
from typing import List

from pydantic import BaseModel, Field, ValidationError

from .claim_extraction import LLMClient
from .schemas import Claim, NLIScore, ScoredEvidence


ADJUDICATION_PROMPT = """Eres un verificador FEVER/NLI estricto.
Dado un claim y varias evidencias recuperadas, decide para cada evidencia si:
- SUPPORTS: la evidencia apoya explicitamente todo el claim.
- REFUTES: la evidencia contradice el claim o aporta datos incompatibles.
- NOT ENOUGH INFO: la evidencia es relevante pero no permite confirmar ni refutar.

Reglas importantes:
- No marques SUPPORTS si la evidencia solo comparte nombres o palabras sueltas.
- Si el claim dice futbol y la evidencia dice baloncesto, eso REFUTES.
- Si el claim afirma un origen/lugar y la evidencia da otro origen/lugar incompatible, eso REFUTES.
- Si el claim afirma origen o gentilicio, no infieras SUPPORTS por visitas, bodas,
  titulares regionales, acentos, aficiones o presencia temporal en ese lugar.
- Si faltan partes clave del claim, usa NOT ENOUGH INFO.

Devuelve JSON valido con este formato exacto:
{{"evidences": [{{"index": 1, "label": "SUPPORTS|REFUTES|NOT ENOUGH INFO", "confidence": 0.0}}]}}

Claim:
\"\"\"
{claim}
\"\"\"

Evidencias:
{evidences}
"""


class _AdjudicatedEvidence(BaseModel):
    index: int = Field(ge=1)
    label: str
    confidence: float = Field(default=0.75, ge=0.0, le=1.0)


class _AdjudicationResponse(BaseModel):
    evidences: List[_AdjudicatedEvidence] = Field(default_factory=list)


def adjudicate_scored_evidences(
    claim: Claim,
    scored: List[ScoredEvidence],
    *,
    llm: LLMClient,
) -> List[ScoredEvidence]:
    """Reetiqueta evidencias con el LLM si devuelve una respuesta valida.

    Si el LLM no esta disponible, devuelve JSON invalido, omite indices o usa
    etiquetas desconocidas, se conserva la salida NLI original.
    """
    if not scored:
        return scored

    prompt = ADJUDICATION_PROMPT.format(
        claim=claim.text.strip(),
        evidences=_format_evidences(scored),
    )
    raw = llm.complete(prompt, response_format="json")

    try:
        parsed = _AdjudicationResponse.model_validate(
            json.loads(_extract_json_block(raw))
        )
    except (ValueError, ValidationError, json.JSONDecodeError):
        return scored

    replacements = {
        item.index: item
        for item in parsed.evidences
        if item.label in {"SUPPORTS", "REFUTES", "NOT ENOUGH INFO"}
    }
    if not replacements:
        return scored

    adjusted: List[ScoredEvidence] = []
    for index, item in enumerate(scored, start=1):
        replacement = replacements.get(index)
        if replacement is None:
            adjusted.append(item)
            continue
        adjusted.append(
            ScoredEvidence(
                evidence=item.evidence,
                nli=NLIScore(
                    label=replacement.label,
                    score=max(0.5, float(replacement.confidence)),
                ),
            )
        )
    return adjusted


def _format_evidences(scored: List[ScoredEvidence]) -> str:
    blocks = []
    for index, item in enumerate(scored, start=1):
        evidence = item.evidence
        blocks.append(
            f"[{index}] Title: {evidence.title}\n"
            f"URL: {evidence.url}\n"
            f"Snippet: {evidence.snippet[:900]}\n"
            f"NLI inicial: {item.nli.label} ({item.nli.score:.3f})"
        )
    return "\n\n".join(blocks)


def _extract_json_block(raw: str) -> str:
    raw = raw.strip()
    if raw.startswith("{") and raw.endswith("}"):
        return raw
    match = re.search(r"\{.*\}", raw, flags=re.DOTALL)
    if match:
        return match.group(0)
    raise ValueError("No se encontro JSON en la respuesta de adjudicacion.")
