/**
 * @file LandingValueSection.jsx
 * @description Componente de la landing page orientado a contenido, comunicacion de valor y conversion.
 */

import { Button } from "@/components/ui/button";
import { Sparkles } from "lucide-react";

/** CTA final de conversión para dirigir al registro o exploracion de API. */
function LandingValueSection({ onExploreApi, content }) {
  return (
    <section className="bg-surface-container-lowest px-6 py-24">
      <div className="mx-auto w-full max-w-7xl">
        <div className="landing-final-cta-shell landing-reveal relative overflow-hidden rounded-[2rem] border border-outline-variant/20 p-8 md:p-12">
          <div className="landing-final-cta-bg absolute inset-0" aria-hidden="true" />
          <div className="landing-final-cta-overlay absolute inset-0" aria-hidden="true" />
          <div className="landing-final-cta-grid absolute inset-0" aria-hidden="true" />

          <div className="pointer-events-none absolute -left-14 top-8 h-36 w-36 rounded-full bg-primary/20 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-12 right-16 h-44 w-44 rounded-full bg-primary/25 blur-3xl" />

          <div className="relative z-10 mx-auto flex w-full max-w-3xl flex-col items-center text-center">
            <div className="w-full">

              <h2 className="mb-5 font-headline text-3xl font-bold leading-tight text-on-surface md:text-5xl">{content.title}</h2>
              <p className="mx-auto mb-7 max-w-2xl text-base leading-relaxed text-on-surface-variant md:text-lg">{content.description}</p>

              <div className="mb-8 flex flex-wrap items-center justify-center gap-3">
                {[
                  "Deteccion en tiempo real",
                  "Análisis multicapa",
                  "Alertas tempranas",
                ].map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center rounded-full border border-outline-variant/25 bg-surface/55 px-3 py-1.5 text-[11px] uppercase tracking-wide text-on-surface-variant backdrop-blur-md"
                  >
                    {tag}
                  </span>
                ))}
              </div>

              <Button
                type="button"
                onClick={onExploreApi}
                className="landing-shimmer h-auto rounded-xl bg-primary px-8 py-4 text-base font-bold text-on-primary shadow-lg shadow-primary/25 transition-transform duration-300 hover:-translate-y-0.5"
              >
                {content.cta}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default LandingValueSection;
