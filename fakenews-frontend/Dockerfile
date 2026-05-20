# =====================================================================
# Frontend Dockerfile (Vite build -> Nginx static serve)
# Build context esperado: ./fakenews-frontend
# Variables Vite (VITE_*) deben pasarse como --build-arg porque se
# inlinean en tiempo de build.
# =====================================================================

# ----- Stage 1: build -----
FROM node:20-alpine AS builder

WORKDIR /app

# Build args -> ENV para que Vite los lea durante "npm run build"
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_ANON_KEY
ARG VITE_AUTH_SITE_URL
ARG VITE_ANALYSIS_API_BASE_URL
ARG VITE_ANALYSIS_TEXT_PATH=/predecir/
ARG VITE_ANALYSIS_VERIFY_PATH=/verify
ARG VITE_ANALYSIS_SAVE_PATH=/analyses/save
ARG VITE_ACCOUNT_DELETE_PATH=/account/delete
ARG VITE_BILLING_CHECKOUT_PATH=/billing/checkout
ARG VITE_BILLING_CONFIRM_PATH=/billing/confirm

ENV VITE_SUPABASE_URL=$VITE_SUPABASE_URL \
    VITE_SUPABASE_ANON_KEY=$VITE_SUPABASE_ANON_KEY \
    VITE_AUTH_SITE_URL=$VITE_AUTH_SITE_URL \
    VITE_ANALYSIS_API_BASE_URL=$VITE_ANALYSIS_API_BASE_URL \
    VITE_ANALYSIS_TEXT_PATH=$VITE_ANALYSIS_TEXT_PATH \
    VITE_ANALYSIS_VERIFY_PATH=$VITE_ANALYSIS_VERIFY_PATH \
    VITE_ANALYSIS_SAVE_PATH=$VITE_ANALYSIS_SAVE_PATH \
    VITE_ACCOUNT_DELETE_PATH=$VITE_ACCOUNT_DELETE_PATH \
    VITE_BILLING_CHECKOUT_PATH=$VITE_BILLING_CHECKOUT_PATH \
    VITE_BILLING_CONFIRM_PATH=$VITE_BILLING_CONFIRM_PATH

# Instalación reproducible
COPY package.json package-lock.json* ./
RUN npm ci

COPY . .
RUN npm run build

# ----- Stage 2: runtime nginx -----
FROM nginx:1.27-alpine AS runtime

# Copiar configuración SPA-friendly
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copiar artefacto de build
COPY --from=builder /app/dist /usr/share/nginx/html

# Nginx escucha en $PORT (Render lo inyecta) sustituyendo en arranque
ENV PORT=8080
EXPOSE 8080

# Healthcheck
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD wget -qO- "http://127.0.0.1:${PORT}/" >/dev/null 2>&1 || exit 1

# Sustituye $PORT en la config y arranca nginx en foreground
CMD ["sh", "-c", "sed -i \"s/listen 8080;/listen ${PORT};/\" /etc/nginx/conf.d/default.conf && nginx -g 'daemon off;'"]
