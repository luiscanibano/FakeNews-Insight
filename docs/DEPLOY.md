# Guía de despliegue — Alpha (Render + GHCR)

Este documento describe paso a paso cómo desplegar la versión alpha de
la plataforma de detección de fake news en [Render](https://render.com)
usando imágenes Docker publicadas en GitHub Container Registry (GHCR)
y CI/CD con GitHub Actions.

---

## 1. Arquitectura del despliegue

- **GitHub Actions** construye dos imágenes Docker (backend + frontend)
  en cada push a `main` y las publica en GHCR.
- **Render** usa "Deploy from container registry" apuntando a `ghcr.io`
  con la etiqueta `:latest`.
- Tras la publicación, un workflow adicional invoca los **Deploy Hooks**
  de Render para forzar la actualización.

Ver diagrama en [docs/ARCHITECTURE.md](ARCHITECTURE.md).

---

## 2. Requisitos previos (lo hace el usuario una sola vez)

1. **Repositorio en GitHub** con el código en la rama `main`.
2. **Cuenta de Supabase** con el proyecto creado y migraciones aplicadas
   (`SUPABASE_URL`, `ANON_KEY`, `SERVICE_ROLE_KEY` listos).
3. **Cuenta gratuita de Render** (puede iniciar sesión con GitHub).
4. **Acceso de lectura a GHCR** desde Render. Si el repo es público,
   las imágenes son públicas y no hace falta nada. Si es privado, crea
   un Personal Access Token (PAT) con scope `read:packages`.

---

## 3. Configurar GitHub Secrets

En `Settings → Secrets and variables → Actions → New repository secret`
crea los siguientes secrets:

| Secret                          | Descripción                                                    |
|---------------------------------|----------------------------------------------------------------|
| `VITE_SUPABASE_URL`             | URL del proyecto Supabase (build-time del frontend).           |
| `VITE_SUPABASE_ANON_KEY`        | Anon key de Supabase (build-time del frontend).                |
| `VITE_ANALYSIS_API_BASE_URL`    | URL pública del backend en Render (ej. `https://fakenews-backend.onrender.com`). |
| `RENDER_DEPLOY_HOOK_BACKEND`    | Deploy Hook URL del servicio backend en Render.                |
| `RENDER_DEPLOY_HOOK_FRONTEND`   | Deploy Hook URL del servicio frontend en Render.               |

> El token `GITHUB_TOKEN` lo provee Actions automáticamente; no hay que
> crearlo.

---

## 4. Crear los servicios en Render

### 4.1 Backend (Web Service)

1. `New + → Web Service → Existing image from a registry`.
2. Image URL: `ghcr.io/<usuario>/<repo>-backend:latest`.
3. Region: **Frankfurt (EU Central)**.
4. Plan: **Free**.
5. Variables de entorno (Environment):
   - `SUPABASE_URL`
   - `SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `PORT` lo gestiona Render automáticamente.
6. Health Check Path: `/health`.
7. Tras crearlo, copia la URL pública (ej. `https://fakenews-backend.onrender.com`).

### 4.2 Frontend (Web Service)

1. `New + → Web Service → Existing image from a registry`.
2. Image URL: `ghcr.io/<usuario>/<repo>-frontend:latest`.
3. Region: **Frankfurt (EU Central)**.
4. Plan: **Free**.
5. Health Check Path: `/`.
6. **Importante**: las variables `VITE_*` ya están inlineadas en el
   bundle durante el build. Si cambia la URL del backend hay que
   regenerar la imagen (push a main).

### 4.3 Deploy Hooks

En cada servicio: `Settings → Deploy Hook → Copy URL` y guárdala como
secret en GitHub (ver sección 3).

---

## 5. Primer despliegue

```bash
git add .
git commit -m "feat: alpha deployment infra"
git push origin main
```

Esto dispara:

1. `build-and-publish.yml` → publica `:latest` y `:sha-xxxxxxx` en GHCR.
2. `deploy-render.yml` → llama a los Deploy Hooks.
3. Render baja la nueva imagen y reinicia los servicios.

> En el plan Free, el primer arranque del backend tarda ~30-45 s por la
> carga de NLTK + joblib. Posteriores cold starts después de 15 min de
> inactividad volverán a tardar lo mismo.

---

## 6. Verificación post-deploy

```bash
curl https://fakenews-backend.onrender.com/health
# -> {"status":"ok"}

curl -I https://fakenews-frontend.onrender.com/
# -> HTTP/2 200
```

Abre la URL del frontend en el navegador, registra un usuario,
ejecuta un análisis y comprueba que se guarda en Supabase.

---

## 7. Rollback

Render guarda las últimas imágenes desplegadas. En `Deploys` puedes
hacer **Rollback** a una versión anterior con un clic. Alternativamente,
relanza la imagen `ghcr.io/.../<repo>-backend:sha-xxxxxxx` cambiando el
tag en Settings.

---

## 8. Desarrollo local con Docker

```bash
cp .env.example .env   # rellenar valores
docker compose up --build
```

- Frontend: <http://localhost:5173>
- Backend:  <http://localhost:8000/health>
