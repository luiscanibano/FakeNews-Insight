# Arquitectura — Alpha

## Visión general

```mermaid
flowchart LR
    subgraph Dev[Desarrollo local]
        DEV[Developer]
        GIT[Git push to main]
    end

    subgraph GH[GitHub]
        REPO[(Repo)]
        ACT[GitHub Actions]
        GHCR[(GHCR<br/>ghcr.io)]
    end

    subgraph Render[Render Web Services - Frankfurt]
        BE[Backend<br/>FastAPI + SVM]
        FE[Frontend<br/>Nginx + React build]
    end

    subgraph Ext[Servicios externos]
        SB[(Supabase<br/>Auth + DB)]
    end

    USER[Usuario navegador]

    DEV --> GIT --> REPO
    REPO -->|push main| ACT
    ACT -->|docker build &amp; push| GHCR
    ACT -->|deploy hook| Render
    Render -->|pull :latest| GHCR

    USER -->|HTTPS| FE
    FE -->|XHR /predecir/| BE
    BE -->|REST| SB
    FE -->|Auth| SB
```

## Componentes

| Componente | Tecnología                  | Imagen Docker base       | Observaciones |
|------------|-----------------------------|--------------------------|---------------|
| Backend    | FastAPI + scikit-learn SVM  | `python:3.11-slim`       | Carga modelos `.pkl` y NLTK al arranque (~25 s cold start). Multi-stage build. |
| Frontend   | React 19 + Vite + Tailwind  | `nginx:1.27-alpine`      | Variables `VITE_*` inlineadas en build-time. SPA fallback en Nginx. |
| Auth/DB    | Supabase (gestionado)       | n/a                      | Auth de usuarios + tabla `analyses`. |
| Modelos ML | SVM + TF-IDF (joblib)       | n/a                      | Empaquetados en la imagen del backend (~220 KB total). |

## Flujo de un análisis

```mermaid
sequenceDiagram
    participant U as Usuario
    participant FE as Frontend (Nginx)
    participant BE as Backend (FastAPI)
    participant SB as Supabase

    U->>FE: Carga la SPA
    U->>FE: Login (form)
    FE->>SB: signInWithPassword()
    SB-->>FE: JWT
    U->>FE: Pega texto y pulsa "Analizar"
    FE->>BE: POST /predecir/ {texto}
    BE->>BE: Preprocesa (NLTK) + vectoriza (TF-IDF) + predice (SVM)
    BE-->>FE: {prediccion, confianza}
    FE->>BE: POST /analyses/save (Authorization: Bearer JWT)
    BE->>SB: REST insert (service_role)
    SB-->>BE: OK
    BE-->>FE: OK
    FE-->>U: Muestra resultado
```

## Decisiones de diseño relevantes

- **Modelos en la imagen**, no en almacenamiento externo: son < 1 MB y
  versionarlos junto al código simplifica reproducibilidad.
- **`VITE_*` build-time**: cualquier cambio de URL del backend obliga a
  regenerar la imagen del frontend (no es configurable en runtime).
- **Render plan Free**: cold start ~30 s tras 15 min inactivos. Aceptable
  para alpha; en producción migrar a plan Starter.
- **CORS `allow_origins=["*"]`**: aceptable en alpha, **endurecer** antes
  de la beta para apuntar al dominio del frontend.
- **GHCR como registro**: integración nativa con Actions, sin coste para
  repos públicos.
