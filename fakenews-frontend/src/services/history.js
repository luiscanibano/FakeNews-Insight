/**
 * @file history.js
 * @description Capa de servicios para acceso a API/Supabase, transformacion de datos y manejo uniforme de errores.
 */

import { resolveApiBaseUrl } from "../lib/apiBaseUrl";
import { getSupabaseClient } from "./supabase";

const DEFAULT_HISTORY_DELETE_PATH = "/verification-history";
const HISTORY_API_BASE_URL = resolveApiBaseUrl(import.meta.env.VITE_ANALYSIS_API_BASE_URL);

/** Asegura que las rutas de API empiecen por '/'. */
const normalizePath = (path) => {
  if (!path) {
    return DEFAULT_HISTORY_DELETE_PATH;
  }

  return path.startsWith("/") ? path : `/${path}`;
};

const HISTORY_DELETE_PATH = normalizePath(
  import.meta.env.VITE_HISTORY_DELETE_PATH?.trim() || DEFAULT_HISTORY_DELETE_PATH
);
const HISTORY_DELETE_ENDPOINT = `${HISTORY_API_BASE_URL}${HISTORY_DELETE_PATH}`;

/** Convierte confidence a número finito para operar en UI sin NaN. */
const toNumericOrNull = (value) => {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
};

/** Homologa etiquetas de veredicto del backend a estados visuales estables. */
const normalizeVerdictLabel = (rawVerdict) => {
  const normalized = String(rawVerdict || "").trim().toUpperCase();

  if (["SUPPORTED", "REFUTED", "NOT_ENOUGH_INFO", "CONFLICTING"].includes(normalized)) {
    return normalized;
  }

  if (normalized === "REAL" || normalized === "FIABLE") {
    return "FIABLE";
  }

  if (normalized === "FAKE" || normalized === "FALSA") {
    return "FALSA";
  }

  return "DUDOSA";
};

/** Formatea la fecha de cada fila en formato corto legible para historial. */
const formatTimestampLabel = (dateValue) => {
  const parsed = new Date(dateValue);

  if (Number.isNaN(parsed.getTime())) {
    return "Sin fecha";
  }

  return new Intl.DateTimeFormat("es-ES", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(parsed);
};

/** Ordena listas anidadas por su campo position cuando existe. */
const sortByPosition = (items) =>
  [...(items || [])].sort((left, right) => {
    const leftPos = Number.isFinite(Number(left?.position)) ? Number(left.position) : Number.MAX_SAFE_INTEGER;
    const rightPos = Number.isFinite(Number(right?.position)) ? Number(right.position) : Number.MAX_SAFE_INTEGER;
    return leftPos - rightPos;
  });

/** Adapta una verificación FEVER persistida al contrato visual de VerificationReport. */
const toVerificationReport = (row) => ({
  run_id: row?.id || null,
  veredicto_global: normalizeVerdictLabel(row?.overall_label),
  resumen: row?.summary || "",
  model_version: row?.model_version || "fever-stub-v0",
  duracion_ms: toNumericOrNull(row?.duration_ms),
  claims: sortByPosition(row?.verification_claims).map((claim) => ({
    id: claim?.id || null,
    texto: claim?.claim_text || "",
    veredicto: normalizeVerdictLabel(claim?.label),
    confianza: toNumericOrNull(claim?.confidence),
    razonamiento: claim?.rationale || "",
    evidencias: sortByPosition(claim?.verification_evidences).map((evidence) => ({
      url: evidence?.url || "",
      titulo: evidence?.title || evidence?.url || "",
      snippet: evidence?.snippet || "",
      nli_label: evidence?.nli_label || "NOT ENOUGH INFO",
      nli_score: toNumericOrNull(evidence?.nli_score),
    })),
  })),
});

/** Adapta una fila de verification_runs al contrato consumido por DashboardHistory. */
const toHistoryItem = (row) => {
  const inputText = String(row?.input_text || "").trim();
  const report = toVerificationReport(row);

  return {
    id: row?.id,
    runId: row?.id || null,
    title: inputText ? `${inputText.slice(0, 72)}${inputText.length > 72 ? "..." : ""}` : "Verificación guardada",
    excerpt: inputText ? inputText.slice(0, 220) : "Sin fragmento disponible.",
    source: null,
    verdictLabel: report.veredicto_global,
    confidence: null,
    modelVersion: row?.model_version || "fever-stub-v0",
    timestampLabel: formatTimestampLabel(row?.created_at),
    claimsCount: report.claims.length,
    summary: row?.summary || "",
    report,
  };
};

/** Recupera verificaciones FEVER persistidas por usuario ordenadas por fecha descendente. */
export const getSavedHistory = async ({ userId, limit = null }) => {
  if (!userId) {
    throw new Error("User id is required to load history");
  }

  const supabase = getSupabaseClient();
  let query = supabase
    .from("verification_runs")
    .select(`
      id,
      user_id,
      input_text,
      overall_label,
      summary,
      model_version,
      duration_ms,
      saved_to_history,
      created_at,
      verification_claims (
        id,
        claim_text,
        label,
        confidence,
        rationale,
        position,
        verification_evidences (
          id,
          url,
          title,
          snippet,
          nli_label,
          nli_score,
          position
        )
      )
    `)
    .eq("user_id", userId)
    .eq("saved_to_history", true)
    .order("created_at", { ascending: false });

  if (Number.isFinite(limit) && limit > 0) {
    query = query.limit(limit);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(error.message || "No se pudo cargar el historial guardado.");
  }

  return (data || []).map(toHistoryItem);
};

/** Elimina una verificación concreta del historial del usuario autenticado. */
export const deleteSavedHistoryItem = async ({ runId, jwtToken }) => {
  if (!jwtToken) {
    throw new Error("Tu sesión no es válida. Inicia sesión de nuevo.");
  }

  if (!runId) {
    throw new Error("No se encontró el identificador del historial a eliminar.");
  }

  const response = await fetch(`${HISTORY_DELETE_ENDPOINT}/${runId}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${jwtToken}`,
    },
  });

  if (!response.ok) {
    let message = "No se pudo eliminar la verificación del historial.";

    try {
      const payload = await response.json();
      if (typeof payload?.detail === "string" && payload.detail.trim()) {
        message = payload.detail;
      }
    } catch {
      /** Fallback al mensaje por defecto. */
    }

    throw new Error(message);
  }

  return response.json();
};
