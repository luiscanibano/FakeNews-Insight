/**
 * @file LandingHero.jsx
 * @description Componente de la landing page orientado a contenido, comunicacion de valor y conversion.
 */

import { Radar, ShieldCheck, Sparkles, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";

function LandingHero({ onStartNow, content }) {
  return (
    <header id="top" className="landing-grid-pattern landing-mesh-gradient relative overflow-hidden px-6 md:min-h-[98svh]">
      <div className="landing-hero-beam pointer-events-none absolute -top-28 left-1/2 h-72 w-[1200px] -translate-x-1/2" />
      <div className="landing-hero-aurora pointer-events-none absolute inset-0" />
      <div className="landing-hero-aurora landing-hero-aurora-alt pointer-events-none absolute inset-0" />
      <div className="landing-hero-halo pointer-events-none absolute left-1/2 top-[42%] h-[420px] w-[420px] -translate-x-1/2 -translate-y-1/2 rounded-full" />
      <div className="landing-ambient-orb pointer-events-none absolute right-[8%] top-24 h-32 w-32 rounded-full bg-primary/20 blur-3xl" />
      <div className="landing-ambient-orb pointer-events-none absolute left-[8%] top-52 h-40 w-40 rounded-full bg-primary/10 blur-[95px]" style={{ animationDelay: "1.4s" }} />
      <div className="relative z-10 mx-auto flex min-h-[calc(92svh-7rem)] w-full max-w-7xl items-center justify-center py-20 md:min-h-[98svh] md:py-0">
        <div className="flex w-full flex-col items-center text-center md:-translate-y-20 lg:-translate-y-24">
          <div className="landing-reveal mb-8 inline-flex items-center gap-2 rounded-full border border-outline-variant/15 bg-surface-container-high px-3 py-1 font-label text-[10px] uppercase tracking-[0.2em] text-primary">
            <Sparkles className="size-3.5" />
            {content.badge}
          </div>

          <h1 className="landing-reveal mb-6 max-w-4xl font-headline text-5xl font-extrabold leading-[1.1] tracking-tighter md:text-7xl" style={{ "--landing-delay": "80ms" }}>
            <span className="text-on-surface">{content.titlePrefix} </span>
            <em className="landing-title-emphasis mx-1 italic">{content.titleEmphasis}</em>
            <span className="text-on-surface">{content.titleSuffix}</span>
          </h1>

          <p className="landing-reveal mb-10 max-w-2xl text-lg font-light leading-relaxed text-on-surface-variant md:text-xl" style={{ "--landing-delay": "140ms" }}>
            {content.description}
          </p>

          <div className="landing-reveal flex w-full justify-center" style={{ "--landing-delay": "220ms" }}>
            <Button
              type="button"
              onClick={onStartNow}
              className="landing-shimmer h-12 min-w-[240px] rounded-full bg-primary px-12 text-lg font-bold text-on-primary shadow-xl shadow-primary/20 transition-transform duration-300 hover:scale-105"
            >
              {content.ctaPrimary}
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}

export default LandingHero;
