/**
 * @file SubscriptionSection.jsx
 * @description Bloque de gestión de suscripción en el panel de cuenta.
 */

import { CreditCard, ArrowRight } from "lucide-react";

/** Bloque informativo del plan actual con acceso al selector de planes. */
function SubscriptionSection({ planLabel, onOpenPlanSelector }) {
  return (
    <div className="dash-section">
      <div className="dash-section-head">
        <CreditCard className="size-4 text-on-surface-variant" aria-hidden="true" />
        <h3 className="dash-section-title-sm">Gestionar suscripción</h3>
      </div>
      <p className="dash-section-text">
        Cambia de plan, programa el regreso a Free al final del ciclo o reactiva una
        suscripción desde el selector de planes.
      </p>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <span className="dash-pill dash-pill-emphasis">Plan {planLabel}</span>
        <button type="button" className="dash-cta" onClick={onOpenPlanSelector}>
          Abrir selector de planes
          <ArrowRight className="dash-cta-arrow size-4" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}

export default SubscriptionSection;
