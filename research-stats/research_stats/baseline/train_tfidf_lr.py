"""Baseline reproducible TF-IDF (claim + evidence) -> LogisticRegression.

Vive en `research_stats.baseline.train_tfidf_lr`.

Uso:
    python -m research_stats.baseline.train_tfidf_lr \
        --train data/processed/train.parquet \
        --dev   data/processed/validation.parquet \
        --out   models/baseline_tfidf_lr.joblib
"""

from __future__ import annotations

import argparse
import json
from dataclasses import dataclass
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import classification_report, f1_score
from sklearn.pipeline import Pipeline

from research_stats.labels import LABELS_3WAY

SEP = " [SEP] "  # separador entre claim y evidence


@dataclass(frozen=True)
class BaselineConfig:
    max_features: int = 200_000
    ngram_range: tuple[int, int] = (1, 2)
    min_df: int = 2
    C: float = 1.0
    max_iter: int = 1000
    seed: int = 42


def build_pipeline(cfg: BaselineConfig) -> Pipeline:
    return Pipeline([
        ("tfidf", TfidfVectorizer(
            max_features=cfg.max_features,
            ngram_range=cfg.ngram_range,
            min_df=cfg.min_df,
            strip_accents="unicode",
            sublinear_tf=True,
        )),
        ("clf", LogisticRegression(
            C=cfg.C,
            max_iter=cfg.max_iter,
            multi_class="multinomial",
            solver="lbfgs",
            n_jobs=-1,
            random_state=cfg.seed,
        )),
    ])


def _build_text(df: pd.DataFrame) -> np.ndarray:
    return (df["claim"].astype(str) + SEP + df["evidence"].astype(str)).to_numpy()


def train_and_evaluate(train_df: pd.DataFrame, dev_df: pd.DataFrame,
                       cfg: BaselineConfig | None = None) -> dict:
    cfg = cfg or BaselineConfig()
    pipe = build_pipeline(cfg)

    X_train, y_train = _build_text(train_df), train_df["label"].to_numpy()
    X_dev, y_dev = _build_text(dev_df), dev_df["label"].to_numpy()

    pipe.fit(X_train, y_train)
    y_pred = pipe.predict(X_dev)

    macro_f1 = f1_score(y_dev, y_pred, labels=list(LABELS_3WAY), average="macro")
    report = classification_report(
        y_dev, y_pred, labels=list(LABELS_3WAY), output_dict=True, zero_division=0,
    )

    return {
        "pipeline": pipe,
        "macro_f1": float(macro_f1),
        "classification_report": report,
        "config": cfg.__dict__,
    }


def _build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--train", type=Path, required=True)
    parser.add_argument("--dev", type=Path, required=True)
    parser.add_argument("--out", type=Path, required=True,
                        help="Ruta del .joblib donde guardar el pipeline entrenado.")
    return parser


def main() -> None:
    args = _build_parser().parse_args()
    train_df = pd.read_parquet(args.train)
    dev_df = pd.read_parquet(args.dev)

    result = train_and_evaluate(train_df, dev_df)
    args.out.parent.mkdir(parents=True, exist_ok=True)
    joblib.dump(result["pipeline"], args.out)

    summary = {k: v for k, v in result.items() if k != "pipeline"}
    print(json.dumps(summary, indent=2, ensure_ascii=False))


if __name__ == "__main__":
    main()
