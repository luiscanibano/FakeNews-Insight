/**
 * @file config.js
 * @description ConfiguraciÃ³n por defecto de la extension. Edita este fichero
 * antes de cargar la extension en local con tus propias credenciales de
 * Supabase y la URL del backend.
 *
 * IMPORTANTE: el `SUPABASE_ANON_KEY` queda embebido en la extension. No es
 * un secreto: Supabase lo considera pÃºblico. Las restricciones de acceso
 * deben hacerse mediante Row Level Security (RLS) en las tablas.
 */

export const CONFIG = {
  /** URL base del proyecto Supabase (sin barra final). */
  SUPABASE_URL: "https://trmeogbtkvafjbhaivcy.supabase.co",

  /** Anon key pÃºblica de Supabase. Mismo valor que `VITE_SUPABASE_ANON_KEY`. */
  SUPABASE_ANON_KEY: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRybWVvZ2J0a3ZhZmpiaGFpdmN5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIwMTQ4MzQsImV4cCI6MjA4NzU5MDgzNH0.0ZlCkU7LZZ8TmSc1jq0dumOv9fs64roOnggkYKZUNY0",

  /** URL base del backend FastAPI (sin barra final). */
  ANALYSIS_API_BASE_URL:
    "https://api.fakenewsinsight.com",

  /**
   * Solo activa backends alternativos en entornos de desarrollo controlados.
   * En builds para usuarios finales debe permanecer en false para no mezclar
   * errores de produccion con servidores locales o desactualizados.
   */
  ANALYSIS_API_ENABLE_FALLBACKS: false,

  /** Backends alternativos para desarrollo local si el endpoint principal falla. */
  ANALYSIS_API_FALLBACK_BASE_URLS: [
    "http://127.0.0.1:8000",
    "http://localhost:8000",
  ],

  /** URL del registro web (se abre en pestana nueva desde la vista de login). */
  WEB_REGISTER_URL:
    "https://fakenews-insight.pages.dev/register",
};
