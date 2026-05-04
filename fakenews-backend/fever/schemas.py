"""Esquemas de datos del agente de verificacion.

Las etiquetas FEVER (`SUPPORTS`, `REFUTES`, `NOT ENOUGH INFO`) son las
que produce el clasificador NLI por par (claim, evidence). El agregado
final por claim usa una etiqueta extendida `VerdictLabel` que ademas
introduce `CONFLICTING` para casos en los que distintas evidencias se
contradicen entre si.
"""

from __future__ import annotations

from datetime import datetime, timezone
from enum import Enum
from typing import List, Literal, Optional

from pydantic import BaseModel, Field


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


# --- Etiquetas NLI puras (por par claim/evidence) ---
NLILabel = Literal["SUPPORTS", "REFUTES", "NOT ENOUGH INFO"]


class VerdictLabel(str, Enum):
    """Etiqueta agregada por claim (4-way)."""

    SUPPORTED = "SUPPORTED"
    REFUTED = "REFUTED"
    NOT_ENOUGH_INFO = "NOT_ENOUGH_INFO"
    CONFLICTING = "CONFLICTING"


# --- Modelos de dominio ---

class Claim(BaseModel):
    """Afirmacion verificable extraida del texto de entrada."""

    id: str
    text: str = Field(min_length=1)
    source_span: Optional[str] = Field(
        default=None,
        description="Fragmento del texto original del que se extrajo la afirmacion.",
    )


class Evidence(BaseModel):
    """Fragmento recuperado de la web considerado relevante para un claim."""

    url: str
    title: str = ""
    snippet: str = ""
    retrieved_at: datetime = Field(default_factory=_utcnow)
    relevance_score: Optional[float] = Field(
        default=None,
        description="Score de re-ranking (no devuelto por el buscador).",
    )


class NLIScore(BaseModel):
    """Resultado del modelo NLI sobre un par (claim, evidence)."""

    label: NLILabel
    score: float = Field(ge=0.0, le=1.0)


class ScoredEvidence(BaseModel):
    """Evidence enriquecida con la salida del NLI."""

    evidence: Evidence
    nli: NLIScore


class ClaimVerdict(BaseModel):
    """Veredicto agregado por afirmacion."""

    claim: Claim
    label: VerdictLabel
    confidence: float = Field(ge=0.0, le=1.0)
    rationale: str = ""
    evidences: List[ScoredEvidence] = Field(default_factory=list)


class VerificationReport(BaseModel):
    """Salida final del agente para un texto de entrada."""

    input_text: str
    claims: List[ClaimVerdict] = Field(default_factory=list)
    overall_label: VerdictLabel = VerdictLabel.NOT_ENOUGH_INFO
    summary: str = ""
    model_version: str = "fever-agent-v0"
    duration_ms: Optional[int] = None
