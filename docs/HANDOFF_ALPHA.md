# Despliegue Alpha — Resumen de cambios y guía de acciones manuales

> Documento generado tras la implementación del plan de dockerización + CI/CD.
> Fecha de generación: abril 2026.

---

## 1. Lo que ha hecho el agente (✅ completado)

Resumen ordenado por fases del plan original.

### Fase 0 — Higiene del repositorio

| Archivo | Propósito |
|---|---|
| [.gitignore](../.gitignore) | Ignora `.venv/`, `node_modules/`, `dist/`, `__pycache__/`, `.env*`, logs, caches, etc. |
| [.gitattributes](../.gitattributes) | Normaliza EOL a LF (clave para Docker/Linux desde Windows) y marca binarios. |
| [.nvmrc](../.nvmrc) | Fija Node **20** para que `nvm use` y CI usen la misma versión. |
| [README.md](../README.md) | Punto de entrada del repo: estructura, arranque rápido, enlaces a docs. |

> **Decisión durante la implementación**: los modelos `.pkl` pesan 220 KB en total, así que **NO se ha usado Git LFS** (innecesario y añade fricción a Render). Se commitean como binarios normales.

### Fase 1 — Limpieza de residuos de Stripe

- [fakenews-backend/.env.example](../fakenews-backend/.env.example): eliminadas claves `STRIPE_*`, `BILLING_*`, `FRONTEND_BASE_URL`.
- [fakenews-frontend/.env.example](../fakenews-frontend/.env.example): eliminadas `VITE_BILLING_*`.
- [fakenews-frontend/src/services/account.js](../fakenews-frontend/src/services/account.js): eliminado el fallback a `VITE_BILLING_API_BASE_URL` en `ACCOUNT_API_BASE_URL`.

### Fase 2 — Backend dockerizable

- [fakenews-backend/main.py](../fakenews-backend/main.py): añadido endpoint `GET /health` que devuelve `{"status":"ok"}` (lo usan Docker, Render y los smoke tests).
- [fakenews-backend/requirements.txt](../fakenews-backend/requirements.txt): **versiones pinneadas** y `stripe` eliminado.
- [fakenews-backend/requirements-dev.txt](../fakenews-backend/requirements-dev.txt): añade `pytest` y `httpx` para tests.
- [fakenews-backend/Dockerfile](../fakenews-backend/Dockerfile):
  - Multi-stage `python:3.11-slim` (builder + runtime).
  - Pre-descarga corpora NLTK (`punkt`, `punkt_tab`, `stopwords`, `wordnet`, `omw-1.4`) en build, no en arranque.
  - Usuario no-root (`app`).
  - Copia `models/` desde la raíz del repo (por eso el build context = raíz, no `fakenews-backend/`).
  - `HEALTHCHECK` y `CMD` parametrizado por `$PORT` (Render lo inyecta dinámicamente).
- [fakenews-backend/.dockerignore](../fakenews-backend/.dockerignore).

### Fase 3 — Frontend dockerizable

- [fakenews-frontend/Dockerfile](../fakenews-frontend/Dockerfile):
  - Multi-stage `node:20-alpine` (build) + `nginx:1.27-alpine` (serve).
  - `npm ci` para instalación reproducible.
  - Variables `VITE_*` aceptadas como `--build-arg` (se inlinean en el bundle).
- [fakenews-frontend/nginx.conf](../fakenews-frontend/nginx.conf):
  - SPA fallback (`try_files $uri $uri/ /index.html`) — necesario para React Router.
  - Gzip activado.
  - Cache largo en `/assets/` (assets con hash de Vite).
  - Headers de seguridad (`X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`).
- [fakenews-frontend/.dockerignore](../fakenews-frontend/.dockerignore).

### Fase 4 — Orquestación local

- [docker-compose.yml](../docker-compose.yml): servicios `backend` y `frontend` con healthcheck y `depends_on: condition: service_healthy`.
- [.env.example](../.env.example) en la raíz: plantilla de variables para `docker compose`.

### Fase 5 — Smoke tests

- [fakenews-backend/tests/test_smoke.py](../fakenews-backend/tests/test_smoke.py):
  - `test_health_endpoint_returns_ok` — valida `/health`.
  - `test_app_has_expected_routes` — valida que `/predecir/` y `/health` existen.
- [fakenews-backend/pytest.ini](../fakenews-backend/pytest.ini): configuración mínima de pytest.

### Fase 6 — CI/CD con GitHub Actions

