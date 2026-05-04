"""Tests estadisticos para comparar dos modelos clasificadores.

- Test de McNemar para diferencias significativas en errores apareados.
- IC bootstrap para diferencia de macro-F1.
"""

from __future__ import annotations

from typing import Sequence

import numpy as np
from sklearn.metrics import f1_score
from statsmodels.stats.contingency_tables import mcnemar

from research_stats.labels import LABELS_3WAY


def mcnemar_test(y_true: Sequence[str], y_pred_a: Sequence[str],
                 y_pred_b: Sequence[str]) -> dict:
    """Compara dos modelos sobre las mismas muestras.

    Devuelve la tabla 2x2 de aciertos/errores y el p-valor del test de
    McNemar (corrected continuity por defecto).
    """
    y_true_arr = np.asarray(y_true)
    a_correct = np.asarray(y_pred_a) == y_true_arr
    b_correct = np.asarray(y_pred_b) == y_true_arr

    n00 = int(np.sum(~a_correct & ~b_correct))
    n01 = int(np.sum(~a_correct & b_correct))
    n10 = int(np.sum(a_correct & ~b_correct))
    n11 = int(np.sum(a_correct & b_correct))
    table = [[n11, n10], [n01, n00]]

    # exact=True usa binomial cuando n01+n10 es pequeno
    use_exact = (n01 + n10) < 25
    result = mcnemar(table, exact=use_exact, correction=not use_exact)
    return {
        "table": table,
        "statistic": float(result.statistic),
        "pvalue": float(result.pvalue),
        "exact": use_exact,
    }


def bootstrap_macro_f1_diff(
    y_true: Sequence[str], y_pred_a: Sequence[str], y_pred_b: Sequence[str],
    n_boot: int = 1_000, ci: float = 0.95, seed: int = 42,
) -> tuple[float, float, float]:
    """IC bootstrap para la diferencia macro_f1(A) - macro_f1(B)."""
    rng = np.random.default_rng(seed)
    y_true_arr = np.asarray(y_true)
    a_arr = np.asarray(y_pred_a)
    b_arr = np.asarray(y_pred_b)
    n = len(y_true_arr)
    if n == 0:
        return 0.0, 0.0, 0.0

    def _f1(idx: np.ndarray, preds: np.ndarray) -> float:
        return float(f1_score(
            y_true_arr[idx], preds[idx],
            labels=list(LABELS_3WAY),
            average="macro", zero_division=0,
        ))

    base_idx = np.arange(n)
    observed = _f1(base_idx, a_arr) - _f1(base_idx, b_arr)
    diffs = np.empty(n_boot, dtype=np.float64)
    for i in range(n_boot):
        idx = rng.integers(0, n, size=n)
        diffs[i] = _f1(idx, a_arr) - _f1(idx, b_arr)
    alpha = (1 - ci) / 2
    return float(observed), float(np.quantile(diffs, alpha)), float(np.quantile(diffs, 1 - alpha))
