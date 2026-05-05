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

/** Componente principal del informe de verificacion. */
function VerificationReport({ report }) {
  const { t } = useTranslation();

  if (!report) {
    return null;
  }

  const overallTone = VERDICT_TO_TONE[report.veredicto_global] || "verdict-nei";

  return (
    <section
      className="verification-report"
      aria-labelledby="verification-report-title"
    >
      <header className={`verification-report__header ${overallTone}`}>
        <h2 id="verification-report-title">
          {t(`verify.verdict.${report.veredicto_global}`, report.veredicto_global)}
        </h2>
        {report.resumen ? (
          <p className="verification-report__summary">{report.resumen}</p>
        ) : null}
        <dl className="verification-report__meta">
          <div>
            <dt>{t("verify.meta.modelVersion", "Modelo")}</dt>
            <dd>{report.model_version}</dd>
          </div>
          <div>
            <dt>{t("verify.meta.duration", "Duración")}</dt>
            <dd>
              {typeof report.duracion_ms === "number"
                ? `${report.duracion_ms} ms`
                : "-"}
            </dd>
          </div>
          {typeof report.verificaciones_restantes_hoy === "number" ? (
            <div>
              <dt>{t("verify.meta.remaining", "Verificaciones restantes hoy")}</dt>
              <dd>
                {report.verificaciones_restantes_hoy}
                {typeof report.limite_diario === "number"
                  ? ` / ${report.limite_diario}`
                  : ""}
              </dd>
            </div>
          ) : null}
        </dl>
      </header>

      <ol className="verification-report__claims" aria-label={t("verify.claimsLabel", "Afirmaciones")}>
        {report.claims.map((claim, idx) => (
          <li key={claim.id || idx} className="verification-report__claim">
            <header className={`claim-header ${VERDICT_TO_TONE[claim.veredicto] || "verdict-nei"}`}>
              <span className="claim-index" aria-hidden="true">#{idx + 1}</span>
              <p className="claim-text">{claim.texto}</p>
              <span className="claim-verdict">
                {t(`verify.verdict.${claim.veredicto}`, claim.veredicto)}
              </span>
              <span
                className="claim-confidence"
                title={t("verify.meta.confidence", "Confianza agregada")}
              >
                {Math.round((claim.confianza ?? 0) * 100)}%
              </span>
            </header>
            {claim.razonamiento ? (
              <p className="claim-rationale">{claim.razonamiento}</p>
            ) : null}
            {claim.evidencias?.length > 0 ? (
              <ol
                className="claim-evidences"
                aria-label={t("verify.evidencesLabel", "Evidencias")}
              >
                {claim.evidencias.map((ev, evIdx) => (
                  <li key={`${claim.id}-${evIdx}`} className="claim-evidence">
                    <a
                      href={ev.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="evidence-link"
                    >
                      [{evIdx + 1}] {ev.titulo || ev.url}
                    </a>
                    <span className={`evidence-nli ${ev.nli_label.replace(/\s+/g, "-").toLowerCase()}`}>
                      {t(NLI_LABEL_KEY[ev.nli_label] || "verify.nli.nei", ev.nli_label)}
                      {" "}
                      ({Math.round((ev.nli_score ?? 0) * 100)}%)
                    </span>
                    {ev.snippet ? (
                      <p className="evidence-snippet">{ev.snippet}</p>
                    ) : null}
                  </li>
                ))}
              </ol>
            ) : (
              <p className="claim-no-evidence">
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
