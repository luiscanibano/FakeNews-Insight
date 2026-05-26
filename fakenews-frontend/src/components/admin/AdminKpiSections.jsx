/**
 * @file AdminKpiSections.jsx
 * @description Bloques KPI del panel admin con la misma familia visual del dashboard.
 */

import { BarChart3, Globe2, PlugZap, UserRound } from "lucide-react";
import { useTranslation } from "react-i18next";

/** Renderiza KPI de usuarios y llamadas diarias por canal operativo. */
function AdminKpiSections({ userKpis, requestKpis, loadingRequestKpis }) {
  const { t } = useTranslation("admin");

  const requestCards = [
    {
      key: "web",
      icon: Globe2,
      label: t("kpis.webToday"),
      value: requestKpis.web,
    },
    {
      key: "extension",
      icon: PlugZap,
      label: t("kpis.extensionToday"),
      value: requestKpis.extension,
    },
  ];

  const userCards = [
    { key: "total", label: t("kpis.totalUsers"), value: userKpis.total },
    { key: "free", label: t("kpis.totalFree"), value: userKpis.free },
    { key: "pro", label: t("kpis.totalPro"), value: userKpis.pro },
    { key: "ultra", label: t("kpis.totalUltra"), value: userKpis.ultra },
  ];

  return (
    <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
      <section className="dash-in dash-panel space-y-5" style={{ "--i": 1 }}>
        <header className="dash-panel-head flex-wrap">
          <div>
            <p className="dash-panel-meta">{t("kpis.usersMeta")}</p>
            <h2 className="dash-panel-title flex items-center gap-2">
              <UserRound className="size-4 text-primary" />
              {t("kpis.usersTitle")}
            </h2>
          </div>
        </header>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {userCards.map((item) => (
            <div
              key={item.key}
              className="rounded-2xl border border-outline-variant/20 bg-surface/50 px-4 py-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]"
            >
              <p className="text-xs font-medium uppercase tracking-[0.16em] text-on-surface-variant/90">
                {item.label}
              </p>
              <p className="mt-3 font-headline text-3xl font-semibold text-on-surface">
                {item.value}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="dash-in dash-panel space-y-5" style={{ "--i": 2 }}>
        <header className="dash-panel-head flex-wrap">
          <div>
            <p className="dash-panel-meta">{t("kpis.requestsMeta")}</p>
            <h2 className="dash-panel-title flex items-center gap-2">
              <BarChart3 className="size-4 text-primary" />
              {t("kpis.apiCallsTitle")}
            </h2>
          </div>
        </header>

        <div className="grid gap-3 sm:grid-cols-2">
          {requestCards.map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.key}
                className="rounded-2xl border border-outline-variant/20 bg-surface/50 px-4 py-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]"
              >
                <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.16em] text-on-surface-variant/90">
                  <Icon className="size-4 text-primary" />
                  {item.label}
                </div>
                <p className="mt-3 font-headline text-3xl font-semibold text-on-surface">
                  {loadingRequestKpis ? "..." : item.value}
                </p>
              </div>
            );
          })}
        </div>
        <p className="text-sm text-on-surface-variant">
          {t("kpis.requestsCaption")}
        </p>
      </section>
    </div>
  );
}

export default AdminKpiSections;
