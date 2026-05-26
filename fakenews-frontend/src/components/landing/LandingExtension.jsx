/**
 * @file LandingExtension.jsx
 * @description Seccion de la landing que presenta la extension de navegador
 * con un preview animado del marco que envuelve la selección + panel adjunto,
 * replicando la estetica del content script real.
 */

import { Download, MousePointerClick, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

/** Seccion de extension con captura real del widget. */
function LandingExtension({ content }) {
  return (
    <section className="bg-surface px-6 py-24" id="extension">
      <div className="mx-auto w-full max-w-7xl">
        <Card className="landing-glass-card landing-reveal ring-0 relative overflow-hidden rounded-[2rem] border border-outline-variant/15 bg-surface-container p-8 md:p-12">
          {/* Glow decorativo */}
          <div className="pointer-events-none absolute -left-24 -top-24 h-[280px] w-[280px] rounded-full bg-primary/15 blur-[100px]" />
          <div className="pointer-events-none absolute -right-16 bottom-0 h-[260px] w-[260px] rounded-full bg-primary-container/15 blur-[110px]" />

          <CardContent className="relative z-10 grid gap-12 px-0 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
            {/* === Columna izquierda: copy + CTAs === */}
            <div>
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-primary">
                <MousePointerClick className="size-3.5" />
                {content.eyebrow}
              </div>
              <h2 className="mb-6 font-headline text-3xl font-bold leading-tight text-on-surface md:text-5xl">
                {content.title}
              </h2>
              <p className="mb-8 text-lg leading-relaxed text-on-surface-variant">
                {content.description}
              </p>

              <ul className="mb-10 space-y-3">
                {content.bullets.map((bullet) => (
                  <li
                    key={bullet}
                    className="flex items-start gap-3 text-on-surface-variant"
                  >
                    <ShieldCheck className="mt-0.5 size-5 flex-shrink-0 text-primary" />
                    <span className="text-sm md:text-base">{bullet}</span>
                  </li>
                ))}
              </ul>

              <div className="flex flex-wrap items-center gap-3">
                <Button asChild size="lg" className="gap-2">
                  <a
                    href={content.releasesUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Download className="size-4" />
                    {content.ctaPrimary}
                  </a>
                </Button>
                <Button asChild variant="ghost" size="lg">
                  <a href="#process">{content.ctaSecondary}</a>
                </Button>
              </div>
            </div>

            {/* === Columna derecha: captura real de la extension en acción === */}
            <div className="relative">
              <div className="extension-preview relative mx-auto w-full max-w-[520px] overflow-hidden rounded-2xl border border-outline-variant/15 bg-[#0a0b10] shadow-[0_25px_60px_rgba(0,0,0,0.55)]">
                <img
                  src="/landing/extension-preview.gif"
                  alt="Captura real de FakeNews Insight revisando un texto en una página web"
                  loading="lazy"
                  className="block h-auto w-full"
                />
              </div>

              {/* Glows decorativos detras de la captura */}
              <div className="pointer-events-none absolute -left-10 -top-10 -z-10 h-48 w-48 rounded-full bg-primary/25 blur-3xl" />
              <div className="pointer-events-none absolute -bottom-10 -right-10 -z-10 h-56 w-56 rounded-full bg-primary-container/20 blur-3xl" />
            </div>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}

export default LandingExtension;
