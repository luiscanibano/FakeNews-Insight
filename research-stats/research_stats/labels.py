"""Etiquetas FEVER usadas en todo el pipeline.

Mantiene una unica fuente de verdad para nombres de etiquetas y mapeos
entre el formato bruto (FEVER) y el formato interno (3 clases).
"""

from __future__ import annotations

from typing import Final

# Etiquetas en formato FEVER bruto
FEVER_SUPPORTS: Final = "SUPPORTS"
FEVER_REFUTES: Final = "REFUTES"
FEVER_NEI: Final = "NOT ENOUGH INFO"

LABELS_3WAY: Final = (FEVER_SUPPORTS, FEVER_REFUTES, FEVER_NEI)

# Mapeos enteros para entrenamiento
LABEL2ID: Final = {label: idx for idx, label in enumerate(LABELS_3WAY)}
ID2LABEL: Final = {idx: label for label, idx in LABEL2ID.items()}


def normalize_label(raw: str) -> str:
    """Normaliza variantes textuales al formato canonico FEVER."""
    cleaned = raw.strip().upper().replace("_", " ")
    if cleaned in {"SUPPORTS", "SUPPORTED", "SUPPORT"}:
        return FEVER_SUPPORTS
    if cleaned in {"REFUTES", "REFUTED", "CONTRADICTS"}:
        return FEVER_REFUTES
    if cleaned in {"NOT ENOUGH INFO", "NEI", "NEUTRAL"}:
        return FEVER_NEI
    raise ValueError(f"Etiqueta FEVER desconocida: {raw!r}")
