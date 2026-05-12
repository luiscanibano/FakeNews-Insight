# TFG Informática — FakeNews Insight (memoria)

Memoria del Trabajo Fin de Grado en Ingeniería Informática
correspondiente a la **plataforma SaaS FakeNews Insight**: arquitectura,
ingeniería de software, despliegue y operación.

## Estructura

```
tfg-informatica/
├── README.md
├── memoria/
│   ├── main.tex
│   ├── preamble.tex
│   ├── chapters/
│   │   ├── 00-cubierta.tex
│   │   ├── 00b-portada.tex
│   │   ├── 00c-acreditativo.tex
│   │   ├── 01-introduccion.tex
│   │   ├── 02-estado-arte.tex
│   │   ├── 03-analisis-requisitos.tex
│   │   ├── 04-arquitectura.tex
│   │   ├── 05-backend.tex
│   │   ├── 06-frontend.tex
│   │   ├── 07-extension-navegador.tex
│   │   ├── 08-agente-verificacion.tex
│   │   ├── 09-billing-y-planes.tex
│   │   ├── 10-seguridad-y-rls.tex
│   │   ├── 11-pruebas.tex
│   │   ├── 12-despliegue.tex
│   │   ├── 13-resultados.tex
│   │   └── 14-conclusiones.tex
│   └── bib/refs.bib
└── anexos/
    └── main.tex
```

## Compilación

```bash
cd memoria
latexmk -pdf main.tex

cd ../anexos
latexmk -pdf main.tex
```

## Componentes de la plataforma documentados

- **Backend FastAPI** (`fakenews-backend/`): inferencia clásica + agente
  de verificación FEVER, billing Stripe, integración Supabase.
- **Frontend React + Vite + Tailwind** (`fakenews-frontend/`): SPA con
  arquitectura MVC adaptada (UI / Zustand / Services), i18n, tests
  Vitest.
- **Browser extension MV3** (`browser-extension/`): autenticación
  Supabase, JWT Bearer, vista de análisis y verificación.
- **Modelo de datos Supabase**: PostgreSQL con Row Level Security,
  migraciones SQL versionadas.
- **Despliegue Docker Compose**.

## Relación con el TFG de Estadística

La componente puramente estadística (modelización predictiva, FEVER,
DeBERTa, calibración, contrastes) se entrega en `tfg-estadistica/` como
trabajo independiente del Grado en Estadística.
