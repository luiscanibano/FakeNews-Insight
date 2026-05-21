/**
 * @file constants.js
 * @description Constantes transversales compartidas entre App, stores, hooks y páginas.
 */

/** Tiempo de inactividad antes de forzar logout automático (1 hora). */
export const INACTIVITY_TIMEOUT_MS = 60 * 60 * 1000;

/** Eventos del DOM considerados como actividad del usuario para refrescar la sesión. */
export const ACTIVITY_EVENTS = [
  "mousedown",
  "mousemove",
  "keydown",
  "scroll",
  "touchstart",
];

/** Timeout para peticiones de autenticación / lectura de token. */
export const AUTH_REQUEST_TIMEOUT_MS = 12000;

/** Timeout para operaciones de cuenta server-side (más lentas que auth). */
export const ACCOUNT_REQUEST_TIMEOUT_MS = 25000;

/** Repositorio público usado para las descargas y releases visibles en la UI. */
export const GITHUB_RELEASES_URL = "https://github.com/luiscanibano/FakeNews-Insight/releases";
