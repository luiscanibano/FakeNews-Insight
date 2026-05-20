/**
 * @file VerificationReport.jsx
 * @description Vista del informe del agente FEVER: veredicto global,
 *              afirmaciones extraidas y evidencias web con citas numericas.
 *              Soporta i18n y atributos ARIA para accesibilidad.
 */

import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";

const VERDICT_TO_TEXT_CLASS = {
  SUPPORTED: "text-emerald-300",
  REFUTED: "text-rose-300",
  NOT_ENOUGH_INFO: "text-white",
  CONFLICTING: "text-white",
};

const VERDICT_TO_BADGE_CLASS = {
  SUPPORTED: "border-emerald-400/30 bg-emerald-500/10 text-emerald-300",
  REFUTED: "border-rose-400/30 bg-rose-500/10 text-rose-300",
  NOT_ENOUGH_INFO: "border-white/15 bg-white/5 text-white",
  CONFLICTING: "border-white/15 bg-white/5 text-white",
};

const VERDICT_TO_PANEL_CLASS = {
  SUPPORTED: "border-emerald-400/20",
  REFUTED: "border-rose-400/20",
  NOT_ENOUGH_INFO: "border-outline-variant/25",
  CONFLICTING: "border-outline-variant/25",
};

const VERDICT_ORDER = ["SUPPORTED", "REFUTED", "NOT_ENOUGH_INFO", "CONFLICTING"];

