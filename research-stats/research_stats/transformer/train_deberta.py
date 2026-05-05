"""Fine-tune de un transformer (default DeBERTa-v3-small) sobre FEVER 3-way.

Carga `transformer/config.yaml` por defecto. Usa HuggingFace `Trainer`.

Uso:
    python -m research_stats.transformer.train_deberta \
        --train data/processed/train.parquet \
        --dev   data/processed/validation.parquet \
        --out   checkpoints/deberta-v3-small-fever-v1
"""

from __future__ import annotations

import argparse
from dataclasses import dataclass
from pathlib import Path
from typing import Any

import yaml

from research_stats.labels import ID2LABEL, LABEL2ID, LABELS_3WAY

ROOT = Path(__file__).resolve().parents[2]
DEFAULT_CONFIG = Path(__file__).resolve().parent / "config.yaml"


@dataclass
class TrainConfig:
    model_name: str
    max_length: int
    batch_size: int
    learning_rate: float
    num_train_epochs: int
    weight_decay: float
    warmup_ratio: float
    gradient_accumulation_steps: int
    eval_strategy: str
    save_strategy: str
    load_best_model_at_end: bool
    metric_for_best_model: str
    fp16: bool
    seed: int

    @classmethod
    def from_yaml(cls, path: Path) -> "TrainConfig":
        data = yaml.safe_load(path.read_text(encoding="utf-8"))
        return cls(**data)


def _compute_metrics_factory():
    """Devuelve la funcion compute_metrics tras importar `evaluate`/sklearn."""
    from sklearn.metrics import accuracy_score, f1_score
    import numpy as np

    def compute_metrics(eval_pred: Any) -> dict[str, float]:
        logits, labels = eval_pred
        preds = np.argmax(logits, axis=-1)
        return {
            "accuracy": float(accuracy_score(labels, preds)),
            "macro_f1": float(f1_score(labels, preds, average="macro")),
        }

    return compute_metrics


def _make_dataset(parquet_path: Path, tokenizer, max_length: int,
                  max_samples: int | None = None):
    """Carga un parquet (claim, evidence, label) como Dataset HF tokenizado."""
    import pandas as pd
    from datasets import Dataset  # type: ignore

    df = pd.read_parquet(parquet_path)
    df = df[df["label"].isin(LABELS_3WAY)].reset_index(drop=True)
    if max_samples is not None and max_samples > 0 and len(df) > max_samples:
        # Muestreo estratificado por label.
        from sklearn.model_selection import train_test_split  # type: ignore
        df, _ = train_test_split(
            df, train_size=max_samples, random_state=42,
            stratify=df["label"],
        )
        df = df.reset_index(drop=True)
    df["label_id"] = df["label"].map(LABEL2ID)

    ds = Dataset.from_pandas(df[["claim", "evidence", "label_id"]],
                             preserve_index=False)

    def _tokenize(batch):
        return tokenizer(batch["claim"], batch["evidence"],
                         truncation=True, max_length=max_length)

    ds = ds.map(_tokenize, batched=True, remove_columns=["claim", "evidence"])
    ds = ds.rename_column("label_id", "labels")
    return ds


def train(train_path: Path, dev_path: Path, out_dir: Path,
          config_path: Path = DEFAULT_CONFIG,
          max_train_samples: int | None = None) -> None:
    cfg = TrainConfig.from_yaml(config_path)
    out_dir.mkdir(parents=True, exist_ok=True)

    # Imports diferidos: que `--help` funcione sin torch instalado.
    from transformers import (  # type: ignore
        AutoModelForSequenceClassification,
        AutoTokenizer,
        DataCollatorWithPadding,
        Trainer,
        TrainingArguments,
        set_seed,
    )

    set_seed(cfg.seed)

    tokenizer = AutoTokenizer.from_pretrained(cfg.model_name)
    model = AutoModelForSequenceClassification.from_pretrained(
        cfg.model_name,
        num_labels=len(LABELS_3WAY),
        id2label=ID2LABEL,
        label2id=LABEL2ID,
    )

    train_ds = _make_dataset(train_path, tokenizer, cfg.max_length,
                             max_samples=max_train_samples)
    dev_ds = _make_dataset(dev_path, tokenizer, cfg.max_length)

    args = TrainingArguments(
        output_dir=str(out_dir),
        per_device_train_batch_size=cfg.batch_size,
        per_device_eval_batch_size=cfg.batch_size,
        learning_rate=cfg.learning_rate,
        num_train_epochs=cfg.num_train_epochs,
        weight_decay=cfg.weight_decay,
        warmup_ratio=cfg.warmup_ratio,
        gradient_accumulation_steps=cfg.gradient_accumulation_steps,
        eval_strategy=cfg.eval_strategy,
        save_strategy=cfg.save_strategy,
        load_best_model_at_end=cfg.load_best_model_at_end,
        metric_for_best_model=cfg.metric_for_best_model,
        fp16=cfg.fp16,
        seed=cfg.seed,
        report_to=["none"],
    )

    trainer = Trainer(
        model=model,
        args=args,
        train_dataset=train_ds,
        eval_dataset=dev_ds,
        tokenizer=tokenizer,
        data_collator=DataCollatorWithPadding(tokenizer=tokenizer),
        compute_metrics=_compute_metrics_factory(),
    )

    trainer.train()
    trainer.save_model(str(out_dir))
    tokenizer.save_pretrained(str(out_dir))
    metrics = trainer.evaluate()
    (out_dir / "eval_metrics.json").write_text(
        __import__("json").dumps(metrics, indent=2), encoding="utf-8"
    )
    print(f"[train_deberta] OK -> {out_dir}")


def _build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--train", type=Path, required=True)
    parser.add_argument("--dev", type=Path, required=True)
    parser.add_argument("--out", type=Path, required=True)
    parser.add_argument("--config", type=Path, default=DEFAULT_CONFIG)
    parser.add_argument("--max-train-samples", type=int, default=None,
                        help="Si se indica, muestrea ese numero de ejemplos"
                             " del train (estratificado por label).")
    return parser


if __name__ == "__main__":
    args = _build_parser().parse_args()
    train(args.train, args.dev, args.out, args.config,
          max_train_samples=args.max_train_samples)
