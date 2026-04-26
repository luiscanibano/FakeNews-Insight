/**
 * @file LandingIntegration.jsx
 * @description Componente de la landing page orientado a contenido, comunicacion de valor y conversion.
 */

import { Code2, Terminal, Workflow } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

const integrationIcons = {
  api: Code2,
  sdk: Terminal,
  node: Workflow,
};

/** Seccion de integraciones y ecosistema tecnico soportado. */
function LandingIntegration({ content }) {
  return (
    <section className="bg-surface-container-lowest px-6 py-24">
      <div className="mx-auto w-full max-w-7xl">
        <Card className="landing-glass-card landing-reveal ring-0 relative overflow-hidden rounded-[2rem] border border-outline-variant/15 bg-surface-container p-8 md:p-12">
          <div className="pointer-events-none absolute right-0 top-0 h-full w-1/2 opacity-20">
            <div className="h-full w-full bg-gradient-to-l from-primary/20 to-transparent" />
          </div>

          <div className="pointer-events-none absolute right-6 top-1/2 hidden h-[300px] w-[360px] -translate-y-1/2 lg:block">
            <div className="absolute left-1/2 top-1/2 h-[230px] w-[230px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-outline-variant/20" />
            <div className="absolute left-1/2 top-1/2 h-[320px] w-[320px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-outline-variant/10" />
            <div className="absolute left-4 top-1/2 h-24 w-24 -translate-y-1/2 rounded-full bg-primary/20 blur-3xl" />
            <div className="absolute right-6 top-10 h-24 w-24 rounded-full bg-primary/15 blur-3xl" />

            <div className="landing-float-fast absolute left-1/2 top-[24%] z-20 grid h-24 w-24 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-3xl border border-outline-variant/25 bg-surface/70 shadow-[0_10px_35px_rgba(0,0,0,0.35)] backdrop-blur-xl">
              <img
                src="https://cdn.simpleicons.org/python/3776AB"
                alt="Python"
                className="h-12 w-12 opacity-90"
              />
            </div>

            <div className="landing-float-slow absolute left-[28%] top-[68%] z-20 grid h-20 w-20 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-2xl border border-outline-variant/20 bg-surface/60 shadow-[0_8px_24px_rgba(0,0,0,0.3)] backdrop-blur-xl">
              <img
                src="https://cdn.simpleicons.org/openapiinitiative/84cc16"
                alt="REST API"
                className="h-10 w-10 opacity-85"
              />
            </div>

            <div className="landing-float-slow absolute left-[72%] top-[68%] z-20 grid h-20 w-20 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-2xl border border-outline-variant/20 bg-surface/60 shadow-[0_8px_24px_rgba(0,0,0,0.3)] backdrop-blur-xl">
              <img
                src="https://cdn.simpleicons.org/nodedotjs/5FA04E"
                alt="Node.js"
                className="h-10 w-10 opacity-90"
              />
            </div>
          </div>

          <CardContent className="relative z-10 max-w-2xl px-0">
            <h2 className="mb-6 font-headline text-3xl font-bold text-on-surface md:text-5xl">{content.title}</h2>
            <p className="mb-10 text-lg leading-relaxed text-on-surface-variant">{content.description}</p>
            <div className="flex flex-wrap items-center gap-6">
              {content.items.map((item) => {
                const Icon = integrationIcons[item.icon] ?? Code2;

                return (
                  <div
                    key={item.label}
                    className="flex cursor-default items-center gap-2 rounded-full border border-transparent px-3 py-1.5 text-on-surface/60 grayscale transition-all duration-300 hover:border-outline-variant/30 hover:bg-surface-container-highest/40 hover:text-on-surface hover:grayscale-0"
                  >
                    <Icon className="size-4" />
                    <span className="text-sm font-medium">{item.label}</span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}

export default LandingIntegration;