/** Componente principal del informe de verificacion. */
function VerificationReport({
  report,
  idPrefix = "verification-report",
  runId = null,
  onSaveResult,
  isSavingResult = false,
  saveResultError = "",
  savedInHistory = false,
}) {
  const { t } = useTranslation("dashboard");

  if (!report) {
    return null;
  }

  const overallTitleTone = VERDICT_TO_TEXT_CLASS[report.veredicto_global] || "text-white";
  const overallPanelTone = VERDICT_TO_PANEL_CLASS[report.veredicto_global] || "border-outline-variant/25";
  const reportTitleId = `${idPrefix}-title`;
  const guideTitleId = `${idPrefix}-guide-title`;
  const claimsTitleId = `${idPrefix}-claims-title`;
  const resolvedRunId = runId || report?.run_id || null;
  const canSaveVerification = !savedInHistory && !isSavingResult && (Boolean(resolvedRunId) || Boolean(report));

  const handleSaveClick = async () => {
    if (!canSaveVerification || typeof onSaveResult !== "function") {
      return;
    }

    try {
      await onSaveResult();
    } catch {
      /** El estado de error ya se expone desde el store. */
    }
  };

  return (
    <section
      className="space-y-4"
      aria-labelledby={reportTitleId}
    >
      <header className={`overflow-hidden rounded-2xl border bg-surface/60 p-4 shadow-[0_18px_60px_rgba(0,0,0,0.18)] ${overallPanelTone}`}>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-2xl">
            <p className="inline-flex rounded-full border border-outline-variant/30 bg-surface-container-low/50 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-on-surface-variant">
              {t("verify.overallLabel", "Veredicto global")}
            </p>
            <h2 id={reportTitleId} className={`mt-3 font-headline text-3xl font-bold sm:text-4xl ${overallTitleTone}`}>
              {t(`verify.verdict.${report.veredicto_global}`, report.veredicto_global)}
            </h2>
            {report.resumen ? (
              <p className="mt-2 max-w-xl text-sm leading-relaxed text-on-surface-variant">{report.resumen}</p>
            ) : null}

            {typeof onSaveResult === "function" ? (
              <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center">
                <Button
                  type="button"
                  variant="outline"
                  className="w-full sm:w-auto"
                  onClick={handleSaveClick}
                  disabled={!canSaveVerification}
                >
                  {savedInHistory
                    ? t("result.actions.savedHistory")
                    : isSavingResult
                    ? t("result.actions.saving")
                    : t("result.actions.saveHistory")}
                </Button>
              </div>
            ) : null}

            {saveResultError ? (
              <p className="mt-3 rounded-xl border border-error/30 bg-error-container/40 px-3 py-2 text-sm text-error">
                {saveResultError}
              </p>
            ) : null}
          </div>

          <dl className="grid gap-3 text-xs text-on-surface-variant sm:grid-cols-3 lg:min-w-[420px] lg:max-w-[460px]">
            <div className="rounded-xl border border-outline-variant/20 bg-surface-container-low/40 px-3 py-3">
              <dt className="font-semibold uppercase tracking-wider">{t("verify.meta.modelVersion", "Modelo")}</dt>
              <dd className="mt-1 break-words text-sm font-semibold text-on-surface">{report.model_version}</dd>
            </div>
            <div className="rounded-xl border border-outline-variant/20 bg-surface-container-low/40 px-3 py-3">
              <dt className="font-semibold uppercase tracking-wider">{t("verify.meta.duration", "Duración")}</dt>
              <dd className="mt-1 text-sm font-semibold text-on-surface">
                {typeof report.duracion_ms === "number"
                  ? `${report.duracion_ms} ms`
                  : "-"}
              </dd>
            </div>
            {typeof report.verificaciones_restantes_hoy === "number" ? (
              <div className="rounded-xl border border-outline-variant/20 bg-surface-container-low/40 px-3 py-3">
                <dt className="font-semibold uppercase tracking-wider">{t("verify.meta.remaining", "Verificaciones restantes hoy")}</dt>
                <dd className="mt-1 text-sm font-semibold text-on-surface">
                  {report.verificaciones_restantes_hoy}
                  {typeof report.limite_diario === "number"
                    ? ` / ${report.limite_diario}`
                    : ""}
                </dd>
              </div>
            ) : null}
          </dl>
        </div>
      </header>

      <section
        className="rounded-2xl border border-outline-variant/25 bg-surface-container-low/35 p-3 sm:p-4"
        aria-labelledby={guideTitleId}
      >
        <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
          <div>
            <h3 id={guideTitleId} className="text-sm font-semibold text-on-surface">
              {t("verify.guide.title")}
            </h3>
            <p className="mt-1 text-xs leading-relaxed text-on-surface-variant">
              {t("verify.guide.intro")}
            </p>
          </div>
          <p className="shrink-0 rounded-full border border-outline-variant/25 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-on-surface-variant">
            {t("verify.guide.method")}
          </p>
        </div>

        <dl className="mt-3 grid gap-2 sm:grid-cols-2">
          {VERDICT_ORDER.map((label) => (
            <div key={label} className={`rounded-xl border bg-surface/45 p-3 ${VERDICT_TO_PANEL_CLASS[label] || "border-outline-variant/20"}`}>
              <dt className={`text-[10px] font-bold uppercase tracking-wider ${VERDICT_TO_TEXT_CLASS[label] || "text-white"}`}>
                {t(`verify.verdict.${label}`, label)}
              </dt>
              <dd className="mt-1 text-xs leading-relaxed text-on-surface-variant">
                {t(`verify.guide.verdicts.${label}`)}
              </dd>
            </div>
          ))}
        </dl>

        <p className="mt-3 rounded-xl border border-outline-variant/20 bg-surface/40 px-3 py-2 text-xs leading-relaxed text-on-surface-variant">
          {t("verify.guide.nliNote")}
        </p>
      </section>

      <section aria-labelledby={claimsTitleId} className="space-y-3">
        <div className="rounded-2xl border border-outline-variant/20 bg-surface-container-low/25 px-4 py-3">
          <h3 id={claimsTitleId} className="text-sm font-semibold text-on-surface">
            {t("verify.claimsLabel", "Afirmaciones extraídas")}
          </h3>
          <p className="mt-1 text-xs leading-relaxed text-on-surface-variant">
            {t("verify.claimsIntro", "Estas son las afirmaciones concretas que el sistema ha extraído del texto para contrastarlas con evidencias web.")}
          </p>
        </div>

        <ol className="space-y-3" aria-label={t("verify.claimsLabel", "Afirmaciones") }>
        {report.claims.map((claim, idx) => (
          <li key={claim.id || idx} className={`rounded-2xl border bg-surface/50 p-3 sm:p-4 ${VERDICT_TO_PANEL_CLASS[claim.veredicto] || "border-outline-variant/25"}`}>
            <header className="flex flex-wrap items-start gap-2">
              <span className="rounded-full border border-outline-variant/30 px-2 py-1 text-xs font-bold text-on-surface-variant" aria-hidden="true">#{idx + 1}</span>
              <p className="min-w-0 flex-1 text-sm font-semibold leading-relaxed text-on-surface">{claim.texto}</p>
              <span className={`rounded-full border px-2 py-1 text-[10px] font-semibold uppercase tracking-wider ${VERDICT_TO_BADGE_CLASS[claim.veredicto] || "border-white/15 bg-white/5 text-white"}`}>
                {t(`verify.verdict.${claim.veredicto}`, claim.veredicto)}
              </span>
              <span
                className="rounded-full bg-surface-container-low px-2 py-1 text-[10px] font-semibold text-on-surface-variant"
                title={t("verify.meta.confidence", "Confianza agregada")}
              >
                {Math.round((claim.confianza ?? 0) * 100)}%
              </span>
            </header>
            {claim.razonamiento ? (
              <p className="mt-3 text-xs leading-relaxed text-on-surface-variant">{claim.razonamiento}</p>
            ) : null}
            {claim.evidencias?.length > 0 ? (
              <div className="mt-3 rounded-xl border border-outline-variant/20 bg-surface-container-low/40 px-3 py-2">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-on-surface-variant">
                  {t("verify.evidencesLabel", "Evidencias")}
                </p>
                <ol
                  className="mt-2 flex list-none flex-wrap gap-y-1 p-0 text-xs leading-relaxed"
                  aria-label={t("verify.evidencesLabel", "Evidencias")}
                >
                  {claim.evidencias.map((ev, evIdx) => (
                    <li key={`${claim.id}-${evIdx}`} className="flex min-w-0 items-baseline">
                      <a
                        href={ev.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="break-words font-semibold text-primary hover:underline"
                      >
                        [{evIdx + 1}] {ev.titulo || ev.url}
                      </a>
                      {evIdx < claim.evidencias.length - 1 ? (
                        <span className="pr-2 text-on-surface-variant">,</span>
                      ) : null}
                    </li>
                  ))}
                </ol>
              </div>
            ) : (
              <p className="mt-3 rounded-xl border border-outline-variant/20 bg-surface-container-low/40 px-3 py-2 text-xs text-on-surface-variant">
                {t("verify.noEvidence", "Sin evidencias web suficientes.")}
              </p>
            )}
          </li>
        ))}
        </ol>
      </section>

    </section>
  );
}

export default VerificationReport;
