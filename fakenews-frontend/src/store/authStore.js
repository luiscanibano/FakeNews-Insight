import { create } from "zustand";
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

// Normaliza la forma de extraer el usuario porque cada endpoint puede devolver estructuras distintas.
const getUserFromAuthData = (authData) =>
  authData?.user || authData?.session?.user || null;

// Hidrata perfil, rol y plan a partir del usuario autenticado en Supabase.
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

// Store global de autenticacion para compartir estado entre pantallas.
export const useAuthStore = create((set) => ({
  user: null,
  profile: null,
  role: USER_ROLE.GUEST,
  plan: USER_PLAN.FREE,
  loading: false,
  authReady: false,
  error: null,

  // Permite actualizar el usuario desde fuera del flujo de login/register.
  setUser: (user) => set({ user }),

  // Borra mensajes de error globales.
  clearError: () => set({ error: null }),

  // Inicializa el usuario desde la sesion persistida de Supabase.
  initializeAuth: async () => {
    set({ loading: true, error: null });

    try {
      const user = await getCurrentUser();
      const access = await hydrateAccessFromUser(user);
      set({ user, ...access, loading: false, authReady: true });
    } catch (error) {
      set({ error: error.message, loading: false, authReady: true });
    }
  },

  // Suscribe el store a eventos de autenticacion de Supabase.
  subscribeToAuthChanges: () =>
    onAuthStateChange(async (user) => {
      if (!user) {
        set({
          user: null,
          profile: null,
          role: USER_ROLE.GUEST,
          plan: USER_PLAN.FREE,
          authReady: true,
        });
        return;
      }

      set({ user, authReady: true });

      try {
        const access = await hydrateAccessFromUser(user);
        set({ ...access });
      } catch (error) {
        set({ error: error.message });
      }
    }),

  // Cierra sesion en Supabase y limpia estado local.
  logout: async () => {
    set({ loading: true, error: null });

    try {
      await logout();
      set({
        user: null,
        profile: null,
        role: USER_ROLE.GUEST,
        plan: USER_PLAN.FREE,
        loading: false,
      });
    } catch (error) {
      set({ error: error.message, loading: false });
      throw error;
    }
  },

  // Inicia sesion, refleja loading/error y guarda el usuario si todo va bien.
  login: async (credentials) => {
    set({ loading: true, error: null });

    try {
      const authData = await login(credentials);
      const user = getUserFromAuthData(authData);
      const access = await hydrateAccessFromUser(user);
      set({ user, ...access, loading: false });
      return authData;
    } catch (error) {
      set({ error: error.message, loading: false });
      throw error;
    }
  },

  // Registra usuario y actualiza estado global.
  register: async (credentials) => {
    set({ loading: true, error: null });

    try {
      const authData = await register(credentials);
      // En registro solo consideramos usuario logueado si existe sesion activa.
      // Si Supabase exige confirmacion por email, authData.session suele venir null.
      const user = authData?.session?.user || null;
      const access = await hydrateAccessFromUser(user);
      set({ user, ...access, loading: false });
      return authData;
    } catch (error) {
      set({ error: error.message, loading: false });
      throw error;
    }
  },

  // Inicia autenticacion con Google mediante OAuth.
  signInWithGoogle: async () => {
    set({ loading: true, error: null });

    try {
      const authData = await signInWithGoogle();
      set({ loading: false });
      return authData;
    } catch (error) {
      set({ error: error.message, loading: false });
      throw error;
    }
  },

  // Solicita el email de recuperacion.
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

  // Inicializa sesion temporal para flujo de recuperacion de contrasena.
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

  // Actualiza la contrasena del usuario en recovery.
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
