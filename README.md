# TFG — FakeNews Insight

Plataforma web para verificacion de afirmaciones con evidencias. El flujo
principal combina extraccion de claims, recuperacion web, inferencia FEVER/NLI,
adjudicacion semantica y agregacion de veredictos. El backend esta construido
con FastAPI y el frontend con React + Vite; Supabase gestiona autenticacion,
persistencia y RLS.

> Estado: **alpha** — backend dockerizado en un VPS y frontend estatico en
> Cloudflare Pages, ambos con CI/CD desde GitHub Actions.

---

## Estructura del repositorio

```
.
├── fakenews-backend/      # FastAPI + agente FEVER/NLI (Dockerfile)
├── fakenews-frontend/     # React 19 + Vite + Tailwind
├── models/                # Modelo FEVER/NLI exportado para inferencia
├── deploy/vps/            # Despliegue VPS: compose, Caddy y script remoto
├── .github/workflows/     # CI y despliegues frontend/backend
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
- **Deploy backend** ([deploy-backend-vps.yml](.github/workflows/deploy-backend-vps.yml)):
  conecta por SSH al VPS y ejecuta `deploy/vps/deploy.sh`.
- **Deploy frontend** ([deploy-cloudflare-pages.yml](.github/workflows/deploy-cloudflare-pages.yml)):
  compila el frontend Vite y publica `dist/` en Cloudflare Pages.

El Dockerfile del frontend se mantiene para desarrollo local y validacion
containerizada, pero produccion sirve el artefacto estatico desde Cloudflare
Pages.

Secrets/variables necesarios para despliegue:

- Backend VPS: `VPS_HOST`, `VPS_USER`, `VPS_SSH_PRIVATE_KEY`, `VPS_APP_DIR`.
- Frontend Cloudflare: `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`,
  `CLOUDFLARE_PAGES_PROJECT_NAME`.
- Build frontend: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`,
  `VITE_ANALYSIS_API_BASE_URL` apuntando al backend publico del VPS.

### VPS backend

El despliegue del backend en produccion usa:

1. [deploy/vps/docker-compose.yml](deploy/vps/docker-compose.yml)
2. [deploy/vps/Caddyfile](deploy/vps/Caddyfile)
3. [deploy/vps/deploy.sh](deploy/vps/deploy.sh)

El backend queda expuesto en `https://api.fakenewsinsight.com` y Caddy hace de
reverse proxy hacia `backend:8000` dentro de la red Docker.

---

## URLs alpha

> _Pendientes de cumplimentar tras el primer despliegue:_
>
> - Frontend: `https://<proyecto>.pages.dev`
> - Backend:  `https://api.fakenewsinsight.com`
