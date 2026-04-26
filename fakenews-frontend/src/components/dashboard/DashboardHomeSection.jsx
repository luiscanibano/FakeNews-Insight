/**
 * @file DashboardHomeSection.jsx
 * @description Componente del dashboard para renderizar analisis, resultados, navegacion y paneles operativos.
 */

import { BarChart3, CalendarDays, Clock3, Crown, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

/** Asigna estilos de badge segun veredicto normalizado del analisis. */
const getVerdictStyles = (verdict) => {
  if (verdict === "FIABLE") {
    return "border-emerald-400/30 bg-emerald-500/15 text-emerald-200";
  }

  if (verdict === "FALSA") {
    return "border-red-400/30 bg-red-500/15 text-red-200";
  }

  return "border-amber-300/40 bg-amber-500/15 text-amber-100";
};

/** Controla la densidad de etiquetas del eje X en movil para evitar solapamientos. */
const shouldShowMobileXAxisLabel = (index, totalPoints) => {
  if (totalPoints <= 5) {
    return true;
  }

  if (totalPoints === 10) {
    return index === 0 || index === 2 || index === 4 || index === 6 || index === 9;
  }

  return index % 2 === 0 || index === totalPoints - 1;
};

/** Renderiza la seccion Inicio del dashboard con metricas, actividad y recientes. */
function DashboardHomeSection({
  planLabel,
  usageMetrics,
  last30DaysSeries,
  recentAnalyses,
  homeLoading,
  homeError,
  onStartAnalysis,
}) {
  const safeSeries = Array.isArray(last30DaysSeries) ? last30DaysSeries : [];
  const maxSeriesValue = Math.max(1, ...safeSeries.map((point) => point.count || 0));
  const safeUsageMetrics =
    usageMetrics || { remainingLabel: "--", usedToday: 0, usedThisMonth: 0, dailyLimitLabel: "--" };

  return (
    <section className="space-y-6">
      <div className="auth-fade-up text-center" style={{ "--auth-delay": "40ms" }}>
        <div className="dashboard-hero-title-wrap mx-auto max-w-5xl">
          <h1 className="dashboard-hero-title font-headline text-3xl font-extrabold leading-[1.08] tracking-tighter sm:text-5xl">
            <span className="landing-gradient-title">Tu centro de control</span>{" "}
            <em className="landing-title-emphasis mx-1 italic">contra la desinformación</em>
          </h1>
          <div className="dashboard-hero-underline" aria-hidden="true" />
        </div>
        <p className="mx-auto mt-3 max-w-3xl text-sm leading-relaxed text-on-surface-variant sm:text-base">
          Empieza desde Inicio con una visión rapida de tu estado y actividad reciente conectada
          con Supabase.
        </p>

        <div className="mt-5 flex justify-center">
          <Button
            type="button"
            onClick={onStartAnalysis}
            className="landing-shimmer h-11 rounded-xl bg-primary px-5 text-sm font-bold text-on-primary"
          >
            Ir a analizar
          </Button>
        </div>
      </div>

      <div className="auth-fade-up grid grid-cols-1 gap-4 xl:grid-cols-[0.9fr_1.1fr]" style={{ "--auth-delay": "90ms" }}>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 xl:grid-cols-1">
          <div className="landing-glass-card rounded-2xl border border-outline-variant/20 p-4 sm:p-5">
            <div className="flex items-center justify-between gap-2">
              <p className="text-[10px] uppercase tracking-[0.16em] text-on-surface-variant">Plan actual</p>
              <span className="inline-flex items-center justify-center rounded-lg border border-outline-variant/25 bg-surface/55 p-1.5">
                <Crown className="size-3.5 text-primary" />
              </span>
            </div>
            <p className="mt-2 text-3xl font-extrabold tracking-tight text-on-surface">{planLabel}</p>
            <p className="mt-1 text-xs text-on-surface-variant">Nivel de suscripción activo.</p>
          </div>

          <div className="landing-glass-card rounded-2xl border border-outline-variant/20 p-4 sm:p-5">
            <div className="flex items-center justify-between gap-2">
              <p className="text-[10px] uppercase tracking-[0.16em] text-on-surface-variant">Análisis restantes</p>
              <span className="inline-flex items-center justify-center rounded-lg border border-outline-variant/25 bg-surface/55 p-1.5">
                <BarChart3 className="size-3.5 text-primary" />
              </span>
            </div>
            <p className="mt-2 text-3xl font-extrabold tracking-tight text-on-surface">{safeUsageMetrics.remainingLabel}</p>
            <p className="mt-1 text-xs text-on-surface-variant">Cupo diario disponible.</p>
          </div>

          <div className="landing-glass-card rounded-2xl border border-outline-variant/20 p-4 sm:p-5">
            <div className="flex items-center justify-between gap-2">
              <p className="text-[10px] uppercase tracking-[0.16em] text-on-surface-variant">Análisis este mes</p>
              <span className="inline-flex items-center justify-center rounded-lg border border-outline-variant/25 bg-surface/55 p-1.5">
                <Clock3 className="size-3.5 text-primary" />
              </span>
            </div>
            <p className="mt-2 text-3xl font-extrabold tracking-tight text-on-surface">{safeUsageMetrics.usedThisMonth}</p>
            <p className="mt-1 text-xs text-on-surface-variant">
              Total acumulado en el mes actual.
            </p>
          </div>
        </div>

        <div className="landing-glass-card rounded-2xl border border-outline-variant/20 p-4 sm:p-5">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-outline-variant/25 bg-surface/55 px-2.5 py-1 text-[10px] uppercase tracking-[0.16em] text-primary">
            <CalendarDays className="size-3.5" />
            Últimos 10 días
          </div>

          <div className="grid h-52 grid-cols-10 items-end gap-2">
            {safeSeries.map((point, index) => {
              const value = Number(point.count) || 0;
              const barHeight = Math.max(8, Math.round((value / maxSeriesValue) * 100));
              const showMobileXAxisLabel = shouldShowMobileXAxisLabel(index, safeSeries.length);

              return (
                <div key={point.label} className="flex flex-col items-center justify-end gap-1">
                  <span
                    className={`text-[10px] text-on-surface-variant ${
                      showMobileXAxisLabel ? "inline" : "hidden sm:inline"
                    }`}
                  >
                    {value}
                  </span>
                  <div className="flex h-36 w-full items-end rounded-md border border-outline-variant/20 bg-surface-container-high/45 p-0.5">
                    <div
                      className="dashboard-home-bar-fill w-full rounded-sm bg-gradient-to-t from-primary/35 via-primary/70 to-primary"
                      style={{ height: `${barHeight}%`, animationDelay: `${120 + index * 70}ms` }}
                    />
                  </div>
                  <span
                    className={`text-[10px] text-on-surface-variant ${
                      showMobileXAxisLabel ? "inline" : "hidden sm:inline"
                    }`}
                  >
                    {point.label}
                  </span>
                </div>
              );
            })}
          </div>

          <p className="mt-3 text-xs text-on-surface-variant">
            Número de análisis por día en los últimos 10 días.
          </p>

          {homeLoading ? (
            <p className="mt-1 text-xs text-primary">Cargando actividad desde Supabase...</p>
          ) : null}

          {homeError ? (
            <p className="mt-1 text-xs text-error">{homeError}</p>
          ) : null}
        </div>
      </div>

      <div className="auth-fade-up" style={{ "--auth-delay": "140ms" }}>
        <div className="dashboard-result-shell rounded-3xl border border-outline-variant/20 p-4 sm:p-6">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="font-headline text-xl font-bold text-on-surface sm:text-2xl">
                Análisis recientes
              </h2>
              <p className="text-xs text-on-surface-variant">
                Últimos 3 análisis registrados en tu cuenta.
              </p>
            </div>
            <div className="inline-flex items-center gap-1.5 rounded-full border border-outline-variant/25 bg-surface/55 px-3 py-1 text-[11px] text-on-surface-variant">
              <Clock3 className="size-3.5 text-primary" />
              Actualización manual
            </div>
          </div>

          <div className="space-y-3">
            {recentAnalyses.length === 0 ? (
              <div className="rounded-2xl border border-outline-variant/25 bg-surface/45 p-4 text-sm text-on-surface-variant">
                Aun no hay análisis recientes guardados para este usuario.
              </div>
            ) : null}

            {recentAnalyses.map((analysis) => (
              <article
                key={analysis.id}
                className="rounded-2xl border border-outline-variant/25 bg-surface/50 p-3 sm:p-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-on-surface">{analysis.title}</p>
                  <span
                    className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider ${getVerdictStyles(
                      analysis.verdictLabel
                    )}`}
                  >
                    {analysis.verdictLabel}
                  </span>
                </div>

                <div className="mt-2 flex flex-wrap items-center gap-4 text-xs text-on-surface-variant">
                  <span className="inline-flex items-center gap-1.5">
                    <BarChart3 className="size-3.5 text-primary" />
                    Fuerza SVM: {analysis.svmStrength.toFixed(2)}
                  </span>
                  <span>{analysis.timestampLabel}</span>
                </div>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

export default DashboardHomeSection;
