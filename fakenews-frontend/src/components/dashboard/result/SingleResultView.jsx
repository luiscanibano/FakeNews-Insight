/**
 * @file SingleResultView.jsx
 * @description Vista del resultado individual del análisis con veredicto y acciones.
 */

import { Button } from "@/components/ui/button";
import { getVerdictTone } from "./verdictTone";

/** Render del veredicto unico con badge de incertidumbre, fuente y acciones. */
function SingleResultView({ result, isSavingResult, saveResultError, onSaveResult }) {
  const formattedSvmStrength =
    typeof result?.svmStrength === "number" ? result.svmStrength.toFixed(2) : "--";
  const verdictTone = getVerdictTone({
    verdictLabel: result?.verdictLabel,
    svmStrength: result?.svmStrength,
  });
  const canSaveSingleResult =
    Boolean(result?.analysisRunId) && !result?.savedInHistory && !isSavingResult;

  /** Gestiona guardado manual en historial sin duplicar estado de error local. */
  const handleSaveClick = async () => {
    if (!canSaveSingleResult || typeof onSaveResult !== "function") {
      return;
    }

    try {
      await onSaveResult();
    } catch {
      /** El store centralizado expone saveResultError. */
    }
  };

  return (
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
        <h2
          className={`mt-2 font-headline text-2xl font-bold sm:text-3xl ${verdictTone.headingClass}`}
        >
          {result.verdictLabel} - FUERZA SVM {formattedSvmStrength}
        </h2>
      </div>

      <div
        className={`mt-4 rounded-2xl border bg-surface/50 p-3 sm:p-4 ${verdictTone.panelBorderClass}`}
      >
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
            <p>Es el nivel de conviccion del algoritmo.</p>
            <p>
              Un valor cercano a 0 significa que la noticia tiene patrones contradictorios y la
              IA no esta 100% segura.
            </p>
            <p>Valores altos indican una deteccion clara y contundente.</p>
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
          Generar enlace público
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
  );
}

export default SingleResultView;
