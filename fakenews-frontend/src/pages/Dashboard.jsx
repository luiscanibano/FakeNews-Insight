/**
 * @file Dashboard.jsx
 * @description Pagina de aplicacion que orquesta componentes, estados y flujos de negocio por seccion.
 */

import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FileSpreadsheet, Link2, Text } from "lucide-react";
import { useAuthStore } from "../store/authStore";
import { useAnalysisStore } from "../store/analysisStore";
import { USER_PLAN, USER_ROLE } from "../lib/accessControl";
import { useDashboardStore } from "../store/dashboardStore";
import { getAccessToken } from "../services/auth";
import { changeAccountPassword, deleteAccount } from "../services/account";
import DashboardHeader from "../components/dashboard/DashboardHeader";
import DashboardPlanSelectorModal from "../components/dashboard/DashboardPlanSelectorModal";
import DashboardAccountPanel from "../components/dashboard/DashboardAccountPanel";
import LandingBackground from "../components/landing/LandingBackground";
import DashboardHome from "./DashboardHome";
import DashboardAnalyze from "./DashboardAnalyze";
import DashboardHistory from "./DashboardHistory";
import DashboardExtension from "./DashboardExtension";
import DashboardApiKeys from "./DashboardApiKeys";

const ANALYSIS_MODE = {
  TEXT: "text",
  URL: "url",
  CSV: "csv",
};

const AUTH_REQUEST_TIMEOUT_MS = 12000;
const ACCOUNT_REQUEST_TIMEOUT_MS = 25000;

const DASHBOARD_VIEW = {
  HOME: "home",
  ANALYZE: "analyze",
  HISTORY: "history",
  EXTENSION: "extension",
  API_KEYS: "apiKeys",
};

/** Envuelve promesas con timeout para evitar bloqueos infinitos en UI. */
const withTimeout = (promise, timeoutMs, timeoutMessage) =>
  new Promise((resolve, reject) => {
    const timeoutId = window.setTimeout(() => {
      reject(new Error(timeoutMessage));
    }, timeoutMs);

    Promise.resolve(promise)
      .then((value) => {
        window.clearTimeout(timeoutId);
        resolve(value);
      })
      .catch((error) => {
        window.clearTimeout(timeoutId);
        reject(error);
      });
  });

