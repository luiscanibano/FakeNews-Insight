/**
 * @file VerificationReport.jsx
 * @description Vista del informe del agente FEVER: veredicto global,
 *              afirmaciones extraidas y evidencias web con citas numericas.
 *              Soporta i18n y atributos ARIA para accesibilidad.
 */

import { useTranslation } from "react-i18next";

const VERDICT_TO_TONE = {
  SUPPORTED: "verdict-supported",
  REFUTED: "verdict-refuted",
  NOT_ENOUGH_INFO: "verdict-nei",
  CONFLICTING: "verdict-conflicting",
};

const NLI_LABEL_KEY = {
  SUPPORTS: "verify.nli.supports",
  REFUTES: "verify.nli.refutes",
  "NOT ENOUGH INFO": "verify.nli.nei",
};

const VERDICT_ORDER = ["SUPPORTED", "REFUTED", "NOT_ENOUGH_INFO", "CONFLICTING"];

/** Componente principal del informe de verificacion. */
function VerificationReport({ report }) {
  const { t } = useTranslation("dashboard");

  if (!report) {
    return null;
  }

  const overallTone = VERDICT_TO_TONE[report.veredicto_global] || "verdict-nei";

  return (
    <section
      className="space-y-4"
      aria-labelledby="verification-report-title"
    >
      <header className={`rounded-2xl border border-outline-variant/25 bg-surface/60 p-4 ${overallTone}`}>
        <h2 id="verification-report-title" className="font-headline text-2xl font-bold text-on-surface sm:text-3xl">
          {t(`verify.verdict.${report.veredicto_global}`, report.veredicto_global)}
        </h2>
        {report.resumen ? (
          <p className="mt-2 text-sm leading-relaxed text-on-surface-variant">{report.resumen}</p>
        ) : null}
        <dl className="mt-4 grid gap-3 text-xs text-on-surface-variant sm:grid-cols-3">
          <div>
            <dt className="font-semibold uppercase tracking-wider">{t("verify.meta.modelVersion", "Modelo")}</dt>
            <dd className="mt-1 break-words text-on-surface">{report.model_version}</dd>
          </div>
          <div>
            <dt className="font-semibold uppercase tracking-wider">{t("verify.meta.duration", "Duración")}</dt>
            <dd className="mt-1 text-on-surface">
              {typeof report.duracion_ms === "number"
                ? `${report.duracion_ms} ms`
                : "-"}
            </dd>
          </div>
          {typeof report.verificaciones_restantes_hoy === "number" ? (
            <div>
              <dt className="font-semibold uppercase tracking-wider">{t("verify.meta.remaining", "Verificaciones restantes hoy")}</dt>
              <dd className="mt-1 text-on-surface">
                {report.verificaciones_restantes_hoy}
                {typeof report.limite_diario === "number"
                  ? ` / ${report.limite_diario}`
                  : ""}
              </dd>
            </div>
          ) : null}
        </dl>
      </header>

      <section
        className="rounded-2xl border border-outline-variant/25 bg-surface-container-low/35 p-3 sm:p-4"
        aria-labelledby="verification-guide-title"
      >
        <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
          <div>
            <h3 id="verification-guide-title" className="text-sm font-semibold text-on-surface">
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
            <div key={label} className={`rounded-xl border border-outline-variant/20 bg-surface/45 p-3 ${VERDICT_TO_TONE[label]}`}>
              <dt className="text-[10px] font-bold uppercase tracking-wider text-on-surface">
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

      <ol className="space-y-3" aria-label={t("verify.claimsLabel", "Afirmaciones")}>
        {report.claims.map((claim, idx) => (
          <li key={claim.id || idx} className="rounded-2xl border border-outline-variant/25 bg-surface/50 p-3 sm:p-4">
            <header className={`flex flex-wrap items-start gap-2 ${VERDICT_TO_TONE[claim.veredicto] || "verdict-nei"}`}>
              <span className="rounded-full border border-outline-variant/30 px-2 py-1 text-xs font-bold text-on-surface-variant" aria-hidden="true">#{idx + 1}</span>
              <p className="min-w-0 flex-1 text-sm font-semibold leading-relaxed text-on-surface">{claim.texto}</p>
              <span className="rounded-full border border-outline-variant/30 px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-on-surface">
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
              <ol
                className="mt-3 space-y-2"
                aria-label={t("verify.evidencesLabel", "Evidencias")}
              >
                {claim.evidencias.map((ev, evIdx) => (
                  <li key={`${claim.id}-${evIdx}`} className="rounded-xl border border-outline-variant/20 bg-surface-container-low/40 p-3">
                    <a
                      href={ev.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="break-words text-xs font-semibold text-primary hover:underline"
                    >
                      [{evIdx + 1}] {ev.titulo || ev.url}
                    </a>
                    <span className={`mt-2 block text-[10px] font-semibold uppercase tracking-wider text-on-surface-variant ${ev.nli_label.replace(/\s+/g, "-").toLowerCase()}`}>
                      {t(NLI_LABEL_KEY[ev.nli_label] || "verify.nli.nei", ev.nli_label)}
                      {" "}
                      ({Math.round((ev.nli_score ?? 0) * 100)}%)
                    </span>
                    {ev.snippet ? (
                      <p className="mt-2 text-xs leading-relaxed text-on-surface-variant">{ev.snippet}</p>
                    ) : null}
                  </li>
                ))}
              </ol>
            ) : (
              <p className="mt-3 rounded-xl border border-outline-variant/20 bg-surface-container-low/40 px-3 py-2 text-xs text-on-surface-variant">
                {t("verify.noEvidence", "Sin evidencias web suficientes.")}
              </p>
            )}
          </li>
        ))}
      </ol>
    </section>
  );
}

export default VerificationReport;
