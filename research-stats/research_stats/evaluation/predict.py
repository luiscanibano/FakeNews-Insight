"""Genera predicciones (parquet) para baseline TF-IDF+LR o DeBERTa fine-tuned.

Salida: parquet con columnas
    claim, evidence, label, pred_label,
    prob_supports, prob_refutes, prob_not_enough_info

Uso:
    # Baseline
    python -m research_stats.evaluation.predict \
        --kind baseline \
        --model models/baseline_tfidf_lr.joblib \
        --test  data/processed/test.parquet \
        --out   reports/tables/preds_baseline.parquet

    # DeBERTa
    python -m research_stats.evaluation.predict \
        --kind deberta \
        --model checkpoints/deberta-v3-small-fever-v1 \
        --test  data/processed/test.parquet \
        --out   reports/tables/preds_deberta.parquet
"""

from __future__ import annotations

import argparse
from pathlib import Path

import numpy as np
import pandas as pd

from research_stats.labels import ID2LABEL, LABELS_3WAY


PROB_COLS = [f"prob_{lbl.lower().replace(' ', '_')}" for lbl in LABELS_3WAY]


def _predict_baseline(model_path: Path, df: pd.DataFrame) -> pd.DataFrame:
    import joblib

    pipe = joblib.load(model_path)
    sep = " [SEP] "
    texts = (df["claim"].astype(str) + sep + df["evidence"].astype(str)).to_numpy()
    proba = pipe.predict_proba(texts)
    classes = list(pipe.classes_)
    # Reordenar columnas a LABELS_3WAY
    idx = [classes.index(lbl) for lbl in LABELS_3WAY]
    proba = proba[:, idx]
    pred_idx = proba.argmax(axis=1)
    preds = np.array([LABELS_3WAY[i] for i in pred_idx])
    out = df[["claim", "evidence", "label"]].copy()
    out["pred_label"] = preds
    for j, col in enumerate(PROB_COLS):
        out[col] = proba[:, j]
    return out


def _predict_deberta(model_dir: Path, df: pd.DataFrame,
                     batch_size: int = 32, max_length: int = 192) -> pd.DataFrame:
    import torch
    from torch.utils.data import DataLoader
    from transformers import (  # type: ignore
        AutoModelForSequenceClassification,
        AutoTokenizer,
        DataCollatorWithPadding,
    )
    from datasets import Dataset  # type: ignore

    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    tok = AutoTokenizer.from_pretrained(model_dir)
    model = AutoModelForSequenceClassification.from_pretrained(model_dir).to(device).eval()

    ds = Dataset.from_pandas(df[["claim", "evidence"]], preserve_index=False)

    def _tok(b):
        return tok(b["claim"], b["evidence"], truncation=True, max_length=max_length)

    ds = ds.map(_tok, batched=True, remove_columns=["claim", "evidence"])
    collator = DataCollatorWithPadding(tokenizer=tok)
    loader = DataLoader(ds, batch_size=batch_size, collate_fn=collator)

    all_probs: list[np.ndarray] = []
    with torch.no_grad():
        for batch in loader:
            batch = {k: v.to(device) for k, v in batch.items()}
            logits = model(**batch).logits
            probs = torch.softmax(logits, dim=-1).cpu().numpy()
            all_probs.append(probs)
    proba = np.concatenate(all_probs, axis=0)

    # Mapear orden de columnas: el modelo expone id2label segun LABELS_3WAY
    # (configurado en train_deberta), pero por seguridad reordenamos.
    cfg_id2label = {int(k): v for k, v in model.config.id2label.items()}
    idx = [next(i for i, lbl in cfg_id2label.items() if lbl == target)
           for target in LABELS_3WAY]
    proba = proba[:, idx]

    pred_idx = proba.argmax(axis=1)
    preds = np.array([LABELS_3WAY[i] for i in pred_idx])
    out = df[["claim", "evidence", "label"]].copy()
    out["pred_label"] = preds
    for j, col in enumerate(PROB_COLS):
        out[col] = proba[:, j]
    return out


def predict(kind: str, model_path: Path, test_path: Path, out_path: Path) -> None:
    df = pd.read_parquet(test_path)
    df = df[df["label"].isin(LABELS_3WAY)].reset_index(drop=True)
    if kind == "baseline":
        out = _predict_baseline(model_path, df)
    elif kind == "deberta":
        out = _predict_deberta(model_path, df)
    else:
        raise ValueError(f"--kind desconocido: {kind!r}")
    out_path.parent.mkdir(parents=True, exist_ok=True)
    out.to_parquet(out_path, index=False)
    print(f"[predict] {kind}: {len(out)} predicciones -> {out_path}")


def _build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--kind", choices=["baseline", "deberta"], required=True)
    parser.add_argument("--model", type=Path, required=True)
    parser.add_argument("--test", type=Path, required=True)
    parser.add_argument("--out", type=Path, required=True)
    return parser


if __name__ == "__main__":
    args = _build_parser().parse_args()
    predict(args.kind, args.model, args.test, args.out)
