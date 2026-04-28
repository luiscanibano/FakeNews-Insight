/**
 * @file DashboardHeroSection.jsx
 * @description Cabecera editorial sobria de la vista de análisis.
 */

import { useTranslation } from "react-i18next";

function DashboardHeroSection() {
  const { t } = useTranslation("dashboard");
  return (
    <section className="dash-in" style={{ "--i": 0 }}>
      <span className="dash-home-eyebrow">
        <span className="dash-home-eyebrow-dot" aria-hidden="true" />
        {t("hero.eyebrow")}
      </span>

      <h1 className="dash-home-h1 mt-3">
        {t("hero.titlePrefix")}
        <span className="dash-home-h1-soft">{t("hero.titleSoft")}</span>
      </h1>

      <p className="dash-home-sub">{t("hero.subtitle")}</p>
    </section>
  );
}

export default DashboardHeroSection;
