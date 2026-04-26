/**
 * @file historyStore.js
 * @description Store global con Zustand para centralizar estado, acciones y sincronizacion entre vistas.
 */

import { create } from "zustand";
import { getSavedHistory } from "../services/history";

export const useHistoryStore = create((set) => ({
  loading: false,
  error: null,
  items: [],

  /** Carga historial guardado para el usuario autenticado y controla errores de consulta. */
  fetchHistory: async ({ userId }) => {
    if (!userId) {
      return;
    }

    set({ loading: true, error: null });

    try {
      const items = await getSavedHistory({ userId });
      set({ loading: false, error: null, items });
    } catch (error) {
      set({ loading: false, error: error.message, items: [] });
    }
  },

  /** Oculta el error de historial manteniendo la lista actual. */
  clearError: () => set({ error: null }),
}));
