/**
 * @file analysisStore.js
 * @description Store global con Zustand para centralizar tareas de verificacion asincrona.
 */

import { create } from "zustand";
import {
  getVerificationCsvStatus,
  getVerificationStatus,
  saveVerificationToHistory,
  verifyClaims,
  verifyCsv,
  verifyUrl,
} from "../services/analysis";
import { getAccessToken } from "../services/auth";

const PROGRESS_TICK_MS = 140;
const PROGRESS_CAP = 93;
const POLL_DELAY_MS = 1800;

const ACTIVE_TASK_STATUSES = new Set(["queued", "pending", "processing"]);

const progressTimerRefs = new Map();
const pollTimerRefs = new Map();

const clearTaskTimer = (timerMap, taskId) => {
  const timerId = timerMap.get(taskId);
  if (!timerId) {
    return;
  }

  if (timerMap === progressTimerRefs) {
    window.clearInterval(timerId);
  } else {
    window.clearTimeout(timerId);
  }

  timerMap.delete(taskId);
};

const clearTaskAsyncWork = (taskId) => {
  clearTaskTimer(progressTimerRefs, taskId);
  clearTaskTimer(pollTimerRefs, taskId);
};

const clearAllTaskAsyncWork = () => {
  Array.from(progressTimerRefs.keys()).forEach((taskId) => clearTaskTimer(progressTimerRefs, taskId));
  Array.from(pollTimerRefs.keys()).forEach((taskId) => clearTaskTimer(pollTimerRefs, taskId));
};