- [.github/workflows/ci.yml](../.github/workflows/ci.yml): lint + smoke tests del backend y `npm run lint && npm run build` del frontend en cada PR / push a ramas != `main`.
- [.github/workflows/build-and-publish.yml](../.github/workflows/build-and-publish.yml): construye y publica las imágenes Docker (backend y frontend) en GHCR (`ghcr.io/<usuario>/<repo>-backend:latest` y `:sha-xxxxxxx`) en cada push a `main`.
- [.github/workflows/deploy-render.yml](../.github/workflows/deploy-render.yml): tras un build exitoso llama a los Deploy Hooks de Render.

### Fase 8 — Documentación

- [docs/DEPLOY.md](DEPLOY.md): guía paso a paso de despliegue (este documento es complementario).
- [docs/ARCHITECTURE.md](ARCHITECTURE.md): diagramas mermaid del sistema y del flujo de un análisis.

---

## 2. Lo que tienes que hacer tú (acción manual requerida)

Estas tareas son **inevitablemente manuales**: requieren autenticación tuya, decisiones de cuenta, o acciones en interfaces externas.

### Paso 1 — Verificar localmente con Docker (recomendado antes de subir)

```powershell
# Desde la raíz del repo
Copy-Item .env.example .env
# Edita .env y rellena al menos:
#   SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY
#   VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY

docker compose up --build
```

Comprueba:

- <http://localhost:8000/health> → `{"status":"ok"}`
- <http://localhost:5173> → carga la SPA, login funciona, análisis funciona.

> Si esto falla, **NO sigas**: arregla aquí antes de tocar Render.

### Paso 2 — Subir el código a GitHub

```powershell
# Si aún no es un repo git
git init
git branch -M main
git add .
git commit -m "feat: alpha deployment infrastructure (docker + ci/cd)"

# Crea el repo en GitHub (puedes usar la web o gh cli) y luego:
git remote add origin https://github.com/<TU_USUARIO>/<TU_REPO>.git
git push -u origin main
```

> Recomendación: hazlo **público** para que las imágenes en GHCR sean públicas y Render pueda bajarlas sin token. Si lo haces privado tendrás que configurar credenciales adicionales en Render.

### Paso 3 — Crear los GitHub Secrets

En `Settings → Secrets and variables → Actions → New repository secret`:

| Nombre del secret | Cómo obtenerlo |
|---|---|
| `VITE_SUPABASE_URL` | Supabase Dashboard → Project Settings → API → URL. |
| `VITE_SUPABASE_ANON_KEY` | Supabase Dashboard → Project Settings → API → `anon public`. |
| `VITE_ANALYSIS_API_BASE_URL` | URL pública del backend en Render (la sabrás tras el Paso 4). **De momento déjalo vacío y vuelve más tarde**. |
| `RENDER_DEPLOY_HOOK_BACKEND` | Lo obtendrás en el Paso 4. |
| `RENDER_DEPLOY_HOOK_FRONTEND` | Lo obtendrás en el Paso 4. |

> Nota: el primer push a `main` va a fallar el job `build-frontend` porque faltan secrets. Es normal y esperado. Continúa con el Paso 4.

### Paso 4 — Crear los servicios en Render

Inicia sesión en <https://render.com> con tu cuenta de GitHub.

#### 4.1 Backend

1. `New + → Web Service → Existing image from a registry`.
2. **Image URL**: `ghcr.io/<TU_USUARIO>/<TU_REPO>-backend:latest`
   *(reemplaza minúsculas; GHCR fuerza minúsculas en `<usuario>/<repo>`).*
3. **Region**: Frankfurt (EU Central).
4. **Plan**: Free.
5. **Environment Variables** (sección Environment):
   - `SUPABASE_URL`
   - `SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
6. **Health Check Path**: `/health`.
7. Tras crear el servicio, copia su URL pública (algo como `https://fakenews-backend-xxxx.onrender.com`).
8. `Settings → Deploy Hook → Copy URL`. Guárdalo como secret `RENDER_DEPLOY_HOOK_BACKEND` en GitHub.

#### 4.2 Frontend

1. `New + → Web Service → Existing image from a registry`.
2. **Image URL**: `ghcr.io/<TU_USUARIO>/<TU_REPO>-frontend:latest`.
3. **Region**: Frankfurt.
4. **Plan**: Free.
5. **Health Check Path**: `/`.
6. *No necesita variables de entorno en runtime* (las `VITE_*` se inlinean en build).
7. Tras crear el servicio, copia su URL pública.
8. `Settings → Deploy Hook → Copy URL`. Guárdalo como secret `RENDER_DEPLOY_HOOK_FRONTEND` en GitHub.

