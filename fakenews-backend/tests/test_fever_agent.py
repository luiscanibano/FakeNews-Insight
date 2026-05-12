"""Tests del agente de verificacion FEVER (sin red ni LLM real)."""

from __future__ import annotations

import json
from typing import List

import pytest

from fever.agent import AgentConfig, VerificationAgent, build_default_agent
from fever.aggregation import (
    AggregationConfig,
    aggregate,
    aggregate_overall,
)
from fever.claim_extraction import extract_claims
from fever.inference import StubNLIClassifier
from fever.retrieval import StubSearcher
from fever.schemas import (
    Claim,
    Evidence,
    NLIScore,
    ScoredEvidence,
    VerdictLabel,
)


# --- Fakes / helpers ---

class FakeLLM:
    def __init__(self, payload: dict | str):
        self.payload = payload
        self.calls: List[str] = []

    def complete(self, prompt: str, *, response_format: str = "json") -> str:
        self.calls.append(prompt)
        if isinstance(self.payload, dict):
            return json.dumps(self.payload)
        return self.payload


class QueueLLM:
    def __init__(self, payloads: List[dict | str]):
        self.payloads = list(payloads)
        self.calls: List[str] = []

    def complete(self, prompt: str, *, response_format: str = "json") -> str:
        self.calls.append(prompt)
        payload = self.payloads.pop(0) if self.payloads else {}
        if isinstance(payload, dict):
            return json.dumps(payload)
        return payload


def _ev(snippet: str, url: str = "https://example.org/a") -> Evidence:
    return Evidence(url=url, title="t", snippet=snippet)


def _scored(label: str, score: float, snippet: str = "x" * 30) -> ScoredEvidence:
    return ScoredEvidence(evidence=_ev(snippet), nli=NLIScore(label=label, score=score))


# --- claim_extraction ---

def test_extract_claims_parses_valid_json():
    llm = FakeLLM({"claims": [{"text": "La tierra es redonda"},
                              {"text": "El agua hierve a 100C"}]})
    claims = extract_claims("texto", llm=llm, max_claims=5)
    assert [c.text for c in claims] == ["La tierra es redonda", "El agua hierve a 100C"]
    assert all(c.id for c in claims)


def test_extract_claims_falls_back_on_invalid_json():
    llm = FakeLLM("respuesta sin json valido")
    claims = extract_claims("texto largo de ejemplo", llm=llm)
    assert len(claims) == 1
    assert claims[0].text.startswith("texto largo")


def test_extract_claims_respects_max_claims():
    llm = FakeLLM({"claims": [{"text": f"c{i}"} for i in range(10)]})
    claims = extract_claims("t", llm=llm, max_claims=3)
    assert len(claims) == 3


def test_extract_claims_empty_input_returns_empty():
    assert extract_claims("   ", llm=FakeLLM({"claims": []})) == []


# --- inference (stub) ---

def test_stub_nli_supports_when_overlap_high():
    cls = StubNLIClassifier()
    score = cls.predict("la tierra orbita el sol",
                        "estudios confirman que la tierra orbita el sol diariamente")
    assert score.label == "SUPPORTS"


def test_stub_nli_nei_when_empty():
    score = StubNLIClassifier().predict("foo", "")
    assert score.label == "NOT ENOUGH INFO"


# --- aggregation ---

def test_aggregate_returns_nei_when_no_confident():
    label, conf = aggregate([_scored("SUPPORTS", 0.3)])
    assert label == VerdictLabel.NOT_ENOUGH_INFO
    assert 0.0 <= conf <= 1.0


def test_aggregate_supported_when_only_supports():
    label, conf = aggregate([_scored("SUPPORTS", 0.9), _scored("SUPPORTS", 0.8)])
    assert label == VerdictLabel.SUPPORTED
    assert conf > 0.8


