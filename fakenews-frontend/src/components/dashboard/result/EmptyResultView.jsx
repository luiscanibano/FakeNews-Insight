/**
 * @file EmptyResultView.jsx
 * @description Estado vacio del panel de resultados antes del primer análisis.
 */

import { useTranslation } from "react-i18next";

/** Placeholder mostrado antes de cualquier análisis para guiar al usuario. */
function EmptyResultView() {
  const { t } = useTranslation("dashboard");
  return (
    <>
      <div className="text-center">
        <h2 className="mt-2 font-headline text-2xl font-bold text-on-surface sm:text-3xl">
          {t("result.empty.title")}
        </h2>
        <p className="mx-auto mt-2 max-w-2xl text-sm text-on-surface-variant">
          {t("result.empty.subtitle")}
        </p>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-outline-variant/25 bg-surface/50 p-3 text-center">
          <p className="text-xs uppercase tracking-wider text-on-surface-variant">{t("result.empty.verdictLabel")}</p>
          <p className="mt-1 text-lg font-bold text-on-surface/50">--</p>
        </div>
        <div className="rounded-xl border border-outline-variant/25 bg-surface/50 p-3 text-center">
          <p className="text-xs uppercase tracking-wider text-on-surface-variant">{t("result.empty.svmStrengthLabel")}</p>
          <p className="mt-1 text-lg font-bold text-on-surface/50">--</p>
        </div>
      </div>
    </>
  );
}

export default EmptyResultView;
