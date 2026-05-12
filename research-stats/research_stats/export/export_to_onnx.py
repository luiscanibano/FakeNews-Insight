"""Exportacion del modelo final entrenado a la frontera con el backend.

Convierte un checkpoint HuggingFace a ONNX y lo deposita en
`../models/fever/<version>/` junto con el tokenizer y `model_card.md`.
Esa carpeta es la unica frontera entre research-stats y fakenews-backend.

Uso:
    python -m research_stats.export.export_to_onnx \
        --checkpoint checkpoints/deberta-v3-fever-v1 \
        --version    deberta-v3-fever-v1
"""

from __future__ import annotations

import argparse
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]  # raiz del repo (sale de research-stats)
DEFAULT_OUT_BASE = ROOT / "models" / "fever"


def export(checkpoint: Path, version: str,
           out_base: Path = DEFAULT_OUT_BASE) -> Path:
    out_dir = out_base / version
    out_dir.mkdir(parents=True, exist_ok=True)

    # Imports diferidos
    from optimum.onnxruntime import ORTModelForSequenceClassification  # type: ignore
    from transformers import AutoTokenizer  # type: ignore

    print(f"[export] {checkpoint} -> {out_dir}")
    model = ORTModelForSequenceClassification.from_pretrained(
        str(checkpoint), export=True,
    )
    tokenizer = AutoTokenizer.from_pretrained(str(checkpoint))
    model.save_pretrained(str(out_dir))
    tokenizer.save_pretrained(str(out_dir))

    # Model card minimo (la version completa para la memoria se redacta aparte)
    (out_dir / "model_card.md").write_text(
        f"""# Model card — {version}

- Tarea: Natural Language Inference 3-way (SUPPORTS / REFUTES / NOT ENOUGH INFO)
- Dataset de entrenamiento: FEVER-NLI (`pietrolesci/nli_fever`, subset train estratificado)
- Backbone: DeBERTa-v3-small (`microsoft/deberta-v3-small`)
- Checkpoint fuente: `{checkpoint}`
- Formato: ONNX (consumido por fakenews-backend/fever/inference.py)
- Generado por: research-stats/export/export_to_onnx.py
""",
        encoding="utf-8",
    )
    print(f"[export] OK ({version})")
    return out_dir


def _build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--checkpoint", type=Path, required=True)
    parser.add_argument("--version", required=True)
    parser.add_argument("--out-base", type=Path, default=DEFAULT_OUT_BASE)
    return parser


if __name__ == "__main__":
    args = _build_parser().parse_args()
    export(args.checkpoint, args.version, args.out_base)
