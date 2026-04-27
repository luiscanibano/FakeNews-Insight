/**
 * @file SubscriptionSection.jsx
 * @description Bloque de gestion de suscripcion en el panel de cuenta.
 */

import { CreditCard } from "lucide-react";
import { Button } from "@/components/ui/button";

const SECTION_BASE_CLASSES =
  "rounded-2xl border border-outline-variant/25 bg-surface/40 p-5";

/** Bloque informativo del plan actual con acceso al selector de planes. */
function SubscriptionSection({ planLabel, onOpenPlanSelector }) {
  return (
    <div className={SECTION_BASE_CLASSES}>
      <div className="mb-3 flex items-center gap-2 text-on-surface">
        <CreditCard className="size-4 text-primary" />
        <h3 className="text-sm font-semibold uppercase tracking-[0.16em]">
          Gestionar suscripcion
        </h3>
      </div>
      <p className="text-sm text-on-surface-variant">
        Cambia de plan, programa el regreso a Free al final del ciclo o reactiva una
        suscripcion desde el selector de planes.
      </p>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <span className="rounded-full border border-outline-variant/30 bg-surface/60 px-3 py-1 text-xs uppercase tracking-[0.16em] text-primary">
          Plan {planLabel}
        </span>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" onClick={onOpenPlanSelector}>
            Abrir selector de planes
          </Button>
        </div>
      </div>
    </div>
  );
}

export default SubscriptionSection;
