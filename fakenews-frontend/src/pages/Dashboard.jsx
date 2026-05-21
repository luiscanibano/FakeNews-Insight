/**
 * @file Dashboard.jsx
 * @description Shell del dashboard: header, fondo, modales y rutas anidadas para cada vista.
 */

import { useEffect, useState } from "react";
import { Navigate, Outlet, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { FileSpreadsheet, Link2, Text } from "lucide-react";
import { useAuthStore } from "../store/authStore";
import { useDashboardStore } from "../store/dashboardStore";
import { USER_PLAN, USER_ROLE } from "../lib/accessControl";
import {
  ANALYSIS_MODE,
  DASHBOARD_NAV_ITEMS,
  DASHBOARD_VIEW,
} from "../lib/dashboardConstants";
import { collectIdentityProviders } from "../lib/identityProviders";
import { useAnalysisFlow } from "../hooks/useAnalysisFlow";
import { useAccountActions } from "../hooks/useAccountActions";
import { useBillingActions } from "../hooks/useBillingActions";
import { useBillingStore } from "../store/billingStore";
import DashboardHeader from "../components/dashboard/DashboardHeader";
import DashboardPlanSelectorModal from "../components/dashboard/DashboardPlanSelectorModal";
import DashboardAccountPanel from "../components/dashboard/DashboardAccountPanel";
import LandingBackground from "../components/landing/LandingBackground";
import DashboardHome from "./DashboardHome";
import DashboardAnalyze from "./DashboardAnalyze";
import DashboardHistory from "./DashboardHistory";
import DashboardExtension from "./DashboardExtension";

/** Etiqueta legible del plan usada en chips/encabezados del dashboard. */
const formatPlanLabel = (plan) => {
  if (plan === USER_PLAN.ULTRA) return "ULTRA";
  if (plan === USER_PLAN.PRO) return "PRO";
  return "FREE";
};

/** Resuelve cual nav item esta activo a partir de la URL actual. */
const resolveActiveNavId = (pathname) => {
  const trimmed = pathname.replace(/\/+$/, "");
  if (trimmed === "/dashboard" || trimmed === "") {
    return DASHBOARD_VIEW.HOME;
  }
  const segment = trimmed.replace("/dashboard/", "").split("/")[0];
  const match = DASHBOARD_NAV_ITEMS.find((item) => item.path === segment);
  return match?.id || DASHBOARD_VIEW.HOME;
};

/** Layout interno: header + fondo + outlet con context para las rutas anidadas. */
function DashboardLayout({
  modeOptions,
  modeTagline,
  canUseCsvAnalysis,
  analysisFlow,
  planLabel,
  onOpenAccountPanel,
  onOpenPlanSelector,
  onLogout,
  accountLabel,
}) {
  const location = useLocation();
  const navigate = useNavigate();
  const activeNavId = resolveActiveNavId(location.pathname);

  const handleNavSelect = (nextViewId) => {
    const item = DASHBOARD_NAV_ITEMS.find((entry) => entry.id === nextViewId);
    if (!item) return;
    navigate(item.path ? `/dashboard/${item.path}` : "/dashboard");
  };

  const handleStartAnalysisFromHome = () => {
    navigate("/dashboard/analyze");
  };

  return (
    <div className="stitch-landing dark relative isolate min-h-screen overflow-x-hidden bg-surface text-on-surface font-body selection:bg-primary/30 selection:text-primary">
      <LandingBackground />

      <DashboardHeader
        navItems={DASHBOARD_NAV_ITEMS}
        activeNavId={activeNavId}
        onNavSelect={handleNavSelect}
        planLabel={planLabel}
        accountLabel={accountLabel}
        onLogout={onLogout}
        onOpenPlanSelector={onOpenPlanSelector}
        onOpenAccountPanel={onOpenAccountPanel}
      />

      <main className="relative z-10 mx-auto w-full max-w-7xl px-4 pb-12 pt-32 sm:px-6">
        <Outlet
          context={{
            planLabel,
            modeOptions,
            modeTagline,
            canUseCsvAnalysis,
            analysisFlow,
            onStartAnalysis: handleStartAnalysisFromHome,
          }}
        />
      </main>
    </div>
  );
}

/** Página raiz del dashboard que monta layout, rutas anidadas y modales. */
function Dashboard() {
  const { t } = useTranslation("dashboard");
  const user = useAuthStore((state) => state.user);
  const profile = useAuthStore((state) => state.profile);
  const role = useAuthStore((state) => state.role);
  const plan = useAuthStore((state) => state.plan);
  const logout = useAuthStore((state) => state.logout);

  const fetchHomeData = useDashboardStore((state) => state.fetchHomeData);

  const [isPlanSelectorOpen, setIsPlanSelectorOpen] = useState(false);
  const [isAccountPanelOpen, setIsAccountPanelOpen] = useState(false);

  const planLabel = formatPlanLabel(plan);
  const canUseCsvAnalysis = role === USER_ROLE.ADMIN || plan === USER_PLAN.ULTRA;
  const accountLabel = profile?.display_name || user?.email || t("account.myAccount");

  const analysisFlow = useAnalysisFlow({ canUseCsvAnalysis, plan });
  const { handleChangeAccountPassword, handleDeleteAccount } = useAccountActions();
  const { confirmCheckout } = useBillingActions();
  const loadBillingSnapshot = useBillingStore((state) => state.loadSnapshot);

  const modeOptions = [
    { id: ANALYSIS_MODE.TEXT, label: t("modes.text"), Icon: Text, locked: false },
    { id: ANALYSIS_MODE.URL, label: t("modes.url"), Icon: Link2, locked: false },
    { id: ANALYSIS_MODE.CSV, label: t("modes.csv"), Icon: FileSpreadsheet, locked: !canUseCsvAnalysis },
  ];

  const modeTagline =
    analysisFlow.analysisMode === ANALYSIS_MODE.TEXT
      ? t("modes.taglineText")
      : analysisFlow.analysisMode === ANALYSIS_MODE.URL
      ? t("modes.taglineUrl")
      : t("modes.taglineCsv");

  const location = useLocation();
  const navigate = useNavigate();
  const isHomeView = resolveActiveNavId(location.pathname) === DASHBOARD_VIEW.HOME;

  useEffect(() => {
    if (!user?.id || !isHomeView) {
      return;
    }
    fetchHomeData({ userId: user.id, fallbackPlan: plan });
  }, [isHomeView, user?.id, plan, fetchHomeData]);

  /** Captura el retorno de Stripe Checkout (?billing=success&session_id=...) y confirma el pago. */
  useEffect(() => {
    if (!user?.id) return;
    const params = new URLSearchParams(location.search);
    const billingFlag = params.get("billing");
    if (!billingFlag) return;

    const sessionId = params.get("session_id");
    if (billingFlag === "success" && sessionId) {
      confirmCheckout(sessionId).catch(() => {
        /* error reflejado en billingStore */
      });
    } else if (billingFlag === "success") {
      loadBillingSnapshot().catch(() => {});
    }

    params.delete("billing");
    params.delete("session_id");
    const cleanSearch = params.toString();
    navigate(
      { pathname: location.pathname, search: cleanSearch ? `?${cleanSearch}` : "" },
      { replace: true }
    );
  }, [user?.id, location.pathname, location.search, confirmCheckout, loadBillingSnapshot, navigate]);

  const handleLogout = async () => {
    try {
      await logout();
    } catch {
      /** Logout fallback gestionado por el store. */
    }
  };

  const identityProviders = collectIdentityProviders(user);
  const primaryProvider = user?.app_metadata?.provider || "";

  return (
    <>
      <Routes>
        <Route
          element={
            <DashboardLayout
              modeOptions={modeOptions}
              modeTagline={modeTagline}
              canUseCsvAnalysis={canUseCsvAnalysis}
              analysisFlow={analysisFlow}
              planLabel={planLabel}
              accountLabel={accountLabel}
              onLogout={handleLogout}
              onOpenAccountPanel={() => setIsAccountPanelOpen(true)}
              onOpenPlanSelector={() => setIsPlanSelectorOpen(true)}
            />
          }
        >
          <Route index element={<DashboardHome />} />
          <Route path="analyze" element={<DashboardAnalyze />} />
          <Route path="history" element={<DashboardHistory />} />
          <Route path="extension" element={<DashboardExtension />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Route>
      </Routes>

      <DashboardPlanSelectorModal
        isOpen={isPlanSelectorOpen}
        currentPlan={plan}
        onClose={() => setIsPlanSelectorOpen(false)}
      />

      <DashboardAccountPanel
        isOpen={isAccountPanelOpen}
        email={user?.email}
        planLabel={planLabel}
        identityProviders={identityProviders}
        primaryProvider={primaryProvider}
        onClose={() => setIsAccountPanelOpen(false)}
        onChangePassword={handleChangeAccountPassword}
        onOpenPlanSelector={() => {
          setIsAccountPanelOpen(false);
          setIsPlanSelectorOpen(true);
        }}
        onDeleteAccount={handleDeleteAccount}
      />
    </>
  );
}

export default Dashboard;
