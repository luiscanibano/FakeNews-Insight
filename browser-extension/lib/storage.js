/**
 * @file storage.js
 * @description Wrappers asincronos sobre `chrome.storage.local` para guardar y
 * recuperar la sesion de Supabase de forma aislada al sitio web.
 */

const STORAGE_KEY = "fakenews-insight-session";
const VERIFICATION_TASKS_KEY = "fakenews-insight-verification-tasks";
const SELECTED_VERIFICATION_TASK_KEY = "fakenews-insight-selected-verification-task";

const setStorageEntries = (entries) =>
  new Promise((resolve, reject) => {
    chrome.storage.local.set(entries, () => {
      const error = chrome.runtime.lastError;
      if (error) {
        reject(new Error(error.message));
        return;
      }
      resolve();
    });
  });

const getStorageEntries = (keys) =>
  new Promise((resolve, reject) => {
    chrome.storage.local.get(keys, (result) => {
      const error = chrome.runtime.lastError;
      if (error) {
        reject(new Error(error.message));
        return;
      }
      resolve(result || {});
    });
  });

const removeStorageEntries = (keys) =>
  new Promise((resolve, reject) => {
    chrome.storage.local.remove(keys, () => {
      const error = chrome.runtime.lastError;
      if (error) {
        reject(new Error(error.message));
        return;
      }
      resolve();
    });
  });

/**
 * Persiste la sesion completa (tokens + metadatos) en `chrome.storage.local`.
 * @param {{ accessToken: string, refreshToken: string, expiresAt: number, userEmail: string }} session
 */
export const saveSession = (session) =>
  setStorageEntries({ [STORAGE_KEY]: session });

/**
 * Lee la sesion guardada. Devuelve `null` si no hay ninguna.
 * @returns {Promise<null | { accessToken: string, refreshToken: string, expiresAt: number, userEmail: string }>}
 */
export const loadSession = () =>
  getStorageEntries([STORAGE_KEY]).then((result) => result?.[STORAGE_KEY] || null);

/** Borra la sesion guardada (logout local). */
export const clearSession = () =>
  removeStorageEntries([
    STORAGE_KEY,
    VERIFICATION_TASKS_KEY,
    SELECTED_VERIFICATION_TASK_KEY,
  ]);

export const loadVerificationTasks = () =>
  getStorageEntries([VERIFICATION_TASKS_KEY]).then((result) => {
    const tasks = result?.[VERIFICATION_TASKS_KEY];
    return Array.isArray(tasks) ? tasks : [];
  });

export const saveVerificationTasks = (tasks) =>
  setStorageEntries({
    [VERIFICATION_TASKS_KEY]: Array.isArray(tasks) ? tasks : [],
  });

export const clearVerificationTasks = () =>
  removeStorageEntries([VERIFICATION_TASKS_KEY, SELECTED_VERIFICATION_TASK_KEY]);

export const upsertVerificationTask = async (task) => {
  if (!task || typeof task !== "object") {
    return [];
  }

  const taskId = String(task.taskId || task.runId || task.run_id || "").trim();
  if (!taskId) {
    throw new Error("taskId es obligatorio para persistir una tarea de verificacion.");
  }

  const tasks = await loadVerificationTasks();
  const nextTasks = [...tasks];
  const index = nextTasks.findIndex((entry) => {
    const entryTaskId = String(entry?.taskId || entry?.runId || entry?.run_id || "").trim();
    return entryTaskId === taskId;
  });

  if (index >= 0) {
    nextTasks[index] = { ...nextTasks[index], ...task, taskId };
  } else {
    nextTasks.unshift({ ...task, taskId });
  }

  await saveVerificationTasks(nextTasks);
  return nextTasks;
};

export const removeVerificationTask = async (taskId) => {
  const normalizedTaskId = String(taskId || "").trim();
  if (!normalizedTaskId) {
    return [];
  }

  const tasks = await loadVerificationTasks();
  const nextTasks = tasks.filter((task) => {
    const currentTaskId = String(task?.taskId || task?.runId || task?.run_id || "").trim();
    return currentTaskId !== normalizedTaskId;
  });

  await saveVerificationTasks(nextTasks);

  const selectedTaskId = await loadSelectedVerificationTaskId();
  if (selectedTaskId === normalizedTaskId) {
    await clearSelectedVerificationTaskId();
  }

  return nextTasks;
};

export const loadSelectedVerificationTaskId = () =>
  getStorageEntries([SELECTED_VERIFICATION_TASK_KEY]).then(
    (result) => result?.[SELECTED_VERIFICATION_TASK_KEY] || null
  );

export const saveSelectedVerificationTaskId = (taskId) =>
  setStorageEntries({
    [SELECTED_VERIFICATION_TASK_KEY]: String(taskId || "").trim() || null,
  });

export const clearSelectedVerificationTaskId = () =>
  removeStorageEntries([SELECTED_VERIFICATION_TASK_KEY]);
