"""Recuperacion de evidencias web para una afirmacion.

Diseno: el cliente de busqueda se inyecta como `WebSearcher` con un
metodo `search(query, max_results) -> List[Evidence]`. La implementacion
real envuelve Tavily, pero los tests pueden inyectar mocks deterministas.
"""

from __future__ import annotations

import os
from typing import List, Protocol

from .schemas import Claim, Evidence


class WebSearcher(Protocol):
    """Protocolo para clientes de busqueda web sustituibles."""

    def search(self, query: str, max_results: int = 5) -> List[Evidence]: ...


class TavilySearcher:
    """Implementacion real respaldada por Tavily (https://tavily.com)."""

    def __init__(self, api_key: str | None = None) -> None:
        self.api_key = api_key or os.getenv("TAVILY_API_KEY", "")
        if not self.api_key:
            raise RuntimeError("TAVILY_API_KEY no esta configurada.")
        self._client = None  # cargado en la primera llamada

    def _ensure_client(self):
        if self._client is None:
            from tavily import TavilyClient  # type: ignore

            self._client = TavilyClient(api_key=self.api_key)
        return self._client

    def search(self, query: str, max_results: int = 5) -> List[Evidence]:
        client = self._ensure_client()
        response = client.search(query=query, max_results=max_results)
        results: List[Evidence] = []
        for item in response.get("results", [])[:max_results]:
            results.append(Evidence(
                url=str(item.get("url", "")),
                title=str(item.get("title", "")),
                snippet=str(item.get("content", "") or item.get("snippet", "")),
                relevance_score=item.get("score"),
            ))
        return results


class StubSearcher:
    """Buscador determinista para entornos sin red (CI, tests, demos)."""

    def __init__(self, fixtures: dict[str, List[Evidence]] | None = None) -> None:
        self._fixtures = fixtures or {}

    def search(self, query: str, max_results: int = 5) -> List[Evidence]:
        # Match por substring para soportar queries derivadas del claim.
        for key, evidences in self._fixtures.items():
            if key.lower() in query.lower():
                return evidences[:max_results]
        return []


def fetch_evidences_for_claim(
    claim: Claim, *, searcher: WebSearcher, max_results: int = 5,
) -> List[Evidence]:
    """Genera la query y delega en el buscador inyectado."""
    query = claim.text.strip()[:300]
    if not query:
        return []
    return searcher.search(query, max_results=max_results)
