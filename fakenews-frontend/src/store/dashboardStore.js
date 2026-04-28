/**
 * @file dashboardStore.js
 * @description Store global con Zustand para centralizar estado, acciones y sincronizacion entre vistas.
 */

import { create } from "zustand";
import { getDashboardHomeData } from "../services/dashboard";

/** Estado base de métricas para evitar nulos en primer render. */
const EMPTY_USAGE_METRICS = {
  remainingLabel: "--",
  usedToday: 0,
  usedThisMonth: 0,
  dailyLimitLabel: "--",
};

const DAY_IN_MS = 24 * 60 * 60 * 1000;

/** Serie inicial de 10 dias con ceros para renderizar el grafico antes de cargar datos. */
const EMPTY_LAST_30_DAYS_SERIES = Array.from({ length: 10 }, (_, index) => {
  const offset = 9 - index;
  const referenceDate = new Date(Date.now() - offset * DAY_IN_MS);
  const label =
    offset === 0
      ? "Hoy"
      : new Intl.DateTimeFormat("es-ES", { day: "2-digit", month: "2-digit" }).format(
          referenceDate
        );

  return {
    label,
    count: 0,
  };
});

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
