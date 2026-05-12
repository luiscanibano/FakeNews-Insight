/**
 * @file analysis.js
 * @description Capa de servicios para acceso a API/Supabase, transformacion de datos y manejo uniforme de errores.
 */

const DEFAULT_ANALYSIS_API_BASE_URL = "http://127.0.0.1:8000";
const DEFAULT_ANALYSIS_TEXT_PATH = "/predecir/";
const DEFAULT_ANALYSIS_SAVE_PATH = "/analyses/save";
const DEFAULT_ANALYSIS_VERIFY_PATH = "/verify";
const VERIFY_TEXT_MIN_LENGTH = 80;
const VERIFY_TEXT_MAX_LENGTH = 12000;

/** Normaliza la URL base eliminando barras finales para evitar dobles separadores. */
const normalizeBaseUrl = (baseUrl) => baseUrl.replace(/\/+$/, "");

/** Asegura que una ruta empiece por '/' y aplica ruta por defecto cuando no existe valor. */
const normalizePath = (path) => {
  if (!path) {
    return DEFAULT_ANALYSIS_TEXT_PATH;
  }

  return path.startsWith("/") ? path : `/${path}`;
};

const ANALYSIS_API_BASE_URL = normalizeBaseUrl(
  import.meta.env.VITE_ANALYSIS_API_BASE_URL?.trim() || DEFAULT_ANALYSIS_API_BASE_URL
);

const ANALYSIS_TEXT_PATH = normalizePath(
  import.meta.env.VITE_ANALYSIS_TEXT_PATH?.trim() || DEFAULT_ANALYSIS_TEXT_PATH
);

const ANALYSIS_SAVE_PATH = normalizePath(
  import.meta.env.VITE_ANALYSIS_SAVE_PATH?.trim() || DEFAULT_ANALYSIS_SAVE_PATH
);

const ANALYSIS_VERIFY_PATH = normalizePath(
  import.meta.env.VITE_ANALYSIS_VERIFY_PATH?.trim() || DEFAULT_ANALYSIS_VERIFY_PATH
);

const ANALYSIS_TEXT_ENDPOINT = `${ANALYSIS_API_BASE_URL}${ANALYSIS_TEXT_PATH}`;
const ANALYSIS_SAVE_ENDPOINT = `${ANALYSIS_API_BASE_URL}${ANALYSIS_SAVE_PATH}`;
const ANALYSIS_VERIFY_ENDPOINT = `${ANALYSIS_API_BASE_URL}${ANALYSIS_VERIFY_PATH}`;

/** Extrae un mensaje de error legible desde la respuesta HTTP o usa un fallback semántico. */
const getErrorMessage = async (response, fallbackMessage) => {
  try {
    const payload = await response.json();
    const detail = payload?.detail;

    if (typeof detail === "string" && detail.trim()) {
      return detail;
    }
  } catch {
    /** Ignore JSON parsing errors and fallback to generic message.
 */
  }

  return fallbackMessage;
};

/**
 * Ejecuta el análisis de texto en backend con autenticación JWT.
 * Devuelve el veredicto del modelo, metadatos de señal del clasificador y el identificador de ejecucion.
 */
export const analyzeTextNews = async ({ text, jwtToken }) => {
  const payload = {
    texto: text,
  };

  if (!jwtToken) {
    throw new Error("Tu sesión no es válida. Inicia sesión de nuevo.");
  }

  const response = await fetch(ANALYSIS_TEXT_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${jwtToken}`,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const message = await getErrorMessage(
      response,
      "No se pudo analizar el texto en este momento."
    );
    throw new Error(message);
  }

  return response.json();
};

/**
 * Persiste manualmente en historial un análisis previamente ejecutado (run_id).
 * Esta acción es explicita para separar consumo de cuota de almacenamiento histórico.
 */
export const saveAnalysisToHistory = async ({ runId, jwtToken }) => {
  if (!jwtToken) {
    throw new Error("Tu sesión no es válida. Inicia sesión de nuevo.");
  }

  if (!runId) {
    throw new Error("No se encontró el identificador del análisis para guardar.");
  }

  const response = await fetch(ANALYSIS_SAVE_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${jwtToken}`,
    },
    body: JSON.stringify({ run_id: runId }),
  });

  if (!response.ok) {
    const message = await getErrorMessage(
      response,
      "No se pudo guardar el análisis en historial."
    );
    throw new Error(message);
  }

  return response.json();
};

/**
 * Ejecuta la verificacion de afirmaciones con limites por plan.
 * Devuelve el veredicto global, claims con evidencias, citas y cupo restante.
 */
export const verifyClaims = async ({ text, jwtToken }) => {
  if (!jwtToken) {
    throw new Error("Tu sesión no es válida. Inicia sesión de nuevo.");
  }

  const trimmedText = text?.trim() || "";
  if (trimmedText.length < VERIFY_TEXT_MIN_LENGTH) {
    throw new Error("El texto a verificar es demasiado corto.");
  }

  if (trimmedText.length > VERIFY_TEXT_MAX_LENGTH) {
    throw new Error(`El texto no puede superar ${VERIFY_TEXT_MAX_LENGTH.toLocaleString("es-ES")} caracteres.`);
  }

  const response = await fetch(ANALYSIS_VERIFY_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${jwtToken}`,
    },
    body: JSON.stringify({ texto: trimmedText }),
  });

  if (!response.ok) {
    const fallback =
      response.status === 403
        ? "No quedan verificaciones disponibles para tu plan."
        : "No se pudo verificar el texto en este momento.";
    const message = await getErrorMessage(response, fallback);
    throw new Error(message);
  }

  return response.json();
};
