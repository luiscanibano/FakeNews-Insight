/**
 * @file Landing.jsx
 * @description Página de aplicación que orquesta componentes, estados y flujos de negocio por seccion.
 */

import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import LandingBackground from "../components/landing/LandingBackground";
import LandingNavbar from "../components/landing/LandingNavbar";
import LandingHero from "../components/landing/LandingHero";
import LandingFeatures from "../components/landing/LandingFeatures";
import LandingProcess from "../components/landing/LandingProcess";
import LandingValueSection from "../components/landing/LandingValueSection";
import LandingExtension from "../components/landing/LandingExtension";
import LandingPricing from "../components/landing/LandingPricing";
import LandingFooter from "../components/landing/LandingFooter";
import { useLandingContent } from "../components/landing/landingContent";

/** Compone la landing pública y conecta CTAs con rutas de autenticación.
 */
function Landing() {
  const navigate = useNavigate();
  const landingContent = useLandingContent();

  /** Activa animaciones de entrada conforme cada bloque entra en viewport.
 */
  useEffect(() => {
    const elements = document.querySelectorAll(".landing-reveal");
    if (!elements.length) return;

    const isElementInViewport = (element) => {
      const rect = element.getBoundingClientRect();
      const viewportHeight = window.innerHeight || document.documentElement.clientHeight || 0;

      return rect.bottom >= 0 && rect.top <= viewportHeight;
    };

    /** Fallback para navegadores sin observer: muestra todos los bloques al instante.
 */
    const revealAll = () => {
      elements.forEach((element) => element.classList.add("in-view"));
    };

    const revealVisibleElements = () => {
      elements.forEach((element) => {
        if (!element.classList.contains("in-view") && isElementInViewport(element)) {
          element.classList.add("in-view");
          observer?.unobserve(element);
        }
      });
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

    revealVisibleElements();

    elements.forEach((element) => {
      if (element.classList.contains("in-view") || isElementInViewport(element)) {
        element.classList.add("in-view");
        return;
      }

      observer.observe(element);
    });

    window.addEventListener("scroll", revealVisibleElements, { passive: true });
    window.addEventListener("resize", revealVisibleElements);

    return () => {
      window.removeEventListener("scroll", revealVisibleElements);
      window.removeEventListener("resize", revealVisibleElements);
      observer.disconnect();
    };
  }, [landingContent]);

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
        <LandingExtension content={landingContent.extension} />
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
