import { getSupabaseClient } from "./supabase";

// Traduce errores tecnicos a mensajes mas claros para la interfaz.
const getErrorMessage = (error, fallbackMessage) => {
  const message = error?.message || fallbackMessage;
  const normalizedMessage = message.toLowerCase();

  if (
    normalizedMessage.includes("email rate limit exceeded") ||
    normalizedMessage.includes("rate limit")
  ) {
    return "Has superado el limite de correos de recuperacion. Espera un minuto e intentalo de nuevo.";
  }

  return message;
};

// Inicia sesion con email/contrasena.
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

// Inicia sesion con Google OAuth usando redireccion al dashboard.
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

// Registra un nuevo usuario.
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

// Solicita email de recuperacion con URL de retorno al frontend.
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

// Establece sesion temporal de recuperacion a partir de tokens del enlace.
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

// Actualiza la contrasena del usuario autenticado.
export const updatePassword = async ({ password }) => {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.auth.updateUser({ password });

  if (error) {
    throw new Error(getErrorMessage(error, "Unable to update password"));
  }

  return data;
};

// Cierra sesion en Supabase y elimina la sesion local persistida.
export const logout = async () => {
  const supabase = getSupabaseClient();
  const { error } = await supabase.auth.signOut();

  if (error) {
    throw new Error(getErrorMessage(error, "Unable to log out"));
  }
};

// Lee el usuario actual desde la sesion persistida de Supabase.
export const getCurrentUser = async () => {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.auth.getSession();

  if (error) {
    throw new Error(getErrorMessage(error, "Unable to get current session"));
  }

  return data?.session?.user || null;
};

// Obtiene el perfil de negocio (roles/plan) de un usuario autenticado.
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

// Escucha cambios de sesion (login, logout, refresh, OAuth callback).
export const onAuthStateChange = (callback) => {
  const supabase = getSupabaseClient();
  const { data } = supabase.auth.onAuthStateChange((_event, session) => {
    callback(session?.user || null);
  });

  return () => {
    data.subscription.unsubscribe();
  };
};
