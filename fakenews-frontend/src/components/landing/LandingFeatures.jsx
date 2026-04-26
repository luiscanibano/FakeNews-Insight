/**
 * @file LandingFeatures.jsx
 * @description Componente de la landing page orientado a contenido, comunicacion de valor y conversion.
 */

import { Activity, Brain, CheckCircle2, Clock3, Globe2, Link2, PlugZap, Sparkles } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

const featureIcons = {
  brain: Brain,
  extension: PlugZap,
  stats: Activity,
  latency: Clock3,
  network: Globe2,
  link: Link2,
};

/** Renderiza las tarjetas de capacidades y metricas clave de la landing. */
function LandingFeatures({ content }) {
  const [integrationCard, statsCard] = content.cards || [];

  return (
    <section className="relative bg-surface-container-low px-6 py-24" id="features">
      <div className="mx-auto w-full max-w-7xl">
        <div className="landing-reveal mb-16 flex flex-col justify-between gap-6 md:flex-row md:items-end">
          <div>
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-outline-variant/15 bg-surface-container-high px-3 py-1 font-label text-[10px] uppercase tracking-[0.2em] text-primary">
              <Sparkles className="size-3.5" />
              {content.badge}
            </div>
            <h2 className="mb-4 font-headline text-3xl font-bold tracking-tight text-on-surface md:text-5xl">
              <span className="text-on-surface">{content.titlePrefix} </span>
              <em className="landing-title-emphasis mx-1 italic">{content.titleEmphasis}</em>
              <span className="text-on-surface">{content.titleSuffix}</span>
            </h2>
            <p className="max-w-lg text-on-surface-variant">{content.description}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-[1.25fr_0.75fr] md:items-stretch">
          <Card className="feature-card-pro feature-card-float landing-reveal ring-0 min-h-[400px] justify-between rounded-3xl border-outline-variant/15 bg-surface-container p-8 md:min-h-[380px] md:self-center" style={{ "--landing-delay": "60ms", "--feature-float-delay": "0ms" }}>
            <CardContent className="px-0">
              {content.primaryFeature && (
                <>
                  <div className="mb-6 inline-flex rounded-xl bg-primary/10 p-3">
                    <Brain className="size-8 text-primary" />
                  </div>
                  <h3 className="mb-4 font-headline text-2xl font-bold">{content.primaryFeature.title}</h3>
                  <p className="max-w-md leading-relaxed text-on-surface-variant">{content.primaryFeature.description}</p>
                  <ul className="mt-6 space-y-2">
                    {content.primaryFeature.points?.map((point) => (
                      <li key={point} className="flex items-center gap-2 text-sm text-on-surface-variant/90">
                        <CheckCircle2 className="size-4 text-primary" />
                        {point}
                      </li>
                    ))}
                  </ul>
                </>
              )}
              <div className="mt-8 rounded-2xl border border-outline-variant/10 bg-surface-container-highest/50 p-4">
                <div className="flex flex-col gap-4 md:flex-row md:items-center">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                    <Link2 className="size-5 text-primary" />
                  </div>
                  <div className="h-10 flex-1 rounded-lg border border-outline-variant/20 bg-surface-container px-2 py-3 text-xs text-on-surface-variant grid place-items-center md:place-items-start">
                    {content.primaryFeature?.sampleUrl}
                  </div>
                  <div>
                    <button type="button" className="landing-shimmer h-10 rounded-lg bg-primary px-4 text-xs font-bold text-on-primary">
                      {content.primaryFeature?.analyzeCta}
                    </button>
                  </div>
                </div>

              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 gap-6">
            {[integrationCard, statsCard].filter(Boolean).map((card, index) => {
              const Icon = featureIcons[card.icon] ?? Brain;

              return (
                <Card
                  key={card.title}
                  className="feature-card-pro feature-card-float landing-reveal ring-0 justify-between rounded-3xl border-outline-variant/15 bg-surface-container p-8 transition-transform duration-500 hover:-translate-y-1"
                  style={{ "--landing-delay": `${120 + index * 80}ms`, "--feature-float-delay": `${index * 900}ms` }}
                >
                  <CardContent className="px-0">
                    <div className="mb-6 inline-flex rounded-xl bg-primary/10 p-3">
                      <Icon className="size-7 text-primary" />
                    </div>
                    <h3 className="mb-4 font-headline text-xl font-bold">{card.title}</h3>
                    <p className="text-sm leading-relaxed text-on-surface-variant">{card.description}</p>
                    <ul className="mt-5 space-y-2">
                      {card.points?.map((point) => (
                        <li key={point} className="flex items-center gap-2 text-xs text-on-surface-variant/90">
                          <span className="feature-dot" />
                          {point}
                        </li>
                      ))}
                    </ul>
                    {card.metric ? (
                      <div className="mt-5 inline-flex items-center rounded-full border border-outline-variant/20 bg-surface/65 px-3 py-1 text-[11px] font-semibold text-primary">
                        {card.metric}
                      </div>
                    ) : null}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}

export default LandingFeatures;
