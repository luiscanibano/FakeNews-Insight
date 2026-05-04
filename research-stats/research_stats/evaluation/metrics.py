"""Metricas de clasificacion para FEVER 3-way."""

from __future__ import annotations

from typing import Iterable, Sequence

import numpy as np
from sklearn.metrics import (
    accuracy_score,
    classification_report,
    confusion_matrix,
    f1_score,
)

from research_stats.labels import LABELS_3WAY


def compute_basic_metrics(
    y_true: Sequence[str], y_pred: Sequence[str],
    labels: Iterable[str] = LABELS_3WAY,
) -> dict:
    """Devuelve accuracy, macro-F1, F1 por clase y matriz de confusion."""
    labels_list = list(labels)
    return {
        "accuracy": float(accuracy_score(y_true, y_pred)),
        "macro_f1": float(f1_score(y_true, y_pred, labels=labels_list,
                                   average="macro", zero_division=0)),
        "f1_per_class": {
            label: float(score) for label, score in zip(
                labels_list,
                f1_score(y_true, y_pred, labels=labels_list,
                         average=None, zero_division=0),
            )
        },
        "confusion_matrix": confusion_matrix(
            y_true, y_pred, labels=labels_list,
        ).tolist(),
        "classification_report": classification_report(
            y_true, y_pred, labels=labels_list,
            output_dict=True, zero_division=0,
        ),
    }


def bootstrap_macro_f1(
    y_true: Sequence[str], y_pred: Sequence[str],
    n_boot: int = 1_000, ci: float = 0.95, seed: int = 42,
) -> tuple[float, float, float]:
    """IC bootstrap para macro-F1.

    Devuelve (macro_f1_observado, ci_lower, ci_upper).
    """
    rng = np.random.default_rng(seed)
    y_true_arr = np.asarray(y_true)
    y_pred_arr = np.asarray(y_pred)
    n = len(y_true_arr)
    if n == 0:
        return 0.0, 0.0, 0.0

    observed = float(f1_score(y_true_arr, y_pred_arr,
                              labels=list(LABELS_3WAY),
                              average="macro", zero_division=0))
    scores = np.empty(n_boot, dtype=np.float64)
    for i in range(n_boot):
        idx = rng.integers(0, n, size=n)
        scores[i] = f1_score(y_true_arr[idx], y_pred_arr[idx],
                             labels=list(LABELS_3WAY),
                             average="macro", zero_division=0)
    alpha = (1 - ci) / 2
    lower = float(np.quantile(scores, alpha))
    upper = float(np.quantile(scores, 1 - alpha))
    return observed, lower, upper
