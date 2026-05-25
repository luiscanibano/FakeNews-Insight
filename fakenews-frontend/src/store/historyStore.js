/**
 * @file historyStore.js
 * @description Store global con Zustand para centralizar estado, acciones y sincronizacion entre vistas.
 */

import { create } from "zustand";
import { getAccessToken } from "../services/auth";
import { deleteSavedHistoryItem, getSavedHistory } from "../services/history";

export const useHistoryStore = create((set) => ({
  loading: false,
  error: null,
  items: [],
  deleteLoadingId: null,

  /** Carga historial guardado para el usuario autenticado y controla errores de consulta. */
  fetchHistory: async ({ userId }) => {
    if (!userId) {
      return;
    }

    set({ loading: true, error: null });

    try {
      const items = await getSavedHistory({ userId });
      set({ loading: false, error: null, items, deleteLoadingId: null });
    } catch (error) {
      set({ loading: false, error: error.message, items: [], deleteLoadingId: null });
    }
  },

  /** Elimina una verificacion FEVER del historial y actualiza el listado en memoria. */
  deleteHistoryItem: async ({ itemId }) => {
    if (!itemId) {
      throw new Error("No se encontró el identificador del historial a eliminar.");
    }

    set({ deleteLoadingId: itemId, error: null });

    try {
      const jwtToken = await getAccessToken();
      await deleteSavedHistoryItem({ itemId, jwtToken });

      set((state) => ({
        items: state.items.filter(
          (item) => item.id !== itemId && item.runId !== itemId && item.batchId !== itemId
        ),
        deleteLoadingId: null,
        error: null,
      }));
    } catch (error) {
      set({ deleteLoadingId: null, error: error.message });
      throw error;
    }
  },

  /** Oculta el error de historial manteniendo la lista actual. */
  clearError: () => set({ error: null }),
}));
