"""Calibracion de probabilidades.

- Diagrama de fiabilidad (reliability diagram).
- Expected Calibration Error (ECE).
- Wrappers para Platt scaling (sigmoide) e isotonic regression.

Vive en `research_stats.evaluation.calibration`.
"""

from __future__ import annotations

from dataclasses import dataclass

import numpy as np
from sklearn.calibration import CalibratedClassifierCV
from sklearn.isotonic import IsotonicRegression
from sklearn.linear_model import LogisticRegression


@dataclass
class ReliabilityCurve:
    bin_centers: np.ndarray  # confianza media por bin
    bin_accuracy: np.ndarray  # accuracy real por bin
    bin_counts: np.ndarray   # numero de muestras por bin


def reliability_curve(probs: np.ndarray, correct: np.ndarray,
                       n_bins: int = 15) -> ReliabilityCurve:
    """Calcula la curva de fiabilidad para un binarizado de la confianza maxima.

    Parameters
    ----------
    probs: np.ndarray
        Probabilidades maximas predichas por muestra. Shape (N,).
    correct: np.ndarray
        Indicador binario (0/1) de si la prediccion fue correcta. Shape (N,).
    n_bins: int
        Numero de bins equiespaciados en [0, 1].
    """
    probs = np.asarray(probs, dtype=np.float64)
    correct = np.asarray(correct, dtype=np.float64)
    bins = np.linspace(0.0, 1.0, n_bins + 1)
    bin_idx = np.clip(np.digitize(probs, bins) - 1, 0, n_bins - 1)

    centers = np.zeros(n_bins)
    accs = np.zeros(n_bins)
    counts = np.zeros(n_bins, dtype=np.int64)
    for b in range(n_bins):
        mask = bin_idx == b
        counts[b] = int(mask.sum())
        if counts[b] > 0:
            centers[b] = float(probs[mask].mean())
            accs[b] = float(correct[mask].mean())
    return ReliabilityCurve(centers, accs, counts)


def expected_calibration_error(probs: np.ndarray, correct: np.ndarray,
                                n_bins: int = 15) -> float:
    """ECE (Naeini et al., 2015) con bins equiespaciados."""
    curve = reliability_curve(probs, correct, n_bins=n_bins)
    n_total = curve.bin_counts.sum()
    if n_total == 0:
        return 0.0
    weights = curve.bin_counts / n_total
    return float(np.sum(weights * np.abs(curve.bin_accuracy - curve.bin_centers)))


def fit_platt(scores: np.ndarray, y_true: np.ndarray) -> LogisticRegression:
    """Platt scaling sobre scores 1-D (binario one-vs-rest)."""
    lr = LogisticRegression(C=1e6, solver="lbfgs")
    lr.fit(scores.reshape(-1, 1), y_true)
    return lr


def fit_isotonic(scores: np.ndarray, y_true: np.ndarray) -> IsotonicRegression:
    """Isotonic regression (no-parametrica) sobre scores 1-D."""
    iso = IsotonicRegression(out_of_bounds="clip")
    iso.fit(scores, y_true)
    return iso


def calibrate_classifier(estimator, X, y, method: str = "isotonic"):
    """Envuelve un clasificador con `CalibratedClassifierCV`.

    `method` ∈ {"sigmoid" (Platt), "isotonic"}.
    """
    return CalibratedClassifierCV(estimator, method=method, cv="prefit").fit(X, y)
