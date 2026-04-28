/**
 * @file BatchResultView.jsx
 * @description Vista resumen del análisis por lotes (CSV).
 */

import { Button } from "@/components/ui/button";
import { useTranslation } from "react-i18next";

/** Resumen de lote procesado con KPIs y acciones de exportacion. */
function BatchResultView({ result }) {
  const { t } = useTranslation("dashboard");
  return (
    <>
      <div className="text-center">
        <p className="text-sm text-on-surface-variant">{t("result.batch.intro")}</p>
        <h2 className="mt-2 font-headline text-2xl font-bold text-on-surface sm:text-3xl">
          {result.totalRows} {t("result.batch.headingSuffix")}
        </h2>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-outline-variant/25 bg-surface/50 p-3 text-center">
          <p className="text-xs uppercase tracking-wider text-on-surface-variant">{t("result.batch.fileLabel")}</p>
          <p className="mt-1 break-all text-sm font-semibold text-on-surface">{result.fileName}</p>
        </div>
        <div className="rounded-xl border border-outline-variant/25 bg-surface/50 p-3 text-center">
          <p className="text-xs uppercase tracking-wider text-on-surface-variant">{t("result.batch.totalsLabel")}</p>
          <p className="mt-1 text-lg font-bold text-primary">{result.totalRows}</p>
        </div>
        <div className="rounded-xl border border-outline-variant/25 bg-surface/50 p-3 text-center">
          <p className="text-xs uppercase tracking-wider text-on-surface-variant">{t("result.batch.suspiciousLabel")}</p>
          <p className="mt-1 text-lg font-bold text-primary">{result.suspiciousRows}</p>
        </div>
      </div>

      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        <Button type="button" variant="outline" className="w-full sm:w-auto">
          {t("result.actions.downloadReport")}
        </Button>
        <Button type="button" variant="outline" className="w-full sm:w-auto">
          {t("result.actions.saveHistory")}
        </Button>
      </div>
    </>
  );
}

export default BatchResultView;
