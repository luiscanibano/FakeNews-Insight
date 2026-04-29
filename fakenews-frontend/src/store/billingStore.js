/**
 * @file billingStore.js
 * @description Store Zustand para snapshot de suscripcion y acciones de billing centralizadas.
 */

import { create } from "zustand";
import {
  cancelBillingSubscription,
  confirmBillingCheckout,
  createBillingCheckout,
  fetchBillingSnapshot,
  openBillingPortal,
  resumeBillingSubscription,
} from "../services/billing";
import { getAccessToken } from "../services/auth";

/** Lee el JWT actual con un único punto de fallo para los flujos de billing. */
const requireAccessToken = async () => {
  const token = await getAccessToken();
  if (!token) {
    throw new Error("Tu sesión no es válida. Inicia sesión de nuevo.");
  }
  return token;
};

const initialState = {
  snapshot: null,
  loading: false,
  actionInFlight: null,
  error: null,
  lastAction: null,
};

/** Store global de estado de facturación. */
export const useBillingStore = create((set, get) => ({
  ...initialState,

  /** Resetea el store al hacer logout o tras navegaciones que ya no requieren snapshot. */
  reset: () => set({ ...initialState }),

  /** Carga el snapshot del usuario actual desde el backend. */
  loadSnapshot: async () => {
    set({ loading: true, error: null });
    try {
      const jwtToken = await requireAccessToken();
      const snapshot = await fetchBillingSnapshot({ jwtToken });
      set({ snapshot, loading: false });
      return snapshot;
    } catch (error) {
      set({ loading: false, error: error?.message || "No se pudo cargar el estado de facturación." });
      throw error;
    }
  },

  /** Lanza una acción remota controlando spinner por tipo y guardando el resultado. */
  runAction: async (actionType, executor) => {
    if (get().actionInFlight) {
      return undefined;
    }
    set({ actionInFlight: actionType, error: null, lastAction: null });
    try {
      const jwtToken = await requireAccessToken();
      const result = await executor(jwtToken);
      set({ actionInFlight: null, lastAction: { type: actionType, result } });
      return result;
    } catch (error) {
      set({
        actionInFlight: null,
        error: error?.message || "No se pudo completar la operación de facturación.",
      });
      throw error;
    }
  },

  /** Inicia checkout, upgrade prorrateado o downgrade programado segun el plan objetivo. */
  selectPlan: async (plan) =>
    get().runAction("checkout", (jwtToken) => createBillingCheckout({ plan, jwtToken })),

  /** Programa cancelación al final del periodo. */
  cancelSubscription: async () =>
    get().runAction("cancel", (jwtToken) => cancelBillingSubscription({ jwtToken })),

  /** Revierte cancelación o downgrade programado. */
  resumeSubscription: async () =>
    get().runAction("resume", (jwtToken) => resumeBillingSubscription({ jwtToken })),

  /** Obtiene URL del Customer Portal de Stripe y la abre en nueva pestaña. */
  openPortal: async () =>
    get().runAction("portal", async (jwtToken) => {
      const result = await openBillingPortal({ jwtToken });
      if (result?.url) {
        window.open(result.url, "_blank", "noopener,noreferrer");
      }
      return result;
    }),

  /** Confirma el retorno de Stripe Checkout (UX inmediata, fuente de verdad sigue siendo el webhook). */
  confirmCheckout: async (sessionId) =>
    get().runAction("confirm", (jwtToken) => confirmBillingCheckout({ sessionId, jwtToken })),
}));
