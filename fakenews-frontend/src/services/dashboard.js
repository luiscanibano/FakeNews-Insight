/**
 * @file dashboard.js
 * @description Capa de servicios para acceso a API/Supabase, transformacion de datos y manejo uniforme de errores.
 */

import { getSupabaseClient } from "./supabase";
import i18next from "i18next";

const DAY_IN_MS = 24 * 60 * 60 * 1000;
const DASHBOARD_CHART_DAYS = 10;

const ANALYSIS_QUERY_ATTEMPTS = [
  { table: "analysis_runs", userColumn: "user_id", createdAtColumn: "created_at" },
  { table: "analysis_history", userColumn: "user_id", createdAtColumn: "created_at" },
  { table: "analysis_history", userColumn: "profile_id", createdAtColumn: "created_at" },
  { table: "analysis_results", userColumn: "user_id", createdAtColumn: "created_at" },
  { table: "analysis_results", userColumn: "profile_id", createdAtColumn: "created_at" },
  { table: "analyses", userColumn: "user_id", createdAtColumn: "created_at" },
  { table: "analyses", userColumn: "profile_id", createdAtColumn: "created_at" },
];

const VERIFICATION_QUERY_ATTEMPTS = [
  { table: "verification_runs", userColumn: "user_id", createdAtColumn: "created_at" },
];

/** Resuelve el límite por defecto cuando el perfil no expone límite diario explicito. */
const getFallbackLimitFromPlan = (plan) => {
  if (plan === "free") {
    return 20;
  }

  return null;
};

/** Normaliza una fecha a clave UTC YYYY-MM-DD para agregaciones por dia. */
const getUtcDateKeyFromDate = (date) => {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
    return null;
  }

  return date.toISOString().slice(0, 10);
};

const getTodayUtcDateKey = () => getUtcDateKeyFromDate(new Date());

/** Devuelve true si la fecha recibida pertenece al mes y anio actuales en UTC. */
const isCurrentUtcMonth = (date) => {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
    return false;
  }

  const now = new Date();

  return (
    date.getUTCFullYear() === now.getUTCFullYear() &&
    date.getUTCMonth() === now.getUTCMonth()
  );
};

/** Etiqueta de eje X en formato corto para el grafico de actividad del dashboard. */
const formatChartDateLabel = (date) => {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
    return "--/--";
  }

  const lang = (i18next.language || "es").toLowerCase().split("-")[0];
  const locale = lang === "en" ? "en-US" : "es-ES";
  return new Intl.DateTimeFormat(locale, {
    day: "2-digit",
    month: "2-digit",
  }).format(date);
};

/** Convierte cualquier valor en numerico finito o null si no es representable. */
const toNumericOrNull = (value) => {
  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? numericValue : null;
};

/** Homologa etiquetas de veredicto a un canon comun sin perder las de FEVER. */
const normalizeVerdictLabel = (rawVerdict) => {
  const normalized = String(rawVerdict || "").trim().toLowerCase();

  if (normalized === "supported") {
    return "SUPPORTED";
  }

  if (normalized === "refuted") {
    return "REFUTED";
  }

  if (normalized === "not_enough_info") {
    return "NOT_ENOUGH_INFO";
  }

  if (normalized === "conflicting") {
    return "CONFLICTING";
  }

  if (["real", "fiable", "trusted", "credible", "supported"].includes(normalized)) {
    return "FIABLE";
  }

  if (["fake", "falsa", "false", "misleading", "refuted"].includes(normalized)) {
    return "FALSA";
  }

  return "DUDOSA";
};

