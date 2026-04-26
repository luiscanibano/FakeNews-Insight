/**
 * @file DashboardResultPanel.jsx
 * @description Componente del dashboard para renderizar analisis, resultados, navegacion y paneles operativos.
 */

import { Button } from "@/components/ui/button";

/** Deriva tono visual segun veredicto y nivel de incertidumbre de la fuerza SVM. */
const getVerdictTone = ({ verdictLabel, svmStrength }) => {
  const hasStrength = typeof svmStrength === "number";
  const threshold = 0.3;
  const epsilon = 0.0001;

  const isUncertain = !hasStrength || Math.abs(svmStrength - threshold) <= epsilon;

  if (isUncertain) {
    return {
      headingClass: "text-amber-200",
      badgeClass: "border-amber-300/40 bg-amber-500/15 text-amber-100",
      panelBorderClass: "border-amber-300/35",
      badgeText: "INCIERTO / DUDOSO",
      showBadge: true,
    };
  }

  if (verdictLabel === "FIABLE") {
    return {
      headingClass: "text-emerald-300",
      badgeClass: "",
      panelBorderClass: "border-emerald-400/30",
      badgeText: "",
      showBadge: false,
    };
  }

  if (verdictLabel === "FALSA") {
    return {
      headingClass: "text-red-300",
      badgeClass: "",
      panelBorderClass: "border-red-400/30",
      badgeText: "",
      showBadge: false,
    };
  }

  return {
    headingClass: "text-on-surface",
    badgeClass: "",
    panelBorderClass: "border-outline-variant/25",
    badgeText: "",
    showBadge: false,
  };
};

