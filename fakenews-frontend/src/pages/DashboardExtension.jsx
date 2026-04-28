/**
 * @file DashboardExtension.jsx
 * @description Página informativa de la extensión de navegador: descarga,
 * pasos de instalación en modo desarrollador y enlace a la documentación.
 */

import { Download, ArrowRight } from "lucide-react";
import { useTranslation } from "react-i18next";

const RELEASES_URL =
  "https://github.com/luiscanibano/TFG-Informatica---Luis-Canibano/releases";

function DashboardExtension() {
  const { t } = useTranslation("dashboard");
  const installSteps = t("extension.steps", { returnObjects: true });
  return (
    <section className="space-y-8">
      <div className="dash-in" style={{ "--i": 0 }}>
        <span className="dash-home-eyebrow">
          <span className="dash-home-eyebrow-dot" aria-hidden="true" />
          {t("extension.eyebrow")}
        </span>

        <h1 className="dash-home-h1 mt-3">
          {t("extension.titlePrefix")}{" "}
          <span className="dash-home-h1-soft">{t("extension.titleSoft")}</span>
        </h1>

        <p className="dash-home-sub">
          {t("extension.subtitle")}
        </p>

        <div className="mt-5 flex flex-wrap items-center gap-3">
          <a
            href={RELEASES_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="dash-cta"
          >
            <Download className="size-4" />
            {t("extension.downloadCta")}
            <ArrowRight className="dash-cta-arrow size-4" aria-hidden="true" />
          </a>
          <span className="dash-panel-meta">
            {t("extension.compatibility")}
          </span>
        </div>
      </div>

      <div className="dash-in dash-panel" style={{ "--i": 1 }}>
        <header className="dash-panel-head">
          <div>
            <h2 className="dash-panel-title">{t("extension.howToInstall")}</h2>
            <p className="dash-panel-meta">
              {t("extension.installSubtitle")}
            </p>
          </div>
        </header>

        <ol className="dash-list">
          {installSteps.map((step, index) => (
            <li
              key={step.title}
              className="dash-step dash-in"
              style={{ "--i": index + 2 }}
            >
              <span className="dash-step-num">{index + 1}</span>
              <div>
                <h3 className="dash-step-title">{step.title}</h3>
                <p className="dash-step-desc">{step.description}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

export default DashboardExtension;
