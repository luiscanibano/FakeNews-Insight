/**
 * @file LandingFooter.jsx
 * @description Componente de la landing page orientado a contenido, comunicacion de valor y conversion.
 */

import { APP_VERSION } from "@/lib/constants";

/** Cierre de landing con enlaces de navegacion, legales y redes.
 */
function LandingFooter({ content }) {
  return (
    <footer className="border-t border-outline-variant/15 bg-surface-container-lowest px-6 py-12">
      <div className="landing-reveal mx-auto grid w-full max-w-7xl grid-cols-1 gap-8 md:grid-cols-2 lg:flex lg:items-start lg:justify-between">
        <div className="max-w-xs">
          <div className="mb-4 font-headline text-lg font-black uppercase tracking-tighter text-on-surface">
            {content.brand}
          </div>
          <p className="mb-6 text-sm leading-relaxed text-on-surface/50">{content.description}</p>
        </div>

        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 sm:gap-12">
          {content.columns.map((column) => (
            <div key={column.title} className="space-y-4">
              <h5 className="font-headline text-xs font-bold uppercase tracking-widest text-primary">{column.title}</h5>
              <div className="flex flex-col gap-2">
                {column.links.map((link) => (
                  <a
                    key={link.label}
                    className="text-sm text-on-surface/50 transition-all hover:translate-x-0.5 hover:text-on-surface"
                    href={link.href}
                  >
                    {link.label}
                  </a>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="lg:text-right">
          <p className="mb-2 font-label text-xs uppercase tracking-[0.24em] text-primary/80">v{APP_VERSION}</p>
          <p className="mb-4 text-sm text-on-surface/50">{content.copyright}</p>
          <div className="flex gap-6 lg:justify-end">
            {content.socials.map((item) => (
              <a
                key={item.label}
                href={item.href}
                className="font-label text-xs uppercase tracking-widest text-on-surface/50 transition-colors hover:text-on-surface"
              >
                {item.label}
              </a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}

export default LandingFooter;
