/**
 * @file AdminKpiSections.jsx
 * @description Componente del panel administrativo para KPIs, gestion de usuarios y control de planes.
 */

import { BarChart3, Globe2, PlugZap, Rocket, UserRound } from "lucide-react";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../ui/card";

/** Renderiza KPI de usuarios y llamadas diarias por canal operativo. */
function AdminKpiSections({ userKpis, apiCallsToday }) {
  return (
    <>
      <section className="mb-10">
        <h2 className="mb-4 flex items-center gap-2 font-headline text-2xl font-bold">
          <UserRound className="size-5 text-primary" />
          Número de usuarios
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card className="landing-glass-card border-outline-variant/20 bg-surface-container/70">
            <CardHeader>
              <CardDescription>Total usuarios</CardDescription>
              <CardTitle>{userKpis.total}</CardTitle>
            </CardHeader>
          </Card>
          <Card className="landing-glass-card border-outline-variant/20 bg-surface-container/70">
            <CardHeader>
              <CardDescription>Total usuarios FREE</CardDescription>
              <CardTitle className="text-primary">{userKpis.free}</CardTitle>
            </CardHeader>
          </Card>
          <Card className="landing-glass-card border-outline-variant/20 bg-surface-container/70">
            <CardHeader>
              <CardDescription>Total usuarios PRO</CardDescription>
              <CardTitle className="text-primary">{userKpis.pro}</CardTitle>
            </CardHeader>
          </Card>
          <Card className="landing-glass-card border-outline-variant/20 bg-surface-container/70">
            <CardHeader>
              <CardDescription>Total usuarios ULTRA</CardDescription>
              <CardTitle className="text-primary">{userKpis.ultra}</CardTitle>
            </CardHeader>
          </Card>
        </div>
      </section>

      <section className="mb-10">
        <h2 className="mb-4 flex items-center gap-2 font-headline text-2xl font-bold">
          <BarChart3 className="size-5 text-primary" />
          Número de llamadas a la API
        </h2>
        <div className="grid gap-4 md:grid-cols-3">
          <Card className="landing-glass-card border-outline-variant/20 bg-surface-container/70">
            <CardHeader>
              <CardDescription className="flex items-center gap-2">
                <Globe2 className="size-4" />
                Total peticiones WEB HOY
              </CardDescription>
              <CardTitle>{apiCallsToday.web}</CardTitle>
            </CardHeader>
          </Card>
          <Card className="landing-glass-card border-outline-variant/20 bg-surface-container/70">
            <CardHeader>
              <CardDescription className="flex items-center gap-2">
                <PlugZap className="size-4" />
                Total peticiones Extensión HOY
              </CardDescription>
              <CardTitle>{apiCallsToday.extension}</CardTitle>
            </CardHeader>
          </Card>
          <Card className="landing-glass-card border-outline-variant/20 bg-surface-container/70">
            <CardHeader>
              <CardDescription className="flex items-center gap-2">
                <Rocket className="size-4" />
                Total peticiones API HOY
              </CardDescription>
              <CardTitle>{apiCallsToday.api}</CardTitle>
            </CardHeader>
          </Card>
        </div>
        <p className="mt-2 text-xs text-on-surface-variant">
          Datos de llamadas API simulados temporalmente.
        </p>
      </section>
    </>
  );
}

export default AdminKpiSections;
