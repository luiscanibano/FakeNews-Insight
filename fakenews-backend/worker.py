"""Entry point del worker de verificaciones asincronas."""

from verification_queue import run_worker


if __name__ == "__main__":
    run_worker()