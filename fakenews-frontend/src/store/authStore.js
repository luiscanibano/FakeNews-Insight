/**
 * @file authStore.js
 * @description Store global con Zustand para centralizar estado, acciones y sincronizacion entre vistas.
 */

import { create } from "zustand";
import { useAnalysisStore } from "./analysisStore";
import {
  getCurrentUser,
  getProfileByUserId,
  login,
  logout,
  onAuthStateChange,
  register,
  requestPasswordReset,
  setRecoverySession,
  signInWithGoogle,
  updatePassword,
} from "../services/auth";
import { resolveAccess, USER_PLAN, USER_ROLE } from "../lib/accessControl";
import {
  clearSessionActivity,
  persistLastActivityAtForUser,
  readLastActivityAt,
  readLastActivityAtForUser,
} from "../lib/sessionActivity";
import { INACTIVITY_TIMEOUT_MS } from "../lib/constants";

/** Normaliza la forma de extraer el usuario porque cada endpoint puede devolver estructuras distintas.
 */
const getUserFromAuthData = (authData) =>
  authData?.user || authData?.session?.user || null;

let initializeAuthInFlightPromise = null;

const resetAnalysisState = () => {
  try {
    useAnalysisStore.getState().reset();
  } catch {
    /** Ignore reset issues during auth transitions. */
  }
};

/** Comprueba si la ultima actividad del usuario supera el umbral de inactividad permitido. */
const hasExpiredByInactivity = (userId, { allowGlobalFallback = true } = {}) => {
  if (!userId) {
    return false;
  }

  const userScopedActivityAt = readLastActivityAtForUser(userId);
  const lastActivityAt =
    userScopedActivityAt ?? (allowGlobalFallback ? readLastActivityAt() : null);

  if (!lastActivityAt) {
    return false;
  }

  return Date.now() - lastActivityAt >= INACTIVITY_TIMEOUT_MS;
};

/** Hidrata perfil, rol y plan a partir del usuario autenticado en Supabase.
 */
const hydrateAccessFromUser = async (user) => {
  if (!user) {
    return {
      profile: null,
      role: USER_ROLE.GUEST,
      plan: USER_PLAN.FREE,
    };
  }

  const profile = await getProfileByUserId(user.id);
  const { role, plan } = resolveAccess(profile);

  return { profile, role, plan };
};

/** Store global de autenticación para compartir estado entre pantallas.
 */
