"""Parsing y validacion de CSV para contraste FEVER por lotes."""

from __future__ import annotations

import csv
import io
from pathlib import Path
from typing import Dict, List


class CsvContrastValidationError(ValueError):
    """Error de validacion del CSV de entrada."""


def _decode_csv_bytes(file_bytes: bytes) -> str:
    for encoding in ("utf-8-sig", "utf-8", "cp1252"):
        try:
            return file_bytes.decode(encoding)
        except UnicodeDecodeError:
            continue

    raise CsvContrastValidationError(
        "No se pudo decodificar el CSV. Usa UTF-8 o un CSV compatible con Windows-1252."
    )


def _truncate_text(text: str, max_chars: int) -> str:
    if max_chars <= 0 or len(text) <= max_chars:
        return text

    candidate = text[: max_chars + 1].rsplit(" ", 1)[0].strip()
    return candidate or text[:max_chars].strip()


def parse_csv_verification_file(
    *,
    file_bytes: bytes,
    filename: str,
    max_rows: int,
    max_chars: int,
) -> Dict[str, object]:
    if not file_bytes:
        raise CsvContrastValidationError("El archivo CSV esta vacio.")

    normalized_filename = Path(filename or "lote.csv").name or "lote.csv"
    decoded_csv = _decode_csv_bytes(file_bytes)
    reader = csv.DictReader(io.StringIO(decoded_csv, newline=""))

    if not reader.fieldnames:
        raise CsvContrastValidationError("El CSV debe incluir una cabecera con una unica columna de texto.")

    normalized_fields = [str(field or "").strip() for field in reader.fieldnames if str(field or "").strip()]
    if len(normalized_fields) != 1:
        raise CsvContrastValidationError(
            "El CSV debe contener exactamente una columna de texto para contrastar."
        )

    source_field = normalized_fields[0]
    rows: List[Dict[str, object]] = []
    for row_index, row in enumerate(reader, start=1):
        if len(rows) >= max_rows:
            raise CsvContrastValidationError(
                f"El CSV supera el maximo permitido de {max_rows} filas por lote."
            )

        raw_value = str((row or {}).get(source_field) or "").strip()
        if not raw_value:
            continue

        rows.append({
            "row_index": row_index,
            "input_text": _truncate_text(raw_value, max_chars=max_chars),
        })

    if not rows:
        raise CsvContrastValidationError(
            "El CSV no contiene filas con texto util para contrastar."
        )

    return {
        "filename": normalized_filename,
        "column_name": source_field,
        "rows": rows,
    }