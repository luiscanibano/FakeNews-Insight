/**
 * @file DashboardAnalysisPanel.jsx
 * @description Panel de configuración del análisis: selector de modo, entrada y CTA.
 */

import { FileSpreadsheet, Globe2, ArrowRight } from "lucide-react";

const MODE_TITLES = {
  text: "Modo texto",
  url: "Modo URL",
  csv: "Modo lote CSV",
};

function DashboardAnalysisPanel({
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
}) {
  return (
    <section className="dash-in dash-panel" style={{ "--i": 1 }}>
      <header className="dash-panel-head flex-wrap">
        <div>
          <h2 className="dash-panel-title">Configura el análisis</h2>
          <p className="dash-panel-meta">{modeTagline}</p>
        </div>

        <div className="dash-seg" role="tablist" aria-label="Modo de análisis">
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
                disabled={mode.locked || isAnalysing}
                className={`dash-seg-item ${isActive ? "is-active" : ""}`}
              >
                <Icon className="size-3.5" />
                {mode.label}
                {mode.locked ? <span className="dash-seg-badge">Ultra</span> : null}
              </button>
            );
          })}
        </div>
      </header>

      <form className="space-y-4" onSubmit={onSubmit}>
        <div className="space-y-2">
          <p className="dash-stat-label">{MODE_TITLES[analysisMode] || "Entrada"}</p>

          {analysisMode === "text" ? (
            <div className="dash-input-shell">
              <textarea
                value={textPayload}
                onChange={(event) => onTextPayloadChange(event.target.value)}
                placeholder="Pega o escribe la noticia que quieres verificar..."
                disabled={isAnalysing}
                className="dash-textarea"
              />
            </div>
          ) : null}

          {analysisMode === "url" ? (
            <div>
              <label className="dash-stat-label">
                <Globe2 className="dash-stat-label-icon size-3.5" />
                URL de la noticia
              </label>
              <input
                type="url"
                placeholder="https://ejemplo.com/noticia"
                value={urlPayload}
                disabled={isAnalysing}
                onChange={(event) => onUrlPayloadChange(event.target.value)}
                className="dash-input mt-2"
              />
              <p className="dash-field-hint">
                Extraemos titular, contexto y metadatos para un dictamen trazable.
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
                disabled={isAnalysing}
                className="dash-drop"
              >
                <span className="dash-drop-icon">
                  <FileSpreadsheet className="size-5" />
                </span>
                <span className="text-sm font-semibold text-on-surface">
                  {csvFile ? csvFile.name : "Seleccionar archivo CSV"}
                </span>
                <span className="dash-field-hint mt-0">
                  Sube un lote de titulares para procesarlos en bloque.
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
            El análisis por lotes CSV se desbloquea en el plan Ultra.
          </p>
        ) : null}

        <div className="flex items-center justify-between gap-3 pt-1">
          <p className="dash-panel-meta">
            {isAnalysing ? "Procesando..." : "Listo para analizar"}
          </p>
          <button type="submit" disabled={isAnalysing} className="dash-cta">
            {isAnalysing ? "Analizando..." : "Analizar"}
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
              Procesando señales · {analysisProgress}%
            </p>
          </div>
        ) : null}
      </form>
    </section>
  );
}

export default DashboardAnalysisPanel;