export const useAuthStore = create((set) => ({
  user: null,
  profile: null,
  role: USER_ROLE.GUEST,
  plan: USER_PLAN.FREE,
  loading: false,
  authReady: false,
  error: null,

  /** Permite actualizar el usuario desde fuera del flujo de login/register.
 */
  setUser: (user) => set({ user }),

  /** Borra mensajes de error globales.
 */
  clearError: () => set({ error: null }),

  /** Aplica perfil y recalcula rol/plan para sincronizacion inmediata de UI. */
  applyProfileAccess: (profile) => {
    const access = resolveAccess(profile || null);
    set({ profile: profile || null, ...access });
  },

  /** Refresca perfil del usuario autenticado sin reinicializar toda la sesión. */
  refreshAccess: async () => {
    const currentUser = useAuthStore.getState().user;

    if (!currentUser) {
      const guestAccess = {
        profile: null,
        role: USER_ROLE.GUEST,
        plan: USER_PLAN.FREE,
      };

      set(guestAccess);
      return guestAccess;
    }

    const access = await hydrateAccessFromUser(currentUser);
    set({ ...access });
    return access;
  },

  /** Inicializa el usuario desde la sesión persistida de Supabase.
 */
  initializeAuth: async () => {
    if (initializeAuthInFlightPromise) {
      await initializeAuthInFlightPromise;
      return;
    }

    set({ loading: true, error: null });

    initializeAuthInFlightPromise = (async () => {
      try {
        const user = await getCurrentUser();

        if (user?.id && hasExpiredByInactivity(user.id, { allowGlobalFallback: true })) {
          clearSessionActivity();
          resetAnalysisState();

          try {
            await logout();
          } catch {
            /** Error is handled by store state; keep hard sign-out behavior.
 */
          }

          set({
            user: null,
            profile: null,
            role: USER_ROLE.GUEST,
            plan: USER_PLAN.FREE,
            loading: false,
            authReady: true,
          });
          return;
        }

        const access = await hydrateAccessFromUser(user);
        set({ user, ...access, loading: false, authReady: true });
      } catch (error) {
        set({ error: error.message, loading: false, authReady: true });
      } finally {
        initializeAuthInFlightPromise = null;
      }
    })();

    await initializeAuthInFlightPromise;
  },

  /** Suscribe el store a eventos de autenticación de Supabase.
 */
  subscribeToAuthChanges: () =>
    onAuthStateChange(async (event, user) => {
      if (!user) {
        clearSessionActivity();
        resetAnalysisState();
        set({
          user: null,
          profile: null,
          role: USER_ROLE.GUEST,
          plan: USER_PLAN.FREE,
          authReady: true,
        });
        return;
      }

      /**
       * En SIGNED_IN no usamos fallback global para evitar falsos positivos por
       * marcas heredadas de otro contexto, pero si existe marca del mismo usuario
       * y esta vencida, se fuerza cierre de sesión.
       */
      if (hasExpiredByInactivity(user.id, { allowGlobalFallback: event !== "SIGNED_IN" })) {
        clearSessionActivity();
        resetAnalysisState();

        try {
          await logout();
        } catch {
          /** Error is handled by store state; keep hard sign-out behavior.
 */
        }

        set({
          user: null,
          profile: null,
          role: USER_ROLE.GUEST,
          plan: USER_PLAN.FREE,
          authReady: true,
        });
        return;
      }

      if (event === "SIGNED_IN" && user?.id) {
        persistLastActivityAtForUser(user.id);
      }

      set({ user, authReady: true });

      try {
        const access = await hydrateAccessFromUser(user);
        set({ ...access });
      } catch (error) {
        set({ error: error.message });
      }
    }),

  /** Cierra sesión en Supabase y limpia estado local.
 */
  logout: async () => {
    const loggedOutState = {
      user: null,
      profile: null,
      role: USER_ROLE.GUEST,
      plan: USER_PLAN.FREE,
      loading: false,
      error: null,
      authReady: true,
    };

    clearSessionActivity();
    resetAnalysisState();
    set(loggedOutState);

    try {
      await logout();
    } catch (error) {
      throw error;
    }
  },

  /** Inicia sesión, refleja loading/error y guarda el usuario si todo va bien.
 */
  login: async (credentials) => {
    set({ loading: true, error: null });

    try {
      /**
       * Limpia huella previa para que un login explicito no herede
       * marcas de inactividad antiguas de la sesión anterior.
       */
      clearSessionActivity();

      const authData = await login(credentials);
      const user = getUserFromAuthData(authData);
      const access = await hydrateAccessFromUser(user);

      if (user?.id) {
        persistLastActivityAtForUser(user.id);
      }

      set({ user, ...access, loading: false });
      return authData;
    } catch (error) {
      set({ error: error.message, loading: false });
      throw error;
    }
  },

  /** Registra usuario y actualiza estado global.
 */
  register: async (credentials) => {
    set({ loading: true, error: null });

    try {
      /** Evita reutilizar una marca antigua de actividad en alta de cuenta. */
      clearSessionActivity();

      const authData = await register(credentials);
      /** En registro solo consideramos usuario logueado si existe sesión activa.
 */
      /** Si Supabase exige confirmacion por email, authData.session suele venir null.
 */
      const user = authData?.session?.user || null;
      const access = await hydrateAccessFromUser(user);

      if (user?.id) {
        persistLastActivityAtForUser(user.id);
      }

      set({ user, ...access, loading: false });
      return authData;
    } catch (error) {
      set({ error: error.message, loading: false });
      throw error;
    }
  },

  /** Inicia autenticación con Google mediante OAuth.
 */
  signInWithGoogle: async () => {
    set({ loading: true, error: null });

    try {
      /** Evita arrastrar actividad previa antes de redirigir a OAuth. */
      clearSessionActivity();

      const authData = await signInWithGoogle();
      set({ loading: false });
      return authData;
    } catch (error) {
      set({ error: error.message, loading: false });
      throw error;
    }
  },

  /** Solicita el email de recuperación.
 */
  requestPasswordReset: async ({ email, redirectTo }) => {
    set({ loading: true, error: null });

    try {
      const data = await requestPasswordReset({ email, redirectTo });
      set({ loading: false });
      return data;
    } catch (error) {
      set({ error: error.message, loading: false });
      throw error;
    }
  },

  /** Inicializa sesión temporal para flujo de recuperación de contraseña.
 */
  setRecoverySession: async ({ accessToken, refreshToken }) => {
    set({ loading: true, error: null });

    try {
      const data = await setRecoverySession({ accessToken, refreshToken });
      set({ loading: false });
      return data;
    } catch (error) {
      set({ error: error.message, loading: false });
      throw error;
    }
  },

  /** Actualiza la contraseña del usuario en recovery.
 */
  updatePassword: async ({ password }) => {
    set({ loading: true, error: null });

    try {
      const data = await updatePassword({ password });
      set({ loading: false });
      return data;
    } catch (error) {
      set({ error: error.message, loading: false });
      throw error;
    }
  },
}));
