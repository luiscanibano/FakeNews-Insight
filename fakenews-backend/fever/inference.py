"""Wrapper de inferencia del modelo NLI entrenado en `research-stats/`.

El backend NUNCA importa de `research-stats`. La unica frontera es el
artefacto en `models/fever/<version>/` (formato HuggingFace o ONNX).

Esta clase expone un protocolo simple `predict(claim, evidence) -> NLIScore`
de modo que el agente puede inyectar otra implementacion (incluido un
mock) sin tocar el resto del codigo.
"""

from __future__ import annotations

import os
from pathlib import Path
from typing import Protocol

from .schemas import NLIScore


class NLIClassifier(Protocol):
    """Protocolo para clasificadores NLI sustituibles."""

    model_version: str

    def predict(self, claim: str, evidence: str) -> NLIScore: ...


class FeverNLIClassifier:
    """Implementacion real respaldada por un modelo HuggingFace local.

    Carga el modelo solo en la primera llamada a `predict` para evitar
    inflar el tiempo de arranque del backend cuando el agente no se usa.
    """

    LABELS = ("SUPPORTS", "REFUTES", "NOT ENOUGH INFO")

    def __init__(self, model_path: str | os.PathLike[str],
                 model_version: str = "fever-deberta-v1") -> None:
        self.model_path = Path(model_path)
        self.model_version = model_version
        self._tokenizer = None
        self._model = None

    def _ensure_loaded(self) -> None:
        if self._model is not None:
            return
        if not self.model_path.exists():
            raise FileNotFoundError(
                f"No se encontro el modelo NLI en {self.model_path}. "
                "Exportalo primero desde research-stats/export/export_to_onnx.py"
            )
        # Imports diferidos para no obligar a tener transformers instalado
        # en entornos donde el agente no se usa.
        from transformers import AutoModelForSequenceClassification, AutoTokenizer  # type: ignore

        self._tokenizer = AutoTokenizer.from_pretrained(str(self.model_path))
        self._model = AutoModelForSequenceClassification.from_pretrained(
            str(self.model_path)
        )
        self._model.eval()

    def predict(self, claim: str, evidence: str) -> NLIScore:
        self._ensure_loaded()
        import torch  # type: ignore

        inputs = self._tokenizer(
            claim, evidence,
            truncation=True, max_length=256, return_tensors="pt",
        )
        with torch.no_grad():
            logits = self._model(**inputs).logits[0]
        probs = torch.softmax(logits, dim=-1).tolist()
        idx = int(max(range(len(probs)), key=lambda i: probs[i]))
        return NLIScore(label=self.LABELS[idx], score=float(probs[idx]))


class StubNLIClassifier:
    """Implementacion ligera para entornos sin modelo real (CI, tests).

    Aplica reglas simples basadas en presencia de palabras del claim en
    la evidencia. Util para el modo `mock` del agente.
    """

    model_version = "fever-stub-v0"

    def predict(self, claim: str, evidence: str) -> NLIScore:
        if not evidence.strip():
            return NLIScore(label="NOT ENOUGH INFO", score=0.5)

        claim_tokens = {t.lower() for t in claim.split() if len(t) > 3}
        evidence_lower = evidence.lower()
        overlap = sum(1 for tok in claim_tokens if tok in evidence_lower)

        if claim_tokens and overlap / len(claim_tokens) >= 0.5:
            return NLIScore(label="SUPPORTS", score=0.7)
        if "no " in evidence_lower or "not " in evidence_lower or "false" in evidence_lower:
            return NLIScore(label="REFUTES", score=0.6)
        return NLIScore(label="NOT ENOUGH INFO", score=0.55)
