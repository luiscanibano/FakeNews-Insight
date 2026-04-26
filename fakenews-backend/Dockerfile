# =====================================================================
# Backend Dockerfile (FastAPI + scikit-learn + NLTK)
# Build context esperado: RAÍZ DEL REPO (necesita acceder a ./models/)
# Comando recomendado:
#   docker build -f fakenews-backend/Dockerfile -t fakenews-backend:dev .
# =====================================================================

# ----- Stage 1: builder -----
FROM python:3.11-slim AS builder

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

WORKDIR /build

# Compilador necesario para algunas wheels (scikit-learn ya trae wheels prebuilt,
# pero mantenemos build-essential por si falta alguno en arm64)
RUN apt-get update && apt-get install -y --no-install-recommends \
        build-essential \
    && rm -rf /var/lib/apt/lists/*

COPY fakenews-backend/requirements.txt ./requirements.txt
RUN pip install --prefix=/install -r requirements.txt

# Pre-descarga de corpora NLTK al stage builder (evita descarga en runtime)
ENV NLTK_DATA=/install/nltk_data
RUN PYTHONPATH=/install/lib/python3.11/site-packages \
    python -m nltk.downloader -d /install/nltk_data \
        punkt punkt_tab stopwords wordnet omw-1.4

# ----- Stage 2: runtime -----
FROM python:3.11-slim AS runtime

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    NLTK_DATA=/opt/nltk_data \
    PORT=8000

# Crear usuario no-root
RUN groupadd --system app && useradd --system --gid app --home /app app

WORKDIR /app

# Copiar dependencias y datos NLTK desde el builder
COPY --from=builder /install/lib/python3.11/site-packages /usr/local/lib/python3.11/site-packages
COPY --from=builder /install/bin /usr/local/bin
COPY --from=builder /install/nltk_data /opt/nltk_data

# Copiar código del backend y modelos (build context = repo root)
COPY fakenews-backend/ /app/
COPY models/ /models/

RUN chown -R app:app /app /models /opt/nltk_data
USER app

EXPOSE 8000

# Healthcheck (Render lo ignora pero es útil en Docker local y compose)
HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 \
    CMD python -c "import urllib.request,sys; \
        sys.exit(0 if urllib.request.urlopen(f'http://127.0.0.1:{__import__(\"os\").environ.get(\"PORT\",\"8000\")}/health', timeout=3).status==200 else 1)"

# Render expone $PORT dinámicamente
CMD ["sh", "-c", "uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000}"]
