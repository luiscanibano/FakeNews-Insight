# TFG — FakeNews Insight: Plataforma de detección de Fake News

Plataforma web que clasifica noticias como reales o falsas usando un
modelo SVM + TF-IDF entrenado sobre un corpus en español. Frontend en
React + Vite, backend en FastAPI, autenticación y persistencia en
Supabase.

> Estado: **alpha** — primer despliegue dockerizado con CI/CD.

---

## Estructura del repositorio

```
.
├── fakenews-backend/      # FastAPI + scikit-learn (Dockerfile)
├── fakenews-frontend/     # React 19 + Vite + Tailwind (Dockerfile + nginx)
├── models/                # Pickles del SVM y el TF-IDF (~220 KB)
├── docs/                  # Documentación de despliegue y arquitectura
├── .github/workflows/     # CI, build & publish, deploy
├── docker-compose.yml     # Orquestación local
└── .env.example           # Variables necesarias para docker compose
```

---

## Requisitos

- **Docker Desktop** (recomendado para correrlo todo).
- *Opcionalmente, para desarrollo nativo:*
  - Python **3.11**
  - Node **20** (ver [.nvmrc](./.nvmrc))

---

## Arranque rápido (Docker)

```bash
cp .env.example .env       # rellenar SUPABASE_* y VITE_SUPABASE_*
docker compose up --build
```

- Frontend: <http://localhost:5173>
- Backend healthcheck: <http://localhost:8000/health>

---

## Desarrollo nativo

### Backend

```bash
cd fakenews-backend
python -m venv .venv && .venv\Scripts\activate    # Windows
pip install -r requirements-dev.txt
cp .env.example .env                              # rellenar valores
uvicorn main:app --reload
```

### Frontend

```bash
cd fakenews-frontend
npm install
cp .env.example .env                              # rellenar valores
npm run dev
```

---

## Variables de entorno

Cada subproyecto tiene su propio `.env.example`:

- [fakenews-backend/.env.example](fakenews-backend/.env.example)
- [fakenews-frontend/.env.example](fakenews-frontend/.env.example)
- [.env.example](.env.example) (raíz, usado por `docker compose`)

---

## CI/CD

- **CI** ([ci.yml](.github/workflows/ci.yml)): lint + smoke tests en cada PR.
- **Build & Publish** ([build-and-publish.yml](.github/workflows/build-and-publish.yml)):
  publica imágenes Docker en GHCR en cada push a `main`.
- **Deploy** ([deploy-render.yml](.github/workflows/deploy-render.yml)):
  triggerea los Deploy Hooks de Render.

Ver guía completa: [docs/DEPLOY.md](docs/DEPLOY.md).
Ver arquitectura: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

---

## URLs alpha

> _Pendientes de cumplimentar tras el primer despliegue:_
>
> - Frontend: `https://<TBD>.onrender.com`
> - Backend:  `https://<TBD>.onrender.com`
