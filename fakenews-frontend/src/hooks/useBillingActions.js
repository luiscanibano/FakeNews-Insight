/**
 * @file useBillingActions.js
 * @description Orquesta acciones de facturación, redirige a Stripe Checkout y refresca el perfil tras cambios.
 */

import { useCallback } from "react";
import { useBillingStore } from "../store/billingStore";
import { useAuthStore } from "../store/authStore";

/** Decide la accion concreta a partir del plan objetivo y el snapshot actual. */
export const useBillingActions = () => {
  const refreshAccess = useAuthStore((state) => state.refreshAccess);
  const selectPlanAction = useBillingStore((state) => state.selectPlan);
  const cancelAction = useBillingStore((state) => state.cancelSubscription);
  const resumeAction = useBillingStore((state) => state.resumeSubscription);
  const portalAction = useBillingStore((state) => state.openPortal);
  const confirmAction = useBillingStore((state) => state.confirmCheckout);
  const loadSnapshot = useBillingStore((state) => state.loadSnapshot);

  /** Selecciona plan PRO/ULTRA: checkout, upgrade prorrateado o downgrade programado. */
  const selectPlan = useCallback(
    async (plan) => {
      const result = await selectPlanAction(plan);
      if (!result) {
        return undefined;
      }

      if (result.status === "checkout" && result.checkout_url) {
        window.location.assign(result.checkout_url);
        return result;
      }

      await Promise.allSettled([refreshAccess(), loadSnapshot()]);
      return result;
    },
    [selectPlanAction, refreshAccess, loadSnapshot]
  );

  /** Programa baja a FREE conservando plan superior hasta fin de periodo. */
  const cancelSubscription = useCallback(async () => {
    const result = await cancelAction();
    await Promise.allSettled([refreshAccess(), loadSnapshot()]);
    return result;
  }, [cancelAction, refreshAccess, loadSnapshot]);

  /** Revierte cancelación o downgrade programados antes de que se apliquen. */
  const resumeSubscription = useCallback(async () => {
    const result = await resumeAction();
    await Promise.allSettled([refreshAccess(), loadSnapshot()]);
    return result;
  }, [resumeAction, refreshAccess, loadSnapshot]);

  /** Abre Customer Portal en nueva pestaña. */
  const openPortal = useCallback(() => portalAction(), [portalAction]);

  /** Confirma sesión de Stripe Checkout tras volver al dashboard. */
  const confirmCheckout = useCallback(
    async (sessionId) => {
      const result = await confirmAction(sessionId);
      await Promise.allSettled([refreshAccess(), loadSnapshot()]);
      return result;
    },
    [confirmAction, refreshAccess, loadSnapshot]
  );

  return {
    selectPlan,
    cancelSubscription,
    resumeSubscription,
    openPortal,
    confirmCheckout,
  };
};
