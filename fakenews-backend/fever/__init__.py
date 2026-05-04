"""Agente de verificacion de afirmaciones (FEVER + retrieval web + NLI).

Diseno orientado a testabilidad: todos los componentes externos (LLM,
buscador web, clasificador NLI) se inyectan via protocolos de modo que
los tests pueden sustituirlos por implementaciones falsas sin tocar red.
"""

__all__ = [
    "Claim",
    "Evidence",
    "ClaimVerdict",
    "VerificationReport",
    "VerdictLabel",
]

from .schemas import (  # noqa: F401
    Claim,
    ClaimVerdict,
    Evidence,
    VerdictLabel,
    VerificationReport,
)