/** Shell principal del dashboard con navegacion por vistas y flujo de analisis. */
function Dashboard() {
  const user = useAuthStore((state) => state.user);
  const profile = useAuthStore((state) => state.profile);
  const role = useAuthStore((state) => state.role);
  const plan = useAuthStore((state) => state.plan);
  const logout = useAuthStore((state) => state.logout);

  const [analysisMode, setAnalysisMode] = useState(ANALYSIS_MODE.TEXT);
  const [activeView, setActiveView] = useState(DASHBOARD_VIEW.HOME);
  const [isPlanSelectorOpen, setIsPlanSelectorOpen] = useState(false);
  const [isAccountPanelOpen, setIsAccountPanelOpen] = useState(false);
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
  const navigate = useNavigate();

  const textResult = useAnalysisStore((state) => state.result);
  const isTextAnalysing = useAnalysisStore((state) => state.isAnalysing);
  const textAnalysisProgress = useAnalysisStore((state) => state.analysisProgress);
  const textAnalysisError = useAnalysisStore((state) => state.error);
  const saveTextAnalysisError = useAnalysisStore((state) => state.saveError);
  const isSavingTextAnalysis = useAnalysisStore((state) => state.saveLoading);
  const analyzeText = useAnalysisStore((state) => state.analyzeText);
  const saveCurrentTextResultToHistory = useAnalysisStore((state) => state.saveCurrentResultToHistory);
  const clearTextAnalysisError = useAnalysisStore((state) => state.clearError);
  const resetTextAnalysis = useAnalysisStore((state) => state.reset);

  const homeLoading = useDashboardStore((state) => state.homeLoading);
  const homeError = useDashboardStore((state) => state.homeError);
  const usageMetrics = useDashboardStore((state) => state.usageMetrics);
  const last30DaysSeries = useDashboardStore((state) => state.last30DaysSeries);
  const recentAnalyses = useDashboardStore((state) => state.recentAnalyses);
  const fetchHomeData = useDashboardStore((state) => state.fetchHomeData);

  const planLabel =
    plan === USER_PLAN.ULTRA ? "ULTRA" : plan === USER_PLAN.PRO ? "PRO" : "FREE";
  const canUseCsvAnalysis = role === USER_ROLE.ADMIN || plan === USER_PLAN.ULTRA;
  const accountLabel = profile?.display_name || user?.email || "Mi cuenta";

  const navItems = [
    { id: DASHBOARD_VIEW.HOME, label: "Inicio" },
    { id: DASHBOARD_VIEW.ANALYZE, label: "Analizar" },
    { id: DASHBOARD_VIEW.HISTORY, label: "Mi historial" },
    { id: DASHBOARD_VIEW.EXTENSION, label: "Extension navegador" },
    { id: DASHBOARD_VIEW.API_KEYS, label: "Developers" },
  ];

  const modeOptions = [
    {
      id: ANALYSIS_MODE.TEXT,
      label: "Texto",
      Icon: Text,
      locked: false,
    },
    {
      id: ANALYSIS_MODE.URL,
      label: "URL",
      Icon: Link2,
      locked: false,
    },
    {
      id: ANALYSIS_MODE.CSV,
      label: "Lote .CSV",
      Icon: FileSpreadsheet,
      locked: !canUseCsvAnalysis,
    },
  ];

  const modeTagline =
    analysisMode === ANALYSIS_MODE.TEXT
      ? "Motor semantico para texto libre"
      : analysisMode === ANALYSIS_MODE.URL
      ? "Extraccion y verificacion desde fuente web"
      : "Procesamiento masivo de titulares en lote";

  const isAnalysing = analysisMode === ANALYSIS_MODE.TEXT ? isTextAnalysing : isMockAnalysing;
  const analysisProgress =
    analysisMode === ANALYSIS_MODE.TEXT ? textAnalysisProgress : mockAnalysisProgress;
  const result = analysisMode === ANALYSIS_MODE.TEXT ? textResult : mockResult;
  const resolvedError =
    localError || (analysisMode === ANALYSIS_MODE.TEXT ? textAnalysisError : "");

  useEffect(() => {
    return () => {
      if (progressTimerRef.current) {
        window.clearInterval(progressTimerRef.current);
      }

      if (finalizeTimerRef.current) {
        window.clearTimeout(finalizeTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!user?.id || activeView !== DASHBOARD_VIEW.HOME) {
      return;
    }

    fetchHomeData({
      userId: user.id,
      fallbackPlan: plan,
    });
  }, [activeView, user?.id, plan, fetchHomeData]);

  /** Limpia timers locales usados para simulacion de progreso en modos no-texto. */
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

  /** Construye resultado simulado para URL/CSV manteniendo contrato de DashboardResultPanel. */
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
      normalizedScore >= 78
        ? "FIABLE"
        : normalizedScore >= 63
        ? "DUDOSA"
        : "FALSA";

    return {
      kind: "single",
      mode,
      verdictLabel,
      normalizedScore,
      source: mode === ANALYSIS_MODE.URL ? url : "Texto pegado manualmente",
      excerpt:
        mode === ANALYSIS_MODE.TEXT
          ? text.slice(0, 260)
          : "Analisis semantico generado desde la URL facilitada.",
    };
  };

  /** Cambia modo de analisis y resetea estado asociado para evitar residuos visuales. */
  const handleModeChange = (nextMode) => {
    if (nextMode === ANALYSIS_MODE.CSV && !canUseCsvAnalysis) {
      setLocalError("La opcion por lotes en CSV esta disponible solo para plan Ultra.");
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

  /** Captura archivo CSV seleccionado y limpia mensajes previos de error. */
  const handleCsvPick = (event) => {
    const file = event.target.files?.[0] || null;
    setCsvFile(file);
    setLocalError("");
    setMockResult(null);
  };

  /** Mantiene sincronizado el texto de entrada y limpia errores de analisis texto. */
  const handleTextPayloadChange = (value) => {
    setTextPayload(value);
    setLocalError("");
    clearTextAnalysisError();
  };

  /** Mantiene sincronizada la URL de entrada para modo de analisis por enlace. */
  const handleUrlPayloadChange = (value) => {
    setUrlPayload(value);
    setLocalError("");
  };

  /** Valida entradas por modo y ejecuta analisis real (texto) o simulacion (url/csv). */
  const handleSubmit = async (event) => {
    event.preventDefault();

    if (analysisMode === ANALYSIS_MODE.TEXT && !textPayload.trim()) {
      setLocalError("Pega o escribe una noticia antes de analizar.");
      return;
    }

    if (analysisMode === ANALYSIS_MODE.URL && !urlPayload.trim()) {
      setLocalError("Introduce una URL valida para iniciar el analisis.");
      return;
    }

    if (analysisMode === ANALYSIS_MODE.CSV) {
      if (!canUseCsvAnalysis) {
        setLocalError("Necesitas plan Ultra para el analisis por lotes.");
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
      } catch {}
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

  /** Navega entre secciones del dashboard mediante identificador de vista. */
  const handleNavSelect = (nextViewId) => {
    setActiveView(nextViewId);
  };

  /** Atajo desde Home para llevar al usuario a la vista de analisis. */
  const handleStartAnalysisFromHome = () => {
    setActiveView(DASHBOARD_VIEW.ANALYZE);
  };

  /** Abre el popup de planes (botones decorativos, sin pagos por ahora). */
  const handleOpenPlanSelector = () => {
    setIsPlanSelectorOpen(true);
  };

  /** Abre el panel de cuenta del usuario. */
  const handleOpenAccountPanel = () => {
    setIsAccountPanelOpen(true);
  };

  /** Cierra el panel de cuenta. */
  const handleCloseAccountPanel = () => {
    setIsAccountPanelOpen(false);
  };

  /** Cambia contrasena del usuario reautenticando con la actual. */
  const handleChangeAccountPassword = async ({ currentPassword, newPassword }) => {
    const email = user?.email;
    if (!email) {
      throw new Error("No se pudo obtener el email del usuario actual.");
    }

    return changeAccountPassword({ email, currentPassword, newPassword });
  };

  /** Elimina la cuenta del usuario tras confirmacion explicita y cierra sesion. */
  const handleDeleteAccount = async ({ confirmation }) => {
    const jwtToken = await withTimeout(
      getAccessToken(),
      AUTH_REQUEST_TIMEOUT_MS,
      "No se pudo validar tu sesión a tiempo. Vuelve a iniciar sesión."
    );

    await withTimeout(
      deleteAccount({ jwtToken, confirmation }),
      ACCOUNT_REQUEST_TIMEOUT_MS,
      "La eliminación de la cuenta tardó demasiado. Reintenta en unos segundos."
    );

    try {
      await logout();
    } catch {}

    navigate("/", { replace: true });
  };

  /** Cierra el popup de planes. */
  const handleClosePlanSelector = () => {
    setIsPlanSelectorOpen(false);
  };

  /** Selector de plan deshabilitado: la facturación se reimplementará más adelante. */
  const handleSelectPlan = () => {};

  /** Resuelve la pagina activa en funcion del tab seleccionado en navegacion. */
  const renderActivePage = () => {
    if (activeView === DASHBOARD_VIEW.HOME) {
      return (
        <DashboardHome
          planLabel={planLabel}
          usageMetrics={usageMetrics}
          last30DaysSeries={last30DaysSeries}
          recentAnalyses={recentAnalyses}
          homeLoading={homeLoading}
          homeError={homeError}
          onStartAnalysis={handleStartAnalysisFromHome}
        />
      );
    }

    if (activeView === DASHBOARD_VIEW.ANALYZE) {
      return (
        <DashboardAnalyze
          modeOptions={modeOptions}
          analysisMode={analysisMode}
          modeTagline={modeTagline}
          canUseCsvAnalysis={canUseCsvAnalysis}
          isAnalysing={isAnalysing}
          onModeChange={handleModeChange}
          onSubmit={handleSubmit}
          textPayload={textPayload}
          onTextPayloadChange={handleTextPayloadChange}
          urlPayload={urlPayload}
          onUrlPayloadChange={handleUrlPayloadChange}
          csvFile={csvFile}
          fileInputRef={fileInputRef}
          onCsvPick={handleCsvPick}
          localError={resolvedError}
          analysisProgress={analysisProgress}
          result={result}
          onSaveResult={saveCurrentTextResultToHistory}
          isSavingResult={isSavingTextAnalysis}
          saveResultError={saveTextAnalysisError}
        />
      );
    }

    if (activeView === DASHBOARD_VIEW.HISTORY) {
      return <DashboardHistory />;
    }

    if (activeView === DASHBOARD_VIEW.EXTENSION) {
      return <DashboardExtension />;
    }

    if (activeView === DASHBOARD_VIEW.API_KEYS) {
      return <DashboardApiKeys />;
    }

    return (
      <DashboardHome
        planLabel={planLabel}
        usageMetrics={usageMetrics}
        last30DaysSeries={last30DaysSeries}
        recentAnalyses={recentAnalyses}
        homeLoading={homeLoading}
        homeError={homeError}
        onStartAnalysis={handleStartAnalysisFromHome}
      />
    );
  };

  /** Cierra sesion delegando el manejo de errores al auth store. */
  const handleLogout = async () => {
    try {
      await logout();
    } catch {}
  };

  return (
    <div className="stitch-landing dark relative isolate min-h-screen overflow-x-hidden bg-surface text-on-surface font-body selection:bg-primary/30 selection:text-primary">
      <LandingBackground />

      <DashboardHeader
        navItems={navItems}
        activeNavId={activeView}
        onNavSelect={handleNavSelect}
        planLabel={planLabel}
        accountLabel={accountLabel}
        onLogout={handleLogout}
        onOpenPlanSelector={handleOpenPlanSelector}
        onOpenAccountPanel={handleOpenAccountPanel}
      />

      <main className="relative z-10 mx-auto w-full max-w-7xl px-4 pb-12 pt-32 sm:px-6">
        {renderActivePage()}
      </main>

      <DashboardPlanSelectorModal
        isOpen={isPlanSelectorOpen}
        currentPlan={plan}
        onClose={handleClosePlanSelector}
        onSelectPlan={handleSelectPlan}
      />

      <DashboardAccountPanel
        isOpen={isAccountPanelOpen}
        email={user?.email}
        planLabel={planLabel}
        identityProviders={(() => {
          const providers = new Set();
          const appProviders = user?.app_metadata?.providers;
          if (Array.isArray(appProviders)) {
            appProviders.forEach((value) => {
              const normalized = String(value || "").toLowerCase();
              if (normalized) providers.add(normalized);
            });
          }
          const primaryProvider = String(user?.app_metadata?.provider || "").toLowerCase();
          if (primaryProvider) providers.add(primaryProvider);
          if (Array.isArray(user?.identities)) {
            user.identities.forEach((identity) => {
              const normalized = String(identity?.provider || "").toLowerCase();
              if (normalized) providers.add(normalized);
            });
          }
          return Array.from(providers);
        })()}
        primaryProvider={user?.app_metadata?.provider || ""}
        onClose={handleCloseAccountPanel}
        onChangePassword={handleChangeAccountPassword}
        onOpenPlanSelector={() => {
          setIsAccountPanelOpen(false);
          handleOpenPlanSelector();
        }}
        onDeleteAccount={handleDeleteAccount}
      />
    </div>
  );
}

export default Dashboard;
