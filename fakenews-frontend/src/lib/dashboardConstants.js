/**
 * @file dashboardConstants.js
 * @description Constantes compartidas para modos de analisis y rutas internas del dashboard.
 */

/** Modos de analisis disponibles en el panel principal. */
export const ANALYSIS_MODE = {
  TEXT: "text",
  URL: "url",
  CSV: "csv",
};

/** Identificadores logicos de cada vista (uso historico, analytics). */
export const DASHBOARD_VIEW = {
  HOME: "home",
  ANALYZE: "analyze",
  HISTORY: "history",
  EXTENSION: "extension",
  API_KEYS: "apiKeys",
};

/**
 * Catalogo de items de navegacion del dashboard.
 * `path` es relativo al prefijo "/dashboard". El item HOME usa "" para coincidir con la ruta indice.
 */
export const DASHBOARD_NAV_ITEMS = [
  { id: DASHBOARD_VIEW.HOME, label: "Inicio", path: "" },
  { id: DASHBOARD_VIEW.ANALYZE, label: "Analizar", path: "analyze" },
  { id: DASHBOARD_VIEW.HISTORY, label: "Mi historial", path: "history" },
  { id: DASHBOARD_VIEW.EXTENSION, label: "Extension navegador", path: "extension" },
  { id: DASHBOARD_VIEW.API_KEYS, label: "Developers", path: "api-keys" },
];
