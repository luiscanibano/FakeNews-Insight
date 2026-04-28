/**
 * @file LandingHero.jsx
 * @description Componente de la landing page orientado a contenido, comunicacion de valor y conversion.
 */

import { Radar, ShieldCheck, Sparkles, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";

function LandingHero({ onStartNow, content }) {
  return (
    <header id="top" className="hero-min-stage landing-grid-pattern landing-mesh-gradient relative overflow-hidden px-6 md:min-h-[98svh]">
      <div className="hero-min-bg landing-hero-beam pointer-events-none absolute -top-28 left-1/2 h-72 w-[1200px] -translate-x-1/2" />
      <div className="hero-min-bg landing-hero-aurora pointer-events-none absolute inset-0" />
      <div className="hero-min-bg landing-hero-aurora landing-hero-aurora-alt pointer-events-none absolute inset-0" />
      <div className="hero-min-bg landing-hero-halo pointer-events-none absolute left-1/2 top-[42%] h-[420px] w-[420px] -translate-x-1/2 -translate-y-1/2 rounded-full" />
      <div className="hero-min-bg landing-ambient-orb pointer-events-none absolute right-[8%] top-24 h-32 w-32 rounded-full bg-primary/20 blur-3xl" />
      <div className="hero-min-bg landing-ambient-orb pointer-events-none absolute left-[8%] top-52 h-40 w-40 rounded-full bg-primary/10 blur-[95px]" style={{ animationDelay: "1.4s" }} />
      <div className="relative z-10 mx-auto flex min-h-[calc(92svh-7rem)] w-full max-w-7xl items-center justify-center py-20 md:min-h-[98svh] md:py-0">
        <div className="flex w-full flex-col items-center text-center md:-translate-y-20 lg:-translate-y-24">

          <span className="hero-min-rule" aria-hidden="true" />

          <h1 className="hero-min-title mb-6 max-w-4xl font-headline text-5xl font-extrabold leading-[1.1] tracking-tighter md:text-7xl">
            <span className="hero-min-fade text-on-surface" style={{ "--hero-min-delay": "120ms" }}>{content.titlePrefix} </span>
            <em className="hero-min-emphasis landing-title-emphasis mx-1 italic">{content.titleEmphasis}</em>
            <span className="hero-min-fade text-on-surface" style={{ "--hero-min-delay": "260ms" }}>{content.titleSuffix}</span>
          </h1>

          <p className="hero-min-fade mb-10 max-w-2xl text-lg font-light leading-relaxed text-on-surface-variant md:text-xl" style={{ "--hero-min-delay": "520ms" }}>
            {content.description}
          </p>

          <div className="hero-min-fade flex w-full justify-center" style={{ "--hero-min-delay": "680ms" }}>
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
