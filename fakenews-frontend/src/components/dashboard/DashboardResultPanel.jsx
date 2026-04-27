/**
 * @file DashboardResultPanel.jsx
 * @description Panel de resultados que delega en sub-vistas segun estado: vacio, analizando, single o batch.
 */

import SingleResultView from "./result/SingleResultView";
import BatchResultView from "./result/BatchResultView";
import AnalysingView from "./result/AnalysingView";
import EmptyResultView from "./result/EmptyResultView";

/** Selector de vista segun el estado actual del flujo de analisis. */
function DashboardResultPanel({
  result,
  isAnalysing,
  onSaveResult,
  isSavingResult = false,
  saveResultError = "",
}) {
  return (
    <section className="auth-fade-up mt-6" style={{ "--auth-delay": "170ms" }}>
      <div className="dashboard-result-shell dashboard-panel-float dashboard-panel-float-delayed landing-glass-card rounded-3xl border border-outline-variant/20 p-4 sm:p-6">
        {result?.kind === "single" ? (
          <SingleResultView
            result={result}
            isSavingResult={isSavingResult}
            saveResultError={saveResultError}
            onSaveResult={onSaveResult}
          />
        ) : result?.kind === "batch" ? (
          <BatchResultView result={result} />
        ) : isAnalysing ? (
          <AnalysingView />
        ) : (
          <EmptyResultView />
        )}
      </div>
    </section>
  );
}

export default DashboardResultPanel;
