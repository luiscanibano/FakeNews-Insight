/**
 * @file analysis.js
 * @description Capa de servicios para acceso a API/Supabase, transformacion de datos y manejo uniforme de errores.
 */

const DEFAULT_ANALYSIS_TEXT_PATH = "/predecir/";
const DEFAULT_ANALYSIS_SAVE_PATH = "/analyses/save";
const DEFAULT_ANALYSIS_VERIFY_PATH = "/verify";
const DEFAULT_ANALYSIS_VERIFY_URL_PATH = "/verify/url";
const DEFAULT_ANALYSIS_VERIFY_CSV_PATH = "/verify/csv";
const DEFAULT_VERIFICATION_HISTORY_SAVE_PATH = "/verification-history/save";
const VERIFY_TEXT_MIN_LENGTH = 80;
const VERIFY_TEXT_MAX_LENGTH = 12000;

import { resolveApiBaseUrl } from "../lib/apiBaseUrl";

/** Asegura que una ruta empiece por '/' y aplica ruta por defecto cuando no existe valor. */
const normalizePath = (path) => {
  if (!path) {
    return DEFAULT_ANALYSIS_TEXT_PATH;
  }

  return path.startsWith("/") ? path : `/${path}`;
};

const ANALYSIS_API_BASE_URL = resolveApiBaseUrl(import.meta.env.VITE_ANALYSIS_API_BASE_URL);

const ANALYSIS_TEXT_PATH = normalizePath(
  import.meta.env.VITE_ANALYSIS_TEXT_PATH?.trim() || DEFAULT_ANALYSIS_TEXT_PATH
);

const ANALYSIS_SAVE_PATH = normalizePath(
  import.meta.env.VITE_ANALYSIS_SAVE_PATH?.trim() || DEFAULT_ANALYSIS_SAVE_PATH
);

const ANALYSIS_VERIFY_PATH = normalizePath(
  import.meta.env.VITE_ANALYSIS_VERIFY_PATH?.trim() || DEFAULT_ANALYSIS_VERIFY_PATH
);

const ANALYSIS_VERIFY_URL_PATH = normalizePath(
  import.meta.env.VITE_ANALYSIS_VERIFY_URL_PATH?.trim() || DEFAULT_ANALYSIS_VERIFY_URL_PATH
);

const ANALYSIS_VERIFY_CSV_PATH = normalizePath(
  import.meta.env.VITE_ANALYSIS_VERIFY_CSV_PATH?.trim() || DEFAULT_ANALYSIS_VERIFY_CSV_PATH
);

const VERIFICATION_HISTORY_SAVE_PATH = normalizePath(
  import.meta.env.VITE_HISTORY_SAVE_PATH?.trim() || DEFAULT_VERIFICATION_HISTORY_SAVE_PATH
);

const ANALYSIS_TEXT_ENDPOINT = `${ANALYSIS_API_BASE_URL}${ANALYSIS_TEXT_PATH}`;
const ANALYSIS_SAVE_ENDPOINT = `${ANALYSIS_API_BASE_URL}${ANALYSIS_SAVE_PATH}`;
const ANALYSIS_VERIFY_ENDPOINT = `${ANALYSIS_API_BASE_URL}${ANALYSIS_VERIFY_PATH}`;
const ANALYSIS_VERIFY_URL_ENDPOINT = `${ANALYSIS_API_BASE_URL}${ANALYSIS_VERIFY_URL_PATH}`;
const ANALYSIS_VERIFY_CSV_ENDPOINT = `${ANALYSIS_API_BASE_URL}${ANALYSIS_VERIFY_CSV_PATH}`;
const VERIFICATION_HISTORY_SAVE_ENDPOINT = `${ANALYSIS_API_BASE_URL}${VERIFICATION_HISTORY_SAVE_PATH}`;

const buildVerificationStatusEndpoint = (runId) =>
  `${ANALYSIS_VERIFY_ENDPOINT}/${encodeURIComponent(runId)}`;

const buildVerificationCsvStatusEndpoint = (batchId) =>
  `${ANALYSIS_VERIFY_CSV_ENDPOINT}/${encodeURIComponent(batchId)}`;

