/**
 * @file LandingNavbar.jsx
 * @description Componente de la landing page orientado a contenido, comunicacion de valor y conversion.
 */

import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

/** Barra de navegacion responsiva con menu desktop y drawer movil. */
function LandingNavbar({ onStartNow, content }) {
  const [brandLead = content.brand, ...brandTailParts] = content.brand.split(" ");
  const brandTail = brandTailParts.join(" ");

  return (
    <nav className="fixed top-0 z-50 w-full px-4 pt-4 md:px-6">
      <div className="landing-navbar-shell mx-auto flex h-16 w-full max-w-7xl items-center justify-between rounded-2xl border border-outline-variant/20 px-4 md:px-6">
        <a href="#top" className="group flex items-center gap-3 text-on-surface">
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
        </a>

        <div className="hidden items-center gap-2 md:flex">
          {content.links.map((link) => (
            <a key={link.href} className="landing-nav-link" href={link.href}>
              {link.label}
            </a>
          ))}
        </div>

        <div className="hidden md:block">
          <Button type="button" onClick={onStartNow} className="landing-nav-cta h-10 rounded-xl px-5 text-sm font-semibold text-on-primary">
            {content.cta}
          </Button>
        </div>

        <Sheet>
          <SheetTrigger asChild>
            <Button size="icon" variant="ghost" className="rounded-xl border border-outline-variant/30 bg-surface/60 md:hidden" aria-label="Abrir menú">
              <Menu className="size-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="landing-mobile-sheet border-outline-variant/20 bg-surface p-6">
            <div className="mb-6 flex items-center gap-3 text-on-surface">
              <span className="landing-brand-mark" aria-hidden="true">
                <span className="landing-brand-grid" />
                <span className="landing-brand-glyph">
                  <span className="landing-brand-bar landing-brand-bar-a" />
                  <span className="landing-brand-bar landing-brand-bar-b" />
                  <span className="landing-brand-dot" />
                </span>
              </span>
              <div className="leading-tight">
                <span className="landing-brand-lead">{brandLead}</span>
                {brandTail ? <span className="landing-brand-tail">{brandTail}</span> : null}
              </div>
            </div>
            <div className="flex flex-col gap-4">
              {content.links.map((link, idx) => (
                <a
                  key={link.href}
                  href={link.href}
                  className="landing-mobile-link font-label text-xs uppercase tracking-wider text-on-surface/80 transition-colors hover:text-on-surface"
                  style={{ "--nav-delay": `${idx * 70}ms` }}
                >
                  {link.label}
                </a>
              ))}
            </div>
            <Button
              type="button"
              onClick={onStartNow}
              className="landing-nav-cta mt-8 w-full py-2 text-on-primary"
            >
              {content.cta}
            </Button>
          </SheetContent>
        </Sheet>
      </div>
    </nav>
  );
}

export default LandingNavbar;
