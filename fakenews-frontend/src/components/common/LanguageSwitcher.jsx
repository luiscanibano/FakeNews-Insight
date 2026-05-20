/**
 * @file LanguageSwitcher.jsx
 * @description Selector global de idioma (ES/EN). Renderizado fixed en la esquina
 * superior derecha como dropdown con bandera y etiqueta. Persiste la elección a
 * traves de i18next-browser-languagedetector (localStorage).
 */

import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Check, Globe } from "lucide-react";

const LANGUAGES = [
  { code: "es", flag: "🇪🇸", shortLabel: "ES", labelKey: "language.es" },
  { code: "en", flag: "🇬🇧", shortLabel: "EN", labelKey: "language.en" },
];

/** Devuelve el idioma activo normalizado contra la lista soportada. */
const resolveActiveLanguage = (rawLanguage) => {
  const normalized = (rawLanguage || "").toLowerCase().split("-")[0];
  return LANGUAGES.find((entry) => entry.code === normalized) || LANGUAGES[0];
};

/** Toggle de idioma flotante con dropdown y trigger compacto. */
function LanguageSwitcher() {
  const { t, i18n } = useTranslation("common");
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  const active = resolveActiveLanguage(i18n.language);

  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }

    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    const handleEscape = (event) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };

    window.addEventListener("mousedown", handleClickOutside);
    window.addEventListener("keydown", handleEscape);

    return () => {
      window.removeEventListener("mousedown", handleClickOutside);
      window.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen]);

  const handleSelect = (code) => {
    if (code !== i18n.language) {
      i18n.changeLanguage(code);
    }
    setIsOpen(false);
  };

  return (
    <div
      ref={containerRef}
      className="fixed right-3 top-3 z-[60] sm:right-4 sm:top-4 md:right-6 md:top-6"
    >
      <button
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label={t("language.label")}
        className="flex items-center gap-1.5 rounded-full border border-outline-variant/30 bg-surface-container/85 px-2.5 py-1.5 font-label text-[0.7rem] uppercase tracking-[0.11em] text-on-surface backdrop-blur-md shadow-md shadow-black/20 transition-colors hover:bg-surface-container-high/90"
      >
        <Globe className="size-3.5 text-primary" aria-hidden="true" />
        <span className="min-w-[1.65rem] text-center text-[0.7rem] font-semibold leading-none">
          {active.shortLabel}
        </span>
      </button>

      {isOpen ? (
        <ul
          role="listbox"
          aria-label={t("language.label")}
          className="mt-2 min-w-[10rem] rounded-2xl border border-outline-variant/30 bg-surface-container/95 p-1 shadow-xl shadow-black/30 backdrop-blur-md"
        >
          {LANGUAGES.map((entry) => {
            const isActive = entry.code === active.code;
            return (
              <li key={entry.code}>
                <button
                  type="button"
                  role="option"
                  aria-selected={isActive}
                  onClick={() => handleSelect(entry.code)}
                  className={`flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm transition-colors ${
                    isActive
                      ? "bg-primary/15 text-on-surface"
                      : "text-on-surface-variant hover:bg-surface-container-high"
                  }`}
                >
                  <span aria-hidden="true" className="text-base leading-none">
                    {entry.flag}
                  </span>
                  <span className="flex-1 font-medium">{t(entry.labelKey)}</span>
                  {isActive ? (
                    <Check className="size-3.5 text-primary" aria-hidden="true" />
                  ) : null}
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}

export default LanguageSwitcher;
