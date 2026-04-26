/**
 * @file DashboardAnalyze.jsx
 * @description Pagina de aplicacion que orquesta componentes, estados y flujos de negocio por seccion.
 */

import DashboardHeroSection from "../components/dashboard/DashboardHeroSection";
import DashboardAnalysisPanel from "../components/dashboard/DashboardAnalysisPanel";
import DashboardResultPanel from "../components/dashboard/DashboardResultPanel";

/** Vista principal de analisis que compone hero, formulario y panel de resultados. */
function DashboardAnalyze({
  modeOptions,
  analysisMode,
  modeTagline,
  canUseCsvAnalysis,
  isAnalysing,
  onModeChange,
  onSubmit,
  textPayload,
  onTextPayloadChange,
  urlPayload,
  onUrlPayloadChange,
  csvFile,
  fileInputRef,
  onCsvPick,
  localError,
  analysisProgress,
  result,
  onSaveResult,
  isSavingResult,
  saveResultError,
}) {
  return (
    <>
      <DashboardHeroSection />

      <DashboardAnalysisPanel
        modeOptions={modeOptions}
        analysisMode={analysisMode}
        modeTagline={modeTagline}
        canUseCsvAnalysis={canUseCsvAnalysis}
        isAnalysing={isAnalysing}
        onModeChange={onModeChange}
        onSubmit={onSubmit}
        textPayload={textPayload}
        onTextPayloadChange={onTextPayloadChange}
        urlPayload={urlPayload}
        onUrlPayloadChange={onUrlPayloadChange}
        csvFile={csvFile}
        fileInputRef={fileInputRef}
        onCsvPick={onCsvPick}
        localError={localError}
        analysisProgress={analysisProgress}
      />

      <DashboardResultPanel
        result={result}
        isAnalysing={isAnalysing}
        onSaveResult={onSaveResult}
        isSavingResult={isSavingResult}
        saveResultError={saveResultError}
      />
    </>
  );
}

export default DashboardAnalyze;
