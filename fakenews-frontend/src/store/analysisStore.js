/**
 * @file analysisStore.js
 * @description Store global con Zustand para centralizar estado, acciones y sincronizacion entre vistas.
 */

import { create } from "zustand";
import { analyzeTextNews, saveAnalysisToHistory } from "../services/analysis";
import { getAccessToken } from "../services/auth";

let progressTimerRef = null;
let resetProgressTimerRef = null;

/** Limpia timers de progreso para evitar fugas de estado entre análisis consecutivos. */
const clearProgressTimers = () => {
  if (progressTimerRef) {
    window.clearInterval(progressTimerRef);
    progressTimerRef = null;
  }

  if (resetProgressTimerRef) {
    window.clearTimeout(resetProgressTimerRef);
    resetProgressTimerRef = null;
  }
};

/** Normaliza la respuesta backend al contrato de resultado que consume el dashboard. */
const toDashboardResult = ({ text, backendResult }) => {
  const rawDistance = Number(backendResult?.certeza_svm);
  const hasValidDistance = Number.isFinite(rawDistance);

  const verdictLabel =
    backendResult?.veredicto === "REAL"
      ? "FIABLE"
      : backendResult?.veredicto === "FAKE"
      ? "FALSA"
      : "DUDOSA";

  return {
    kind: "single",
    mode: "text",
    verdictLabel,
    svmStrength: hasValidDistance ? Math.abs(rawDistance) : null,
    source: "Texto pegado manualmente",
    excerpt: text.slice(0, 260),
    modelVerdict: backendResult?.veredicto || null,
    svmDistance: hasValidDistance ? rawDistance : null,
    processedWords: Number(backendResult?.palabras_procesadas) || null,
    analysisRunId: backendResult?.analysis_run_id || null,
    savedInHistory: Boolean(backendResult?.guardado_en_historial),
  };
};

export const useAnalysisStore = create((set) => ({
  result: null,
  isAnalysing: false,
  analysisProgress: 0,
  error: null,
  saveLoading: false,
  saveError: null,

  /** Reinicia errores de análisis y de guardado manual en historial. */
  clearError: () => set({ error: null, saveError: null }),

  /** Restablece por completo el estado del flujo de análisis y limpia timers activos. */
  reset: () => {
    clearProgressTimers();
    set({
      result: null,
      isAnalysing: false,
      analysisProgress: 0,
      error: null,
      saveLoading: false,
      saveError: null,
    });
  },

  /**
   * Ejecuta el análisis de texto autenticado con JWT.
   * Mantiene progreso visual optimista hasta recibir respuesta de backend.
   */
  analyzeText: async (text) => {
    const trimmedText = text.trim();

    if (!trimmedText) {
      throw new Error("Debes indicar un texto para analizar.");
    }

    clearProgressTimers();
    set({
      result: null,
      error: null,
      saveError: null,
      saveLoading: false,
      isAnalysing: true,
      analysisProgress: 9,
    });

    progressTimerRef = window.setInterval(() => {
      set((state) => {
        if (state.analysisProgress >= 92) {
          return state;
        }

        return {
          analysisProgress: Math.min(
            92,
            state.analysisProgress + Math.max(3, Math.round((100 - state.analysisProgress) / 11))
          ),
        };
      });
    }, 140);

    try {
      const jwtToken = await getAccessToken();
      const backendResult = await analyzeTextNews({ text: trimmedText, jwtToken });
      const result = toDashboardResult({ text: trimmedText, backendResult });

      clearProgressTimers();
      set({ result, isAnalysing: false, analysisProgress: 100 });

      resetProgressTimerRef = window.setTimeout(() => {
        set({ analysisProgress: 0 });
      }, 550);

      return result;
    } catch (error) {
      clearProgressTimers();
      set({ error: error.message, isAnalysing: false, analysisProgress: 0 });
      throw error;
    }
  },

  /**
   * Guarda manualmente el ultimo análisis en historial usando run_id.
   * Si ya estaba guardado, devuelve el resultado sin repetir la operacion.
   */
  saveCurrentResultToHistory: async () => {
    const state = useAnalysisStore.getState();
    const runId = state.result?.analysisRunId;

    if (!runId) {
      throw new Error("No hay un análisis válido para guardar en historial.");
    }

    if (state.result?.savedInHistory) {
      return state.result;
    }

    set({ saveLoading: true, saveError: null });

    try {
      const jwtToken = await getAccessToken();
      await saveAnalysisToHistory({ runId, jwtToken });

      let updatedResult = null;
      set((currentState) => {
        updatedResult = currentState.result
          ? {
              ...currentState.result,
              savedInHistory: true,
            }
          : currentState.result;

        return {
          result: updatedResult,
          saveLoading: false,
          saveError: null,
        };
      });

      return updatedResult;
    } catch (error) {
      set({ saveLoading: false, saveError: error.message });
      throw error;
    }
  },
}));
