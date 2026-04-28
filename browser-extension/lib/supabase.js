/**
 * @file supabase.js
 * @description Cliente mÃ­nimo para Supabase Auth via REST. Implementa login con
 * email/password, refresco de token y obtencion de un access_token vigente
 * para llamar al backend FastAPI sin requerir el SDK completo.
 */

import { CONFIG } from "./config.js";
import { clearSession, loadSession, saveSession } from "./storage.js";

/** Margen de seguridad: si quedan <= 60s de vida al token, lo refrescamos. */
const REFRESH_MARGIN_MS = 60 * 1000;

/** Error tipado: la sesiÃ³n no es vÃ¡lida y el usuario debe volver a iniciarla. */
export class SessionExpiredError extends Error {
  constructor(message = "Tu sesiÃ³n ha expirado. Vuelve a iniciar sesiÃ³n.") {
    super(message);
    this.name = "SessionExpiredError";
  }
}

const buildAuthUrl = (path, query) => {
  const url = new URL(`${CONFIG.SUPABASE_URL}${path}`);
  if (query) {
    Object.entries(query).forEach(([key, value]) => {
      url.searchParams.set(key, value);
    });
  }
  return url.toString();
};

/** Convierte la respuesta de Supabase Auth en el shape interno de sesiÃ³n. */
const toSessionPayload = (data) => {
  const accessToken = data?.access_token;
  const refreshToken = data?.refresh_token;
  const expiresIn = Number(data?.expires_in || 0);
  const userEmail = data?.user?.email || "";

  if (!accessToken || !refreshToken) {
    throw new Error("Respuesta de autenticaciÃ³n incompleta.");
  }

  return {
    accessToken,
    refreshToken,
    expiresAt: Date.now() + expiresIn * 1000,
    userEmail,
  };
};

const parseErrorMessage = async (response, fallback) => {
  try {
    const payload = await response.json();
    return (
      payload?.error_description ||
      payload?.msg ||
      payload?.error ||
      fallback
    );
  } catch {
    return fallback;
  }
};

/** Inicia sesiÃ³n con email/password contra Supabase Auth y persiste la sesiÃ³n. */
export const signIn = async ({ email, password }) => {
  const response = await fetch(
    buildAuthUrl("/auth/v1/token", { grant_type: "password" }),
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: CONFIG.SUPABASE_ANON_KEY,
      },
      body: JSON.stringify({ email, password }),
    }
  );

  if (!response.ok) {
    const message = await parseErrorMessage(
      response,
      "No se pudo iniciar sesiÃ³n. Revisa tus credenciales."
    );
    throw new Error(message);
  }

  const data = await response.json();
  const session = toSessionPayload(data);
  await saveSession(session);
  return session;
};

/** Refresca la sesiÃ³n usando el refresh_token y persiste el resultado. */
export const refresh = async (refreshToken) => {
  const response = await fetch(
    buildAuthUrl("/auth/v1/token", { grant_type: "refresh_token" }),
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: CONFIG.SUPABASE_ANON_KEY,
      },
      body: JSON.stringify({ refresh_token: refreshToken }),
    }
  );

  if (!response.ok) {
    await clearSession();
    throw new SessionExpiredError();
  }

  const data = await response.json();
  const session = toSessionPayload(data);
  await saveSession(session);
  return session;
};

/** Borra la sesiÃ³n local (no realiza logout server-side; basta para esta v1). */
export const signOut = () => clearSession();

/**
 * Devuelve un access_token vÃ¡lido. Si el actual va a expirar pronto, refresca.
 * Lanza `SessionExpiredError` si no hay sesiÃ³n o el refresco falla.
 */
export const getValidAccessToken = async () => {
  const session = await loadSession();
  if (!session) {
    throw new SessionExpiredError("No has iniciado sesiÃ³n.");
  }

  const remaining = session.expiresAt - Date.now();
  if (remaining > REFRESH_MARGIN_MS) {
    return session.accessToken;
  }

  const refreshed = await refresh(session.refreshToken);
  return refreshed.accessToken;
};
