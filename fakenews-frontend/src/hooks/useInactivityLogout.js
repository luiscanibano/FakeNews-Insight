/**
 * @file useInactivityLogout.js
 * @description Hook que cierra la sesion automaticamente si el usuario permanece inactivo.
 */

import { useEffect, useRef } from "react";
import {
  ACTIVITY_EVENTS,
  INACTIVITY_TIMEOUT_MS,
} from "../lib/constants";
import {
  clearSessionActivity,
  persistLastActivityAtForUser,
  readLastActivityAtForUser,
} from "../lib/sessionActivity";

/**
 * Vigila la actividad del usuario y dispara `onLogout` cuando excede el umbral
 * de inactividad. Se reinicia con cada interaccion (mouse, teclado, foco, etc.).
 */
export const useInactivityLogout = ({ user, authReady, onLogout }) => {
  const inactivityTimerRef = useRef(null);

  useEffect(() => {
    /** Limpia el timeout activo para evitar timers duplicados. */
    const clearInactivityTimer = () => {
      if (inactivityTimerRef.current) {
        window.clearTimeout(inactivityTimerRef.current);
        inactivityTimerRef.current = null;
      }
    };

    if (!authReady) {
      return;
    }

    if (!user) {
      clearInactivityTimer();
      return;
    }

    const userId = String(user.id || "").trim();
    if (!userId) {
      return;
    }

    let autoLogoutInProgress = false;

    const handleAutoLogout = async () => {
      if (autoLogoutInProgress) {
        return;
      }

      autoLogoutInProgress = true;
      clearInactivityTimer();
      clearSessionActivity();

      try {
        await onLogout();
      } catch {
        /** Errores ya gestionados por el caller. */
      }
    };

    /** Evalua inactividad y solo renueva actividad cuando la sesion sigue vigente. */
    const evaluateInactivity = ({ refreshActivity = false } = {}) => {
      clearInactivityTimer();

      const lastActivityAt = readLastActivityAtForUser(userId);
      if (!lastActivityAt) {
        persistLastActivityAtForUser(userId);
        inactivityTimerRef.current = window.setTimeout(
          handleAutoLogout,
          INACTIVITY_TIMEOUT_MS
        );
        return;
      }

      const inactivityElapsedMs = Date.now() - lastActivityAt;

      if (inactivityElapsedMs >= INACTIVITY_TIMEOUT_MS) {
        handleAutoLogout();
        return;
      }

      if (refreshActivity) {
        persistLastActivityAtForUser(userId);
      }

      inactivityTimerRef.current = window.setTimeout(
        handleAutoLogout,
        INACTIVITY_TIMEOUT_MS - inactivityElapsedMs
      );
    };

    const handleUserActivity = () => {
      evaluateInactivity({ refreshActivity: true });
    };

    evaluateInactivity();

    ACTIVITY_EVENTS.forEach((eventName) => {
      window.addEventListener(eventName, handleUserActivity);
    });

    window.addEventListener("focus", evaluateInactivity);
    document.addEventListener("visibilitychange", evaluateInactivity);

    return () => {
      clearInactivityTimer();

      ACTIVITY_EVENTS.forEach((eventName) => {
        window.removeEventListener(eventName, handleUserActivity);
      });

      window.removeEventListener("focus", evaluateInactivity);
      document.removeEventListener("visibilitychange", evaluateInactivity);
    };
  }, [authReady, user, onLogout]);
};
