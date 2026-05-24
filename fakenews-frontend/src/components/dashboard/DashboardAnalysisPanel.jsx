/**
 * @file DashboardAnalysisPanel.jsx
 * @description Panel de configuración del análisis: selector de modo, entrada y CTA.
 */

import { FileSpreadsheet, Globe2, ArrowRight } from "lucide-react";
import { useTranslation } from "react-i18next";

function DashboardAnalysisPanel({
  modeOptions,
  analysisMode,
  modeTagline,
  canUseCsvAnalysis,
  isAnalysing,
  disableInteractions = false,
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
  maxTextLength,
  minTextLength,
}) {
  const { t } = useTranslation("dashboard");
  const trimmedTextLength = textPayload.trim().length;
  const MODE_TITLES = {
    text: t("modes.modeTitleText"),
    url: t("modes.modeTitleUrl"),
    csv: t("modes.modeTitleCsv"),
  };
  return (
    <section className="dash-in dash-panel" style={{ "--i": 1 }}>
      <header className="dash-panel-head flex-wrap">
        <div>
          <h2 className="dash-panel-title">{t("analysisPanel.title")}</h2>
          <p className="dash-panel-meta">{modeTagline}</p>
        </div>

        <div className="dash-seg" role="tablist" aria-label={t("analysisPanel.tabsLabel")}>
          {modeOptions.map((mode) => {
            const isActive = analysisMode === mode.id;
            const Icon = mode.Icon;
            return (
              <button
                key={mode.id}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => onModeChange(mode.id)}
                disabled={mode.locked || disableInteractions}
                className={`dash-seg-item ${isActive ? "is-active" : ""}`}
              >
                <Icon className="size-3.5" />
                {mode.label}
                {mode.locked ? <span className="dash-seg-badge">{t("modes.ultraBadge")}</span> : null}
              </button>
            );
          })}
        </div>
      </header>

      <form className="space-y-4" onSubmit={onSubmit}>
        <div className="space-y-2">
          <p className="dash-stat-label">{MODE_TITLES[analysisMode] || t("analysisPanel.title")}</p>

          {analysisMode === "text" ? (
            <div className="dash-input-shell">
              <textarea
                value={textPayload}
                onChange={(event) => onTextPayloadChange(event.target.value)}
                placeholder={t("analysisPanel.textPlaceholder")}
                disabled={disableInteractions}
                maxLength={maxTextLength}
                className="dash-textarea"
              />
              <div className="dash-text-meta">
                <span>{t("analysisPanel.textLimits", { min: minTextLength, max: maxTextLength.toLocaleString() })}</span>
                <span className={trimmedTextLength > maxTextLength * 0.9 ? "dash-text-count is-near-limit" : "dash-text-count"}>
                  {t("analysisPanel.textCounter", { count: trimmedTextLength, max: maxTextLength.toLocaleString() })}
                </span>
              </div>
            </div>
          ) : null}

          {analysisMode === "url" ? (
            <div>
              <label className="dash-stat-label">
                <Globe2 className="dash-stat-label-icon size-3.5" />
                {t("analysisPanel.urlLabel")}
              </label>
              <input
                type="url"
                placeholder={t("analysisPanel.urlPlaceholder")}
                value={urlPayload}
                disabled={disableInteractions}
                onChange={(event) => onUrlPayloadChange(event.target.value)}
                className="dash-input mt-2"
              />
              <p className="dash-field-hint">
                {t("analysisPanel.urlHint")}
              </p>
            </div>
          ) : null}

          {analysisMode === "csv" ? (
            <div className="space-y-2">
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,text/csv"
                className="hidden"
                onChange={onCsvPick}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={disableInteractions}
                className="dash-drop"
              >
                <span className="dash-drop-icon">
                  <FileSpreadsheet className="size-5" />
                </span>
                <span className="text-sm font-semibold text-on-surface">
                  {csvFile ? csvFile.name : t("analysisPanel.csvSelect")}
                </span>
                <span className="dash-field-hint mt-0">
                  {t("analysisPanel.csvHint")}
                </span>
              </button>
            </div>
          ) : null}
        </div>

        {localError ? (
          <p className="dash-alert dash-alert-error" role="alert">
            {localError}
          </p>
        ) : null}

        {!canUseCsvAnalysis ? (
          <p className="dash-alert dash-alert-info">
            {t("analysisPanel.csvLockedUltra")}
          </p>
        ) : null}

        <div className="flex items-center justify-between gap-3 pt-1">
          <p className="dash-panel-meta">
            {isAnalysing ? t("analysisPanel.processing") : t("analysisPanel.ready")}
          </p>
          <button type="submit" disabled={disableInteractions} className="dash-cta">
            {disableInteractions ? t("analysisPanel.analyzing") : t("analysisPanel.analyze")}
            <ArrowRight className="dash-cta-arrow size-4" aria-hidden="true" />
          </button>
        </div>

        {analysisProgress > 0 ? (
          <div className="space-y-1.5 pt-1">
            <div
              className="dash-progress"
              role="progressbar"
              aria-valuenow={analysisProgress}
              aria-valuemin={0}
              aria-valuemax={100}
            >
              <div className="dash-progress-fill" style={{ width: `${analysisProgress}%` }} />
            </div>
            <p className="dash-panel-meta">
              {t("analysisPanel.progress", { progress: analysisProgress })}
            </p>
          </div>
        ) : null}
      </form>
    </section>
  );
}

export default DashboardAnalysisPanel;
