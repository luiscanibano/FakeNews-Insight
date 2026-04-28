/**
 * @file storage.js
 * @description Wrappers asincronos sobre `chrome.storage.local` para guardar y
 * recuperar la sesiÃ³n de Supabase de forma aislada al sitio web.
 */

const STORAGE_KEY = "fakenews-insight-session";

/**
 * Persiste la sesiÃ³n completa (tokens + metadatos) en `chrome.storage.local`.
 * @param {{ accessToken: string, refreshToken: string, expiresAt: number, userEmail: string }} session
 */
export const saveSession = (session) =>
  new Promise((resolve, reject) => {
    chrome.storage.local.set({ [STORAGE_KEY]: session }, () => {
      const error = chrome.runtime.lastError;
      if (error) {
        reject(new Error(error.message));
        return;
      }
      resolve();
    });
  });

/**
 * Lee la sesiÃ³n guardada. Devuelve `null` si no hay ninguna.
 * @returns {Promise<null | { accessToken: string, refreshToken: string, expiresAt: number, userEmail: string }>}
 */
export const loadSession = () =>
  new Promise((resolve, reject) => {
    chrome.storage.local.get([STORAGE_KEY], (result) => {
      const error = chrome.runtime.lastError;
      if (error) {
        reject(new Error(error.message));
        return;
      }
      resolve(result?.[STORAGE_KEY] || null);
    });
  });

/** Borra la sesiÃ³n guardada (logout local). */
export const clearSession = () =>
  new Promise((resolve, reject) => {
    chrome.storage.local.remove([STORAGE_KEY], () => {
      const error = chrome.runtime.lastError;
      if (error) {
        reject(new Error(error.message));
        return;
      }
      resolve();
    });
  });
