/**
 * @file sessionActivity.js
 * @description Utilidades de sesion para persistir y consultar la ultima actividad del usuario autenticado.
 */

const SESSION_ACTIVITY_STORAGE_KEY = "fakenews:session-activity";

/** Lee objeto de actividad desde localStorage con tolerancia a payload invalido. */
const readStoredSessionActivity = () => {
  if (typeof window === "undefined") {
    return null;
  }

  const rawValue = window.localStorage.getItem(SESSION_ACTIVITY_STORAGE_KEY);
  if (!rawValue) {
    return null;
  }

  try {
    const parsed = JSON.parse(rawValue);

    if (!parsed || typeof parsed !== "object") {
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
};

/** Devuelve el timestamp bruto de actividad almacenado, sin filtrar por usuario. */
export const readLastActivityAt = () => {
  const stored = readStoredSessionActivity();

  if (!stored) {
    return null;
  }

  const numericTimestamp = Number(stored.lastActivityAt);
  if (!Number.isFinite(numericTimestamp) || numericTimestamp <= 0) {
    return null;
  }

  return numericTimestamp;
};

/** Devuelve timestamp de actividad para un usuario concreto o null si no existe. */
export const readLastActivityAtForUser = (userId) => {
  const stored = readStoredSessionActivity();

  if (!stored || stored.userId !== userId) {
    return null;
  }

  const numericTimestamp = Number(stored.lastActivityAt);
  if (!Number.isFinite(numericTimestamp) || numericTimestamp <= 0) {
    return null;
  }

  return numericTimestamp;
};

/** Persiste timestamp de actividad asociado al usuario autenticado actual. */
export const persistLastActivityAtForUser = (userId, timestamp = Date.now()) => {
  if (typeof window === "undefined" || !userId) {
    return;
  }

  window.localStorage.setItem(
    SESSION_ACTIVITY_STORAGE_KEY,
    JSON.stringify({
      userId,
      lastActivityAt: timestamp,
    })
  );
};

/** Limpia por completo la marca de actividad persistida de sesion. */
export const clearSessionActivity = () => {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(SESSION_ACTIVITY_STORAGE_KEY);
};