/** Panel de resultados con estados vacio, analizando, resultado unico y resultado por lote. */
function DashboardResultPanel({
  result,
  isAnalysing,
  onSaveResult,
  isSavingResult = false,
  saveResultError = "",
}) {
  const formattedSvmStrength =
    typeof result?.svmStrength === "number" ? result.svmStrength.toFixed(2) : "--";
  const verdictTone = getVerdictTone({ verdictLabel: result?.verdictLabel, svmStrength: result?.svmStrength });
  const canSaveSingleResult =
    result?.kind === "single" &&
    Boolean(result?.analysisRunId) &&
    !result?.savedInHistory &&
    !isSavingResult;

  /** Gestiona guardado manual en historial sin duplicar estado de error local. */
  const handleSaveClick = async () => {
    if (!canSaveSingleResult || typeof onSaveResult !== "function") {
      return;
    }

    try {
      await onSaveResult();
    } catch {
      /** El store centralizado expone saveResultError y evita duplicar manejo aqui.
 */
    }
  };

  return (
    <section className="auth-fade-up mt-6" style={{ "--auth-delay": "170ms" }}>
      <div className="dashboard-result-shell dashboard-panel-float dashboard-panel-float-delayed landing-glass-card rounded-3xl border border-outline-variant/20 p-4 sm:p-6">
        {result?.kind === "single" ? (
          <>
            <div className="text-center">
              <p className="text-sm text-on-surface-variant">Tenemos los resultados para tu noticia</p>
              {verdictTone.showBadge ? (
                <p
                  className={`mx-auto mt-2 inline-flex rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider ${verdictTone.badgeClass}`}
                >
                  {verdictTone.badgeText}
                </p>
              ) : null}
              <h2 className={`mt-2 font-headline text-2xl font-bold sm:text-3xl ${verdictTone.headingClass}`}>
                {result.verdictLabel} - FUERZA SVM {formattedSvmStrength}
              </h2>
            </div>

            <div className={`mt-4 rounded-2xl border bg-surface/50 p-3 sm:p-4 ${verdictTone.panelBorderClass}`}>
              <p className="mb-2 text-[10px] uppercase tracking-[0.18em] text-on-surface-variant">
                Fuente analizada
              </p>
              <p className="break-words text-xs text-primary">{result.source}</p>
              <p className="mt-3 text-sm leading-relaxed text-on-surface-variant">{result.excerpt}</p>
              <p className="mt-3 text-xs text-on-surface-variant">
                Fuerza SVM (valor absoluto): {formattedSvmStrength}
              </p>

              <details className="mt-3 rounded-xl border border-outline-variant/25 bg-surface-container-low/50 px-3 py-2 text-xs text-on-surface-variant">
                <summary className="cursor-pointer font-semibold text-on-surface">
                  Que significa la fuerza SVM
                </summary>
                <div className="mt-2 space-y-1 leading-relaxed">
                  <p>
                    Es el nivel de conviccion del algoritmo.
                  </p>
                  <p>
                    Un valor cercano a 0 significa que la noticia tiene patrones contradictorios y la IA no esta 100% segura.
                  </p>
                  <p>
                    Valores altos indican una deteccion clara y contundente.
                  </p>
                </div>
              </details>
            </div>

            <div className="mt-4 flex flex-col gap-2 sm:flex-row">
              <Button
                type="button"
                variant="outline"
                className="w-full sm:w-auto"
                onClick={handleSaveClick}
                disabled={!canSaveSingleResult}
              >
                {result?.savedInHistory
                  ? "Guardado en historial"
                  : isSavingResult
                  ? "Guardando..."
                  : "Guardar en historial"}
              </Button>
              <Button type="button" variant="outline" className="w-full sm:w-auto">
                Generar enlace publico
              </Button>
              <Button type="button" variant="outline" className="w-full sm:w-auto">
                Reportar fallo
              </Button>
            </div>

            {saveResultError ? (
              <p className="mt-2 rounded-xl border border-error/30 bg-error-container/40 px-3 py-2 text-sm text-error">
                {saveResultError}
              </p>
            ) : null}
          </>
        ) : result?.kind === "batch" ? (
          <>
            <div className="text-center">
              <p className="text-sm text-on-surface-variant">Lote procesado correctamente</p>
              <h2 className="mt-2 font-headline text-2xl font-bold text-on-surface sm:text-3xl">
                {result.totalRows} noticias analizadas
              </h2>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <div className="rounded-xl border border-outline-variant/25 bg-surface/50 p-3 text-center">
                <p className="text-xs uppercase tracking-wider text-on-surface-variant">Archivo</p>
                <p className="mt-1 break-all text-sm font-semibold text-on-surface">{result.fileName}</p>
              </div>
              <div className="rounded-xl border border-outline-variant/25 bg-surface/50 p-3 text-center">
                <p className="text-xs uppercase tracking-wider text-on-surface-variant">Totales</p>
                <p className="mt-1 text-lg font-bold text-primary">{result.totalRows}</p>
              </div>
              <div className="rounded-xl border border-outline-variant/25 bg-surface/50 p-3 text-center">
                <p className="text-xs uppercase tracking-wider text-on-surface-variant">Sospechosas</p>
                <p className="mt-1 text-lg font-bold text-primary">{result.suspiciousRows}</p>
              </div>
            </div>

            <div className="mt-4 flex flex-col gap-2 sm:flex-row">
              <Button type="button" variant="outline" className="w-full sm:w-auto">
                Descargar reporte
              </Button>
              <Button type="button" variant="outline" className="w-full sm:w-auto">
                Guardar en historial
              </Button>
            </div>
          </>
        ) : isAnalysing ? (
          <>
            <div className="text-center">
              <p className="text-sm text-on-surface-variant">Ejecutando analisis multicapa</p>
              <h2 className="mt-2 font-headline text-2xl font-bold text-on-surface sm:text-3xl">
                Motor IA en proceso
              </h2>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              {["Recopilando fuente", "Extrayendo patrones", "Calculando veredicto"].map((step, index) => (
                <div key={step} className="rounded-xl border border-outline-variant/25 bg-surface/50 p-3 text-center">
                  <p className="text-xs uppercase tracking-wider text-on-surface-variant">Fase {index + 1}</p>
                  <p className="mt-1 text-sm font-semibold text-on-surface">{step}</p>
                </div>
              ))}
            </div>
          </>
        ) : (
          <>
            <div className="text-center">
              <h2 className="mt-2 font-headline text-2xl font-bold text-on-surface sm:text-3xl">
                Esperando tu primer análisis
              </h2>
              <p className="mx-auto mt-2 max-w-2xl text-sm text-on-surface-variant">
                Cuando analices una noticia, aqui veras el veredicto, la fuerza SVM y las acciones disponibles.
              </p>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-outline-variant/25 bg-surface/50 p-3 text-center">
                <p className="text-xs uppercase tracking-wider text-on-surface-variant">Veredicto</p>
                <p className="mt-1 text-lg font-bold text-on-surface/50">--</p>
              </div>
              <div className="rounded-xl border border-outline-variant/25 bg-surface/50 p-3 text-center">
                <p className="text-xs uppercase tracking-wider text-on-surface-variant">Fuerza SVM</p>
                <p className="mt-1 text-lg font-bold text-on-surface/50">--</p>
              </div>
            </div>

            <div className="mt-4 flex flex-col gap-2 sm:flex-row">
              <Button type="button" variant="outline" className="w-full sm:w-auto" disabled>
                Guardar en historial
              </Button>
              <Button type="button" variant="outline" className="w-full sm:w-auto" disabled>
                Generar enlace público
              </Button>
              <Button type="button" variant="outline" className="w-full sm:w-auto" disabled>
                Reportar fallo
              </Button>
            </div>
          </>
        )}
      </div>
    </section>
  );
}

export default DashboardResultPanel;
