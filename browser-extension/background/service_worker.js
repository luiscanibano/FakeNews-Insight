/**
 * @file service_worker.js
 * @description Background service worker (MV3). Atiende peticiones del content
 * script para hacer fetch al backend desde el origen `chrome-extension://...`,
 * evitando los problemas de CORS que aparecen al lanzar fetch desde el origen
 * de la página anfitriona. El popup sigue llamando a la API directamente.
 */

import {
  buildVerificationHistorySavePayload,
  getVerificationStatus,
  saveVerificationHistoryPayload,
  submitVerification,
  VERIFY_STATUS,
  verifyText,
} from "../lib/api.js";
import {
  clearSelectedVerificationTaskId,
  clearVerificationTasks,
  loadSelectedVerificationTaskId,
  loadVerificationTasks,
  removeVerificationTask,
  saveSelectedVerificationTaskId,
  upsertVerificationTask,
} from "../lib/storage.js";

const TASK_POLL_DELAY_MS = 1500;
const TASK_POLL_ALARM_NAME = "verification-task-poll";
const TASK_POLL_ALARM_PERIOD_MINUTES = 0.5;
const activeTaskPollers = new Map();

const isActiveTaskStatus = (status) =>
  status === VERIFY_STATUS.PENDING || status === VERIFY_STATUS.PROCESSING;

const canUseAlarms = () => Boolean(chrome?.alarms?.create);

const isMissingVerificationStatusError = (error) => {
  if (!error) {
    return false;
  }

  if (error?.status === 404) {
    return true;
  }

  return /no existe una verificacion con ese id|not found/i.test(String(error?.message || ""));
};

