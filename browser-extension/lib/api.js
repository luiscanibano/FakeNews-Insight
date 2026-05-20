/**
 * @file api.js
 * @description Cliente del backend FastAPI para verificacion FEVER/NLI.
 * Captura 401 y delega en el flujo de auth para forzar reinicio de sesion.
 */

import { CONFIG } from "./config.js";
import { SessionExpiredError, getValidAccessToken } from "./supabase.js";
import { clearSession } from "./storage.js";

const ANALYSIS_VERIFY_PATH = "/verify";
const VERIFICATION_HISTORY_SAVE_PATH = "/verification-history/save";
const LAST_HISTORY_SAVE_PAYLOAD_KEY = "fakenews-insight-last-history-save-payload";

const shouldRetryOnAlternateBackend = ({ path, status, message }) => {
  if (status >= 500) {
    return true;
  }

  if (path !== VERIFICATION_HISTORY_SAVE_PATH || status !== 400) {
    return false;
  }

  return /run_id|informe de verificaci|input_text|required|verification report/i.test(
    String(message || "")
  );
};

export const serializeVerificationReport = (report) => {
  if (!report || typeof report !== "object") {
    return null;
  }

  const claims = Array.isArray(report.claims)
    ? report.claims.map((claim) => ({
        text: claim?.text || claim?.texto || "",
        label: claim?.label || claim?.veredicto || null,
        confidence:
          claim?.confidence !== undefined && claim?.confidence !== null
            ? claim.confidence
            : claim?.confianza ?? null,
        rationale: claim?.rationale || claim?.razonamiento || "",
        evidences: Array.isArray(claim?.evidences || claim?.evidencias)
          ? (claim.evidences || claim.evidencias).map((evidence) => ({
              title: evidence?.title || evidence?.titulo || "",
              url: evidence?.url || "",
              nli_label: evidence?.nli_label || evidence?.etiqueta_nli || null,
            }))
          : [],
      }))
    : [];

  return {
    run_id: report?.run_id || null,
    overall_label: report?.overall_label || report?.veredicto_global || null,
    summary: report?.summary || report?.resumen || "",
    model_version: report?.model_version || report?.modelo_version || null,
    duration_ms:
      report?.duration_ms !== undefined && report?.duration_ms !== null
        ? report.duration_ms
        : report?.duracion_ms ?? null,
    claims,
  };
};

export const buildVerificationHistorySavePayload = ({
  runId = null,
  report = null,
  inputText = "",
} = {}) => ({
  run_id: runId || null,
  input_text: inputText || undefined,
  report: serializeVerificationReport(report) || undefined,
});

const canUseExtensionStorage = () =>
  typeof globalThis !== "undefined" &&
  globalThis.chrome &&
  chrome.storage &&
  chrome.storage.local;

const loadLastHistorySavePayload = () =>
  new Promise((resolve) => {
    if (!canUseExtensionStorage()) {
      resolve(null);
      return;
    }

    try {
      chrome.storage.local.get([LAST_HISTORY_SAVE_PAYLOAD_KEY], (data) => {
        resolve(data?.[LAST_HISTORY_SAVE_PAYLOAD_KEY] || null);
      });
    } catch {
      resolve(null);
    }
  });

const persistLastHistorySavePayload = (payload) => {
  if (!canUseExtensionStorage() || !payload || typeof payload !== "object") {
    return;
  }

  try {
    chrome.storage.local.set({
      [LAST_HISTORY_SAVE_PAYLOAD_KEY]: {
        run_id: payload.run_id || null,
        input_text: payload.input_text || "",
        report: payload.report && typeof payload.report === "object" ? payload.report : null,
        saved_at: Date.now(),
      },
    });
  } catch {
    /** ignored */
  }
};

const resolveHistorySavePayload = async (payload = {}) => {
  const normalizedPayload = {
    run_id: payload?.run_id || null,
    input_text: payload?.input_text || undefined,
    report:
      payload?.report && typeof payload.report === "object"
        ? payload.report
        : serializeVerificationReport(payload?.report) || undefined,
  };

  if (normalizedPayload.run_id || normalizedPayload.report) {
    return normalizedPayload;
  }

  const cachedPayload = await loadLastHistorySavePayload();
  if (!cachedPayload || typeof cachedPayload !== "object") {
    return normalizedPayload;
  }

  return {
    run_id: normalizedPayload.run_id || cachedPayload.run_id || null,
    input_text: normalizedPayload.input_text || cachedPayload.input_text || undefined,
    report:
      normalizedPayload.report ||
      (cachedPayload.report && typeof cachedPayload.report === "object"
        ? cachedPayload.report
        : undefined),
  };
};

