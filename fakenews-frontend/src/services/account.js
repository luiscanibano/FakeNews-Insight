/**
 * @file account.js
 * @description Servicios de gestion de cuenta del usuario (RGPD): cambio de contraseña y baja.
 */

import { getSupabaseClient } from "./supabase";
import { updatePassword } from "./auth";
import { resolveApiBaseUrl } from "../lib/apiBaseUrl";
import { withTimeout } from "../lib/promiseTimeout";
import { AUTH_REQUEST_TIMEOUT_MS } from "../lib/constants";

const DEFAULT_ACCOUNT_DELETE_PATH = "/account/delete";
const ACCOUNT_REQUEST_TIMEOUT_MS = 20000;

const normalizePath = (path, fallbackPath) => {
  if (!path) {
    return fallbackPath;
  }

  return path.startsWith("/") ? path : `/${path}`;
};

const ACCOUNT_API_BASE_URL = resolveApiBaseUrl(import.meta.env.VITE_ANALYSIS_API_BASE_URL);

const ACCOUNT_DELETE_ENDPOINT = `${ACCOUNT_API_BASE_URL}${normalizePath(
  import.meta.env.VITE_ACCOUNT_DELETE_PATH?.trim(),
  DEFAULT_ACCOUNT_DELETE_PATH
)}`;

/** Reautentica al usuario con su contraseña actual y luego actualiza la contraseña. */
export const changeAccountPassword = async ({ email, currentPassword, newPassword }) => {
  if (!email) {
    throw new Error("No se pudo obtener el email del usuario actual.");
  }

  if (!currentPassword || !newPassword) {
    throw new Error("Introduce la contraseña actual y la nueva contraseña.");
  }

  if (newPassword.length < 8) {
    throw new Error("La nueva contraseña debe tener al menos 8 caracteres.");
  }

  if (newPassword === currentPassword) {
    throw new Error("La nueva contraseña debe ser distinta de la actual.");
  }

  const supabase = getSupabaseClient();

  const { error: signInError } = await withTimeout(
    supabase.auth.signInWithPassword({
      email,
      password: currentPassword,
    }),
    AUTH_REQUEST_TIMEOUT_MS,
    "No se pudo validar tu contraseña actual a tiempo. Reintenta en unos segundos."
  );

  if (signInError) {
    throw new Error("La contraseña actual no es correcta.");
  }

  await updatePassword({ password: newPassword });

  return { updated: true };
};

/** Solicita al backend la baja definitiva de la cuenta. */
export const deleteAccount = async ({ jwtToken, confirmation }) => {
  if (!jwtToken) {
    throw new Error("Tu sesión no es válida. Inicia sesión de nuevo.");
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
      throw new Error("La solicitud tardó demasiado. Reintenta en unos segundos.");
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
