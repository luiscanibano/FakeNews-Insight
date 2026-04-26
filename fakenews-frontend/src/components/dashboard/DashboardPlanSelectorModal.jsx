/**
 * @file DashboardPlanSelectorModal.jsx
 * @description Componente del dashboard para renderizar analisis, resultados, navegacion y paneles operativos.
 */

import { useEffect } from "react";
import { CheckCircle2, Crown, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { landingContent } from "@/components/landing/landingContent";

/** Popup de seleccion de plan (botones decorativos: la facturación se reimplementará más adelante). */
function DashboardPlanSelectorModal({
  isOpen,
  currentPlan,
  onClose,
}) {
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
      className="dashboard-plan-modal-overlay fixed inset-0 z-[80] flex items-start justify-center overflow-y-auto overflow-x-hidden bg-black/70 p-4 pt-16 backdrop-blur-sm sm:items-center sm:pt-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <section className="dashboard-plan-modal-shell landing-glass-card my-auto w-full max-w-6xl overflow-hidden rounded-3xl border border-outline-variant/25 p-5 sm:p-7">
        <div className="mb-5 flex items-start justify-between gap-3">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full border border-outline-variant/25 bg-surface/55 px-3 py-1 text-[11px] uppercase tracking-[0.16em] text-primary">
              <Crown className="size-3.5" />
              Gestión de plan
            </p>
            <h2 className="mt-3 font-headline text-2xl font-bold text-on-surface sm:text-3xl">
              Elige tu suscripción
            </h2>
            <p className="mt-2 text-sm text-on-surface-variant">
              Selecciona el plan que más se ajuste a tus necesidades.
            </p>
          </div>

          <Button
            type="button"
            variant="outline"
            size="icon-sm"
            className="rounded-xl"
            onClick={onClose}
            aria-label="Cerrar selector de plan"
          >
            <X className="size-4" />
          </Button>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {landingContent.value.plans.map((plan, index) => {
            const isCurrent = plan.key === currentPlan;

            return (
              <Card
                key={plan.key}
                className={`dashboard-plan-card-motion landing-glass-card overflow-visible rounded-3xl border p-5 transition-all duration-300 ${
                  plan.recommended
                    ? "border-2 border-primary shadow-2xl shadow-primary/10"
                    : "border-outline-variant/20"
                }`}
                style={{ "--plan-card-delay": `${index * 90}ms` }}
              >
                <CardContent className="flex h-full flex-col px-0">
                  <div className="mb-5">
                    <h3
                      className={`text-xs font-semibold uppercase tracking-[0.18em] ${
                        plan.recommended ? "text-primary" : "text-on-surface-variant"
                      }`}
                    >
                      {plan.name}
                    </h3>
                    <p className="mt-2 flex items-baseline gap-1 text-on-surface">
                      <span className="text-4xl font-bold">{plan.price}</span>
                      <span className="text-sm text-on-surface-variant">{plan.interval}</span>
                    </p>
                  </div>

                  <ul className="mb-7 flex-1 space-y-3">
                    {plan.features.map((feature) => (
                      <li
                        key={feature}
                        className="flex items-center gap-2 text-sm text-on-surface-variant"
                      >
                        <CheckCircle2 className="size-4 text-primary" />
                        {feature}
                      </li>
                    ))}
                  </ul>

                  <Button
                    type="button"
                    variant={plan.recommended ? "default" : "outline"}
                    className={`w-full rounded-xl py-3 text-sm font-semibold ${
                      plan.recommended ? "landing-shimmer bg-primary text-on-primary" : ""
                    }`}
                    disabled
                  >
                    {isCurrent ? "Plan actual" : `Activar ${plan.name}`}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>
    </div>
  );
}

export default DashboardPlanSelectorModal;
