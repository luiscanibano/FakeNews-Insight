/**
 * @file useAnalysisFlow.js
 * @description Hook que centraliza el estado y los flujos de los tres modos de análisis del dashboard.
 *
 * Encapsula:
 *  - estado local (modo activo, payloads de texto/URL/CSV, errores locales).
 *  - simulacion de progreso para los modos URL/CSV (sin backend real todavia).
 *  - delegacion al store de análisis para el modo TEXT.
 */

import { useEffect, useRef, useState } from "react";
import { useAnalysisStore } from "../store/analysisStore";
import { useAuthStore } from "../store/authStore";
import { useDashboardStore } from "../store/dashboardStore";
import { ANALYSIS_MODE } from "../lib/dashboardConstants";
import { VERIFY_TEXT_MIN_LENGTH, getVerifyTextMaxLength } from "../lib/verificationLimits";

/** Construye un resultado simulado para los modos URL/CSV manteniendo el contrato de DashboardResultPanel. */
const buildMockResult = ({ mode, text, url, file }) => {
  if (mode === ANALYSIS_MODE.CSV) {
    const estimatedRows = Math.max(12, Math.min(450, Math.round(file.size / 140)));
    const suspiciousRows = Math.max(1, Math.round(estimatedRows * 0.38));
    return {
      kind: "batch",
      fileName: file.name,
      totalRows: estimatedRows,
      suspiciousRows,
    };
  }

  const payloadSize = mode === ANALYSIS_MODE.TEXT ? text.length : url.length;
  const confidence = 53 + (payloadSize % 39);
  const normalizedScore = Math.max(50, Math.min(96, confidence));
  const verdictLabel =
    normalizedScore >= 78 ? "FIABLE" : normalizedScore >= 63 ? "DUDOSA" : "FALSA";

  return {
    kind: "single",
    mode,
    verdictLabel,
    normalizedScore,
    source: mode === ANALYSIS_MODE.URL ? url : "Texto pegado manualmente",
    excerpt:
      mode === ANALYSIS_MODE.TEXT
        ? text.slice(0, 260)
        : "Revisión semántica generada desde la URL facilitada.",
  };
};

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

  const textResult = useAnalysisStore((state) => state.result);
  const isTextAnalysing = useAnalysisStore((state) => state.isAnalysing);
  const textAnalysisProgress = useAnalysisStore((state) => state.analysisProgress);
  const textAnalysisError = useAnalysisStore((state) => state.error);
  const saveTextAnalysisError = useAnalysisStore((state) => state.saveError);
  const isSavingTextAnalysis = useAnalysisStore((state) => state.saveLoading);
  const analyzeText = useAnalysisStore((state) => state.analyzeText);
  const fetchHomeData = useDashboardStore((state) => state.fetchHomeData);
  const saveCurrentTextResultToHistory = useAnalysisStore(
    (state) => state.saveCurrentResultToHistory
  );
  const clearTextAnalysisError = useAnalysisStore((state) => state.clearError);
  const resetTextAnalysis = useAnalysisStore((state) => state.reset);
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
    resetTextAnalysis();
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

    if (analysisMode === ANALYSIS_MODE.TEXT) {
      setLocalError("");
      clearTextAnalysisError();
      try {
        await analyzeText(textSnapshot);
        if (user?.id) {
          void fetchHomeData({ userId: user.id, fallbackPlan: plan });
        }
      } catch {
        /** Error gestionado por el store. */
      }
      return;
    }

    clearPendingTimers();
    setLocalError("");
    setMockResult(null);
    setIsMockAnalysing(true);
    setMockAnalysisProgress(9);

    progressTimerRef.current = window.setInterval(() => {
      setMockAnalysisProgress((previous) => {
        if (previous >= 92) {
          return previous;
        }
        return Math.min(92, previous + Math.max(3, Math.round((100 - previous) / 11)));
      });
    }, 140);

    finalizeTimerRef.current = window.setTimeout(() => {
      clearPendingTimers();
      setMockAnalysisProgress(100);
      setIsMockAnalysing(false);
      setMockResult(
        buildMockResult({
          mode: analysisMode,
          text: textSnapshot,
          url: urlSnapshot,
          file: csvSnapshot,
        })
      );

      window.setTimeout(() => {
        setMockAnalysisProgress(0);
      }, 550);
    }, 1700);
  };

  const isAnalysing = analysisMode === ANALYSIS_MODE.TEXT ? isTextAnalysing : isMockAnalysing;
  const analysisProgress =
    analysisMode === ANALYSIS_MODE.TEXT ? textAnalysisProgress : mockAnalysisProgress;
  const result = analysisMode === ANALYSIS_MODE.TEXT ? textResult : mockResult;
  const resolvedError =
    localError || (analysisMode === ANALYSIS_MODE.TEXT ? textAnalysisError : "");

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
    maxTextLength,
    minTextLength: VERIFY_TEXT_MIN_LENGTH,
    handleModeChange,
    handleSubmit,
    handleTextPayloadChange,
    handleUrlPayloadChange,
    handleCsvPick,
    saveCurrentTextResultToHistory,
  };
};