const createClientTaskId = () => {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return `verification-${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

const getDefaultTaskSource = ({ mode, inputText }) =>
  mode === "url" ? inputText : "Texto pegado manualmente";

const createVerificationTask = ({ mode, inputText }) => {
  const createdAt = Date.now();

  return {
    clientTaskId: createClientTaskId(),
    mode,
    inputText,
    excerpt: inputText.slice(0, 260),
    source: getDefaultTaskSource({ mode, inputText }),
    status: "queued",
    statusLabel: getTaskStatusLabel("queued"),
    progress: 9,
    report: null,
    analysisRunId: null,
    batchId: null,
    fileName: mode === "csv" ? inputText : null,
    jobId: null,
    error: null,
    saveLoading: false,
    saveError: null,
    savedInHistory: false,
    plan: null,
    remainingToday: null,
    dailyLimit: null,
    maxClaims: null,
    maxEvidences: null,
    maxChars: null,
    totalRows: null,
    processedRows: 0,
    successRows: 0,
    failedRows: 0,
    items: [],
    createdAt,
    updatedAt: createdAt,
    completedAt: null,
  };
};

const toVerificationResult = (task) => {
  if (!task?.report) {
    return null;
  }

  const report = {
    ...task.report,
    run_id: task.report?.run_id || task.analysisRunId || null,
    guardado_en_historial:
      task.report?.guardado_en_historial ?? task.report?.saved_in_history ?? task.savedInHistory,
    saved_in_history:
      task.report?.saved_in_history ?? task.report?.guardado_en_historial ?? task.savedInHistory,
    plan: task.report?.plan ?? task.plan ?? null,
    verificaciones_restantes_hoy:
      task.report?.verificaciones_restantes_hoy ?? task.remainingToday ?? null,
    remaining_today: task.report?.remaining_today ?? task.remainingToday ?? null,
    limite_diario: task.report?.limite_diario ?? task.dailyLimit ?? null,
    daily_limit: task.report?.daily_limit ?? task.dailyLimit ?? null,
    max_claims: task.report?.max_claims ?? task.maxClaims ?? null,
    max_evidences: task.report?.max_evidences ?? task.maxEvidences ?? null,
    max_chars: task.report?.max_chars ?? task.maxChars ?? null,
  };

  return {
    kind: "verification",
    mode: task.mode || task.report?.run_type || "text",
    source:
      task.report?.source_title ||
      task.report?.source_url ||
      task.source ||
      getDefaultTaskSource({ mode: task.mode || "text", inputText: task.inputText || "" }),
    excerpt: task.excerpt,
    inputText: task.inputText,
    report,
    analysisRunId: task.analysisRunId,
    savedInHistory: Boolean(task.savedInHistory),
  };
};

const toBatchResult = (task) => {
  if (!task || task.mode !== "csv") {
    return null;
  }

  return {
    kind: "batch",
    mode: "csv",
    fileName: task.fileName || task.inputText,
    totalRows: task.totalRows || 0,
    processedRows: task.processedRows || 0,
    successRows: task.successRows || 0,
    failedRows: task.failedRows || 0,
    suspiciousRows: task.failedRows || 0,
    items: Array.isArray(task.items) ? task.items : [],
    batchId: task.batchId || null,
    status: task.status,
    error: task.error || null,
    savedInHistory: Boolean(task.savedInHistory),
  };
};

const resolveSelectedTask = (tasks, selectedTaskId) => {
  if (!Array.isArray(tasks) || tasks.length === 0) {
    return null;
  }

  return tasks.find((task) => task.clientTaskId === selectedTaskId) || tasks[0];
};

const withDerivedState = (state) => {
  const selectedTask = resolveSelectedTask(state.tasks, state.selectedTaskId);

  return {
    ...state,
    selectedTaskId: selectedTask?.clientTaskId || null,
    result: selectedTask?.mode === "csv" ? toBatchResult(selectedTask) : toVerificationResult(selectedTask),
    isAnalysing: Boolean(selectedTask && ACTIVE_TASK_STATUSES.has(selectedTask.status)),
    analysisProgress: selectedTask?.progress || 0,
    error: selectedTask?.error || null,
    saveLoading: Boolean(selectedTask?.saveLoading),
    saveError: selectedTask?.saveError || null,
  };
};

const updateTask = (tasks, taskId, updater) =>
  tasks.map((task) =>
    task.clientTaskId === taskId
      ? {
          ...task,
          ...(typeof updater === "function" ? updater(task) : updater),
          updatedAt: Date.now(),
        }
      : task
  );

const getTaskStatusLabel = (status) => {
  switch (status) {
    case "queued":
    case "pending":
      return "En cola";
    case "processing":
      return "Analizando";
    case "completed":
      return "Completada";
    case "failed":
      return "Error";
    default:
      return "Pendiente";
  }
};

const startProgressTimer = (taskId, set) => {
  clearTaskTimer(progressTimerRefs, taskId);

  const timerId = window.setInterval(() => {
    set((state) => {
      const task = state.tasks.find((candidate) => candidate.clientTaskId === taskId);
      if (!task || !ACTIVE_TASK_STATUSES.has(task.status) || task.progress >= PROGRESS_CAP) {
        return state;
      }

      return withDerivedState({
        ...state,
        tasks: updateTask(state.tasks, taskId, (currentTask) => ({
          progress: Math.min(
            PROGRESS_CAP,
            currentTask.progress + Math.max(3, Math.round((100 - currentTask.progress) / 11))
          ),
        })),
      });
    });
  }, PROGRESS_TICK_MS);

  progressTimerRefs.set(taskId, timerId);
};

const schedulePoll = (taskId, get) => {
  clearTaskTimer(pollTimerRefs, taskId);

  const timerId = window.setTimeout(() => {
    clearTaskTimer(pollTimerRefs, taskId);
    void get().pollVerificationTask(taskId);
  }, POLL_DELAY_MS);

  pollTimerRefs.set(taskId, timerId);
};

const startVerificationTask = async ({ set, get, mode, inputText, performRequest }) => {
  const newTask = createVerificationTask({ mode, inputText });
  const clientTaskId = newTask.clientTaskId;

  set((state) =>
    withDerivedState({
      ...state,
      tasks: [newTask, ...state.tasks],
      selectedTaskId: clientTaskId,
    })
  );

  startProgressTimer(clientTaskId, set);

  try {
    const jwtToken = await getAccessToken();
    const backendResult = await performRequest(jwtToken);

    set((state) =>
      withDerivedState({
        ...state,
        tasks: updateTask(state.tasks, clientTaskId, {
          status: backendResult?.status || "pending",
          statusLabel: getTaskStatusLabel(backendResult?.status || "pending"),
          analysisRunId: backendResult?.run_id || null,
          batchId: backendResult?.batch_id || null,
          fileName: backendResult?.filename || (mode === "csv" ? inputText : null),
          jobId: backendResult?.job_id || null,
          plan: backendResult?.plan || null,
          remainingToday: backendResult?.remaining_today ?? backendResult?.remainingToday ?? null,
          dailyLimit: backendResult?.daily_limit ?? backendResult?.dailyLimit ?? null,
          maxClaims: backendResult?.max_claims ?? null,
          maxEvidences: backendResult?.max_evidences ?? null,
          maxChars: backendResult?.max_chars ?? null,
          totalRows: backendResult?.total_rows ?? null,
          processedRows: backendResult?.processed_rows ?? 0,
          successRows: backendResult?.success_rows ?? 0,
          failedRows: backendResult?.failed_rows ?? 0,
          items: Array.isArray(backendResult?.items) ? backendResult.items : [],
          source:
            backendResult?.source_title ||
            backendResult?.source_url ||
            getDefaultTaskSource({ mode, inputText }),
        }),
      })
    );

    schedulePoll(clientTaskId, get);
    return clientTaskId;
  } catch (error) {
    clearTaskAsyncWork(clientTaskId);
    set((state) =>
      withDerivedState({
        ...state,
        tasks: updateTask(state.tasks, clientTaskId, {
          status: "failed",
          statusLabel: getTaskStatusLabel("failed"),
          progress: 0,
          error: error.message,
          completedAt: Date.now(),
        }),
      })
    );
    throw error;
  }
};

export const useAnalysisStore = create((set, get) => ({
  tasks: [],
  selectedTaskId: null,
  result: null,
  isAnalysing: false,
  analysisProgress: 0,
  error: null,
  saveLoading: false,
  saveError: null,

  /** Reinicia errores de análisis y de guardado manual en historial. */
  clearError: () =>
    set((state) => {
      const selectedTask = resolveSelectedTask(state.tasks, state.selectedTaskId);
      if (!selectedTask) {
        return withDerivedState(state);
      }

      return withDerivedState({
        ...state,
        tasks: updateTask(state.tasks, selectedTask.clientTaskId, {
          error: null,
          saveError: null,
        }),
      });
    }),

  selectTask: (taskId) =>
    set((state) =>
      withDerivedState({
        ...state,
        selectedTaskId: taskId,
      })
    ),

  /** Restablece por completo el estado del flujo de análisis y limpia timers activos. */
  reset: () => {
    clearAllTaskAsyncWork();
    set(
      withDerivedState({
        tasks: [],
        selectedTaskId: null,
      })
    );
  },

  /**
  * Crea una tarea local, la envia al backend y arranca el polling hasta completar.
   */
  analyzeText: async (text) => {
    const trimmedText = text.trim();

    if (!trimmedText) {
      throw new Error("Debes indicar un texto para contrastar.");
    }

    return startVerificationTask({
      set,
      get,
      mode: "text",
      inputText: trimmedText,
      performRequest: (jwtToken) => verifyClaims({ text: trimmedText, jwtToken }),
    });
  },

  analyzeUrl: async (url) => {
    const normalizedUrl = url.trim();

    if (!normalizedUrl) {
      throw new Error("Debes indicar una URL para contrastar.");
    }

    return startVerificationTask({
      set,
      get,
      mode: "url",
      inputText: normalizedUrl,
      performRequest: (jwtToken) => verifyUrl({ url: normalizedUrl, jwtToken }),
    });
  },

  analyzeCsv: async (file) => {
    if (!(file instanceof File)) {
      throw new Error("Selecciona un archivo CSV para procesar el lote.");
    }

    return startVerificationTask({
      set,
      get,
      mode: "csv",
      inputText: file.name,
      performRequest: (jwtToken) => verifyCsv({ file, jwtToken }),
    });
  },

  pollVerificationTask: async (taskId) => {
    const task = get().tasks.find((candidate) => candidate.clientTaskId === taskId);
    const taskReference = task?.mode === "csv" ? task?.batchId : task?.analysisRunId;
    if (!task || !taskReference || !ACTIVE_TASK_STATUSES.has(task.status)) {
      return task;
    }

    try {
      const jwtToken = await getAccessToken();
      const backendResult =
        task.mode === "csv"
          ? await getVerificationCsvStatus({
              batchId: task.batchId,
              jwtToken,
            })
          : await getVerificationStatus({
              runId: task.analysisRunId,
              jwtToken,
            });
      const backendStatus = backendResult?.status || task.status;

      if (task.mode === "csv" && backendStatus === "completed") {
        clearTaskAsyncWork(taskId);
        set((state) =>
          withDerivedState({
            ...state,
            tasks: updateTask(state.tasks, taskId, {
              status: "completed",
              statusLabel: getTaskStatusLabel("completed"),
              progress: 100,
              fileName: backendResult?.filename || task.fileName,
              totalRows: backendResult?.total_rows ?? task.totalRows,
              processedRows: backendResult?.processed_rows ?? task.processedRows,
              successRows: backendResult?.success_rows ?? task.successRows,
              failedRows: backendResult?.failed_rows ?? task.failedRows,
              items: Array.isArray(backendResult?.items) ? backendResult.items : task.items,
              error: backendResult?.error || null,
              completedAt: Date.now(),
            }),
          })
        );
        return backendResult;
      }

      if (backendStatus === "completed" && backendResult?.result) {
        clearTaskAsyncWork(taskId);
        set((state) =>
          withDerivedState({
            ...state,
            tasks: updateTask(state.tasks, taskId, {
              status: "completed",
              statusLabel: getTaskStatusLabel("completed"),
              progress: 100,
              report: backendResult.result,
              source:
                backendResult?.result?.source_title ||
                backendResult?.result?.source_url ||
                task.source,
              error: null,
              completedAt: Date.now(),
            }),
          })
        );
        return backendResult;
      }

      if (backendStatus === "failed") {
        clearTaskAsyncWork(taskId);
        set((state) =>
          withDerivedState({
            ...state,
            tasks: updateTask(state.tasks, taskId, {
              status: "failed",
              statusLabel: getTaskStatusLabel("failed"),
              progress: 0,
              error: backendResult?.error || "La verificación no pudo completarse.",
              totalRows: backendResult?.total_rows ?? task.totalRows,
              processedRows: backendResult?.processed_rows ?? task.processedRows,
              successRows: backendResult?.success_rows ?? task.successRows,
              failedRows: backendResult?.failed_rows ?? task.failedRows,
              items: Array.isArray(backendResult?.items) ? backendResult.items : task.items,
              completedAt: Date.now(),
            }),
          })
        );
        return backendResult;
      }

      set((state) =>
        withDerivedState({
          ...state,
          tasks: updateTask(state.tasks, taskId, {
            status: backendStatus,
            statusLabel: getTaskStatusLabel(backendStatus),
            jobId: backendResult?.job_id || task.jobId,
            batchId: backendResult?.batch_id || task.batchId,
            fileName: backendResult?.filename || task.fileName,
            totalRows: backendResult?.total_rows ?? task.totalRows,
            processedRows: backendResult?.processed_rows ?? task.processedRows,
            successRows: backendResult?.success_rows ?? task.successRows,
            failedRows: backendResult?.failed_rows ?? task.failedRows,
            items: Array.isArray(backendResult?.items) ? backendResult.items : task.items,
            source:
              backendResult?.source_title ||
              backendResult?.source_url ||
              task.source,
          }),
        })
      );
      schedulePoll(taskId, get);
      return backendResult;
    } catch (error) {
      clearTaskAsyncWork(taskId);
      set((state) =>
        withDerivedState({
          ...state,
          tasks: updateTask(state.tasks, taskId, {
            status: "failed",
            statusLabel: getTaskStatusLabel("failed"),
            progress: 0,
            error: error.message,
            completedAt: Date.now(),
          }),
        })
      );
      throw error;
    }
  },

  saveTaskResultToHistory: async (taskId) => {
    const task = get().tasks.find((candidate) => candidate.clientTaskId === taskId);

    if (!task?.report && !task?.analysisRunId && !task?.batchId) {
      throw new Error("No hay una verificación completada para guardar.");
    }

    if (task?.savedInHistory) {
      return task;
    }

    set((state) =>
      withDerivedState({
        ...state,
        tasks: updateTask(state.tasks, taskId, {
          saveLoading: true,
          saveError: null,
        }),
      })
    );

    try {
      const jwtToken = await getAccessToken();
      const saveResponse = await saveVerificationToHistory({
        runId: task.analysisRunId,
        batchId: task.batchId,
        jwtToken,
        inputText: task.inputText,
        report: task.report,
        runType: task.mode,
      });

      clearTaskAsyncWork(taskId);
      set((state) => {
        const remainingTasks = state.tasks.filter((candidate) => candidate.clientTaskId !== taskId);
        const nextSelectedTaskId =
          state.selectedTaskId === taskId ? remainingTasks[0]?.clientTaskId || null : state.selectedTaskId;

        return withDerivedState({
          ...state,
          tasks: remainingTasks,
          selectedTaskId: nextSelectedTaskId,
        });
      });

      return saveResponse;
    } catch (error) {
      set((state) =>
        withDerivedState({
          ...state,
          tasks: updateTask(state.tasks, taskId, {
            saveLoading: false,
            saveError: error.message,
          }),
        })
      );
      throw error;
    }
  },

  /**
   * Guarda en historial la tarea actualmente seleccionada.
   */
  saveCurrentResultToHistory: async () => {
    const selectedTask = resolveSelectedTask(get().tasks, get().selectedTaskId);
    if (!selectedTask) {
      throw new Error("No hay una verificación seleccionada para guardar.");
    }

    return get().saveTaskResultToHistory(selectedTask.clientTaskId);
  },
}));
