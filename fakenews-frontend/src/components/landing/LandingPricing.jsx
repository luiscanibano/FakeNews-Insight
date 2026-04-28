/**
 * @file LandingPricing.jsx
 * @description Componente de la landing page orientado a contenido, comunicacion de valor y conversion.
 */

import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

/** Tabla de planes y mapeo de CTA a acción según tipo de suscripcion. */
function LandingPricing({ content, onStartFree, onSubscribePro, onContactEnterprise }) {
  const actionByPlan = {
    free: onStartFree,
    pro: onSubscribePro,
    ultra: onContactEnterprise,
  };

  return (
    <section className="landing-mesh-gradient relative px-6 py-24" id="pricing">
      <div className="mx-auto w-full max-w-7xl">
        <div className="landing-reveal mb-16 text-center">
          <h2 className="mb-4 font-headline text-3xl font-bold text-on-surface md:text-5xl">{content.title}</h2>
          <p className="text-on-surface-variant">{content.description}</p>
        </div>

        <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
          {content.plans.map((plan, index) => (
            <Card
              key={plan.key}
              className={`landing-glass-card landing-reveal ring-0 overflow-visible rounded-3xl border p-8 transition-all duration-500 hover:-translate-y-1 ${
                plan.recommended
                  ? "relative pt-10 border-2 border-primary shadow-2xl shadow-primary/10 md:-translate-y-4"
                  : "border-outline-variant/15 hover:border-outline-variant/40 hover:shadow-[0_16px_45px_rgba(0,0,0,0.35)]"
              }`}
              style={{ "--landing-delay": `${80 + index * 90}ms` }}
            >
              {plan.recommended && (
                <div className="absolute -top-4 left-1/2 z-10 w-max max-w-[calc(100%-2rem)] -translate-x-1/2 rounded-full bg-primary px-4 py-1 text-center text-[10px] font-bold uppercase tracking-widest text-on-primary shadow-lg shadow-primary/30">
                  {content.recommendedLabel}
                </div>
              )}

              <CardContent className="flex h-full flex-col px-0">
                <div className="mb-8">
                  <h3 className={`mb-2 font-label text-xs uppercase tracking-widest ${plan.recommended ? "text-primary" : "text-on-surface-variant"}`}>
                    {plan.name}
                  </h3>
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-bold text-on-surface">{plan.price}</span>
                    <span className="text-sm text-on-surface-variant">{plan.interval}</span>
                  </div>
                </div>

                <ul className="mb-10 flex-1 space-y-4">
                  {plan.features.map((feature) => (
                    <li key={feature} className={`flex items-center gap-3 text-sm ${plan.recommended ? "text-on-surface" : "text-on-surface-variant"}`}>
                      <CheckCircle2 className="size-4 text-primary" />
                      {feature}
                    </li>
                  ))}
                </ul>

                <Button
                  type="button"
                  onClick={actionByPlan[plan.key]}
                  variant={plan.recommended ? "default" : "outline"}
                  className={`w-full rounded-xl py-3 font-semibold ${
                    plan.recommended
                      ? "landing-shimmer bg-primary font-bold text-on-primary hover:shadow-[0_0_20px_rgba(192,193,255,0.4)]"
                      : "border-outline-variant/30 bg-transparent text-on-surface hover:bg-surface-container-high"
                  }`}
                >
                  {plan.cta}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}

export default LandingPricing;
