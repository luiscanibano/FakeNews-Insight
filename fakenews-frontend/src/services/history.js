/**
 * @file history.js
 * @description Capa de servicios para acceso a API/Supabase, transformacion de datos y manejo uniforme de errores.
 */

import { getSupabaseClient } from "./supabase";

/** Convierte confidence a numero finito para operar en UI sin NaN. */
const toNumericOrNull = (value) => {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
};

/** Homologa etiquetas de veredicto del backend a estados visuales estables. */
const normalizeVerdictLabel = (rawVerdict) => {
  const normalized = String(rawVerdict || "").trim().toUpperCase();

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

/** Adapta una fila de analyses al contrato consumido por DashboardHistory. */
const toHistoryItem = (row) => {
  const inputText = String(row?.input_text || "").trim();

  return {
    id: row?.id,
    runId: row?.run_id || null,
    title: inputText ? `${inputText.slice(0, 72)}${inputText.length > 72 ? "..." : ""}` : "Analisis guardado",
    excerpt: inputText ? inputText.slice(0, 220) : "Sin fragmento disponible.",
    source: row?.source_url || "Texto pegado manualmente",
    verdictLabel: normalizeVerdictLabel(row?.label),
    confidence: toNumericOrNull(row?.confidence),
    modelVersion: row?.model_version || "svm-tfidf-v1",
    timestampLabel: formatTimestampLabel(row?.created_at),
  };
};

/** Recupera analisis guardados manualmente por usuario ordenados por fecha descendente. */
export const getSavedHistory = async ({ userId, limit = null }) => {
  if (!userId) {
    throw new Error("User id is required to load history");
  }

  const supabase = getSupabaseClient();
  let query = supabase
    .from("analyses")
    .select("id, run_id, user_id, input_text, source_url, label, confidence, model_version, created_at")
    .eq("user_id", userId)
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
