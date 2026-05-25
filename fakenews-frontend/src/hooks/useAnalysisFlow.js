/**
 * @file useAnalysisFlow.js
 * @description Hook que centraliza el estado y los flujos de los tres modos de análisis del dashboard.
 *
 * Encapsula:
 *  - estado local (modo activo, payloads de texto/URL/CSV, errores locales).
 *  - simulacion de progreso solo para flujos aun no conectados.
 *  - delegacion al store de análisis para texto, URL y CSV.
 */

import { useEffect, useRef, useState } from "react";
import { useAnalysisStore } from "../store/analysisStore";
import { useAuthStore } from "../store/authStore";
import { useDashboardStore } from "../store/dashboardStore";
import { ANALYSIS_MODE } from "../lib/dashboardConstants";
import { VERIFY_TEXT_MIN_LENGTH, getVerifyTextMaxLength } from "../lib/verificationLimits";

/**
 * Devuelve el estado y los handlers necesarios para alimentar `DashboardAnalyze`.
 */
export const useAnalysisFlow = ({ canUseCsvAnalysis, plan }) => {
  const user = useAuthStore((state) => state.user);
  const [analysisMode, setAnalysisMode] = useState(ANALYSIS_MODE.TEXT);
  const [textPayload, setTextPayload] = useState("");
  const [urlPayload, setUrlPayload] = useState("");
  const [csvFile, setCsvFile] = useState(null);
  const [localError, setLocalError] = useState("");
  const [mockResult, setMockResult] = useState(null);
  const [isMockAnalysing, setIsMockAnalysing] = useState(false);
  const [mockAnalysisProgress, setMockAnalysisProgress] = useState(0);

  const fileInputRef = useRef(null);
  const progressTimerRef = useRef(null);
  const finalizeTimerRef = useRef(null);

  const verificationTasks = useAnalysisStore((state) => state.tasks);
  const selectedVerificationTaskId = useAnalysisStore((state) => state.selectedTaskId);
  const textResult = useAnalysisStore((state) => state.result);
  const isTextAnalysing = useAnalysisStore((state) => state.isAnalysing);
  const textAnalysisProgress = useAnalysisStore((state) => state.analysisProgress);
  const textAnalysisError = useAnalysisStore((state) => state.error);
  const saveTextAnalysisError = useAnalysisStore((state) => state.saveError);
  const isSavingTextAnalysis = useAnalysisStore((state) => state.saveLoading);
  const analyzeText = useAnalysisStore((state) => state.analyzeText);
  const analyzeUrl = useAnalysisStore((state) => state.analyzeUrl);
  const analyzeCsv = useAnalysisStore((state) => state.analyzeCsv);
  const selectVerificationTask = useAnalysisStore((state) => state.selectTask);
  const saveVerificationTaskToHistory = useAnalysisStore(
    (state) => state.saveTaskResultToHistory
  );
  const fetchHomeData = useDashboardStore((state) => state.fetchHomeData);
  const saveCurrentTextResultToHistory = useAnalysisStore(
    (state) => state.saveCurrentResultToHistory
  );
  const clearTextAnalysisError = useAnalysisStore((state) => state.clearError);
  const maxTextLength = getVerifyTextMaxLength(plan);

  const clearPendingTimers = () => {
    if (progressTimerRef.current) {
      window.clearInterval(progressTimerRef.current);
      progressTimerRef.current = null;
    }
    if (finalizeTimerRef.current) {
      window.clearTimeout(finalizeTimerRef.current);
      finalizeTimerRef.current = null;
    }
  };

  useEffect(() => {
    return () => clearPendingTimers();
  }, []);

  const handleModeChange = (nextMode) => {
    if (nextMode === ANALYSIS_MODE.CSV && !canUseCsvAnalysis) {
      setLocalError("La revisión por lotes en CSV esta disponible solo para plan Ultra.");
      return;
    }

    setLocalError("");
    clearTextAnalysisError();
    setMockResult(null);
    setIsMockAnalysing(false);
    clearPendingTimers();
    setMockAnalysisProgress(0);
    setAnalysisMode(nextMode);
  };

  const handleCsvPick = (event) => {
    const file = event.target.files?.[0] || null;
    setCsvFile(file);
    setLocalError("");
    setMockResult(null);
  };

  const handleTextPayloadChange = (value) => {
    setTextPayload(value.slice(0, maxTextLength));
    setLocalError("");
    clearTextAnalysisError();
  };

  const handleUrlPayloadChange = (value) => {
    setUrlPayload(value);
    setLocalError("");
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (analysisMode === ANALYSIS_MODE.TEXT && !textPayload.trim()) {
      setLocalError("Pega o escribe un texto o afirmación antes de revisar.");
      return;
    }

    if (analysisMode === ANALYSIS_MODE.TEXT) {
      const length = textPayload.trim().length;
      if (length < VERIFY_TEXT_MIN_LENGTH) {
        setLocalError(`El texto debe tener al menos ${VERIFY_TEXT_MIN_LENGTH} caracteres para extraer afirmaciones verificables.`);
        return;
      }
      if (length > maxTextLength) {
        setLocalError(`Tu plan permite hasta ${maxTextLength.toLocaleString("es-ES")} caracteres por verificación.`);
        return;
      }
    }

    if (analysisMode === ANALYSIS_MODE.URL && !urlPayload.trim()) {
      setLocalError("Introduce una URL válida para iniciar el análisis.");
      return;
    }

    if (analysisMode === ANALYSIS_MODE.CSV) {
      if (!canUseCsvAnalysis) {
        setLocalError("Necesitas plan Ultra para la revisión por lotes.");
        return;
      }
      if (!csvFile) {
        setLocalError("Selecciona un archivo CSV para procesar el lote.");
        return;
      }
    }

    const textSnapshot = textPayload.trim();
    const urlSnapshot = urlPayload.trim();
    const csvSnapshot = csvFile;

    if (analysisMode === ANALYSIS_MODE.TEXT || analysisMode === ANALYSIS_MODE.URL) {
      setLocalError("");
      clearTextAnalysisError();
      try {
        if (analysisMode === ANALYSIS_MODE.TEXT) {
          await analyzeText(textSnapshot);
          setTextPayload("");
        } else {
          await analyzeUrl(urlSnapshot);
          setUrlPayload("");
        }
        if (user?.id) {
          void fetchHomeData({ userId: user.id, fallbackPlan: plan });
        }
      } catch {
        /** Error gestionado por el store. */
      }
      return;
    }

    setLocalError("");
    clearTextAnalysisError();
    try {
      await analyzeCsv(csvSnapshot);
      setCsvFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      if (user?.id) {
        void fetchHomeData({ userId: user.id, fallbackPlan: plan });
      }
    } catch {
      /** Error gestionado por el store. */
    }
  };

  const usesAsyncVerification = true;
  const isAnalysing = usesAsyncVerification ? isTextAnalysing : isMockAnalysing;
  const analysisProgress = usesAsyncVerification ? textAnalysisProgress : mockAnalysisProgress;
  const result = usesAsyncVerification ? textResult : mockResult;
  const resolvedError = localError || (usesAsyncVerification ? textAnalysisError : "");
  const disableAnalysisPanelInteractions = false;

  const handleSelectVerificationTask = (taskId) => {
    const selectedTask = verificationTasks.find((task) => task.clientTaskId === taskId);
    if (selectedTask?.mode === ANALYSIS_MODE.CSV) {
      setAnalysisMode(ANALYSIS_MODE.CSV);
    } else if (selectedTask?.mode === ANALYSIS_MODE.URL) {
      setAnalysisMode(ANALYSIS_MODE.URL);
    } else {
      setAnalysisMode(ANALYSIS_MODE.TEXT);
    }
    selectVerificationTask(taskId);
  };

  return {
    analysisMode,
    textPayload,
    urlPayload,
    csvFile,
    fileInputRef,
    isAnalysing,
    analysisProgress,
    result,
    resolvedError,
    isSavingTextAnalysis,
    saveTextAnalysisError,
    verificationTasks,
    selectedVerificationTaskId,
    maxTextLength,
    minTextLength: VERIFY_TEXT_MIN_LENGTH,
    disableAnalysisPanelInteractions,
    handleModeChange,
    handleSubmit,
    handleTextPayloadChange,
    handleUrlPayloadChange,
    handleCsvPick,
    selectVerificationTask: handleSelectVerificationTask,
    saveVerificationTaskToHistory,
    saveCurrentTextResultToHistory,
  };
};
