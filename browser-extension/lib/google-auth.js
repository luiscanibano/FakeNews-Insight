/**
 * @file google-auth.js
 * @description Login con Google a traves de Supabase usando
 * `chrome.identity.launchWebAuthFlow`. El flujo es:
 *
 *   1. Pedimos a Supabase la URL de autorizacion para `provider=google`
 *      indicando que el redirect final sea el URI propio de la extension
 *      (https://<extension-id>.chromiumapp.org/).
 *   2. Chrome abre Google en una ventana controlada por el navegador,
 *      el usuario consiente y Google -> Supabase -> nuestro redirect.
 *   3. Supabase devuelve los tokens en el fragmento (#) de la URL final.
 *      Los parseamos y los guardamos como una sesión mas.
 *
 * Requisito imprescindible en Supabase Dashboard:
 *   Auth -> URL Configuration -> Redirect URLs:
 *     anade `https://<TU_EXTENSION_ID>.chromiumapp.org/`
 *   El ID lo ves en chrome://extensions junto a la extension cargada.
 */

import { CONFIG } from "./config.js";
import { saveSession } from "./storage.js";

/** Devuelve `https://<extension-id>.chromiumapp.org/`. */
const getRedirectUri = () => chrome.identity.getRedirectURL();

const buildAuthorizeUrl = () => {
  const url = new URL(`${CONFIG.SUPABASE_URL}/auth/v1/authorize`);
  url.searchParams.set("provider", "google");
  url.searchParams.set("redirect_to", getRedirectUri());
  return url.toString();
};

/**
 * Parsea el fragmento `#access_token=...&refresh_token=...&...` que devuelve
 * Supabase tras un login OAuth y construye el shape interno de sesión.
 *
 * El campo `email` no viene en el fragment; lo decodificamos del JWT
 * (es un payload base64url estandar de Supabase).
 */
const parseSessionFromCallbackUrl = (callbackUrl) => {
  const url = new URL(callbackUrl);
  // Supabase usa el fragment, no el query string.
  const fragment = url.hash.startsWith("#") ? url.hash.slice(1) : url.hash;
  const params = new URLSearchParams(fragment);

  const accessToken = params.get("access_token");
  const refreshToken = params.get("refresh_token");
  const expiresIn = Number(params.get("expires_in") || 0);
  const errorDescription = params.get("error_description") || params.get("error");

  if (errorDescription) {
    throw new Error(decodeURIComponent(errorDescription));
  }

  if (!accessToken || !refreshToken) {
    throw new Error("Respuesta de Google/Supabase incompleta.");
  }

  let userEmail = "";
  try {
    const payload = accessToken.split(".")[1];
    const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized.padEnd(
      normalized.length + ((4 - (normalized.length % 4)) % 4),
      "="
    );
    const decoded = JSON.parse(atob(padded));
    userEmail = decoded?.email || decoded?.user_metadata?.email || "";
  } catch {
    /** Sin email no pasa nada: la cabecera lo mostrara vacio. */
  }

  return {
    accessToken,
    refreshToken,
    expiresAt: Date.now() + expiresIn * 1000,
    userEmail,
  };
};

/**
 * Lanza el flujo OAuth con Google y persiste la sesión resultante.
 * Devuelve la sesión al popup para que actualice la UI.
 */
export const signInWithGoogle = async () => {
  const authorizeUrl = buildAuthorizeUrl();

  const callbackUrl = await new Promise((resolve, reject) => {
    chrome.identity.launchWebAuthFlow(
      { url: authorizeUrl, interactive: true },
      (responseUrl) => {
        const error = chrome.runtime.lastError;
        if (error) {
          reject(new Error(error.message || "El flujo de Google fue cancelado."));
          return;
        }
        if (!responseUrl) {
          reject(new Error("Google no devolvio ninguna respuesta."));
          return;
        }
        resolve(responseUrl);
      }
    );
  });

  const session = parseSessionFromCallbackUrl(callbackUrl);
  await saveSession(session);
  return session;
};

/** Util para que el popup pueda mostrar el redirect URI a copiar al README. */
export const getExtensionRedirectUri = getRedirectUri;
