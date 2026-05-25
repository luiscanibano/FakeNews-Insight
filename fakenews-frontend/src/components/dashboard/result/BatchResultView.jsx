/**
 * @file BatchResultView.jsx
 * @description Vista resumen del análisis por lotes (CSV).
 */

import { Button } from "@/components/ui/button";
import { useTranslation } from "react-i18next";

/** Resumen de lote procesado con KPIs y acciones de exportacion. */
function BatchResultView({
  result,
  onSaveResult,
  isSavingResult = false,
  saveResultError = "",
}) {
  const { t } = useTranslation("dashboard");

  const handleDownloadReport = () => {
    const rows = Array.isArray(result?.items) ? result.items : [];
    const csvRows = [
      ["row_index", "status", "overall_label", "selected_claims", "summary", "error"],
      ...rows.map((item) => [
        item?.row_index ?? "",
        item?.status || "",
        item?.overall_label || "",
        item?.selected_claims ?? "",
        item?.summary || "",
        item?.error || "",
      ]),
    ];
    const csvContent = csvRows
      .map((row) => row.map((value) => `"${String(value ?? "").replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const downloadUrl = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = downloadUrl;
    anchor.download = `${(result?.fileName || "verification-batch").replace(/\.csv$/i, "")}-report.csv`;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(downloadUrl);
  };

  const handleSaveClick = async () => {
    if (typeof onSaveResult !== "function" || result?.savedInHistory || isSavingResult) {
      return;
    }

    try {
      await onSaveResult();
    } catch {
      /** El estado de error ya se gestiona fuera del componente. */
    }
  };

  return (
    <>
      <div className="text-center">
        <p className="text-sm text-on-surface-variant">{t("result.batch.intro")}</p>
        <h2 className="mt-2 font-headline text-2xl font-bold text-on-surface sm:text-3xl">
          {result.totalRows} {t("result.batch.headingSuffix")}
        </h2>
        <p className="mt-2 text-sm text-on-surface-variant">
          {t("result.batch.progressSummary", {
            processed: result.processedRows || 0,
            total: result.totalRows || 0,
            defaultValue: "{{processed}} de {{total}} filas procesadas",
          })}
        </p>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-outline-variant/25 bg-surface/50 p-3 text-center">
          <p className="text-xs uppercase tracking-wider text-on-surface-variant">{t("result.batch.fileLabel")}</p>
          <p className="mt-1 break-all text-sm font-semibold text-on-surface">{result.fileName}</p>
        </div>
        <div className="rounded-xl border border-outline-variant/25 bg-surface/50 p-3 text-center">
          <p className="text-xs uppercase tracking-wider text-on-surface-variant">
            {t("result.batch.processedLabel", "Procesadas")}
          </p>
          <p className="mt-1 text-lg font-bold text-primary">{result.processedRows}</p>
        </div>
        <div className="rounded-xl border border-outline-variant/25 bg-surface/50 p-3 text-center">
          <p className="text-xs uppercase tracking-wider text-on-surface-variant">
            {t("result.batch.failedLabel", "Con errores")}
          </p>
          <p className="mt-1 text-lg font-bold text-primary">{result.failedRows}</p>
        </div>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-outline-variant/25 bg-surface/50 p-3 text-center">
          <p className="text-xs uppercase tracking-wider text-on-surface-variant">
            {t("result.batch.successLabel", "Completadas")}
          </p>
          <p className="mt-1 text-lg font-bold text-primary">{result.successRows}</p>
        </div>
        <div className="rounded-xl border border-outline-variant/25 bg-surface/50 p-3 text-center">
          <p className="text-xs uppercase tracking-wider text-on-surface-variant">
            {t("result.batch.batchIdLabel", "Lote")}
          </p>
          <p className="mt-1 break-all text-sm font-semibold text-on-surface">{result.batchId || "--"}</p>
        </div>
      </div>

      {Array.isArray(result.items) && result.items.length > 0 ? (
        <div className="mt-4 space-y-2">
          {result.items.slice(0, 6).map((item) => (
            <div
              key={item.run_id || item.row_index}
              className="rounded-xl border border-outline-variant/25 bg-surface/35 px-3 py-2"
            >
              <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                <span className="font-semibold text-on-surface">
                  {t("result.batch.rowLabel", {
                    row: item.row_index,
                    defaultValue: "Fila {{row}}",
                  })}
                </span>
                <span className="text-on-surface-variant">{item.status}</span>
              </div>
              {item.overall_label ? (
                <p className="mt-1 text-xs text-on-surface-variant">{item.overall_label}</p>
              ) : null}
              {item.error ? (
                <p className="mt-1 text-xs text-error">{item.error}</p>
              ) : null}
            </div>
          ))}
        </div>
      ) : null}

      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        <Button type="button" variant="outline" className="w-full sm:w-auto" onClick={handleDownloadReport}>
          {t("result.actions.downloadReport")}
        </Button>
        {typeof onSaveResult === "function" ? (
          <Button
            type="button"
            variant="outline"
            className="w-full sm:w-auto"
            onClick={handleSaveClick}
            disabled={Boolean(result?.savedInHistory) || isSavingResult}
          >
            {result?.savedInHistory
              ? t("result.actions.savedHistory")
              : isSavingResult
              ? t("result.actions.saving")
              : t("result.actions.saveHistory")}
          </Button>
        ) : null}
      </div>

      {saveResultError ? (
        <p className="mt-3 rounded-xl border border-error/30 bg-error-container/40 px-3 py-2 text-sm text-error">
          {saveResultError}
        </p>
      ) : null}
    </>
  );
}

export default BatchResultView;
