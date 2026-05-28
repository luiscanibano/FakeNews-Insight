/**
 * @file auth.js
 * @description Capa de servicios para acceso a API/Supabase, transformacion de datos y manejo uniforme de errores.
 */

import { getSupabaseClient } from "./supabase";
import { buildAuthRedirectUrl } from "../lib/authRedirect";

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

const GLOBAL_SIGN_OUT_TIMEOUT_MS = 4000;

const withTimeout = (promise, timeoutMs, timeoutMessage) =>
  new Promise((resolve, reject) => {
    const timeoutId = window.setTimeout(() => {
      reject(new Error(timeoutMessage));
    }, timeoutMs);

    promise
      .then(resolve)
      .catch(reject)
      .finally(() => {
        window.clearTimeout(timeoutId);
      });
  });

const mergeAuthUsers = (fallbackUser, canonicalUser) => {
  if (!fallbackUser) {
    return canonicalUser || null;
  }

  if (!canonicalUser) {
    return fallbackUser;
  }

  return {
    ...fallbackUser,
    ...canonicalUser,
    app_metadata: {
      ...(fallbackUser.app_metadata || {}),
      ...(canonicalUser.app_metadata || {}),
    },
    user_metadata: {
      ...(fallbackUser.user_metadata || {}),
      ...(canonicalUser.user_metadata || {}),
    },
    identities: canonicalUser.identities || fallbackUser.identities || null,
  };
};

const getCanonicalAuthUser = async (supabase, fallbackUser = null) => {
  const { data, error } = await supabase.auth.getUser();

  if (error) {
    if (fallbackUser) {
      return fallbackUser;
    }

    throw new Error(getErrorMessage(error, "Unable to get authenticated user"));
  }

  return mergeAuthUsers(fallbackUser, data?.user || null);
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
  const redirectTo = buildAuthRedirectUrl("dashboard");
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
  const redirectTo = buildAuthRedirectUrl("");
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      redirectTo,
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
export const logout = async ({ scope = "global" } = {}) => {
  const supabase = getSupabaseClient();

  const runSignOut = async (signOutScope) => {
    const { error } = await supabase.auth.signOut({ scope: signOutScope });

    if (error) {
      throw error;
    }
  };

  try {
    if (scope === "local") {
      await runSignOut("local");
      return;
    }

    await withTimeout(
      runSignOut("global"),
      GLOBAL_SIGN_OUT_TIMEOUT_MS,
      "Timed out while logging out globally"
    );
    return;
  } catch {
    /**
     * Fallback local para evitar sesiones zombis cuando el sign-out global falla
     * o no responde (ej. red intermitente, timeout o backend de auth temporalmente no disponible).
     */
  }

  try {
    await runSignOut("local");
  } catch (localError) {
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

  const sessionUser = data?.session?.user || null;

  if (!sessionUser) {
    return null;
  }

  return getCanonicalAuthUser(supabase, sessionUser);
};

/** Recupera la sesión actual completa para flujos especiales como recovery. */
export const getCurrentSession = async () => {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.auth.getSession();

  if (error) {
    throw new Error(getErrorMessage(error, "Unable to get current session"));
  }

  return data?.session || null;
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
  const { data } = supabase.auth.onAuthStateChange(async (event, session) => {
    const sessionUser = session?.user || null;

    if (!sessionUser) {
      callback(event, null);
      return;
    }

    const user = await getCanonicalAuthUser(supabase, sessionUser);
    callback(event, user);
  });

  return () => {
    data.subscription.unsubscribe();
  };
};