const isValidHttpUrl = (value) => {
  try {
    const parsed = new URL(String(value || "").trim());
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
};

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

/** Guarda manualmente en historial una verificacion FEVER o un lote CSV previamente ejecutado. */
export const saveVerificationToHistory = async ({
  runId,
  batchId = null,
  jwtToken,
  report = null,
  inputText = "",
  runType = null,
  sourceUrl = null,
  sourceTitle = null,
  inputOrigin = null,
} = {}) => {
  if (!jwtToken) {
    throw new Error("Tu sesión no es válida. Inicia sesión de nuevo.");
  }

  if (!runId && !batchId && !report) {
    throw new Error("No se encontró la verificación para guardar.");
  }

  const response = await fetch(VERIFICATION_HISTORY_SAVE_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${jwtToken}`,
    },
    body: JSON.stringify({
      run_id: runId || null,
      batch_id: batchId || null,
      input_text: inputText || undefined,
      run_type: runType || undefined,
      source_url: sourceUrl || undefined,
      source_title: sourceTitle || undefined,
      input_origin: inputOrigin || undefined,
      report: report || undefined,
    }),
  });

  if (!response.ok) {
    const message = await getErrorMessage(
      response,
      "No se pudo guardar la verificación en historial."
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

/** Ejecuta la verificación FEVER a partir del contenido extraído de una URL. */
export const verifyUrl = async ({ url, jwtToken }) => {
  if (!jwtToken) {
    throw new Error("Tu sesión no es válida. Inicia sesión de nuevo.");
  }

  const normalizedUrl = String(url || "").trim();
  if (!isValidHttpUrl(normalizedUrl)) {
    throw new Error("Introduce una URL HTTP o HTTPS válida.");
  }

  const response = await fetch(ANALYSIS_VERIFY_URL_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${jwtToken}`,
    },
    body: JSON.stringify({ url: normalizedUrl }),
  });

  if (!response.ok) {
    const fallback =
      response.status === 403
        ? "No quedan verificaciones disponibles para tu plan."
        : "No se pudo verificar la URL en este momento.";
    const message = await getErrorMessage(response, fallback);
    throw new Error(message);
  }

  return response.json();
};

/** Envía un CSV de una sola columna al backend FEVER para procesarlo como lote. */
export const verifyCsv = async ({ file, jwtToken }) => {
  if (!jwtToken) {
    throw new Error("Tu sesión no es válida. Inicia sesión de nuevo.");
  }

  if (!(file instanceof File)) {
    throw new Error("Selecciona un archivo CSV para procesar el lote.");
  }

  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch(ANALYSIS_VERIFY_CSV_ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${jwtToken}`,
    },
    body: formData,
  });

  if (!response.ok) {
    const fallback =
      response.status === 403
        ? "No quedan verificaciones disponibles para tu plan."
        : "No se pudo procesar el CSV en este momento.";
    const message = await getErrorMessage(response, fallback);
    throw new Error(message);
  }

  return response.json();
};

/** Consulta el estado actual de una verificacion asincrona ya enviada al backend. */
export const getVerificationStatus = async ({ runId, jwtToken }) => {
  if (!jwtToken) {
    throw new Error("Tu sesión no es válida. Inicia sesión de nuevo.");
  }

  if (!runId) {
    throw new Error("No se encontró el identificador de la verificación.");
  }

  const response = await fetch(buildVerificationStatusEndpoint(runId), {
    method: "GET",
    headers: {
      Authorization: `Bearer ${jwtToken}`,
    },
  });

  if (!response.ok) {
    const message = await getErrorMessage(
      response,
      "No se pudo consultar el estado de la verificación."
    );
    throw new Error(message);
  }

  return response.json();
};

/** Consulta el estado actual de un lote CSV ya enviado al backend. */
export const getVerificationCsvStatus = async ({ batchId, jwtToken }) => {
  if (!jwtToken) {
    throw new Error("Tu sesión no es válida. Inicia sesión de nuevo.");
  }

  if (!batchId) {
    throw new Error("No se encontró el identificador del lote CSV.");
  }

  const response = await fetch(buildVerificationCsvStatusEndpoint(batchId), {
    method: "GET",
    headers: {
      Authorization: `Bearer ${jwtToken}`,
    },
  });

  if (!response.ok) {
    const message = await getErrorMessage(
      response,
      "No se pudo consultar el estado del lote CSV."
    );
    throw new Error(message);
  }

  return response.json();
};
