/**
 * @file DashboardPlanSelectorModal.jsx
 * @description Popup de selección de plan (botones decorativos: la facturación se reimplementará más adelante).
 */

import { useEffect } from "react";
import { Check, Crown, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useLandingContent } from "@/components/landing/landingContent";

/** Popup editorial de selección de plan. */
function DashboardPlanSelectorModal({ isOpen, currentPlan, onClose }) {
  const { t } = useTranslation("dashboard");
  const landingContent = useLandingContent();
  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleEscape = (event) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleEscape);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen, onClose]);

  if (!isOpen) {
    return null;
  }

  return (
    <div
      className="dash-modal-overlay"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <section className="dash-modal dash-modal-lg" role="dialog" aria-modal="true">
        <div className="dash-modal-head">
          <div>
            <span className="dash-home-eyebrow">
              <Crown className="size-3.5" aria-hidden="true" />
              {t("planSelector.eyebrow")}
            </span>
            <h2 className="dash-home-h1 mt-3" style={{ fontSize: "clamp(1.5rem, 3vw, 2rem)" }}>
              {t("planSelector.title")}
            </h2>
            <p className="dash-home-sub" style={{ marginTop: "0.4rem" }}>
              {t("planSelector.subtitle")}
            </p>
          </div>

          <button
            type="button"
            className="dash-modal-close"
            onClick={onClose}
            aria-label={t("planSelector.closeAria")}
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
          {landingContent.value.plans.map((plan, index) => {
            const isCurrent = plan.key === currentPlan;
            const cardClasses = [
              "dash-plan-card",
              plan.recommended ? "is-recommended" : "",
              isCurrent ? "is-current" : "",
            ]
              .filter(Boolean)
              .join(" ");

            return (
              <article key={plan.key} className={cardClasses} style={{ "--i": index }}>
                {plan.recommended ? (
                  <span className="dash-plan-recommended-tag">{t("planSelector.recommended")}</span>
                ) : null}
                {isCurrent ? <span className="dash-plan-current-tag">{t("planSelector.currentTag")}</span> : null}

                <p className="dash-plan-name">{plan.name}</p>

                <p className="dash-plan-price">
                  <span className="dash-plan-price-amount">{plan.price}</span>
                  <span className="dash-plan-price-interval">{plan.interval}</span>
                </p>

                <ul className="dash-plan-features">
                  {plan.features.map((feature) => (
                    <li key={feature} className="dash-plan-feature">
                      <Check className="dash-plan-feature-icon size-4" aria-hidden="true" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>

                <button
                  type="button"
                  className={`dash-plan-action ${
                    plan.recommended ? "dash-plan-action-primary" : "dash-plan-action-outline"
                  }`}
                  disabled
                >
                  {isCurrent ? t("planSelector.currentAction") : t("planSelector.activate", { plan: plan.name })}
                </button>
              </article>
            );
          })}
        </div>
      </section>
    </div>
  );
}

export default DashboardPlanSelectorModal;
