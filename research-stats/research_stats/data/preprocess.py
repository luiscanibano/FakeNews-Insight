"""Preprocesado de FEVER al formato (claim, evidence, label).

Para cada ejemplo de FEVER concatena las evidencias gold (sentencias del
articulo de Wikipedia citado) en un unico texto. Para los ejemplos
`NOT ENOUGH INFO` no hay evidencias gold, por lo que se utiliza un texto
sentinela vacio (esto se documenta en la memoria como decision de diseno).

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


def _flatten_evidence(evidence_field: object) -> str:
    """Convierte el campo `evidence` (anidado) en texto plano.

    FEVER almacena `evidence` como List[List[[ann_id, ev_id, page, sent_id]]].
    Aqui solo conservamos el identificador de pagina+sentencia como pista
    textual; el cuerpo real se obtiene de un dump de Wikipedia, que no
    descargamos (decision documentada).
    """
    if not evidence_field:
        return ""
    parts: list[str] = []
    try:
        for group in evidence_field:  # type: ignore[union-attr]
            for item in group:
                # item ~ [ann_id, ev_id, page, sentence_id]
                if len(item) >= 4 and item[2] is not None:
                    page = str(item[2]).replace("_", " ")
                    parts.append(f"{page} (sent {item[3]})")
    except (TypeError, IndexError):
        return ""
    return " | ".join(dict.fromkeys(parts))  # dedup conservando orden


def preprocess_split(df: pd.DataFrame) -> pd.DataFrame:
    out = pd.DataFrame({
        "claim": df["claim"].astype(str),
        "evidence": df["evidence"].apply(_flatten_evidence),
        "label": df["label"].apply(normalize_label),
    })
    out = out[out["label"].isin(LABELS_3WAY)].reset_index(drop=True)
    return out


def run(raw_dir: Path = DEFAULT_RAW, out_dir: Path = DEFAULT_OUT,
        splits: Iterable[str] = ("train", "labelled_dev", "paper_dev",
                                 "validation", "test")) -> None:
    out_dir.mkdir(parents=True, exist_ok=True)
    found = False
    for split in splits:
        src = raw_dir / f"{split}.parquet"
        if not src.exists():
            continue
        found = True
        df = pd.read_parquet(src)
        if "label" not in df.columns:
            print(f"[preprocess] {split}: sin etiquetas, se salta.")
            continue
        out = preprocess_split(df)
        dst = out_dir / f"{split}.parquet"
        out.to_parquet(dst, index=False)
        print(f"[preprocess] {split}: {len(out):>8d} -> {dst.name}")
    if not found:
        raise SystemExit(
            f"No se encontro ningun split en {raw_dir}. "
            "Ejecuta primero `python -m research_stats.data.download_fever`."
        )


def _build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--raw", type=Path, default=DEFAULT_RAW)
    parser.add_argument("--out", type=Path, default=DEFAULT_OUT)
    return parser


if __name__ == "__main__":
    args = _build_parser().parse_args()
    run(args.raw, args.out)
