/**
 * @file SingleResultView.jsx
 * @description Vista del resultado individual del análisis con veredicto y acciones.
 */

import { Button } from "@/components/ui/button";
import { useTranslation } from "react-i18next";
import { getVerdictTone } from "./verdictTone";
import { translateVerdictLabel } from "./verdictI18n";

/** Render del veredicto unico con badge de incertidumbre, fuente y acciones. */
function SingleResultView({ result, isSavingResult, saveResultError, onSaveResult }) {
  const { t } = useTranslation("dashboard");
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
        <p className="text-sm text-on-surface-variant">{t("result.single.intro")}</p>
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
          {translateVerdictLabel(result.verdictLabel)} - {t("result.single.headingSuffix")} {formattedSvmStrength}
        </h2>
      </div>

      <div
        className={`mt-4 rounded-2xl border bg-surface/50 p-3 sm:p-4 ${verdictTone.panelBorderClass}`}
      >
        <p className="mb-2 text-[10px] uppercase tracking-[0.18em] text-on-surface-variant">
          {t("result.single.sourceLabel")}
        </p>
        <p className="break-words text-xs text-primary">{result.source}</p>
        <p className="mt-3 text-sm leading-relaxed text-on-surface-variant">{result.excerpt}</p>
        <p className="mt-3 text-xs text-on-surface-variant">
          {t("result.single.svmAbsolute", { value: formattedSvmStrength })}
        </p>

        <details className="mt-3 rounded-xl border border-outline-variant/25 bg-surface-container-low/50 px-3 py-2 text-xs text-on-surface-variant">
          <summary className="cursor-pointer font-semibold text-on-surface">
            {t("result.single.detailsSummary")}
          </summary>
          <div className="mt-2 space-y-1 leading-relaxed">
            <p>{t("result.single.detailsLine1")}</p>
            <p>{t("result.single.detailsLine2")}</p>
            <p>{t("result.single.detailsLine3")}</p>
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
            ? t("result.actions.savedHistory")
            : isSavingResult
            ? t("result.actions.saving")
            : t("result.actions.saveHistory")}
        </Button>
        <Button type="button" variant="outline" className="w-full sm:w-auto">
          {t("result.actions.publicLink")}
        </Button>
        <Button type="button" variant="outline" className="w-full sm:w-auto">
          {t("result.actions.report")}
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
