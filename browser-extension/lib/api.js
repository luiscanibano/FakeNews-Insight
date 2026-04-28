/**
 * @file api.js
 * @description Cliente del backend FastAPI (anÃ¡lisis y guardado en historial).
 * Captura 401 y delega en el flujo de auth para forzar reinicio de sesiÃ³n.
 */

import { CONFIG } from "./config.js";
import { SessionExpiredError, getValidAccessToken } from "./supabase.js";
import { clearSession } from "./storage.js";

const ANALYSIS_TEXT_PATH = "/predecir/";
const ANALYSIS_SAVE_PATH = "/analyses/save";

const buildEndpoint = (path) => `${CONFIG.ANALYSIS_API_BASE_URL}${path}`;

const parseErrorMessage = async (response, fallback) => {
  try {
    const payload = await response.json();
    const detail = payload?.detail;
    if (typeof detail === "string" && detail.trim()) {
      return detail;
    }
  } catch {
    /** ignored: respuesta sin cuerpo JSON */
  }
  return fallback;
};

/** Wrapper comun: anade Authorization, maneja 401, devuelve JSON. */
const authorizedFetch = async (endpoint, body) => {
  const accessToken = await getValidAccessToken();

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(body),
  });

  if (response.status === 401) {
    await clearSession();
    throw new SessionExpiredError();
  }

  if (!response.ok) {
    const message = await parseErrorMessage(
      response,
      "El servidor no pudo procesar la peticion."
    );
    throw new Error(message);
  }

  return response.json();
};

/**
 * Envia el texto al endpoint /predecir/. Devuelve el payload completo de backend
 * (veredicto, certeza_svm, plan_usuario, analisis_restantes_hoy, analysis_run_id).
 */
export const analyzeText = (text) =>
  authorizedFetch(buildEndpoint(ANALYSIS_TEXT_PATH), { texto: text });

/** Guarda el run_id devuelto por /predecir/ en el historial del usuario. */
export const saveAnalysis = (runId) =>
  authorizedFetch(buildEndpoint(ANALYSIS_SAVE_PATH), { run_id: runId });
