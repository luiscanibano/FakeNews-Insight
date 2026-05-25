/**
 * @file DashboardResultPanel.jsx
 * @description Panel de resultados que delega en sub-vistas según estado: vacio, analizando, single o batch.
 */

import SingleResultView from "./result/SingleResultView";
import BatchResultView from "./result/BatchResultView";
import AnalysingView from "./result/AnalysingView";
import EmptyResultView from "./result/EmptyResultView";
import VerificationReport from "./VerificationReport";

/** Selector de vista según el estado actual del flujo de análisis. */
function DashboardResultPanel({
  result,
  isAnalysing,
  onSaveResult,
  isSavingResult = false,
  saveResultError = "",
}) {
  return (
    <section className="dash-in" style={{ "--i": 2 }}>
      <div className="dash-panel">
        {result?.kind === "verification" ? (
          <VerificationReport
            report={result.report}
            runId={result?.analysisRunId}
            onSaveResult={onSaveResult}
            isSavingResult={isSavingResult}
            saveResultError={saveResultError}
            savedInHistory={result?.savedInHistory}
          />
        ) : result?.kind === "single" ? (
          <SingleResultView
            result={result}
            isSavingResult={isSavingResult}
            saveResultError={saveResultError}
            onSaveResult={onSaveResult}
          />
        ) : result?.kind === "batch" ? (
          <BatchResultView
            result={result}
            isSavingResult={isSavingResult}
            saveResultError={saveResultError}
            onSaveResult={onSaveResult}
          />
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
