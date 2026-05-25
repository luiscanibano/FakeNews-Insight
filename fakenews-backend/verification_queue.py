"""Infraestructura minima de cola para verificaciones FEVER asincronas."""

from __future__ import annotations

import os
from typing import Any, Dict


VERIFY_QUEUE_NAME = os.getenv("VERIFY_QUEUE_NAME", "verification")
VERIFY_REDIS_URL = (
    os.getenv("VERIFY_REDIS_URL", "").strip()
    or os.getenv("REDIS_URL", "").strip()
    or "redis://redis:6379/0"
)
VERIFY_JOB_TIMEOUT = int(os.getenv("VERIFY_JOB_TIMEOUT", "1800") or 1800)
VERIFY_RESULT_TTL = int(os.getenv("VERIFY_RESULT_TTL", "86400") or 86400)
VERIFY_FAILURE_TTL = int(os.getenv("VERIFY_FAILURE_TTL", "604800") or 604800)


def _get_redis_connection():
    try:
        from redis import Redis
    except ImportError as exc:  # pragma: no cover - env issue
        raise RuntimeError("Falta instalar redis en el backend para habilitar la cola de verificaciones.") from exc

    return Redis.from_url(VERIFY_REDIS_URL)


def enqueue_verification_job(
    *,
    run_id: str,
    user_id: str,
    jwt_token: str,
    text: str,
    quota: Dict[str, Any],
) -> Dict[str, Any]:
    """Encola una verificacion FEVER y devuelve su job_id."""
    try:
        from rq import Queue
    except ImportError as exc:  # pragma: no cover - env issue
        raise RuntimeError("Falta instalar rq en el backend para habilitar la cola de verificaciones.") from exc

    queue = Queue(
        VERIFY_QUEUE_NAME,
        connection=_get_redis_connection(),
        default_timeout=VERIFY_JOB_TIMEOUT,
    )
    job = queue.enqueue(
        process_verification_job,
        kwargs={
            "run_id": run_id,
            "user_id": user_id,
            "jwt_token": jwt_token,
            "text": text,
            "quota": quota,
        },
        job_timeout=VERIFY_JOB_TIMEOUT,
        result_ttl=VERIFY_RESULT_TTL,
        failure_ttl=VERIFY_FAILURE_TTL,
    )
    return {
        "job_id": job.id,
        "status": "pending",
    }


def enqueue_csv_batch_job(
    *,
    batch_id: str,
    user_id: str,
    jwt_token: str,
    rows: list,
    quota: Dict[str, Any],
) -> Dict[str, Any]:
    """Encola un lote CSV FEVER y devuelve su job_id."""
    try:
        from rq import Queue
    except ImportError as exc:  # pragma: no cover - env issue
        raise RuntimeError("Falta instalar rq en el backend para habilitar la cola de verificaciones.") from exc

    queue = Queue(
        VERIFY_QUEUE_NAME,
        connection=_get_redis_connection(),
        default_timeout=VERIFY_JOB_TIMEOUT,
    )
    job = queue.enqueue(
        process_csv_batch_job,
        kwargs={
            "batch_id": batch_id,
            "user_id": user_id,
            "jwt_token": jwt_token,
            "rows": rows,
            "quota": quota,
        },
        job_timeout=VERIFY_JOB_TIMEOUT,
        result_ttl=VERIFY_RESULT_TTL,
        failure_ttl=VERIFY_FAILURE_TTL,
    )
    return {
        "job_id": job.id,
        "status": "pending",
    }


def process_verification_job(
    *,
    run_id: str,
    user_id: str,
    jwt_token: str,
    text: str,
    quota: Dict[str, Any],
) -> Dict[str, Any]:
    """Punto de entrada ejecutado por el worker para procesar una verificacion."""
    import main

    return main._execute_verification_job(
        run_id=run_id,
        user_id=user_id,
        jwt_token=jwt_token,
        text=text,
        quota=quota,
    )


def process_csv_batch_job(
    *,
    batch_id: str,
    user_id: str,
    jwt_token: str,
    rows: list,
    quota: Dict[str, Any],
) -> Dict[str, Any]:
    """Punto de entrada ejecutado por el worker para procesar un lote CSV."""
    import main

    return main._execute_csv_batch_job(
        batch_id=batch_id,
        user_id=user_id,
        jwt_token=jwt_token,
        rows=rows,
        quota=quota,
    )


def run_worker() -> None:
    """Arranca un worker bloqueante para la cola de verificaciones."""
    try:
        from rq import Worker
    except ImportError as exc:  # pragma: no cover - env issue
        raise RuntimeError("Falta instalar rq en el backend para arrancar el worker.") from exc

    worker = Worker([VERIFY_QUEUE_NAME], connection=_get_redis_connection())
    worker.work()