def test_aggregate_refuted_when_only_refutes():
    label, _ = aggregate([_scored("REFUTES", 0.9)])
    assert label == VerdictLabel.REFUTED


def test_aggregate_conflicting_when_both_strong():
    label, _ = aggregate([_scored("SUPPORTS", 0.9), _scored("REFUTES", 0.85)])
    assert label == VerdictLabel.CONFLICTING


def test_aggregate_nei_when_margin_too_small():
    cfg = AggregationConfig(decision_margin=0.5)
    label, _ = aggregate([_scored("SUPPORTS", 0.7), _scored("NOT ENOUGH INFO", 0.6)], cfg)
    assert label == VerdictLabel.NOT_ENOUGH_INFO


def test_overall_conflicting_when_mixed_claims():
    assert (aggregate_overall([VerdictLabel.SUPPORTED, VerdictLabel.REFUTED])
            == VerdictLabel.CONFLICTING)


def test_overall_supported_when_only_supports():
    assert (aggregate_overall([VerdictLabel.SUPPORTED, VerdictLabel.NOT_ENOUGH_INFO])
            == VerdictLabel.SUPPORTED)


def test_overall_nei_when_empty():
    assert aggregate_overall([]) == VerdictLabel.NOT_ENOUGH_INFO


# --- end-to-end agent (con stubs) ---

def test_agent_end_to_end_supports():
    fixtures = {
        "tierra": [_ev("la tierra orbita el sol cada 365 dias confirmado por la nasa")],
    }
    llm = FakeLLM({"claims": [{"text": "la tierra orbita el sol"}]})
    agent = VerificationAgent(
        llm=llm,
        searcher=StubSearcher(fixtures=fixtures),
        nli=StubNLIClassifier(),
    )
    report = agent.verify("Texto de entrada sobre la tierra y el sol")

    assert len(report.claims) == 1
    assert report.claims[0].label == VerdictLabel.SUPPORTED
    assert report.overall_label == VerdictLabel.SUPPORTED
    assert report.duration_ms is not None
    assert report.duration_ms >= 0


def test_agent_end_to_end_no_evidence_is_nei():
    llm = FakeLLM({"claims": [{"text": "afirmacion sin evidencias web disponibles"}]})
    agent = build_default_agent(llm=llm)  # StubSearcher vacio
    report = agent.verify("Algun texto")
    assert report.overall_label == VerdictLabel.NOT_ENOUGH_INFO
    assert report.claims[0].evidences == []


def test_agent_filters_short_evidences():
    fixtures = {"foo": [_ev("corto"), _ev("evidencia mas larga que cumple el minimo")]}
    llm = FakeLLM({"claims": [{"text": "foo bar baz"}]})
    agent = VerificationAgent(
        llm=llm,
        searcher=StubSearcher(fixtures=fixtures),
        nli=StubNLIClassifier(),
        config=AgentConfig(min_evidence_chars=20),
    )
    report = agent.verify("foo bar baz")
    # solo la evidencia larga debe puntuar
    assert len(report.claims[0].evidences) == 1


def test_agent_llm_adjudication_refutes_false_supported_overlap():
    fixtures = {
        "Pau Gasol": [
            _ev("Pau Gasol jugo profesionalmente al baloncesto durante 20 años en la NBA y la ACB."),
        ],
    }
    llm = QueueLLM([
        {"claims": [{"text": "Pau Gasol es un jugador profesional de fútbol."}]},
        {"evidences": [{"index": 1, "label": "REFUTES", "confidence": 0.88}]},
    ])
    agent = VerificationAgent(
        llm=llm,
        searcher=StubSearcher(fixtures=fixtures),
        nli=StubNLIClassifier(),
    )

    report = agent.verify("Pau Gasol es un jugador profesional de fútbol.")

    assert report.claims[0].evidences[0].nli.label == "REFUTES"
    assert report.claims[0].label == VerdictLabel.REFUTED
    assert report.overall_label == VerdictLabel.REFUTED
