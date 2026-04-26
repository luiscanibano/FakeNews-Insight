/**
 * @file DashboardHome.jsx
 * @description Pagina de aplicacion que orquesta componentes, estados y flujos de negocio por seccion.
 */

import DashboardHomeSection from "../components/dashboard/DashboardHomeSection";

/** Pagina Inicio del dashboard: delega render y datos en DashboardHomeSection. */
function DashboardHome({
  planLabel,
  usageMetrics,
  last30DaysSeries,
  recentAnalyses,
  homeLoading,
  homeError,
  onStartAnalysis,
}) {
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
