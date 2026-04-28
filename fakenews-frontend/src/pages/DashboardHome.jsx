/**
 * @file DashboardHome.jsx
 * @description Vista "Inicio" del dashboard. Lee datos del store y los pasa a `DashboardHomeSection`.
 */

import { useOutletContext } from "react-router-dom";
import { useDashboardStore } from "../store/dashboardStore";
import DashboardHomeSection from "../components/dashboard/DashboardHomeSection";

/** Página Inicio del dashboard. */
function DashboardHome() {
  const { planLabel, onStartAnalysis } = useOutletContext();

  const homeLoading = useDashboardStore((state) => state.homeLoading);
  const homeError = useDashboardStore((state) => state.homeError);
  const usageMetrics = useDashboardStore((state) => state.usageMetrics);
  const last30DaysSeries = useDashboardStore((state) => state.last30DaysSeries);
  const recentAnalyses = useDashboardStore((state) => state.recentAnalyses);

  return (
    <DashboardHomeSection
      planLabel={planLabel}
      usageMetrics={usageMetrics}
      last30DaysSeries={last30DaysSeries}
      recentAnalyses={recentAnalyses}
      homeLoading={homeLoading}
      homeError={homeError}
      onStartAnalysis={onStartAnalysis}
    />
  );
}

export default DashboardHome;
