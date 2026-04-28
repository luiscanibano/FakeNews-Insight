/**
 * @file AuthLayout.jsx
 * @description Componente de layout y estructura visual para flujos de autenticación y recuperación de cuenta.
 */

import { Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";

/** Layout reutilizable para login, registro y recuperación con narrativa de marca. */
function AuthLayout({ title, description, highlights, children, bottomText, bottomLinkTo, bottomLinkLabel, floatingCard = false }) {
  const { t } = useTranslation("auth");
  const brand = "FakeNews Insight";
  const [brandLead = brand, ...brandTailParts] = brand.split(" ");
  const brandTail = brandTailParts.join(" ");

  return (
    <main className="stitch-landing dark relative min-h-screen overflow-hidden bg-surface text-on-surface">
      <div className="landing-mesh-gradient absolute inset-0 opacity-90" />
      <div className="landing-grid-pattern absolute inset-0 opacity-70" />
      <div className="landing-ambient-orb pointer-events-none absolute left-[8%] top-[18%] h-48 w-48 rounded-full bg-primary/20 blur-[110px]" />
      <div className="landing-ambient-orb pointer-events-none absolute bottom-[10%] right-[8%] h-40 w-40 rounded-full bg-primary/15 blur-[90px]" style={{ animationDelay: "1.8s" }} />
      <div className="auth-orbit auth-orbit-one pointer-events-none absolute right-[8%] top-[52%] hidden lg:block" />
      <div className="auth-orbit auth-orbit-two pointer-events-none absolute right-[16%] top-[45%] hidden lg:block" />

      <header className="fixed top-0 z-50 w-full px-4 pt-4 md:px-6">
        <div className="landing-navbar-shell mx-auto flex h-16 w-full max-w-7xl items-center justify-between rounded-2xl border border-outline-variant/20 px-4 md:px-6">
          <Link to="/" className="group flex items-center gap-3 text-on-surface">
            <span className="landing-brand-mark" aria-hidden="true">
              <span className="landing-brand-grid" />
              <span className="landing-brand-glyph">
                <span className="landing-brand-bar landing-brand-bar-a" />
                <span className="landing-brand-bar landing-brand-bar-b" />
                <span className="landing-brand-dot" />
              </span>
            </span>
            <span className="leading-tight">
              <span className="landing-brand-lead">{brandLead}</span>
              {brandTail ? <span className="landing-brand-tail">{brandTail}</span> : null}
            </span>
          </Link>
          <Link
            to="/"
            className="landing-nav-link"
          >
            {t("layout.home")}
          </Link>
        </div>
      </header>

      <section className="relative z-10 mx-auto grid min-h-screen w-full max-w-7xl items-center gap-10 px-4 pb-10 pt-28 sm:px-6 lg:grid-cols-[1.1fr_0.9fr]">
        <aside className="auth-fade-up hidden lg:block">
          <div className="max-w-xl">
            <h1 className="mb-5 font-headline text-5xl font-extrabold leading-tight text-on-surface">
              <span>{t("layout.asideTitlePrefix")}</span>
              <em className="landing-title-emphasis italic">{t("layout.asideTitleEmphasis")}</em>
            </h1>
            <p className="mb-10 max-w-lg text-lg text-on-surface-variant">
              {t("layout.asideDescription")}
            </p>

            <div className="space-y-4">
              {highlights?.map((item, index) => (
                <div
                  key={item}
                  className="auth-fade-up rounded-2xl border border-outline-variant/15 bg-surface-container/55 px-4 py-3 text-sm text-on-surface-variant backdrop-blur-md"
                  style={{ animationDelay: `${120 + index * 90}ms` }}
                >
                  {item}
                </div>
              ))}
            </div>
          </div>
        </aside>

        <div className="auth-fade-up" style={{ animationDelay: "120ms" }}>
          <div className={`landing-glass-card w-full rounded-3xl border border-outline-variant/20 p-6 shadow-2xl shadow-black/30 sm:p-8 ${floatingCard ? "auth-card-float" : ""}`}>
            <div className="mb-6">
              <h2 className="font-headline text-3xl font-extrabold tracking-tight text-on-surface">{title}</h2>
              <p className="mt-2 text-sm leading-relaxed text-on-surface-variant">{description}</p>
            </div>

            {children}

            {bottomText ? (
              <p className="mt-6 text-center text-sm text-on-surface/60">
                {bottomText}{" "}
                <Link to={bottomLinkTo} className="font-semibold text-primary transition-colors hover:text-primary-dim">
                  {bottomLinkLabel}
                </Link>
              </p>
            ) : null}
          </div>
        </div>
      </section>
    </main>
  );
}

export default AuthLayout;
