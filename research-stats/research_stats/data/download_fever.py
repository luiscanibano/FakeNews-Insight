"""Descarga FEVER (variante NLI con evidencia gold incluida) desde HuggingFace.

Usamos `pietrolesci/nli_fever`, que ya empareja cada claim con el texto de la
evidencia gold extraida del dump de Wikipedia (campo `hypothesis`). Asi
evitamos descargar el dump de Wikipedia que necesitaria el cliente oficial
de fever.ai. Decision documentada en la memoria de Estadistica.

Schema upstream:
    cid, fid, premise (= claim), hypothesis (= evidencia),
    verifiable, fever_gold_label (str), label (int 0/1/2)

Uso:
    python -m research_stats.data.download_fever
"""

from __future__ import annotations

import argparse
from pathlib import Path

DEFAULT_OUTPUT = Path(__file__).resolve().parents[2] / "data" / "raw"
DEFAULT_HF_NAME = "pietrolesci/nli_fever"


def download(output_dir: Path = DEFAULT_OUTPUT,
             hf_name: str = DEFAULT_HF_NAME,
             hf_config: str | None = None) -> None:
    """Descarga FEVER-NLI y lo guarda en formato Parquet por split."""
    output_dir.mkdir(parents=True, exist_ok=True)
    # Import diferido para que `--help` no requiera tener `datasets` instalado.
    from datasets import load_dataset  # type: ignore

    print(f"[download_fever] Descargando {hf_name} -> {output_dir}")
    ds = load_dataset(hf_name, hf_config) if hf_config else load_dataset(hf_name)
    for split, dset in ds.items():
        out_path = output_dir / f"{split}.parquet"
        dset.to_parquet(str(out_path))
        print(f"  - {split}: {len(dset):>8d} ejemplos -> {out_path.name}")
    print("[download_fever] OK")


def _build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT,
                        help="Directorio donde guardar los splits parquet.")
    parser.add_argument("--hf-name", default=DEFAULT_HF_NAME)
    parser.add_argument("--hf-config", default=None)
    return parser


if __name__ == "__main__":
    args = _build_parser().parse_args()
    download(args.output, args.hf_name, args.hf_config)
