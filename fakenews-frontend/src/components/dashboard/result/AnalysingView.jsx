/**
 * @file AnalysingView.jsx
 * @description Vista de fases en curso mientras se ejecuta el análisis.
 */

import { useTranslation } from "react-i18next";

/** Indicador visual de las tres fases del pipeline mientras se analiza. */
function AnalysingView() {
  const { t } = useTranslation("dashboard");
  const phases = t("result.analysing.phases", { returnObjects: true }) || [];
  return (
    <>
      <div className="text-center">
        <p className="text-sm text-on-surface-variant">{t("result.analysing.subtitle")}</p>
        <h2 className="mt-2 font-headline text-2xl font-bold text-on-surface sm:text-3xl">
          {t("result.analysing.title")}
        </h2>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        {phases.map((step, index) => (
          <div
            key={step}
            className="rounded-xl border border-outline-variant/25 bg-surface/50 p-3 text-center"
          >
            <p className="text-xs uppercase tracking-wider text-on-surface-variant">
              {t("result.analysing.phaseLabel", { index: index + 1 })}
            </p>
            <p className="mt-1 text-sm font-semibold text-on-surface">{step}</p>
          </div>
        ))}
      </div>
    </>
  );
}

export default AnalysingView;
