/**
 * @file account.js
 * @description Servicios de gestion de cuenta del usuario (RGPD): cambio de contrasena y baja.
 */

import { getSupabaseClient } from "./supabase";

const DEFAULT_ACCOUNT_API_BASE_URL = "http://127.0.0.1:8000";
const DEFAULT_ACCOUNT_DELETE_PATH = "/account/delete";
const ACCOUNT_REQUEST_TIMEOUT_MS = 20000;

const normalizeBaseUrl = (baseUrl) => baseUrl.replace(/\/+$/, "");
const normalizePath = (path, fallbackPath) => {
  if (!path) {
    return fallbackPath;
  }

  return path.startsWith("/") ? path : `/${path}`;
};

const ACCOUNT_API_BASE_URL = normalizeBaseUrl(
  import.meta.env.VITE_ANALYSIS_API_BASE_URL?.trim() ||
    DEFAULT_ACCOUNT_API_BASE_URL
);

const ACCOUNT_DELETE_ENDPOINT = `${ACCOUNT_API_BASE_URL}${normalizePath(
  import.meta.env.VITE_ACCOUNT_DELETE_PATH?.trim(),
  DEFAULT_ACCOUNT_DELETE_PATH
)}`;

/** Reautentica al usuario con su contrasena actual y luego actualiza la contrasena. */
export const changeAccountPassword = async ({ email, currentPassword, newPassword }) => {
  if (!email) {
    throw new Error("No se pudo obtener el email del usuario actual.");
  }

  if (!currentPassword || !newPassword) {
    throw new Error("Introduce la contrasena actual y la nueva contrasena.");
  }

  if (newPassword.length < 8) {
    throw new Error("La nueva contrasena debe tener al menos 8 caracteres.");
  }

  if (newPassword === currentPassword) {
    throw new Error("La nueva contrasena debe ser distinta de la actual.");
  }

  const supabase = getSupabaseClient();

  const { error: signInError } = await supabase.auth.signInWithPassword({
    email,
    password: currentPassword,
  });

  if (signInError) {
    throw new Error("La contrasena actual no es correcta.");
  }

  const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });

  if (updateError) {
    throw new Error(updateError.message || "No se pudo actualizar la contrasena.");
  }

  return { updated: true };
};

/** Solicita al backend la baja definitiva de la cuenta. */
export const deleteAccount = async ({ jwtToken, confirmation }) => {
  if (!jwtToken) {
    throw new Error("Tu sesion no es valida. Inicia sesion de nuevo.");
  }

  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => {
    controller.abort();
  }, ACCOUNT_REQUEST_TIMEOUT_MS);

  let response;
  try {
    response = await fetch(ACCOUNT_DELETE_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${jwtToken}`,
      },
      body: JSON.stringify({ confirmation }),
      signal: controller.signal,
    });
  } catch (error) {
    if (error?.name === "AbortError") {
      throw new Error("La solicitud tardo demasiado. Reintenta en unos segundos.");
    }

    throw new Error("No se pudo conectar con el backend para eliminar la cuenta.");
  } finally {
    window.clearTimeout(timeoutId);
  }

  if (!response.ok) {
    let detail = "No se pudo eliminar la cuenta.";
    try {
      const payload = await response.json();
      if (typeof payload?.detail === "string" && payload.detail.trim()) {
        detail = payload.detail;
      }
    } catch {
      /** Ignora errores de parseo. */
    }

    throw new Error(detail);
  }

  return response.json();
};
