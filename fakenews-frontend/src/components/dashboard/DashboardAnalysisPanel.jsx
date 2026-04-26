/**
 * @file DashboardAnalysisPanel.jsx
 * @description Componente del dashboard para renderizar analisis, resultados, navegacion y paneles operativos.
 */

import { FileSpreadsheet, Globe2, Orbit } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

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
    <section className="mt-7">
      <div className="auth-fade-up" style={{ "--auth-delay": "110ms" }}>
        <div className="dashboard-console-shell dashboard-panel-float landing-glass-card rounded-3xl border border-outline-variant/20 p-4 sm:p-6">
          <div className="dashboard-console-grid pointer-events-none absolute inset-0" />

          <div className="relative z-10">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-outline-variant/20 bg-surface-container-high/45 px-3 py-2">
              <div className="inline-flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] text-primary">
                <Orbit className="size-3.5" />
                ANALISIS ADAPTATIVO
              </div>
              <div className="inline-flex items-center gap-2 rounded-full border border-outline-variant/25 bg-surface/65 px-2.5 py-1 text-[10px] uppercase tracking-wider text-on-surface-variant">
                <span className="dashboard-status-pulse" />
                {modeTagline}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              {modeOptions.map((mode) => {
                const isActive = analysisMode === mode.id;
                const disabled = mode.locked;
                const Icon = mode.Icon;

                return (
                  <Button
                    key={mode.id}
                    type="button"
                    onClick={() => onModeChange(mode.id)}
                    disabled={disabled || isAnalysing}
                    className={`h-11 rounded-xl text-sm font-semibold transition-all ${
                      isActive
                        ? "landing-shimmer border border-primary/40 bg-primary text-on-primary"
                        : "border border-outline-variant/30 bg-surface-container-high/50 text-on-surface hover:bg-surface-container"
                    }`}
                  >
                    <Icon className="size-4" />
                    {mode.label}
                    {mode.locked ? (
                      <span className="ml-1 rounded-full border border-primary/30 bg-primary/15 px-1.5 py-0.5 text-[9px] uppercase tracking-wider text-primary">
                        Ultra
                      </span>
                    ) : null}
                  </Button>
                );
              })}
            </div>

            <form className="mt-5 space-y-4" onSubmit={onSubmit}>
              <div className="rounded-2xl border border-outline-variant/25 bg-surface/55 p-3 sm:p-4">
                <div className="mb-3 flex items-center justify-between rounded-lg border border-outline-variant/20 bg-surface-container-high/55 px-3 py-1.5">
                  <p className="text-[10px] uppercase tracking-[0.18em] text-on-surface-variant">
                    {analysisMode === "text"
                      ? "Modo texto"
                      : analysisMode === "url"
                      ? "Modo URL"
                      : "Modo lote CSV"}
                  </p>
                  <div className="flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-full border border-outline-variant/50" />
                    <span className="h-2.5 w-2.5 rounded-full border border-outline-variant/50" />
                    <span className="h-2.5 w-2.5 rounded-full border border-outline-variant/50" />
                  </div>
                </div>

                {analysisMode === "text" ? (
                  <textarea
                    value={textPayload}
                    onChange={(event) => onTextPayloadChange(event.target.value)}
                    placeholder="Pega o escribe la noticia..."
                    disabled={isAnalysing}
                    className="min-h-56 w-full resize-y rounded-xl border border-outline-variant/25 bg-surface-container-lowest/70 px-4 py-3 text-sm leading-relaxed text-on-surface outline-none transition-colors placeholder:text-on-surface-variant focus:border-primary/45"
                  />
                ) : null}

                {analysisMode === "url" ? (
                  <div className="space-y-2">
                    <label className="inline-flex items-center gap-2 text-xs uppercase tracking-wider text-on-surface-variant">
                      <Globe2 className="size-3.5 text-primary" />
                      URL de noticia
                    </label>
                    <Input
                      type="url"
                      placeholder="https://ejemplo.com/noticia"
                      value={urlPayload}
                      disabled={isAnalysing}
                      onChange={(event) => onUrlPayloadChange(event.target.value)}
                      className="h-11 border-outline-variant/30 bg-surface-container-lowest/70 text-on-surface placeholder:text-on-surface-variant"
                    />
                    <p className="text-xs text-on-surface-variant">
                      Extraemos titular, contexto y metadatos para un dictamen trazable.
                    </p>
                  </div>
                ) : null}

                {analysisMode === "csv" ? (
                  <div className="space-y-3">
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
                      className="flex w-full flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-outline-variant/35 bg-surface-container-lowest/60 px-4 py-7 text-center transition-colors hover:border-primary/45 hover:bg-surface-container-lowest disabled:cursor-not-allowed disabled:opacity-70"
                    >
                      <FileSpreadsheet className="size-6 text-primary" />
                      <span className="text-sm font-semibold text-on-surface">
                        {csvFile ? csvFile.name : "Seleccionar archivo CSV"}
                      </span>
                      <span className="text-xs text-on-surface-variant">
                        Sube un lote de titulares para procesarlos en bloque.
                      </span>
                    </button>
                  </div>
                ) : null}
              </div>

              {localError ? (
                <p className="rounded-xl border border-error/30 bg-error-container/40 px-3 py-2 text-sm text-error" role="alert">
                  {localError}
                </p>
              ) : null}

              {!canUseCsvAnalysis ? (
                <p className="rounded-xl border border-primary/20 bg-primary/10 px-3 py-2 text-xs text-primary">
                  El analisis por lotes CSV se desbloquea en plan Ultra.
                </p>
              ) : null}

              <Button
                type="submit"
                disabled={isAnalysing}
                className="landing-shimmer h-11 w-full rounded-xl bg-primary text-sm font-bold text-on-primary sm:h-12 sm:text-base"
              >
                {isAnalysing ? "Analizando..." : "Analizar"}
              </Button>

              {analysisProgress > 0 ? (
                <div className="space-y-2">
                  <div className="dashboard-stream-bar h-2 rounded-full border border-outline-variant/30 bg-surface-container-high/60">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-primary/50 via-primary to-primary"
                      style={{ width: `${analysisProgress}%` }}
                    />
                  </div>
                  <p className="text-[11px] uppercase tracking-wider text-on-surface-variant">
                    Procesando senales... {analysisProgress}%
                  </p>
                </div>
              ) : null}
            </form>
          </div>
        </div>
      </div>
    </section>
  );
}

export default DashboardAnalysisPanel;
