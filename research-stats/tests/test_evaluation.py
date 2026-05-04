from __future__ import annotations

import numpy as np
import pytest

from research_stats.evaluation.calibration import (
    expected_calibration_error,
    reliability_curve,
)
from research_stats.evaluation.metrics import (
    bootstrap_macro_f1,
    compute_basic_metrics,
)
from research_stats.evaluation.statistical_tests import (
    bootstrap_macro_f1_diff,
    mcnemar_test,
)
from research_stats.labels import LABELS_3WAY, normalize_label


# ---------------------------------------------------------------------------
# labels
# ---------------------------------------------------------------------------

def test_normalize_label_acepta_variantes():
    assert normalize_label("supports") == "SUPPORTS"
    assert normalize_label("Refuted") == "REFUTES"
    assert normalize_label("nei") == "NOT ENOUGH INFO"
    assert normalize_label("not_enough_info") == "NOT ENOUGH INFO"


def test_normalize_label_rechaza_desconocidas():
    with pytest.raises(ValueError):
        normalize_label("MAYBE")


# ---------------------------------------------------------------------------
# metrics
# ---------------------------------------------------------------------------

def test_compute_basic_metrics_perfectas():
    y = list(LABELS_3WAY) * 4
    metrics = compute_basic_metrics(y, y)
    assert metrics["accuracy"] == 1.0
    assert metrics["macro_f1"] == 1.0
    cm = np.asarray(metrics["confusion_matrix"])
    assert cm.shape == (3, 3)
    assert np.array_equal(cm, np.diag(cm.diagonal()))


def test_compute_basic_metrics_pesimas():
    y_true = ["SUPPORTS"] * 5 + ["REFUTES"] * 5
    y_pred = ["REFUTES"] * 5 + ["SUPPORTS"] * 5
    metrics = compute_basic_metrics(y_true, y_pred)
    assert metrics["accuracy"] == 0.0


def test_bootstrap_macro_f1_devuelve_intervalo_valido():
    rng = np.random.default_rng(0)
    y_true = rng.choice(LABELS_3WAY, size=200).tolist()
    y_pred = y_true.copy()
    # Introducir 10% de ruido
    flip_idx = rng.choice(len(y_pred), size=20, replace=False)
    for i in flip_idx:
        y_pred[i] = "REFUTES" if y_pred[i] != "REFUTES" else "SUPPORTS"

    obs, lo, hi = bootstrap_macro_f1(y_true, y_pred, n_boot=200, seed=0)
    assert 0.0 <= lo <= obs <= hi <= 1.0
    assert obs > 0.5  # con 10% de ruido deberia ser razonable


# ---------------------------------------------------------------------------
# calibracion
# ---------------------------------------------------------------------------

def test_reliability_curve_y_ece_modelo_perfectamente_calibrado():
    rng = np.random.default_rng(0)
    n = 5000
    probs = rng.uniform(0.0, 1.0, size=n)
    # Modelo perfectamente calibrado: P(correcto)=prob
    correct = (rng.uniform(size=n) < probs).astype(float)
    ece = expected_calibration_error(probs, correct, n_bins=15)
    assert ece < 0.05  # deberia ser pequeno


def test_reliability_curve_modelo_descalibrado_alto_ece():
    rng = np.random.default_rng(1)
    n = 2000
    probs = np.full(n, 0.95)  # siempre alta confianza
    correct = (rng.uniform(size=n) < 0.5).astype(float)  # acierta 50%
    ece = expected_calibration_error(probs, correct, n_bins=15)
    assert ece > 0.3


# ---------------------------------------------------------------------------
# tests estadisticos
# ---------------------------------------------------------------------------

def test_mcnemar_no_diferencia_si_modelos_iguales():
    rng = np.random.default_rng(2)
    y_true = rng.choice(LABELS_3WAY, size=300).tolist()
    y_pred = y_true.copy()
    res = mcnemar_test(y_true, y_pred, y_pred)
    # No hay discordancias -> p-valor alto, estadistico definido
    assert res["pvalue"] >= 0.0


def test_mcnemar_detecta_diferencia_significativa():
    # A acierta todo, B falla la mitad: p-valor deberia ser muy bajo
    y_true = ["SUPPORTS"] * 100 + ["REFUTES"] * 100
    y_a = y_true.copy()
    y_b = ["REFUTES"] * 100 + ["REFUTES"] * 100
    res = mcnemar_test(y_true, y_a, y_b)
    assert res["pvalue"] < 0.01


def test_bootstrap_diff_macro_f1():
    y_true = ["SUPPORTS"] * 50 + ["REFUTES"] * 50 + ["NOT ENOUGH INFO"] * 50
    y_a = y_true.copy()
    y_b = ["SUPPORTS"] * 150  # un modelo trivial
    obs, lo, hi = bootstrap_macro_f1_diff(y_true, y_a, y_b, n_boot=200)
    assert obs > 0
    assert lo <= obs <= hi