> **Dependencia circular**: el frontend necesita conocer la URL del backend en build-time, pero solo la sabrás tras crear el backend. Por eso el orden es: backend primero → coge su URL → rellena `VITE_ANALYSIS_API_BASE_URL` → trigger un nuevo build.

### Paso 5 — Completar el secret `VITE_ANALYSIS_API_BASE_URL`

Una vez tengas la URL del backend en Render, vuelve a GitHub Secrets y rellena `VITE_ANALYSIS_API_BASE_URL` con esa URL (sin barra final), por ejemplo:

```
https://fakenews-backend-xxxx.onrender.com
```

### Paso 6 — Trigger del primer despliegue completo

```powershell
# Cualquier commit trivial sirve para reactivar los workflows
git commit --allow-empty -m "chore: trigger first full deploy"
git push
```

Esto:

1. Ejecuta `build-and-publish.yml` → publica las dos imágenes en GHCR con la URL correcta.
2. `deploy-render.yml` llama a los dos Deploy Hooks.
3. Render baja `:latest` y reinicia ambos servicios.

Verifica:

```powershell
curl https://<tu-backend>.onrender.com/health
# {"status":"ok"}
```

Y abre la URL del frontend en el navegador.

### Paso 7 — (Opcional) Endurecer CORS antes de producción

En [fakenews-backend/main.py](../fakenews-backend/main.py) actualmente:

```python
allow_origins=["*"]
```

Para la **alpha es aceptable**. Antes de la beta, cambia a:

```python
allow_origins=["https://<tu-frontend>.onrender.com"]
```

---

## 3. Resumen visual del flujo

```
TU MÁQUINA                GITHUB                    RENDER
-----------               -------                   -------
git push  ───────────►    Actions
                          ├─ ci.yml (en PR/dev)
                          └─ build-and-publish.yml
                              │
                              ▼
                          GHCR (ghcr.io)
                              │
                          deploy-render.yml ──────► Deploy Hooks
                                                        │
                                                        ▼
                                                    Backend + Frontend
                                                    (pull :latest)
```

---

## 4. Checklist final (marca a medida que avanzas)

- [ ] Verificación local con `docker compose up --build` OK.
- [ ] Repo creado en GitHub y `git push` a `main` ejecutado.
- [ ] 5 secrets de GitHub configurados (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_ANALYSIS_API_BASE_URL`, `RENDER_DEPLOY_HOOK_BACKEND`, `RENDER_DEPLOY_HOOK_FRONTEND`).
- [ ] Servicio `backend` creado en Render con env vars de Supabase y health check `/health`.
- [ ] Servicio `frontend` creado en Render con health check `/`.
- [ ] `VITE_ANALYSIS_API_BASE_URL` rellenado con la URL real del backend.
- [ ] Push final ejecutado y workflows verdes en GitHub Actions.
- [ ] `/health` del backend responde 200 desde Internet.
- [ ] La SPA carga, permite login y ejecuta un análisis end-to-end.
- [ ] URLs alpha actualizadas en [README.md](../README.md).

---

## 5. Troubleshooting rápido

| Síntoma | Causa probable | Solución |
|---|---|---|
| `docker compose up` falla en build del backend con `COPY models/`: not found | Estás corriendo desde un subdirectorio | Ejecuta desde la raíz del repo. |
| Frontend en local muestra "Network Error" al analizar | `VITE_ANALYSIS_API_BASE_URL` apunta a un host no accesible | En local debe ser `http://localhost:8000`. |
| Render: `image pull failed` | Repo privado y Render sin credenciales GHCR | O hazlo público o configura credentials en Render → Account → Registry Credentials. |
| Cold start tarda ~30-45 s | Plan Free de Render duerme tras 15 min de inactividad | Esperado. Migrar a plan Starter para eliminar. |
| Workflow `build-frontend` falla con `secret VITE_* is empty` | Secrets no creados todavía | Crea los secrets en GitHub (Paso 3). |
| El frontend desplegado apunta a `localhost:8000` | Imagen construida sin `VITE_ANALYSIS_API_BASE_URL` correcto | Rellena el secret y haz un nuevo push para regenerar la imagen. |

---

## 6. Referencias internas

- [docs/DEPLOY.md](DEPLOY.md) — guía completa de despliegue.
- [docs/ARCHITECTURE.md](ARCHITECTURE.md) — diagramas de arquitectura.
- [README.md](../README.md) — punto de entrada del repo.
