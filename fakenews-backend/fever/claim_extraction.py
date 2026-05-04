"""Extraccion de afirmaciones verificables a partir de un texto.

Diseno: el LLM se inyecta como `LLMClient` con un metodo unico
`complete(prompt, *, response_format)`. Esto permite tests sin red y
sustituir el proveedor (OpenAI/Anthropic/local) sin tocar el agente.
"""

from __future__ import annotations

import json
import re
import uuid
from typing import List, Optional, Protocol

from pydantic import BaseModel, ValidationError, Field

from .schemas import Claim


CLAIM_EXTRACTION_PROMPT = """Eres un extractor de afirmaciones verificables.
Dada una noticia o texto, devuelve una lista JSON de afirmaciones factuales
concretas, atomicas y comprobables. Ignora opiniones, valoraciones o
preguntas. Limita la respuesta a un maximo de {max_claims} afirmaciones.

Formato de salida estricto (JSON valido):
{{"claims": [{{"text": "..."}}, ...]}}

Texto a analizar:
\"\"\"
{text}
\"\"\"
"""


class LLMClient(Protocol):
    """Protocolo minimo para clientes LLM sustituibles en tests."""

    def complete(self, prompt: str, *, response_format: str = "json") -> str: ...


class _LLMClaimsResponse(BaseModel):
    claims: List["_LLMClaimItem"] = Field(default_factory=list)


class _LLMClaimItem(BaseModel):
    text: str = Field(min_length=1)


_LLMClaimsResponse.model_rebuild()


def _extract_json_block(raw: str) -> str:
    """Recupera el primer objeto JSON del texto (tolera prefijos/sufijos)."""
    raw = raw.strip()
    if raw.startswith("{") and raw.endswith("}"):
        return raw
    match = re.search(r"\{.*\}", raw, flags=re.DOTALL)
    if match:
        return match.group(0)
    raise ValueError("No se encontro un objeto JSON en la respuesta del LLM.")


def extract_claims(
    text: str, *, llm: LLMClient, max_claims: int = 5,
) -> List[Claim]:
    """Pide al LLM la lista de afirmaciones verificables del texto.

    En caso de fallo de parseo o respuesta vacia, devuelve una lista con
    una unica afirmacion equivalente al texto original (fallback degradado
    pero seguro).
    """
    if not text or not text.strip():
        return []

    prompt = CLAIM_EXTRACTION_PROMPT.format(
        max_claims=max_claims, text=text.strip(),
    )
    raw = llm.complete(prompt, response_format="json")

    try:
        block = _extract_json_block(raw)
        parsed = _LLMClaimsResponse.model_validate(json.loads(block))
    except (ValueError, ValidationError, json.JSONDecodeError):
        # Fallback: tratar el texto entero como un unico claim.
        return [Claim(id=_new_id(), text=text.strip()[:500])]

    claims: List[Claim] = []
    for item in parsed.claims[:max_claims]:
        claims.append(Claim(id=_new_id(), text=item.text.strip()))
    if not claims:
        claims = [Claim(id=_new_id(), text=text.strip()[:500])]
    return claims


def _new_id() -> str:
    return uuid.uuid4().hex[:12]
