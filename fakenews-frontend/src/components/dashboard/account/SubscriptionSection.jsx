/**
 * @file SubscriptionSection.jsx
 * @description Bloque de gestión de suscripción en el panel de cuenta.
 */

import { CreditCard, ArrowRight } from "lucide-react";
import { useTranslation } from "react-i18next";

/** Bloque informativo del plan actual con acceso al selector de planes. */
function SubscriptionSection({ planLabel, onOpenPlanSelector }) {
  const { t } = useTranslation("dashboard");
  return (
    <div className="dash-section">
      <div className="dash-section-head">
        <CreditCard className="size-4 text-on-surface-variant" aria-hidden="true" />
        <h3 className="dash-section-title-sm">{t("subscription.title")}</h3>
      </div>
      <p className="dash-section-text">
        {t("subscription.intro")}
      </p>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <span className="dash-pill dash-pill-emphasis">{t("subscription.planChip", { plan: planLabel })}</span>
        <button type="button" className="dash-cta" onClick={onOpenPlanSelector}>
          {t("subscription.openSelector")}
          <ArrowRight className="dash-cta-arrow size-4" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}

export default SubscriptionSection;
