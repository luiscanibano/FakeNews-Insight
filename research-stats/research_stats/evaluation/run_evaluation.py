"""Pipeline orquestador: ejecuta evaluacion completa de un modelo entrenado.

- Carga predicciones del modelo (formato parquet con columnas:
  claim, evidence, label, pred_label, [prob_supports, prob_refutes, prob_nei]).
- Calcula metricas basicas, calibracion, IC bootstrap.
- Si se proporcionan dos modelos, hace test de McNemar entre ambos.
- Genera figuras PNG y tablas CSV en `reports/`.

Uso:
    python -m research_stats.evaluation.run_evaluation \
        --predictions reports/tables/preds_deberta.parquet
    python -m research_stats.evaluation.run_evaluation \
        --predictions reports/tables/preds_deberta.parquet \
        --baseline    reports/tables/preds_baseline.parquet
"""

from __future__ import annotations

import argparse
import json
from pathlib import Path

import numpy as np
import pandas as pd

from research_stats.evaluation.calibration import (
    expected_calibration_error,
    reliability_curve,
)
from research_stats.evaluation.metrics import bootstrap_macro_f1, compute_basic_metrics
from research_stats.evaluation.statistical_tests import (
    bootstrap_macro_f1_diff,
    mcnemar_test,
)
from research_stats.labels import LABELS_3WAY

ROOT = Path(__file__).resolve().parents[2]
DEFAULT_REPORTS = ROOT / "reports"


def _save_confusion_figure(cm: list[list[int]], path: Path) -> None:
    """Guarda matriz de confusion como PNG (importacion diferida de matplotlib)."""
    import matplotlib

    matplotlib.use("Agg")
    import matplotlib.pyplot as plt

    cm_arr = np.asarray(cm)
    fig, ax = plt.subplots(figsize=(5, 4.5), dpi=150)
    im = ax.imshow(cm_arr, cmap="Blues")
    ax.set_xticks(range(len(LABELS_3WAY)), LABELS_3WAY, rotation=20, ha="right")
    ax.set_yticks(range(len(LABELS_3WAY)), LABELS_3WAY)
    ax.set_xlabel("Predicho")
    ax.set_ylabel("Real")
    for i in range(cm_arr.shape[0]):
        for j in range(cm_arr.shape[1]):
            ax.text(j, i, str(cm_arr[i, j]), ha="center", va="center",
                    color="white" if cm_arr[i, j] > cm_arr.max() / 2 else "black")
    fig.colorbar(im, ax=ax)
    fig.tight_layout()
    path.parent.mkdir(parents=True, exist_ok=True)
    fig.savefig(path)
    plt.close(fig)


def _save_reliability_figure(probs: np.ndarray, correct: np.ndarray,
                              path: Path) -> None:
    import matplotlib

    matplotlib.use("Agg")
    import matplotlib.pyplot as plt

    curve = reliability_curve(probs, correct, n_bins=15)
    fig, ax = plt.subplots(figsize=(5, 4.5), dpi=150)
    ax.plot([0, 1], [0, 1], "--", color="gray", label="Calibracion perfecta")
    mask = curve.bin_counts > 0
    ax.plot(curve.bin_centers[mask], curve.bin_accuracy[mask], marker="o",
            label="Modelo")
    ax.set_xlabel("Confianza media")
    ax.set_ylabel("Accuracy real")
    ax.set_xlim(0, 1)
    ax.set_ylim(0, 1)
    ax.legend()
    fig.tight_layout()
    path.parent.mkdir(parents=True, exist_ok=True)
    fig.savefig(path)
    plt.close(fig)


def evaluate(predictions_path: Path, reports_dir: Path,
             baseline_path: Path | None = None,
             tag: str = "model") -> dict:
    df = pd.read_parquet(predictions_path)
    required = {"label", "pred_label"}
    missing = required - set(df.columns)
    if missing:
        raise ValueError(f"El parquet no contiene columnas {missing}.")

    y_true = df["label"].to_numpy()
    y_pred = df["pred_label"].to_numpy()

    metrics = compute_basic_metrics(y_true, y_pred)
    f1, lo, hi = bootstrap_macro_f1(y_true, y_pred)
    metrics["macro_f1_bootstrap_ci"] = {"observed": f1, "lower": lo, "upper": hi}

    # Calibracion (si hay probabilidades)
    prob_cols = [f"prob_{lbl.lower().replace(' ', '_')}" for lbl in LABELS_3WAY]
    if all(col in df.columns for col in prob_cols):
        probs_matrix = df[prob_cols].to_numpy()
        max_probs = probs_matrix.max(axis=1)
        correct = (y_pred == y_true).astype(np.float64)
        metrics["ece"] = expected_calibration_error(max_probs, correct)
        _save_reliability_figure(
            max_probs, correct,
            reports_dir / "figures" / f"{tag}_reliability.png",
        )

    _save_confusion_figure(
        metrics["confusion_matrix"],
        reports_dir / "figures" / f"{tag}_confusion.png",
    )

    # Comparacion con baseline si se proporciona
    if baseline_path is not None:
        base = pd.read_parquet(baseline_path)
        if not (base["label"].to_numpy() == y_true).all():
            raise ValueError(
                "El baseline tiene un orden/ground-truth distinto al del modelo."
            )
        b_pred = base["pred_label"].to_numpy()
        metrics["mcnemar_vs_baseline"] = mcnemar_test(y_true, y_pred, b_pred)
        diff, lo_d, hi_d = bootstrap_macro_f1_diff(y_true, y_pred, b_pred)
        metrics["macro_f1_diff_vs_baseline_ci"] = {
            "observed": diff, "lower": lo_d, "upper": hi_d,
        }

    out_json = reports_dir / "tables" / f"{tag}_evaluation.json"
    out_json.parent.mkdir(parents=True, exist_ok=True)
    out_json.write_text(json.dumps(metrics, indent=2, ensure_ascii=False),
                        encoding="utf-8")
    print(f"[run_evaluation] {tag}: macro_f1={metrics['macro_f1']:.4f} "
          f"(IC95 [{lo:.4f}, {hi:.4f}])")
    print(f"[run_evaluation] Reporte completo -> {out_json}")
    return metrics


def _build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--predictions", type=Path, required=True)
    parser.add_argument("--baseline", type=Path, default=None)
    parser.add_argument("--reports-dir", type=Path, default=DEFAULT_REPORTS)
    parser.add_argument("--tag", default="model")
    return parser


if __name__ == "__main__":
    args = _build_parser().parse_args()
    evaluate(args.predictions, args.reports_dir, args.baseline, args.tag)