const createLocalTaskId = () => {
  if (globalThis.crypto?.randomUUID) {
    return `local-${globalThis.crypto.randomUUID()}`;
  }

  return `local-${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

const looksLikeVerificationReport = (payload) => {
  if (!payload || typeof payload !== "object") {
    return false;
  }

  const hasOverallLabel = typeof payload.overall_label === "string" || typeof payload.veredicto_global === "string";
  const hasClaims = Array.isArray(payload.claims) || Array.isArray(payload.afirmaciones);
  const hasSummary = typeof payload.summary === "string" || typeof payload.resumen === "string";

  return hasOverallLabel || hasClaims || hasSummary;
};

const extractSubmissionResult = (submission) => {
  if (submission?.result && typeof submission.result === "object") {
    return submission.result;
  }

  if (!looksLikeVerificationReport(submission)) {
    return null;
  }

  return {
    ...submission,
    run_id: submission?.run_id || null,
  };
};

const normalizeTask = (task = {}) => {
  const taskId = String(task.taskId || task.runId || task.run_id || "").trim();
  const hasRunId = task.runId !== undefined || task.run_id !== undefined;
  const runId = hasRunId
    ? String(task.runId ?? task.run_id ?? "").trim() || null
    : String(taskId || "").trim() || null;
  const now = new Date().toISOString();
  return {
    taskId,
    runId,
    jobId: task.jobId || task.job_id || null,
    status: String(task.status || VERIFY_STATUS.PENDING).trim() || VERIFY_STATUS.PENDING,
    error: task.error || null,
    result: task.result || null,
    source: task.source || "popup",
    inputText: task.inputText || "",
    textPreview: task.textPreview || String(task.inputText || "").trim().slice(0, 220),
    createdAt: task.createdAt || now,
    updatedAt: task.updatedAt || now,
    plan: task.plan || null,
    remainingToday: task.remainingToday ?? null,
    dailyLimit: task.dailyLimit ?? null,
    maxClaims: task.maxClaims ?? null,
    maxEvidences: task.maxEvidences ?? null,
    maxChars: task.maxChars ?? null,
    savedInHistory: Boolean(task.savedInHistory),
  };
};

const mergeTaskPayload = (task, payload = {}) =>
  normalizeTask({
    ...task,
    runId: payload?.run_id || task?.runId || null,
    jobId: payload?.job_id || task?.jobId || null,
    status: payload?.status || task?.status || VERIFY_STATUS.PENDING,
    error: payload?.error ?? task?.error ?? null,
    result: payload?.result ?? task?.result ?? null,
    plan: payload?.plan ?? task?.plan ?? null,
    remainingToday: payload?.remaining_today ?? task?.remainingToday ?? null,
    dailyLimit: payload?.daily_limit ?? task?.dailyLimit ?? null,
    maxClaims: payload?.max_claims ?? task?.maxClaims ?? null,
    maxEvidences: payload?.max_evidences ?? task?.maxEvidences ?? null,
    maxChars: payload?.max_chars ?? task?.maxChars ?? null,
    updatedAt: new Date().toISOString(),
  });

const clearTaskPoller = (taskId) => {
  const activePoller = activeTaskPollers.get(taskId);
  if (activePoller) {
    clearTimeout(activePoller);
    activeTaskPollers.delete(taskId);
  }
};

const loadTaskById = async (taskId) => {
  const normalizedTaskId = String(taskId || "").trim();
  if (!normalizedTaskId) {
    return null;
  }

  const tasks = await loadVerificationTasks();
  return (
    tasks.find(
      (task) => String(task?.taskId || task?.runId || task?.run_id || "").trim() === normalizedTaskId
    ) || null
  );
};

const persistTask = async (task) => {
  const normalizedTask = normalizeTask(task);
  await upsertVerificationTask(normalizedTask);
  return normalizedTask;
};

const syncPollingAlarm = async () => {
  if (!canUseAlarms()) {
    return;
  }

  const tasks = await loadVerificationTasks();
  const hasActiveTasks = tasks.some((task) => isActiveTaskStatus(task?.status));

  if (!hasActiveTasks) {
    await chrome.alarms.clear(TASK_POLL_ALARM_NAME);
    return;
  }

  chrome.alarms.create(TASK_POLL_ALARM_NAME, {
    delayInMinutes: TASK_POLL_ALARM_PERIOD_MINUTES,
    periodInMinutes: TASK_POLL_ALARM_PERIOD_MINUTES,
  });
};

const refreshTaskStatus = async (taskId) => {
  const task = await loadTaskById(taskId);
  if (!task) {
    clearTaskPoller(taskId);
    return null;
  }

  if (!isActiveTaskStatus(task.status) || task.result) {
    clearTaskPoller(task.taskId || taskId);
    void syncPollingAlarm();
    return task;
  }

  if (!task?.runId) {
    clearTaskPoller(taskId);
    return null;
  }

  let payload;
  try {
    payload = await getVerificationStatus(task.runId);
  } catch (error) {
    if (error?.name === "SessionExpiredError") {
      throw error;
    }

    if (isActiveTaskStatus(task?.status) && isMissingVerificationStatusError(error)) {
      scheduleTaskPolling(task.taskId, TASK_POLL_DELAY_MS * 2);
      void syncPollingAlarm();
      return task;
    }

    throw error;
  }

  const nextTask = await persistTask(mergeTaskPayload(task, payload));

  if (isActiveTaskStatus(nextTask.status)) {
    scheduleTaskPolling(nextTask.taskId);
  } else {
    clearTaskPoller(nextTask.taskId);
  }

  void syncPollingAlarm();

  return nextTask;
};

const scheduleTaskPolling = (taskId, delayMs = TASK_POLL_DELAY_MS) => {
  const normalizedTaskId = String(taskId || "").trim();
  void syncPollingAlarm();
  if (!normalizedTaskId || activeTaskPollers.has(normalizedTaskId)) {
    return;
  }

  const timerId = setTimeout(async () => {
    activeTaskPollers.delete(normalizedTaskId);
    try {
      await refreshTaskStatus(normalizedTaskId);
    } catch (error) {
      const task = await loadTaskById(normalizedTaskId);
      if (!task) {
        return;
      }

      if (!isActiveTaskStatus(task?.status) || task?.result) {
        clearTaskPoller(normalizedTaskId);
        void syncPollingAlarm();
        return;
      }

      if (error?.name === "SessionExpiredError") {
        clearTaskPoller(normalizedTaskId);
        void syncPollingAlarm();
        return;
      }

      await persistTask(
        normalizeTask({
          ...task,
          status: VERIFY_STATUS.FAILED,
          error: error?.message || "No se pudo actualizar el estado de la verificacion.",
          updatedAt: new Date().toISOString(),
        })
      );
      void syncPollingAlarm();
    }
  }, delayMs);

  activeTaskPollers.set(normalizedTaskId, timerId);
};

const createVerificationTask = async ({ text = "", source = "popup" } = {}) => {
  const taskId = createLocalTaskId();
  const provisionalTask = await persistTask(
    normalizeTask({
      taskId,
      runId: null,
      jobId: null,
      status: VERIFY_STATUS.PENDING,
      source,
      inputText: text,
      textPreview: String(text || "").trim().slice(0, 220),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      plan: null,
      remainingToday: null,
      dailyLimit: null,
      maxClaims: null,
      maxEvidences: null,
      maxChars: null,
      error: null,
      result: null,
    })
  );

  await saveSelectedVerificationTaskId(provisionalTask.taskId);

  void syncPollingAlarm();

  (async () => {
    try {
      const submission = await submitVerification(text);
      const submissionResult = extractSubmissionResult(submission);
      const submissionStatus = submission?.status || (submissionResult ? VERIFY_STATUS.COMPLETED : VERIFY_STATUS.PENDING);
      const persistedTask = await persistTask(
        normalizeTask({
          ...provisionalTask,
          runId: submission?.run_id || provisionalTask.runId || null,
          jobId: submission?.job_id || provisionalTask.jobId || null,
          status: submissionStatus,
          plan: submission?.plan || provisionalTask.plan || null,
          remainingToday: submission?.remaining_today ?? provisionalTask.remainingToday ?? null,
          dailyLimit: submission?.daily_limit ?? provisionalTask.dailyLimit ?? null,
          maxClaims: submission?.max_claims ?? provisionalTask.maxClaims ?? null,
          maxEvidences: submission?.max_evidences ?? provisionalTask.maxEvidences ?? null,
          maxChars: submission?.max_chars ?? provisionalTask.maxChars ?? null,
          error: submission?.error || null,
          result: submissionResult,
          updatedAt: new Date().toISOString(),
        })
      );

      if (isActiveTaskStatus(persistedTask.status)) {
        scheduleTaskPolling(persistedTask.taskId, 0);
      }

      void syncPollingAlarm();
    } catch (error) {
      await persistTask(
        normalizeTask({
          ...provisionalTask,
          status: VERIFY_STATUS.FAILED,
          error: error?.message || "No se pudo encolar la verificacion.",
          updatedAt: new Date().toISOString(),
        })
      );
      void syncPollingAlarm();
    }
  })();

  return provisionalTask;
};

const listVerificationTasks = async () => {
  const tasks = await loadVerificationTasks();
  const sortedTasks = [...tasks].sort((left, right) => {
    const leftTime = Date.parse(left?.updatedAt || left?.createdAt || 0) || 0;
    const rightTime = Date.parse(right?.updatedAt || right?.createdAt || 0) || 0;
    return rightTime - leftTime;
  });

  sortedTasks.forEach((task) => {
    if (isActiveTaskStatus(task?.status)) {
      scheduleTaskPolling(task.taskId);
    }
  });

  return sortedTasks;
};

const getVerificationTaskState = async () => ({
  tasks: await listVerificationTasks(),
  selectedTaskId: await loadSelectedVerificationTaskId(),
});

const getVerificationTask = async ({ taskId = "", refresh = false } = {}) => {
  const normalizedTaskId = String(taskId || "").trim();
  if (!normalizedTaskId) {
    throw new Error("taskId es obligatorio.");
  }

  const currentTask = await loadTaskById(normalizedTaskId);
  if (!currentTask) {
    throw new Error("No se encontro la tarea solicitada.");
  }

  if (refresh && isActiveTaskStatus(currentTask.status) && !currentTask.result) {
    const refreshedTask = await refreshTaskStatus(normalizedTaskId);
    if (refreshedTask) {
      return refreshedTask;
    }
  }

  if (isActiveTaskStatus(currentTask.status)) {
    scheduleTaskPolling(currentTask.taskId);
  }

  return currentTask;
};

const dismissVerificationTask = async ({ taskId = "" } = {}) => {
  const normalizedTaskId = String(taskId || "").trim();
  clearTaskPoller(normalizedTaskId);
  await removeVerificationTask(normalizedTaskId);
  void syncPollingAlarm();
  return listVerificationTasks();
};

const clearVerificationTaskState = async () => {
  [...activeTaskPollers.keys()].forEach((taskId) => {
    clearTaskPoller(taskId);
  });
  await clearSelectedVerificationTaskId();
  await clearVerificationTasks();
  await syncPollingAlarm();
  return [];
};

const selectVerificationTask = async ({ taskId = "" } = {}) => {
  const normalizedTaskId = String(taskId || "").trim();
  await saveSelectedVerificationTaskId(normalizedTaskId || null);
  return normalizedTaskId || null;
};

const hydratePendingTasks = async () => {
  const tasks = await loadVerificationTasks();
  tasks.forEach((task) => {
    if (isActiveTaskStatus(task?.status)) {
      scheduleTaskPolling(task.taskId, 0);
    }
  });
  await syncPollingAlarm();
};

const refreshActiveTasks = async () => {
  const tasks = await loadVerificationTasks();
  const activeTasks = tasks.filter((task) => isActiveTaskStatus(task?.status));
  if (!activeTasks.length) {
    await syncPollingAlarm();
    return [];
  }

  const results = await Promise.allSettled(
    activeTasks.map((task) => refreshTaskStatus(task.taskId))
  );
  await syncPollingAlarm();
  return results;
};

const handlers = {
  "fn:verify": (msg) => verifyText(msg.text),
  "fn:verify-submit": (msg) => createVerificationTask({ text: msg.text, source: msg.source }),
  "fn:task-get": (msg) => getVerificationTask({ taskId: msg.taskId || msg.runId, refresh: Boolean(msg.refresh) }),
  "fn:tasks-list": () => listVerificationTasks(),
  "fn:tasks-state": () => getVerificationTaskState(),
  "fn:task-select": (msg) => selectVerificationTask({ taskId: msg.taskId || msg.runId }),
  "fn:task-dismiss": (msg) => dismissVerificationTask({ taskId: msg.taskId || msg.runId }),
  "fn:tasks-clear": () => clearVerificationTaskState(),
  "fn:save-history": (msg) =>
    saveVerificationHistoryPayload(
      msg.payload ||
        buildVerificationHistorySavePayload({
          runId: msg.runId,
          report: msg.report || null,
          inputText: msg.inputText || "",
        })
    ),
};

const CONTENT_SCRIPT_FILES = ["content/content.js"];

const isInjectableUrl = (url) => typeof url === "string" && /^https?:\/\//i.test(url);

const injectContentScriptIntoOpenTabs = async () => {
  const tabs = await chrome.tabs.query({});

  await Promise.all(
    tabs
      .filter((tab) => Number.isInteger(tab.id) && isInjectableUrl(tab.url))
      .map(async (tab) => {
        try {
          await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            files: CONTENT_SCRIPT_FILES,
          });
        } catch (error) {
          console.warn("[FEVER] No se pudo inyectar content script en tab", {
            tabId: tab.id,
            url: tab.url,
            error: error?.message || error,
          });
        }
      })
  );
};

chrome.runtime.onInstalled.addListener(() => {
  hydratePendingTasks().catch((error) => {
    console.error("[FEVER] No se pudieron rehidratar tareas pendientes:", error);
  });
  injectContentScriptIntoOpenTabs().catch((error) => {
    console.error("[FEVER] Inyeccion inicial fallo:", error);
  });
});

chrome.runtime.onStartup.addListener(() => {
  hydratePendingTasks().catch((error) => {
    console.error("[FEVER] No se pudieron rehidratar tareas pendientes al arrancar:", error);
  });
  injectContentScriptIntoOpenTabs().catch((error) => {
    console.error("[FEVER] Inyeccion al arrancar fallo:", error);
  });
});

if (canUseAlarms()) {
  chrome.alarms.onAlarm.addListener((alarm) => {
    if (alarm?.name !== TASK_POLL_ALARM_NAME) {
      return;
    }

    refreshActiveTasks().catch((error) => {
      console.error("[FEVER] La alarma de polling no pudo refrescar las tareas:", error);
    });
  });
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  const handler = handlers[message?.type];
  if (!handler) return false;

  (async () => {
    try {
      const data = await handler(message);
      sendResponse({ ok: true, data });
    } catch (error) {
      sendResponse({
        ok: false,
        sessionExpired: error?.name === "SessionExpiredError",
        message: error?.message || "Error desconocido.",
      });
    }
  })();

  // true => mantenemos abierto el canal para responder de forma asincrona.
  return true;
});
