/**
 * @file DashboardApiKeys.jsx
 * @description Página de aplicación que orquesta componentes, estados y flujos de negocio por seccion.
 */

import { useTranslation } from "react-i18next";

/** Placeholder de gestion de API keys para futuras operaciones seguras en Supabase. */
function DashboardApiKeys() {
  const { t } = useTranslation("dashboard");
  return (
    <section className="auth-fade-up" style={{ "--auth-delay": "40ms" }}>
      <div className="landing-glass-card rounded-3xl border border-outline-variant/20 p-6 sm:p-8">
        <h1 className="font-headline text-2xl font-bold text-on-surface sm:text-3xl">{t("apiKeys.title")}</h1>
        <p className="mt-2 max-w-2xl text-sm text-on-surface-variant sm:text-base">
          {t("apiKeys.subtitle")}
        </p>
      </div>
    </section>
  );
}

export default DashboardApiKeys;
