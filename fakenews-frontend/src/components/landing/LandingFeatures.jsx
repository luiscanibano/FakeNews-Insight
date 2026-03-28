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

// Presenta los bloques de capacidades y metricas principales del producto.
function LandingFeatures({ content }) {
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

        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          <Card className="feature-card-pro landing-reveal ring-0 md:col-span-2 min-h-[430px] justify-between rounded-3xl border-outline-variant/15 bg-surface-container p-8" style={{ "--landing-delay": "60ms" }}>
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
                  <div className="h-10 flex-1 rounded-lg border border-outline-variant/20 bg-surface-container px-4 text-xs text-on-surface-variant grid place-items-center md:place-items-start">
                    {content.primaryFeature?.sampleUrl}
                  </div>
                  <div>
                    <button type="button" className="landing-shimmer h-10 rounded-lg bg-primary px-4 text-xs font-bold text-on-primary">
                      {content.primaryFeature?.analyzeCta}
                    </button>
                  </div>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-3">
                  {content.primaryFeature?.stats?.map((stat) => (
                    <div key={stat.label} className="rounded-xl border border-outline-variant/15 bg-surface/60 px-3 py-2 text-center">
                      <p className="font-headline text-lg font-bold text-primary">{stat.value}</p>
                      <p className="text-[10px] uppercase tracking-wider text-on-surface-variant">{stat.label}</p>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {content.cards.map((card, index) => {
            const Icon = featureIcons[card.icon] ?? Brain;

            return (
              <Card
                key={card.title}
                className="feature-card-pro landing-reveal ring-0 justify-between rounded-3xl border-outline-variant/15 bg-surface-container p-8 transition-transform duration-500 hover:-translate-y-1"
                style={{ "--landing-delay": `${120 + index * 80}ms` }}
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

          <Card className="landing-glass-card landing-reveal ring-0 md:col-span-2 rounded-3xl border-outline-variant/15 bg-surface-container p-0" style={{ "--landing-delay": "260ms" }}>
            <div className="flex flex-col md:flex-row">
              <div className="flex-1 p-8">
                <h3 className="mb-4 font-headline text-2xl font-bold">{content.infrastructure.title}</h3>
                <p className="mb-6 text-sm leading-relaxed text-on-surface-variant">{content.infrastructure.description}</p>
                <div className="flex items-center gap-4">
                  <div className="flex flex-col">
                    <span className="text-lg font-bold text-primary">{content.infrastructure.uptimeValue}</span>
                    <span className="text-[10px] uppercase tracking-wider text-on-surface-variant">{content.infrastructure.uptimeLabel}</span>
                  </div>
                  <div className="h-8 w-px bg-outline-variant/20" />
                  <div className="flex flex-col">
                    <span className="text-lg font-bold text-primary">{content.infrastructure.latencyValue}</span>
                    <span className="text-[10px] uppercase tracking-wider text-on-surface-variant">{content.infrastructure.latencyLabel}</span>
                  </div>
                </div>
              </div>
              <div className="relative min-h-[220px] flex-1 bg-surface-container">
                <img
                  className="absolute inset-0 h-full w-full object-cover opacity-40 mix-blend-overlay"
                  src={content.infrastructure.image}
                  alt="Visual de red distribuida"
                />
              </div>
            </div>
          </Card>
        </div>
      </div>
    </section>
  );
}

export default LandingFeatures;
