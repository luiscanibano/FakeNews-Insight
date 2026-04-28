/**
 * @file auth.js
 * @description Capa de servicios para acceso a API/Supabase, transformacion de datos y manejo uniforme de errores.
 */

import { getSupabaseClient } from "./supabase";

/** Traduce errores tecnicos a mensajes de producto consistentes para UI. */
const getErrorMessage = (error, fallbackMessage) => {
  const message = error?.message || fallbackMessage;
  const normalizedMessage = message.toLowerCase();

  if (
    normalizedMessage.includes("email rate limit exceeded") ||
    normalizedMessage.includes("rate limit")
  ) {
    return "Has superado el límite de correos de recuperación. Espera un minuto e inténtalo de nuevo.";
  }

  return message;
};

/** Inicia sesión por email y contraseña en Supabase Auth. */
export const login = async ({ email, password }) => {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    throw new Error(getErrorMessage(error, "Unable to log in"));
  }

  return data;
};

/** Inicia autenticación OAuth con Google y redirige de vuelta al dashboard. */
export const signInWithGoogle = async () => {
  const supabase = getSupabaseClient();
  const redirectTo = `${window.location.origin}/dashboard`;
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo },
  });

  if (error) {
    throw new Error(getErrorMessage(error, "Unable to sign in with Google"));
  }

  return data;
};

/** Registra un usuario nuevo en Supabase con metadatos iniciales de plan y rol. */
export const register = async ({ email, password }) => {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        role: "user",
        plan: "free",
      },
    },
  });

  if (error) {
    throw new Error(getErrorMessage(error, "Unable to register user"));
  }

  return data;
};

/** Solicita email de recuperación de contraseña con URL de retorno al frontend. */
export const requestPasswordReset = async ({ email, redirectTo }) => {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo,
  });

  if (error) {
    throw new Error(getErrorMessage(error, "Unable to request password reset"));
  }

  return data;
};

/** Establece sesión temporal de recovery usando access_token y refresh_token del enlace. */
export const setRecoverySession = async ({ accessToken, refreshToken }) => {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.auth.setSession({
    access_token: accessToken,
    refresh_token: refreshToken,
  });

  if (error) {
    throw new Error(getErrorMessage(error, "Unable to validate recovery session"));
  }

  return data;
};

/** Actualiza la contraseña del usuario autenticado en el flujo de recovery. */
export const updatePassword = async ({ password }) => {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.auth.updateUser({ password });

  if (error) {
    throw new Error(getErrorMessage(error, "Unable to update password"));
  }

  return data;
};

/** Cierra sesión en Supabase y revoca el contexto de autenticación local. */
export const logout = async () => {
  const supabase = getSupabaseClient();
  const { error } = await supabase.auth.signOut({ scope: "global" });

  if (!error) {
    return;
  }

  /**
   * Fallback local para evitar sesiones zombis cuando el sign-out global falla
   * (ej. red intermitente, timeout o backend de auth temporalmente no disponible).
   */
  const { error: localError } = await supabase.auth.signOut({ scope: "local" });

  if (localError) {
    throw new Error(getErrorMessage(localError, "Unable to log out"));
  }
};

/** Recupera el usuario actual desde la sesión persistida de Supabase Auth. */
export const getCurrentUser = async () => {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.auth.getSession();

  if (error) {
    throw new Error(getErrorMessage(error, "Unable to get current session"));
  }

  return data?.session?.user || null;
};

/** Devuelve el JWT actual para autenticar llamadas backend con cabecera Bearer. */
export const getAccessToken = async () => {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.auth.getSession();

  if (error) {
    throw new Error(getErrorMessage(error, "Unable to get current access token"));
  }

  return data?.session?.access_token || null;
};

/** Lee el perfil de negocio asociado al usuario para plan, rol y metadatos de cuenta. */
export const getProfileByUserId = async (userId) => {
  if (!userId) {
    return null;
  }

  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("id, display_name, avatar_url, role, plan, created_at")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    throw new Error(getErrorMessage(error, "Unable to get profile"));
  }

  return data || null;
};

/** Suscribe cambios de sesión y devuelve una funcion de limpieza de suscripcion. */
export const onAuthStateChange = (callback) => {
  const supabase = getSupabaseClient();
  const { data } = supabase.auth.onAuthStateChange((event, session) => {
    callback(event, session?.user || null);
  });

  return () => {
    data.subscription.unsubscribe();
  };
};
