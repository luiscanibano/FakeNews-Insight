/**
 * @file App.jsx
 * @description Componente raiz de enrutado: inicializa autenticacion, controla rutas publicas/privadas y aplica guardas por rol.
 */

import { useEffect, useRef } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useAuthStore } from "./store/authStore";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import AdminPanel from "./pages/AdminPanel";
import AdminUsers from "./pages/AdminUsers";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import Landing from "./pages/Landing";
import { USER_ROLE } from "./lib/accessControl";
import {
  clearSessionActivity,
  persistLastActivityAtForUser,
  readLastActivityAtForUser,
} from "./lib/sessionActivity";

const INACTIVITY_TIMEOUT_MS = 60 * 60 * 1000;
const ACTIVITY_EVENTS = ["mousedown", "mousemove", "keydown", "scroll", "touchstart"];

/** Componente raiz: inicializa auth y define rutas publicas/privadas segun rol. */
function App() {
  /** Estado de sesion y utilidades de autenticacion expuestas por authStore. */
  const user = useAuthStore((state) => state.user);
  const role = useAuthStore((state) => state.role);
  const authReady = useAuthStore((state) => state.authReady);
  const initializeAuth = useAuthStore((state) => state.initializeAuth);
  const subscribeToAuthChanges = useAuthStore((state) => state.subscribeToAuthChanges);
  const logout = useAuthStore((state) => state.logout);
  const inactivityTimerRef = useRef(null);

  const isAdmin = role === USER_ROLE.ADMIN;
  const defaultPrivatePath = isAdmin ? "/admin" : "/dashboard";

  /** Hidrata sesion inicial y deja suscripcion activa a cambios de auth. */
  useEffect(() => {
    let isCancelled = false;
    let unsubscribe = () => {};

    const bootstrapAuth = async () => {
      await initializeAuth();

      if (isCancelled) {
        return;
      }

      unsubscribe = subscribeToAuthChanges();
    };

    bootstrapAuth();

    return () => {
      isCancelled = true;
      unsubscribe();
    };
  }, [initializeAuth, subscribeToAuthChanges]);

  /** Limpia el timeout activo para evitar timers duplicados del vigilante de inactividad. */
  const clearInactivityTimer = () => {
    if (inactivityTimerRef.current) {
      window.clearTimeout(inactivityTimerRef.current);
      inactivityTimerRef.current = null;
    }
  };

  /** Controla caducidad por inactividad de 1 hora y fuerza logout al superarla. */
  useEffect(() => {
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
        await logout();
      } catch {
        /** Error is already handled in the auth store state.
 */
      }
    };

    /** Evalua inactividad y solo renueva actividad cuando la sesion sigue vigente. */
    const evaluateInactivity = ({ refreshActivity = false } = {}) => {
      clearInactivityTimer();

      const lastActivityAt = readLastActivityAtForUser(userId);
      if (!lastActivityAt) {
        /**
         * Si la huella de actividad no existe aun (race de arranque o sesion nueva),
         * se inicializa para evitar cierres espurios justo despues del login.
         */
        persistLastActivityAtForUser(userId);
        inactivityTimerRef.current = window.setTimeout(handleAutoLogout, INACTIVITY_TIMEOUT_MS);
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
  }, [authReady, user, logout]);

  if (!authReady) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-sm text-muted-foreground">
        Cargando sesion...
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/"
          element={!user ? <Landing /> : <Navigate to={defaultPrivatePath} replace />}
        />

        {/* Rutas Publicas */}
        <Route
          path="/login"
          element={!user ? <Login /> : <Navigate to={defaultPrivatePath} replace />}
        />
        <Route
          path="/register"
          element={!user ? <Register /> : <Navigate to={defaultPrivatePath} replace />}
        />
        <Route
          path="/forgot-password"
          element={!user ? <ForgotPassword /> : <Navigate to={defaultPrivatePath} replace />}
        />
        <Route path="/reset-password" element={<ResetPassword />} />

        {/* Rutas Privadas (Protegidas) */}
        <Route
          path="/dashboard"
          element={
            user ? (
              isAdmin ? <Navigate to="/admin" replace /> : <Dashboard />
            ) : (
              <Navigate to="/" replace />
            )
          }
        />

        <Route
          path="/admin"
          element={
            user ? (
              isAdmin ? <AdminPanel /> : <Navigate to="/dashboard" replace />
            ) : (
              <Navigate to="/" replace />
            )
          }
        />

        <Route
          path="/admin/users"
          element={
            user ? (
              isAdmin ? <AdminUsers /> : <Navigate to="/dashboard" replace />
            ) : (
              <Navigate to="/" replace />
            )
          }
        />

        {/* Redireccion por defecto */}
        <Route
          path="*"
          element={<Navigate to={user ? defaultPrivatePath : "/"} replace />}
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;