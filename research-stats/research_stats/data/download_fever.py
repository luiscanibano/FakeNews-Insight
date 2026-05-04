"""Descarga FEVER desde HuggingFace Datasets a `data/raw/`.

FEVER 1.0 esta disponible en HuggingFace bajo el ID `fever`. Usamos
`datasets.load_dataset` para evitar dependencias del cliente oficial
de fever.ai (que requiere descargar wikipedia dump).

Uso:
    python -m research_stats.data.download_fever
"""

from __future__ import annotations

import argparse
from pathlib import Path

DEFAULT_OUTPUT = Path(__file__).resolve().parents[2] / "data" / "raw"


def download(output_dir: Path = DEFAULT_OUTPUT, hf_name: str = "fever",
             hf_config: str = "v1.0") -> None:
    """Descarga FEVER y lo guarda en formato Parquet por split."""
    output_dir.mkdir(parents=True, exist_ok=True)
    # Import diferido para que `--help` no requiera tener `datasets` instalado.
    from datasets import load_dataset  # type: ignore

    print(f"[download_fever] Descargando {hf_name}/{hf_config} -> {output_dir}")
    ds = load_dataset(hf_name, hf_config)
    for split, dset in ds.items():
        out_path = output_dir / f"{split}.parquet"
        dset.to_parquet(str(out_path))
        print(f"  - {split}: {len(dset):>8d} ejemplos -> {out_path.name}")
    print("[download_fever] OK")


def _build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT,
                        help="Directorio donde guardar los splits parquet.")
    parser.add_argument("--hf-name", default="fever")
    parser.add_argument("--hf-config", default="v1.0")
    return parser


if __name__ == "__main__":
    args = _build_parser().parse_args()
    download(args.output, args.hf_name, args.hf_config)
