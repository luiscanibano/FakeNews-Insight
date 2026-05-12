# FakeNews Insight — Extensión de navegador (MVP)

Extensión Manifest V3 (Chrome / Edge) que permite revisar textos y verificar
afirmaciones con evidencias FEVER sin abrir el dashboard.

## Funcionalidades v0.1.0

- Login con email / contraseña (la misma cuenta que en la web).
- Pegar texto manualmente o **usar la selección actual** de la pestaña.
- Llamada al backend (`/verify`) para extraer claims, buscar evidencias y
  mostrar veredicto global con cuota diaria.
- Botón **Verificar afirmaciones**: extrae claims, busca evidencias
  web y devuelve veredicto por afirmación con citas según los límites del plan.
- Entrada acotada: mínimo 80 caracteres en popup/selección y máximo 12.000
  caracteres en cliente; el backend aplica además el máximo real por plan.
- Sesión persistente en `chrome.storage.local` con refresco automático del JWT.

## Estructura

```
browser-extension/
├── manifest.json
├── icons/                 # icon16.png, icon48.png, icon128.png (placeholders)
├── lib/
│   ├── api.js             # Cliente del backend FastAPI
│   ├── config.js          # ⚠️ EDITA AQUÍ tus credenciales
│   ├── storage.js         # Wrapper de chrome.storage.local
│   └── supabase.js        # Login / refresh / signOut vía REST
└── popup/
    ├── popup.html
    ├── popup.css
    └── popup.js           # Router de vistas + handlers FEVER/NLI
```

## Configuración

Antes de cargar la extensión, edita
[`lib/config.js`](lib/config.js) con tus valores reales:

```js
SUPABASE_URL: "https://<tu-proyecto>.supabase.co",
SUPABASE_ANON_KEY: "eyJhbGciOi...",       // mismo VITE_SUPABASE_ANON_KEY que el frontend
ANALYSIS_API_BASE_URL: "https://tfg-informatica-luis-canibano-backend.onrender.com",
WEB_REGISTER_URL: "https://<tu-proyecto>.pages.dev/register",
```

> El `anon key` de Supabase es público por diseño; la seguridad real reside en
> las políticas **RLS** de tu base de datos. No lo confundas con el
> `service_role` (ese sí es secreto y **nunca** debe ir en la extensión).

## Cargar en local (Chrome / Edge)

1. Edita `lib/config.js` (ver arriba).
2. Ve a `chrome://extensions` (o `edge://extensions`).
3. Activa el **Modo desarrollador** (esquina superior derecha).
4. Pulsa **Cargar descomprimida** y selecciona la carpeta `browser-extension/`.
5. Fija la extensión en la barra de herramientas para acceder rápido al popup.

## Iconos

La carpeta `icons/` contiene PNGs placeholder de 16, 48 y 128 px. Sustitúyelos
por el branding final antes de publicar.

## Backend — CORS

El backend FastAPI debe permitir orígenes `chrome-extension://<id>` para que las
peticiones desde el popup funcionen. Esta versión del repo ya incluye el regex
correspondiente en `fakenews-backend/main.py` (`CORSMiddleware`).

## Distribución

Para usuarios finales se distribuye un ZIP de esta carpeta vía GitHub Releases.
La instalación sigue siendo manual (no está publicada en Chrome Web Store).
