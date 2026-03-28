import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import LandingBackground from "../components/landing/LandingBackground";
import LandingNavbar from "../components/landing/LandingNavbar";
import LandingHero from "../components/landing/LandingHero";
import LandingFeatures from "../components/landing/LandingFeatures";
import LandingProcess from "../components/landing/LandingProcess";
import LandingValueSection from "../components/landing/LandingValueSection";
import LandingIntegration from "../components/landing/LandingIntegration";
import LandingPricing from "../components/landing/LandingPricing";
import LandingFooter from "../components/landing/LandingFooter";
import { landingContent } from "../components/landing/landingContent";

// Compone la landing publica y conecta CTAs con rutas de autenticacion.
function Landing() {
  const navigate = useNavigate();

  // Activa animaciones de entrada conforme cada bloque entra en viewport.
  useEffect(() => {
    const elements = document.querySelectorAll(".landing-reveal");
    if (!elements.length) return;

    // Fallback para navegadores sin observer: muestra todos los bloques al instante.
    const revealAll = () => {
      elements.forEach((element) => element.classList.add("in-view"));
    };

    if (!("IntersectionObserver" in window)) {
      revealAll();
      return;
    }

    let observer;

    try {
      observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              entry.target.classList.add("in-view");
              observer.unobserve(entry.target);
            }
          });
        },
        {
          threshold: 0.15,
          rootMargin: "0px 0px -8% 0px",
        }
      );
    } catch {
      revealAll();
      return;
    }

    elements.forEach((element) => observer.observe(element));

    return () => observer.disconnect();
  }, []);

  return (
    <div className="stitch-landing dark relative isolate overflow-x-hidden bg-surface text-on-surface font-body selection:bg-primary/30 selection:text-primary [scroll-behavior:smooth]">
      <LandingBackground />
      <LandingNavbar
        content={landingContent.navbar}
        onStartNow={() => navigate("/login")}
      />

      <main className="pt-24">
        <LandingHero
          content={landingContent.hero}
          onStartNow={() => navigate("/login")}
        />
        <LandingFeatures content={landingContent.features} />
        <LandingProcess content={landingContent.process} />
        <LandingIntegration content={landingContent.integration} />
        <LandingPricing
          content={landingContent.value}
          onStartFree={() => navigate("/register")}
          onSubscribePro={() => navigate("/register")}
          onContactEnterprise={() => navigate("/register")}
        />
        <LandingValueSection content={landingContent.finalCta} onExploreApi={() => navigate("/register")} />
      </main>

      <LandingFooter content={landingContent.footer} />
    </div>
  );
}

export default Landing;
