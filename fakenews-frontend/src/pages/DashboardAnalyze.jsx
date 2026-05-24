/**
 * @file DashboardAnalyze.jsx
 * @description Vista de análisis: hero + formulario + panel de resultados, alimentada por `useAnalysisFlow`.
 */

import { useOutletContext } from "react-router-dom";
import DashboardHeroSection from "../components/dashboard/DashboardHeroSection";
import DashboardAnalysisPanel from "../components/dashboard/DashboardAnalysisPanel";
import DashboardResultPanel from "../components/dashboard/DashboardResultPanel";
import VerificationTaskQueue from "../components/dashboard/VerificationTaskQueue";

/** Vista principal de análisis que compone hero, formulario y panel de resultados. */
function DashboardAnalyze() {
  const { modeOptions, modeTagline, canUseCsvAnalysis, analysisFlow } = useOutletContext();

  const {
    analysisMode,
    isAnalysing,
    handleModeChange,
    handleSubmit,
    textPayload,
    handleTextPayloadChange,
    urlPayload,
    handleUrlPayloadChange,
    csvFile,
    fileInputRef,
    handleCsvPick,
    resolvedError,
    analysisProgress,
    result,
    verificationTasks,
    selectedVerificationTaskId,
    maxTextLength,
    minTextLength,
    disableAnalysisPanelInteractions,
    selectVerificationTask,
    saveVerificationTaskToHistory,
    saveCurrentTextResultToHistory,
    isSavingTextAnalysis,
    saveTextAnalysisError,
  } = analysisFlow;

  return (
    <section className="space-y-8">
      <DashboardHeroSection />

      <DashboardAnalysisPanel
        modeOptions={modeOptions}
        analysisMode={analysisMode}
        modeTagline={modeTagline}
        canUseCsvAnalysis={canUseCsvAnalysis}
        isAnalysing={isAnalysing}
        disableInteractions={disableAnalysisPanelInteractions}
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
        maxTextLength={maxTextLength}
        minTextLength={minTextLength}
      />

      <VerificationTaskQueue
        tasks={verificationTasks}
        selectedTaskId={selectedVerificationTaskId}
        onSelectTask={selectVerificationTask}
        onSaveTask={saveVerificationTaskToHistory}
      />

      <DashboardResultPanel
        isAnalysing={isAnalysing}
        result={result}
        onSaveResult={saveCurrentTextResultToHistory}
        isSavingResult={isSavingTextAnalysis}
        saveResultError={saveTextAnalysisError}
      />
    </section>
  );
}

export default DashboardAnalyze;