export const saveVerificationHistoryPayload = async (payload = {}) => {
  const resolvedPayload = await resolveHistorySavePayload(payload);
  return authorizedFetch(VERIFICATION_HISTORY_SAVE_PATH, resolvedPayload);
};

const normalizeBaseUrl = (baseUrl) => String(baseUrl || "").trim().replace(/\/+$/, "");

const getApiBaseUrls = () => {
  const configured = [
    CONFIG.ANALYSIS_API_BASE_URL,
    ...(Array.isArray(CONFIG.ANALYSIS_API_FALLBACK_BASE_URLS)
      ? CONFIG.ANALYSIS_API_FALLBACK_BASE_URLS
      : []),
  ];

  return [...new Set(configured.map(normalizeBaseUrl).filter(Boolean))];
};

const buildEndpoint = (baseUrl, path) => `${baseUrl}${path}`;

const buildSaveDebugSuffix = (baseUrl, body) => {
  if (!body || typeof body !== "object") {
    return ` [backend: ${baseUrl}]`;
  }

  const hasRunId = Boolean(String(body.run_id || "").trim());
  const hasReport = Boolean(body.report && typeof body.report === "object");
  const claimsCount = Array.isArray(body.report?.claims) ? body.report.claims.length : 0;
  return ` [backend: ${baseUrl}; run_id: ${hasRunId ? "yes" : "no"}; report: ${hasReport ? `yes/${claimsCount} claims` : "no"}]`;
};

const parseErrorMessage = async (response, fallback) => {
  const rawText = await response.text().catch(() => "");
  const trimmedText = rawText.trim();

  try {
    const payload = trimmedText ? JSON.parse(trimmedText) : null;
    const detail = payload?.detail;
    if (typeof detail === "string" && detail.trim()) {
      return detail;
    }

    const alternatives = [
      payload?.message,
      payload?.error_description,
      payload?.error,
      payload?.msg,
    ];
    const firstAlternative = alternatives.find(
      (value) => typeof value === "string" && value.trim()
    );
    if (firstAlternative) {
      return firstAlternative;
    }
  } catch {
    /** ignored: respuesta sin cuerpo JSON */
  }

  if (trimmedText && !trimmedText.startsWith("<")) {
    return trimmedText.slice(0, 220);
  }

  return `${fallback} (HTTP ${response.status})`;
};

/** Wrapper comun: anade Authorization, maneja 401, devuelve JSON. */
const authorizedFetch = async (path, body) => {
  const accessToken = await getValidAccessToken();
  const apiBaseUrls = getApiBaseUrls();
  let lastError = null;

  for (let index = 0; index < apiBaseUrls.length; index += 1) {
    const endpoint = buildEndpoint(apiBaseUrls[index], path);
    const hasMoreCandidates = index < apiBaseUrls.length - 1;

    let response;
    try {
      response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(body),
      });
    } catch (error) {
      lastError = error;
      if (hasMoreCandidates) {
        continue;
      }
      throw error;
    }

    if (response.status === 401) {
      await clearSession();
      throw new SessionExpiredError();
    }

    if (response.ok) {
      return response.json();
    }

    const message = await parseErrorMessage(
      response,
      "El servidor no pudo procesar la peticion."
    );
    const enrichedMessage =
      path === VERIFICATION_HISTORY_SAVE_PATH
        ? `${message}${buildSaveDebugSuffix(apiBaseUrls[index], body)}`
        : message;

    lastError = new Error(enrichedMessage);

    if (
      hasMoreCandidates &&
      shouldRetryOnAlternateBackend({
        path,
        status: response.status,
        message,
      })
    ) {
      continue;
    }

    throw lastError;
  }

  throw lastError || new Error("No se pudo contactar con el backend de verificacion.");
};

/**
 * Lanza la verificacion de afirmaciones con limites por plan.
 * Devuelve { run_id, overall_label, summary, claims, plan, remaining_today }.
 * Lanza Error con mensaje legible si se agota la cuota del usuario (403).
 */
export const verifyText = async (text) => {
  const report = await authorizedFetch(ANALYSIS_VERIFY_PATH, { texto: text });
  persistLastHistorySavePayload(
    buildVerificationHistorySavePayload({
      runId: report?.run_id || null,
      report,
      inputText: text,
    })
  );
  return report;
};

export const saveVerificationToHistory = ({ runId = null, report = null, inputText = "" }) =>
  saveVerificationHistoryPayload(
    buildVerificationHistorySavePayload({
      runId,
      report,
      inputText,
    })
  );
