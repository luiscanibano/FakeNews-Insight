/**
 * @file dashboardStore.js
 * @description Store global con Zustand para centralizar estado, acciones y sincronizacion entre vistas.
 */

import { create } from "zustand";
import i18next from "i18next";
import { getDashboardHomeData } from "../services/dashboard";

/** Estado base de métricas para evitar nulos en primer render. */
const EMPTY_USAGE_METRICS = {
  remainingLabel: "--",
  usedToday: 0,
  usedThisMonth: 0,
  dailyLimitLabel: "--",
};

const DAY_IN_MS = 24 * 60 * 60 * 1000;

/** Devuelve el locale BCP47 para Intl segun el idioma activo de i18next. */
const resolveDateLocale = () => {
  const lang = (i18next.language || "es").toLowerCase().split("-")[0];
  return lang === "en" ? "en-US" : "es-ES";
};

/** Etiqueta localizada para "Hoy". */
const resolveTodayLabel = () =>
  i18next.t("home.today", { ns: "dashboard", defaultValue: "Hoy" });

/** Construye la serie de 10 dias con etiquetas en el idioma activo. */
const buildEmptyLast30DaysSeries = () => {
  const locale = resolveDateLocale();
  const todayLabel = resolveTodayLabel();
  return Array.from({ length: 10 }, (_, index) => {
    const offset = 9 - index;
    const referenceDate = new Date(Date.now() - offset * DAY_IN_MS);
    const label =
      offset === 0
        ? todayLabel
        : new Intl.DateTimeFormat(locale, { day: "2-digit", month: "2-digit" }).format(
            referenceDate
          );

    return {
      label,
      count: 0,
    };
  });
};

const EMPTY_LAST_30_DAYS_SERIES = buildEmptyLast30DaysSeries();

export const useDashboardStore = create((set) => ({
  homeLoading: false,
  homeError: null,
  usageMetrics: EMPTY_USAGE_METRICS,
  last30DaysSeries: EMPTY_LAST_30_DAYS_SERIES,
  recentAnalyses: [],

  /** Sincroniza datos de Home desde servicios y controla estados de carga/error. */
  fetchHomeData: async ({ userId, fallbackPlan }) => {
    if (!userId) {
      return;
    }

    set({ homeLoading: true, homeError: null });

    try {
      const homeData = await getDashboardHomeData({ userId, fallbackPlan });

      set({
        homeLoading: false,
        usageMetrics: homeData.usageMetrics,
        last30DaysSeries: homeData.last30DaysSeries,
        recentAnalyses: homeData.recentAnalyses,
      });
    } catch (error) {
      set({
        homeLoading: false,
        homeError: error.message,
        usageMetrics: EMPTY_USAGE_METRICS,
        last30DaysSeries: EMPTY_LAST_30_DAYS_SERIES,
        recentAnalyses: [],
      });
    }
  },

  /** Limpia el error visible de Home sin tocar datos ya cargados. */
  clearHomeError: () => set({ homeError: null }),
}));
