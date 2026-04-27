/**
 * @file constants.js
 * @description Constantes transversales compartidas entre App, stores, hooks y paginas.
 */

/** Tiempo de inactividad antes de forzar logout automatico (1 hora). */
export const INACTIVITY_TIMEOUT_MS = 60 * 60 * 1000;

/** Eventos del DOM considerados como actividad del usuario para refrescar la sesion. */
export const ACTIVITY_EVENTS = [
  "mousedown",
  "mousemove",
  "keydown",
  "scroll",
  "touchstart",
];

/** Timeout para peticiones de autenticacion / lectura de token. */
export const AUTH_REQUEST_TIMEOUT_MS = 12000;

/** Timeout para operaciones de cuenta server-side (mas lentas que auth). */
export const ACCOUNT_REQUEST_TIMEOUT_MS = 25000;
