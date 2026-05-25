import { AlertTriangle, CheckCircle2, LoaderCircle } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";

const STATUS_BADGES = {
  queued: "border-sky-500/25 bg-sky-500/10 text-sky-200",
  pending: "border-sky-500/25 bg-sky-500/10 text-sky-200",
  processing: "border-amber-500/25 bg-amber-500/10 text-amber-200",
  completed: "border-emerald-500/25 bg-emerald-500/10 text-emerald-200",
  failed: "border-rose-500/25 bg-rose-500/10 text-rose-200",
};

function VerificationTaskQueue({
  tasks = [],
  selectedTaskId = null,
  onSelectTask,
  onSaveTask,
}) {
  const { t } = useTranslation("dashboard");

  if (!Array.isArray(tasks) || tasks.length === 0) {
    return null;
  }

  return (
    <section className="dash-in space-y-3" style={{ "--i": 2 }}>
      <div className="dash-panel space-y-3">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="dash-panel-title">
              {t("verify.queue.title", "Verificaciones en cola")}
            </h2>
            <p className="dash-panel-meta">
              {t(
                "verify.queue.subtitle",
                "Puedes seguir enviando textos mientras estas verificaciones terminan en segundo plano."
              )}
            </p>
          </div>
          <p className="dash-panel-meta">
            {t("verify.queue.count", {
              count: tasks.length,
              defaultValue: "{{count}} verificacion(es) activas o recientes",
            })}
          </p>
        </div>

        <div className="grid gap-3 xl:grid-cols-2">
          {tasks.map((task) => {
            const isSelected = task.clientTaskId === selectedTaskId;
            const isCompleted = task.status === "completed" && (task.report || task.mode === "csv");
            const isActive = task.status === "queued" || task.status === "pending" || task.status === "processing";
            const badgeTone = STATUS_BADGES[task.status] || STATUS_BADGES.pending;

            return (
              <article
                key={task.clientTaskId}
                className={`rounded-2xl border bg-surface/55 p-4 shadow-[0_16px_44px_rgba(0,0,0,0.16)] transition ${
                  isSelected ? "border-primary/45" : "border-outline-variant/20"
                }`}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold leading-relaxed text-on-surface">
                      {task.excerpt}
                    </p>
                    <p className="mt-2 text-xs text-on-surface-variant">
                      {task.mode === "csv"
                        ? t("verify.queue.rows", {
                            count: task.totalRows || 0,
                            defaultValue: "{{count}} fila(s) en el lote",
                          })
                        : `${task.inputText.length.toLocaleString("es-ES")} ${t("verify.queue.characters", "caracteres")}`}
                    </p>
                  </div>

                  <span className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider ${badgeTone}`}>
                    {task.statusLabel || task.status}
                  </span>
                </div>

                {isActive ? (
                  <div className="mt-4 space-y-2">
                    <div
                      className="dash-progress"
                      role="progressbar"
                      aria-valuenow={task.progress || 0}
                      aria-valuemin={0}
                      aria-valuemax={100}
                    >
                      <div className="dash-progress-fill" style={{ width: `${task.progress || 0}%` }} />
                    </div>
                    <div className="flex items-center gap-2 text-xs text-on-surface-variant">
                      <LoaderCircle className="size-3.5 animate-spin" />
                      <span>
                        {t("verify.queue.progress", {
                          progress: task.progress || 0,
                          defaultValue: "Progreso estimado: {{progress}}%",
                        })}
                      </span>
                    </div>
                  </div>
                ) : null}

                {task.status === "failed" ? (
                  <div className="mt-4 rounded-xl border border-rose-500/25 bg-rose-500/10 px-3 py-2 text-sm text-rose-100">
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="mt-0.5 size-4 shrink-0" />
                      <p>{task.error || t("verify.queue.genericError", "La verificación no pudo completarse.")}</p>
                    </div>
                  </div>
                ) : null}

                {task.saveError ? (
                  <p className="mt-4 rounded-xl border border-error/30 bg-error-container/40 px-3 py-2 text-sm text-error">
                    {task.saveError}
                  </p>
                ) : null}

                <div className="mt-4 flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant={isSelected ? "default" : "outline"}
                    onClick={() => onSelectTask?.(task.clientTaskId)}
                  >
                    {isCompleted
                      ? t("verify.queue.viewResult", "Ver resultados")
                      : t("verify.queue.viewStatus", "Ver estado")}
                  </Button>

                  {isCompleted && task.mode !== "csv" ? (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => onSaveTask?.(task.clientTaskId)}
                      disabled={task.saveLoading}
                    >
                      {task.saveLoading
                        ? t("result.actions.saving")
                        : t("verify.queue.save", "Guardar")}
                    </Button>
                  ) : null}

                  {task.status === "completed" ? (
                    <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/25 bg-emerald-500/10 px-2.5 py-1 text-[11px] font-semibold text-emerald-200">
                      <CheckCircle2 className="size-3.5" />
                      {t("verify.queue.done", "Lista")}
                    </span>
                  ) : null}
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}

export default VerificationTaskQueue;