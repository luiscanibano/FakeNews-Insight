/**
 * @file analysisStore.js
 * @description Store global con Zustand para centralizar estado, acciones y sincronizacion entre vistas.
 */

import { create } from "zustand";
import { saveAnalysisToHistory, verifyClaims } from "../services/analysis";
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

const toVerificationResult = ({ text, backendResult }) => ({
  kind: "verification",
  mode: "text",
  source: "Texto pegado manualmente",
  excerpt: text.slice(0, 260),
  report: backendResult,
  analysisRunId: backendResult?.run_id || null,
  savedInHistory: true,
});

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
  * Ejecuta el contraste de texto autenticado con JWT.
   * Mantiene progreso visual optimista hasta recibir respuesta de backend.
   */
  analyzeText: async (text) => {
    const trimmedText = text.trim();

    if (!trimmedText) {
      throw new Error("Debes indicar un texto para contrastar.");
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
      const backendResult = await verifyClaims({ text: trimmedText, jwtToken });
      const result = toVerificationResult({ text: trimmedText, backendResult });

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
