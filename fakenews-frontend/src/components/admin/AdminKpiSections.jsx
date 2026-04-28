/**
 * @file AdminKpiSections.jsx
 * @description Componente del panel administrativo para KPIs, gestion de usuarios y control de planes.
 */

import { BarChart3, Globe2, PlugZap, Rocket, UserRound } from "lucide-react";
import { useTranslation } from "react-i18next";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../ui/card";

/** Renderiza KPI de usuarios y llamadas diarias por canal operativo. */
function AdminKpiSections({ userKpis, apiCallsToday }) {
  const { t } = useTranslation("admin");
  return (
    <>
      <section className="mb-10">
        <h2 className="mb-4 flex items-center gap-2 font-headline text-2xl font-bold">
          <UserRound className="size-5 text-primary" />
          {t("kpis.usersTitle")}
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card className="landing-glass-card border-outline-variant/20 bg-surface-container/70">
            <CardHeader>
              <CardDescription>{t("kpis.totalUsers")}</CardDescription>
              <CardTitle>{userKpis.total}</CardTitle>
            </CardHeader>
          </Card>
          <Card className="landing-glass-card border-outline-variant/20 bg-surface-container/70">
            <CardHeader>
              <CardDescription>{t("kpis.totalFree")}</CardDescription>
              <CardTitle className="text-primary">{userKpis.free}</CardTitle>
            </CardHeader>
          </Card>
          <Card className="landing-glass-card border-outline-variant/20 bg-surface-container/70">
            <CardHeader>
              <CardDescription>{t("kpis.totalPro")}</CardDescription>
              <CardTitle className="text-primary">{userKpis.pro}</CardTitle>
            </CardHeader>
          </Card>
          <Card className="landing-glass-card border-outline-variant/20 bg-surface-container/70">
            <CardHeader>
              <CardDescription>{t("kpis.totalUltra")}</CardDescription>
              <CardTitle className="text-primary">{userKpis.ultra}</CardTitle>
            </CardHeader>
          </Card>
        </div>
      </section>

      <section className="mb-10">
        <h2 className="mb-4 flex items-center gap-2 font-headline text-2xl font-bold">
          <BarChart3 className="size-5 text-primary" />
          {t("kpis.apiCallsTitle")}
        </h2>
        <div className="grid gap-4 md:grid-cols-3">
          <Card className="landing-glass-card border-outline-variant/20 bg-surface-container/70">
            <CardHeader>
              <CardDescription className="flex items-center gap-2">
                <Globe2 className="size-4" />
                {t("kpis.webToday")}
              </CardDescription>
              <CardTitle>{apiCallsToday.web}</CardTitle>
            </CardHeader>
          </Card>
          <Card className="landing-glass-card border-outline-variant/20 bg-surface-container/70">
            <CardHeader>
              <CardDescription className="flex items-center gap-2">
                <PlugZap className="size-4" />
                {t("kpis.extensionToday")}
              </CardDescription>
              <CardTitle>{apiCallsToday.extension}</CardTitle>
            </CardHeader>
          </Card>
          <Card className="landing-glass-card border-outline-variant/20 bg-surface-container/70">
            <CardHeader>
              <CardDescription className="flex items-center gap-2">
                <Rocket className="size-4" />
                {t("kpis.apiToday")}
              </CardDescription>
              <CardTitle>{apiCallsToday.api}</CardTitle>
            </CardHeader>
          </Card>
        </div>
        <p className="mt-2 text-xs text-on-surface-variant">
          {t("kpis.simulatedNote")}
        </p>
      </section>
    </>
  );
}

export default AdminKpiSections;
