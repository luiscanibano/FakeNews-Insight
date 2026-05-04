"""Construccion del agente de verificacion para el backend en runtime.

Aisla la decision sobre LLM/searcher reales vs stubs para que main.py no
arrastre dependencias opcionales (openai, tavily, transformers) en
arranque ni en tests.

Uso:
    agent = get_verification_agent()
    report = agent.verify(text)

En tests, monkeypatchear `_FACTORY_OVERRIDE` para inyectar un agente
mockeado.
"""

from __future__ import annotations

import os
from typing import Optional

from fever.agent import (
    AgentConfig,
    VerificationAgent,
    build_default_agent,
)
from fever.aggregation import AggregationConfig
from fever.claim_extraction import LLMClient
from fever.inference import FeverNLIClassifier, NLIClassifier, StubNLIClassifier
from fever.retrieval import StubSearcher, TavilySearcher, WebSearcher


_FACTORY_OVERRIDE: Optional[VerificationAgent] = None


def _build_llm() -> LLMClient:
    """Construye el cliente LLM real (OpenAI) o un stub determinista."""
    api_key = os.getenv("OPENAI_API_KEY", "").strip()
    model = os.getenv("FEVER_LLM_MODEL", "gpt-4o-mini").strip()
    if not api_key:
        return _StubLLM()
    return _OpenAILLM(api_key=api_key, model=model)


def _build_searcher() -> WebSearcher:
    if not os.getenv("TAVILY_API_KEY", "").strip():
        return StubSearcher()
    try:
        return TavilySearcher()
    except RuntimeError:
        return StubSearcher()


def _build_nli() -> NLIClassifier:
    model_path = os.getenv("FEVER_MODEL_PATH", "").strip()
    if not model_path or not os.path.exists(model_path):
        return StubNLIClassifier()
    try:
        return FeverNLIClassifier(model_path=model_path)
    except Exception:  # pragma: no cover - defensive fallback
        return StubNLIClassifier()


def _build_config() -> AgentConfig:
    return AgentConfig(
        max_claims=int(os.getenv("FEVER_AGENT_MAX_CLAIMS", "5") or 5),
        max_evidences_per_claim=int(
            os.getenv("FEVER_AGENT_MAX_EVIDENCES", "5") or 5
        ),
        aggregation=AggregationConfig(),
    )


def get_verification_agent() -> VerificationAgent:
    """Devuelve el agente de verificacion (cacheado por proceso).

    En tests, reasignar `_FACTORY_OVERRIDE` con un agente mockeado.
    """
    global _FACTORY_OVERRIDE
    if _FACTORY_OVERRIDE is not None:
        return _FACTORY_OVERRIDE
    agent = build_default_agent(
        llm=_build_llm(),
        searcher=_build_searcher(),
        nli=_build_nli(),
        config=_build_config(),
    )
    _FACTORY_OVERRIDE = agent
    return agent


def reset_verification_agent() -> None:
    """Limpia el cache (uso interno y tests)."""
    global _FACTORY_OVERRIDE
    _FACTORY_OVERRIDE = None


def set_verification_agent(agent: VerificationAgent) -> None:
    """Inyecta un agente (uso interno y tests)."""
    global _FACTORY_OVERRIDE
    _FACTORY_OVERRIDE = agent


# --- LLM clients ---

class _StubLLM:
    """LLM degradado para entornos sin API key: devuelve un solo claim."""

    def complete(self, prompt: str, *, response_format: str = "json") -> str:
        # Trata el texto entero como un unico claim (fallback parser).
        return "{}"


class _OpenAILLM:
    """Cliente OpenAI minimal con carga diferida de la libreria."""

    def __init__(self, *, api_key: str, model: str = "gpt-4o-mini") -> None:
        self.api_key = api_key
        self.model = model
        self._client = None

    def _ensure_client(self):
        if self._client is None:
            from openai import OpenAI  # type: ignore

            self._client = OpenAI(api_key=self.api_key)
        return self._client

    def complete(self, prompt: str, *, response_format: str = "json") -> str:
        client = self._ensure_client()
        response = client.chat.completions.create(
            model=self.model,
            messages=[{"role": "user", "content": prompt}],
            temperature=0.1,
            response_format={"type": "json_object"} if response_format == "json" else None,
        )
        return response.choices[0].message.content or ""
