/**
 * @file api.js
 * @description Cliente del backend FastAPI para verificacion FEVER/NLI.
 * Captura 401 y delega en el flujo de auth para forzar reinicio de sesion.
 */

import { CONFIG } from "./config.js";
import { SessionExpiredError, getValidAccessToken } from "./supabase.js";
import { clearSession } from "./storage.js";

const ANALYSIS_VERIFY_PATH = "/verify";

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
 * Lanza la verificacion de afirmaciones con limites por plan.
 * Devuelve { run_id, overall_label, summary, claims, plan, remaining_today }.
 * Lanza Error con mensaje legible si se agota la cuota del usuario (403).
 */
export const verifyText = (text) =>
  authorizedFetch(buildEndpoint(ANALYSIS_VERIFY_PATH), { texto: text });
