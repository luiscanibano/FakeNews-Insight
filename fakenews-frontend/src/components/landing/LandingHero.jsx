import { useRef } from "react";
import { AlertTriangle, BadgeCheck, CheckCircle2, Radar, ShieldCheck, Sparkles, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";

// Hero principal con CTA y demo interactiva de analisis.
function LandingHero({ onStartNow, content }) {
  const stageRef = useRef(null);
  const frameRef = useRef(null);

  // Calcula inclinacion y punto de brillo para generar efecto parallax en desktop.
  const handleMouseMove = (event) => {
    const stage = stageRef.current;
    if (!stage || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return;
    }

    const rect = stage.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width;
    const y = (event.clientY - rect.top) / rect.height;
    const rotateX = (y - 0.5) * -5;
    const rotateY = (x - 0.5) * 6;
    const glowX = x * 100;
    const glowY = y * 100;

    if (frameRef.current) {
      cancelAnimationFrame(frameRef.current);
    }

    frameRef.current = requestAnimationFrame(() => {
      stage.style.setProperty("--hero-rx", `${rotateX.toFixed(2)}deg`);
      stage.style.setProperty("--hero-ry", `${rotateY.toFixed(2)}deg`);
      stage.style.setProperty("--hero-gx", `${glowX.toFixed(2)}%`);
      stage.style.setProperty("--hero-gy", `${glowY.toFixed(2)}%`);
    });
  };

  // Restaura la posicion neutra del parallax cuando el cursor sale del bloque.
  const handleMouseLeave = () => {
    const stage = stageRef.current;
    if (!stage) return;

    stage.style.setProperty("--hero-rx", "0deg");
    stage.style.setProperty("--hero-ry", "0deg");
    stage.style.setProperty("--hero-gx", "50%");
    stage.style.setProperty("--hero-gy", "50%");
  };

  return (
    <header id="top" className="landing-grid-pattern landing-mesh-gradient relative overflow-hidden px-6 pb-24 pt-32">
      <div className="landing-hero-beam pointer-events-none absolute -top-28 left-1/2 h-72 w-[1200px] -translate-x-1/2" />
      <div className="landing-ambient-orb pointer-events-none absolute right-[8%] top-24 h-32 w-32 rounded-full bg-primary/20 blur-3xl" />
      <div className="landing-ambient-orb pointer-events-none absolute left-[8%] top-52 h-40 w-40 rounded-full bg-primary/10 blur-[95px]" style={{ animationDelay: "1.4s" }} />
      <div className="relative z-10 mx-auto flex w-full max-w-7xl flex-col items-start lg:items-center lg:text-center">
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

        <div className="landing-reveal mb-10 flex flex-wrap items-center gap-3" style={{ "--landing-delay": "180ms" }}>
          <span className="inline-flex items-center gap-2 rounded-full border border-outline-variant/20 bg-surface-container-high px-3 py-1 text-xs text-on-surface-variant">
            <ShieldCheck className="size-3.5 text-primary" />
            Detección multicapa
          </span>
          <span className="inline-flex items-center gap-2 rounded-full border border-outline-variant/20 bg-surface-container-high px-3 py-1 text-xs text-on-surface-variant">
            <Radar className="size-3.5 text-primary" />
            Monitoreo en tiempo real
          </span>
          <span className="inline-flex items-center gap-2 rounded-full border border-outline-variant/20 bg-surface-container-high px-3 py-1 text-xs text-on-surface-variant">
            <Zap className="size-3.5 text-primary" />
            Respuesta &lt; 2s
          </span>
        </div>

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

      <div
        ref={stageRef}
        className="landing-parallax-stage landing-reveal relative mx-auto mt-20 w-full max-w-5xl px-6"
        style={{ "--landing-delay": "300ms" }}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      >
        <div className="landing-hero-ring pointer-events-none absolute left-1/2 top-1/2 h-[120%] w-[120%] -translate-x-1/2 -translate-y-1/2" />
        <div className="landing-parallax-glow pointer-events-none absolute inset-0 z-10" />
        <div className="landing-parallax-surface landing-glass-card relative z-20 rounded-2xl border border-outline-variant/15 p-2 shadow-2xl shadow-black/40">
          <div className="relative aspect-[16/9] overflow-hidden rounded-xl bg-surface-container-lowest">
            <div className="landing-hero-scanline pointer-events-none absolute inset-0 z-10" />
            <div className="relative h-full w-full bg-gradient-to-br from-[#121316] via-[#14151a] to-[#191b20] text-on-surface transition-transform duration-1000 hover:scale-105">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,rgba(173,199,255,0.09)_1px,transparent_0)] bg-[length:22px_22px] opacity-40" />
              <div className="relative z-10 mx-auto flex h-full max-w-4xl flex-col gap-4 px-6 py-6">
                <div className="flex items-center justify-between rounded-xl border border-outline-variant/25 bg-surface/45 px-4 py-3 backdrop-blur-lg">
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.2em] text-on-surface-variant">{content.panelSubtitle}</p>
                  </div>
                  <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/15 px-3 py-1 text-[11px] font-semibold text-primary">
                    <span className="h-2 w-2 animate-pulse rounded-full bg-primary" />
                    {content.panelStatus}
                  </div>
                </div>

                <div className="flex items-center gap-3 rounded-xl border border-outline-variant/25 bg-surface/45 px-4 py-3 backdrop-blur-md">
                  <BadgeCheck className="size-4 text-primary" />
                  <p className="truncate text-xs text-on-surface-variant">{content.sampleUrl}</p>
                  <button type="button" className="ml-auto rounded-lg bg-primary px-3 py-1.5 text-[11px] font-semibold text-on-primary">
                    Analizar
                  </button>
                </div>

                <div className="grid flex-1 grid-cols-1 gap-4 md:grid-cols-[1.35fr_0.95fr]">
                  <div className="rounded-2xl border border-outline-variant/25 bg-surface/40 p-4 backdrop-blur-md">
                    <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-on-surface-variant">Señales detectadas</p>
                    <div className="space-y-3">
                      {content.signals?.map((signal) => (
                        <div key={signal.label}>
                          <div className="mb-1.5 flex items-center justify-between gap-2 text-xs">
                            <span className="text-on-surface-variant">{signal.label}</span>
                            <span className="font-semibold text-primary">{signal.value}</span>
                          </div>
                          <div className="h-1.5 overflow-hidden rounded-full bg-surface-container-high">
                            <div className="h-full rounded-full bg-gradient-to-r from-primary/45 to-primary" style={{ width: signal.value }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="landing-shimmer rounded-2xl border border-primary/25 bg-surface/65 p-4 backdrop-blur-lg">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-on-surface-variant">Veredicto IA</p>
                    <div className="mt-3 flex items-end justify-between">
                      <div>
                        <p className="text-4xl font-extrabold tracking-tight text-on-surface">87%</p>
                        <p className="text-[11px] text-on-surface-variant">{content.scoreLabel}</p>
                      </div>
                      <div className="rounded-full border border-primary/30 bg-primary/15 px-2 py-1 text-[10px] font-semibold uppercase tracking-widest text-primary">
                        {content.verifiedLabel}
                      </div>
                    </div>
                    <div className="mt-4 space-y-2">
                      <div className="flex items-center gap-2 text-[11px] text-on-surface-variant">
                        <CheckCircle2 className="size-3.5 text-primary" />
                        Fuente con alta reputación
                      </div>
                      <div className="flex items-center gap-2 text-[11px] text-on-surface-variant">
                        <AlertTriangle className="size-3.5 text-primary" />
                        Tono parcialmente alarmista
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3 text-[11px] text-on-surface-variant">
                  {content.trustStats?.map((item) => (
                    <div key={item.label} className="rounded-lg border border-outline-variant/25 bg-surface/45 px-3 py-2 backdrop-blur-md">
                      <p className="font-headline text-base font-bold text-primary">{item.value}</p>
                      <p className="text-[10px] uppercase tracking-wider">{item.label}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}

export default LandingHero;
