/**
 * @file DashboardHomeSection.jsx
 * @description Componente del dashboard para renderizar análisis, resultados, navegación y paneles operativos.
 */

import { ArrowRight, ArrowUpRight, BarChart3, CalendarDays, Crown } from "lucide-react";
import { useTranslation } from "react-i18next";
import { translateVerdictLabel } from "./result/verdictI18n";

/** Asigna clases del verdict-dot según veredicto normalizado del análisis. */
const getVerdictClass = (verdict) => {
  if (verdict === "SUPPORTED") return "dash-verdict-real";
  if (verdict === "REFUTED") return "dash-verdict-fake";
  if (verdict === "NOT_ENOUGH_INFO" || verdict === "CONFLICTING") return "dash-verdict-other";
  if (verdict === "FIABLE") return "dash-verdict-real";
  if (verdict === "FALSA") return "dash-verdict-fake";
  return "dash-verdict-other";
};

/** Controla la densidad de etiquetas del eje X en móvil para evitar solapamientos. */
const shouldShowMobileXAxisLabel = (index, totalPoints) => {
  if (totalPoints <= 5) return true;
  if (totalPoints === 10) return index === 0 || index === 2 || index === 4 || index === 6 || index === 9;
  return index % 2 === 0 || index === totalPoints - 1;
};

/** Renderiza la sección Inicio del dashboard con métricas, actividad y recientes. */
function DashboardHomeSection({
  planLabel,
  usageMetrics,
  last30DaysSeries,
  recentAnalyses,
  homeLoading,
  homeError,
  onStartAnalysis,
}) {
  const { t } = useTranslation("dashboard");
  const safeSeries = Array.isArray(last30DaysSeries) ? last30DaysSeries : [];
  const maxSeriesValue = Math.max(1, ...safeSeries.map((point) => point.count || 0));
  const totalSeries = safeSeries.reduce((acc, point) => acc + (Number(point.count) || 0), 0);
  const safeUsageMetrics =
    usageMetrics || { remainingLabel: "--", usedToday: 0, usedThisMonth: 0, dailyLimitLabel: "--" };

  return (
    <section className="space-y-10">
      {/* Hero: saludo editorial sobrio */}
      <div className="dash-in" style={{ "--i": 0 }}>
        <span className="dash-home-eyebrow">
          <span className="dash-home-eyebrow-dot" aria-hidden="true" />
          {t("home.eyebrow")}
        </span>

        <h1 className="dash-home-h1 mt-3">
          {t("home.titlePrefix")}{" "}
          <span className="dash-home-h1-soft">{t("home.titleSoft")}</span>
        </h1>

        <p className="dash-home-sub">{t("home.subtitle")}</p>

        <div className="mt-5 flex items-center gap-2">
          <button type="button" onClick={onStartAnalysis} className="dash-cta">
            {t("home.ctaAnalyze")}
            <ArrowRight className="dash-cta-arrow size-4" aria-hidden="true" />
          </button>
        </div>
      </div>

      {/* Stats: jerarquía 1+2 sin glass uniforme */}
      <div className="dash-in dash-stat-grid" style={{ "--i": 1 }}>
        <div className="dash-stat dash-stat-primary">
          <p className="dash-stat-label">
            <BarChart3 className="dash-stat-label-icon size-3.5" />
            {t("home.remainingToday")}
          </p>
          <p className="dash-stat-value">
            {safeUsageMetrics.remainingLabel}
            <span className="dash-stat-value-suffix">
              {t("home.remainingTodayOf", { limit: safeUsageMetrics.dailyLimitLabel })}
            </span>
          </p>
          <p className="dash-stat-foot">
            {t("home.remainingTodayFoot")}
          </p>
        </div>

        <div className="dash-stat">
          <p className="dash-stat-label">
            <Crown className="dash-stat-label-icon size-3.5" />
            {t("home.currentPlan")}
          </p>
          <p className="dash-stat-value">{planLabel}</p>
          <p className="dash-stat-foot">{t("home.currentPlanFoot")}</p>
        </div>

        <div className="dash-stat">
          <p className="dash-stat-label">
            <CalendarDays className="dash-stat-label-icon size-3.5" />
            {t("home.thisMonth")}
          </p>
          <p className="dash-stat-value">{safeUsageMetrics.usedThisMonth}</p>
          <p className="dash-stat-foot">{t("home.thisMonthFoot")}</p>
        </div>
      </div>

      {/* Gráfico limpio de actividad */}
      <div className="dash-in dash-panel" style={{ "--i": 2 }}>
        <header className="dash-panel-head">
          <div>
            <h2 className="dash-panel-title">{t("home.recentActivity")}</h2>
            <p className="dash-panel-meta">
              {t("home.recentActivityMeta", { total: totalSeries })}
            </p>
          </div>
          <span className="dash-panel-meta">
            {t("home.peak", { peak: maxSeriesValue })}
          </span>
        </header>

        <div className="dash-chart" role="img" aria-label={t("home.chartAria")}>
          {safeSeries.map((point, index) => {
            const value = Number(point.count) || 0;
            const barHeight = Math.max(2, Math.round((value / maxSeriesValue) * 100));

            return (
              <div key={point.label} className="dash-chart-col">
                <span className="dash-chart-tip">
                  {value} · {point.label}
                </span>
                <span
                  className="dash-chart-bar"
                  style={{ height: `${barHeight}%`, "--bar-delay": `${120 + index * 60}ms` }}
                />
              </div>
            );
          })}

          <div className="dash-chart-axis" aria-hidden="true">
            {safeSeries.map((point, index) => {
              const showMobileXAxisLabel = shouldShowMobileXAxisLabel(index, safeSeries.length);
              return (
                <span
                  key={`axis-${point.label}`}
                  className={showMobileXAxisLabel ? "" : "hidden sm:inline"}
                >
                  {point.label}
                </span>
              );
            })}
          </div>
        </div>

        {homeLoading ? (
          <p className="mt-3 text-xs text-on-surface-variant">{t("home.loadingActivity")}</p>
        ) : null}

        {homeError ? (
          <p className="mt-3 text-xs text-error">{homeError}</p>
        ) : null}
      </div>

      {/* Recientes: lista editorial */}
      <div className="dash-in" style={{ "--i": 3 }}>
        <header className="dash-panel-head">
          <div>
            <h2 className="dash-panel-title">{t("home.recentAnalyses")}</h2>
            <p className="dash-panel-meta">
              {t("home.recentAnalysesSub")}
            </p>
          </div>
        </header>

        <div className="dash-list">
          {recentAnalyses.length === 0 ? (
            <div className="dash-list-empty">
              {t("home.emptyRecent")}
            </div>
          ) : null}

          {recentAnalyses.map((analysis) => (
            <article key={analysis.id} className="dash-list-row">
              <div className="min-w-0">
                <div className="dash-list-row-title">
                  <ArrowUpRight className="size-3.5 text-on-surface-variant" aria-hidden="true" />
                  <span className="truncate">{analysis.title}</span>
                </div>
                <div className="dash-list-row-meta">
                  <span>Señal {analysis.svmStrength.toFixed(2)}</span>
                  <span>{analysis.timestampLabel}</span>
                </div>
              </div>

              <span className={`dash-verdict ${getVerdictClass(analysis.verdictLabel)}`}>
                <span className="dash-verdict-dot" aria-hidden="true" />
                {translateVerdictLabel(analysis.verdictLabel)}
              </span>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

export default DashboardHomeSection;