/** Formatea timestamps de filas para representacion humana en listas recientes. */
const formatTimestampLabel = (dateValue) => {
  const parsedDate = new Date(dateValue);

  if (Number.isNaN(parsedDate.getTime())) {
    return "Sin fecha";
  }

  return new Intl.DateTimeFormat("es-ES", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(parsedDate);
};

/** Adapta una fila de análisis al contrato usado por Home y tarjetas de recientes. */
const normalizeRecentAnalysis = (row, index) => {
  const inputText = String(row?.input_text || "").trim();
  const title =
    row?.title ||
    row?.summary ||
    row?.headline ||
    row?.titular ||
    row?.news_title ||
    (inputText ? `${inputText.slice(0, 72)}${inputText.length > 72 ? "..." : ""}` : null) ||
    `Análisis #${index + 1}`;

  const rawStrength =
    row?.svm_strength ??
    row?.fuerza_svm ??
    row?.svm_distance ??
    row?.certeza_svm ??
    row?.confidence ??
    null;

  const numericStrength = toNumericOrNull(rawStrength);

  return {
    id: row?.id || `analysis-${index + 1}`,
    title,
    verdictLabel: normalizeVerdictLabel(
      row?.overall_label ?? row?.verdict ?? row?.veredicto ?? row?.classification ?? row?.label
    ),
    svmStrength: numericStrength !== null ? Math.abs(numericStrength) : 0,
    timestampLabel: formatTimestampLabel(
      row?.created_at ?? row?.createdAt ?? row?.fecha ?? row?.analysis_date
    ),
  };
};

/** Obtiene la clave de dia de una fila de análisis compatible con distintas tablas. */
const getAnalysisDateKey = (row) => {
  const rawDate = row?.created_at ?? row?.createdAt ?? row?.fecha ?? row?.analysis_date;
  const parsedDate = new Date(rawDate);

  if (Number.isNaN(parsedDate.getTime())) {
    return null;
  }

  return getUtcDateKeyFromDate(parsedDate);
};

/** Cuenta cuantos análisis del usuario pertenecen al mes actual. */
const getCurrentMonthAnalysisCount = (rows) => {
  return rows.reduce((accumulator, row) => {
    const rawDate = row?.created_at ?? row?.createdAt ?? row?.fecha ?? row?.analysis_date;
    const parsedDate = new Date(rawDate);

    if (!isCurrentUtcMonth(parsedDate)) {
      return accumulator;
    }

    return accumulator + 1;
  }, 0);
};

/** Detecta errores de esquema/permisos recuperables para seguir intentando tablas alternativas. */
const isRecoverableSchemaError = (error) => {
  const message = String(error?.message || "").toLowerCase();
  const code = String(error?.code || "").toUpperCase();

  return (
    code === "42P01" ||
    code === "42703" ||
    code === "PGRST205" ||
    code === "PGRST204" ||
    code === "42501" ||
    message.includes("does not exist") ||
    message.includes("could not find the table") ||
    message.includes("schema cache") ||
    message.includes("permission denied") ||
    message.includes("column") ||
    message.includes("relation")
  );
};

/** Lee actividad del usuario probando tablas compatibles hasta encontrar una disponible. */
const fetchRowsByAttempts = async ({ supabase, userId, attempts, emptyOnMissing = false }) => {
  for (const attempt of attempts) {
    const { data, error } = await supabase
      .from(attempt.table)
      .select("*")
      .eq(attempt.userColumn, userId)
      .order(attempt.createdAtColumn, { ascending: false })
      .limit(300);

    if (!error) {
      return data || [];
    }

    if (!isRecoverableSchemaError(error)) {
      throw new Error(error.message || "No se pudieron leer los análisis del usuario");
    }
  }

  return emptyOnMissing ? [] : [];
};

/** Lee runs de análisis y contraste para construir la actividad consolidada del dashboard. */
const fetchDashboardActivityRows = async ({ supabase, userId }) => {
  const [analysisRows, verificationRows] = await Promise.all([
    fetchRowsByAttempts({ supabase, userId, attempts: ANALYSIS_QUERY_ATTEMPTS }),
    fetchRowsByAttempts({ supabase, userId, attempts: VERIFICATION_QUERY_ATTEMPTS, emptyOnMissing: true }),
  ]);

  return [...analysisRows, ...verificationRows].sort((leftRow, rightRow) => {
    const leftDate = new Date(
      leftRow?.created_at ?? leftRow?.createdAt ?? leftRow?.fecha ?? leftRow?.analysis_date ?? 0
    ).getTime();
    const rightDate = new Date(
      rightRow?.created_at ?? rightRow?.createdAt ?? rightRow?.fecha ?? rightRow?.analysis_date ?? 0
    ).getTime();

    return rightDate - leftDate;
  });
};

/** Construye la serie diaria de los ultimos 10 dias para el grafico de Home. */
const buildLast30DaysSeries = (rows) => {
  const today = new Date();
  const countsByDay = new Map();

  rows.forEach((row) => {
    const dateKey = getAnalysisDateKey(row);

    if (!dateKey) {
      return;
    }

    countsByDay.set(dateKey, (countsByDay.get(dateKey) || 0) + 1);
  });

  const offsets = Array.from(
    { length: DASHBOARD_CHART_DAYS },
    (_, index) => DASHBOARD_CHART_DAYS - 1 - index
  );

  return offsets.map((offset) => {
    const referenceDate = new Date(today.getTime() - offset * DAY_IN_MS);
    const dateKey = getUtcDateKeyFromDate(referenceDate);

    return {
      label: offset === 0 ? i18next.t("home.today", { ns: "dashboard", defaultValue: "Hoy" }) : formatChartDateLabel(referenceDate),
      count: dateKey ? countsByDay.get(dateKey) || 0 : 0,
    };
  });
};

/** Deriva métricas de uso (restantes/consumidos/límite) a partir del perfil y plan activo. */
const getUsageMetricsFromProfile = ({ profile, fallbackPlan }) => {
  const plan = profile?.plan || fallbackPlan || "free";
  const fallbackLimit = getFallbackLimitFromPlan(plan);

  const profileLimit = toNumericOrNull(profile?.daily_analysis_limit);
  const resolvedLimit = profile?.daily_analysis_limit === null ? null : profileLimit ?? fallbackLimit;

  const profileUsed = toNumericOrNull(profile?.daily_analysis_used) ?? 0;
  const todayUtcDate = getTodayUtcDateKey();
  const profileDate = String(profile?.daily_analysis_date || "").slice(0, 10);
  const usedToday = profileDate === todayUtcDate ? profileUsed : 0;

  const remainingLabel =
    resolvedLimit === null
      ? i18next.t("home.unlimitedRemaining", { ns: "dashboard", defaultValue: "Ilimitados" })
      : Math.max(0, resolvedLimit - usedToday);

  return {
    remainingLabel,
    usedToday,
    dailyLimitLabel:
      resolvedLimit === null
        ? i18next.t("home.unlimited", { ns: "dashboard", defaultValue: "Ilimitado" })
        : resolvedLimit,
  };
};

/** Carga el modelo de datos completo de Home: uso, serie temporal y recientes guardados. */
export const getDashboardHomeData = async ({ userId, fallbackPlan }) => {
  if (!userId) {
    throw new Error("User id is required to load dashboard data");
  }

  const supabase = getSupabaseClient();

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id, plan, daily_analysis_limit, daily_analysis_used, daily_analysis_date")
    .eq("id", userId)
    .maybeSingle();

  if (profileError) {
    throw new Error(profileError.message || "No se pudo cargar el estado del perfil");
  }

  const dashboardActivityRows = await fetchDashboardActivityRows({ supabase, userId });
  const usageMetrics = {
    ...getUsageMetricsFromProfile({ profile, fallbackPlan }),
    usedThisMonth: getCurrentMonthAnalysisCount(dashboardActivityRows),
  };

  return {
    usageMetrics,
    last30DaysSeries: buildLast30DaysSeries(dashboardActivityRows),
    recentAnalyses: dashboardActivityRows.slice(0, 3).map(normalizeRecentAnalysis),
  };
};
