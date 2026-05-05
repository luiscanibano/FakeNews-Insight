"""Preprocesado de FEVER-NLI al formato (claim, evidence, label).

Lee los parquets crudos de `pietrolesci/nli_fever` (campos `premise`,
`hypothesis`, `fever_gold_label`) y los renombra al formato interno
`(claim, evidence, label)` que consume el resto del pipeline.

Splits originales: train (208346) / dev (19998) / test (19998). Renombramos
`dev` -> `validation` para coincidir con la convencion HF del Trainer.

Genera `data/processed/{train,validation,test}.parquet` con columnas:
    claim: str
    evidence: str
    label: str  (SUPPORTS / REFUTES / NOT ENOUGH INFO)

Uso:
    python -m research_stats.data.preprocess
"""

from __future__ import annotations

import argparse
from pathlib import Path
from typing import Iterable

import pandas as pd

from research_stats.labels import LABELS_3WAY, normalize_label

ROOT = Path(__file__).resolve().parents[2]
DEFAULT_RAW = ROOT / "data" / "raw"
DEFAULT_OUT = ROOT / "data" / "processed"

# Splits del HF dataset upstream (pietrolesci/nli_fever).
SPLIT_RENAME = {"train": "train", "dev": "validation", "test": "test"}


def _safe_normalize(raw: object) -> str | None:
    try:
        return normalize_label(str(raw))
    except ValueError:
        return None


def preprocess_split(df: pd.DataFrame) -> pd.DataFrame:
    out = pd.DataFrame({
        "claim": df["premise"].astype(str),
        "evidence": df["hypothesis"].astype(str),
        "label": df["fever_gold_label"].apply(_safe_normalize),
    })
    out = out[out["label"].isin(LABELS_3WAY)].reset_index(drop=True)
    # Quitar duplicados exactos (claim, evidence, label)
    out = out.drop_duplicates(subset=["claim", "evidence", "label"]).reset_index(drop=True)
    return out


def run(raw_dir: Path = DEFAULT_RAW, out_dir: Path = DEFAULT_OUT,
        splits: Iterable[str] = ("train", "dev", "test")) -> None:
    out_dir.mkdir(parents=True, exist_ok=True)
    found = False
    val_df: pd.DataFrame | None = None
    for split in splits:
        src = raw_dir / f"{split}.parquet"
        if not src.exists():
            continue
        found = True
        df = pd.read_parquet(src)
        out = preprocess_split(df)
        dst_name = SPLIT_RENAME.get(split, split)
        if dst_name == "test" and len(out) == 0:
            # El test oficial de FEVER es ciego (labels = "not available").
            # Mas adelante construimos test desde validation.
            print(f"[preprocess] {split}: test ciego, se descarta")
            continue
        if dst_name == "validation":
            val_df = out
            continue
        dst = out_dir / f"{dst_name}.parquet"
        out.to_parquet(dst, index=False)
        print(f"[preprocess] {split} -> {dst.name}: {len(out):>8d}")
    if not found:
        raise SystemExit(
            f"No se encontro ningun split en {raw_dir}. "
            "Ejecuta primero `python -m research_stats.data.download_fever`."
        )
    if val_df is not None:
        # Split estratificado de validation en validation + test (50/50).
        # Documentado en la memoria como decision para tener test gold.
        from sklearn.model_selection import train_test_split  # type: ignore
        v, t = train_test_split(
            val_df, test_size=0.5, random_state=42,
            stratify=val_df["label"],
        )
        v = v.reset_index(drop=True)
        t = t.reset_index(drop=True)
        v.to_parquet(out_dir / "validation.parquet", index=False)
        t.to_parquet(out_dir / "test.parquet", index=False)
        print(f"[preprocess] validation -> validation.parquet: {len(v):>8d}")
        print(f"[preprocess] validation -> test.parquet:       {len(t):>8d}")


def _build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--raw", type=Path, default=DEFAULT_RAW)
    parser.add_argument("--out", type=Path, default=DEFAULT_OUT)
    return parser


if __name__ == "__main__":
    args = _build_parser().parse_args()
    run(args.raw, args.out)
