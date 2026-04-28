/**
 * @file landingContent.js
 * @description Agregador de contenido de la landing. Cada modulo `./content/*`
 * exporta ahora `{ es, en }` y este archivo expone un hook `useLandingContent`
 * que devuelve la variante adecuada al idioma activo de i18next.
 */

import { useMemo } from "react";
import { useTranslation } from "react-i18next";

import { landingNavbarContent } from "./content/landingNavbarContent";
import { landingHeroContent } from "./content/landingHeroContent";
import { landingFeaturesContent } from "./content/landingFeaturesContent";
import { landingProcessContent } from "./content/landingProcessContent";
import { landingExtensionContent } from "./content/landingExtensionContent";
import { landingValueContent } from "./content/landingValueContent";
import { landingFinalCtaContent } from "./content/landingFinalCtaContent";
import { landingFooterContent } from "./content/landingFooterContent";
import { landingIntegrationContent } from "./content/landingIntegrationContent";

export {
  landingNavbarContent,
  landingHeroContent,
  landingFeaturesContent,
  landingProcessContent,
  landingExtensionContent,
  landingValueContent,
  landingFinalCtaContent,
  landingFooterContent,
  landingIntegrationContent,
};

/** Resuelve el codigo de idioma corto (`es`/`en`) con fallback a `es`. */
const resolveLang = (rawLang) => {
  const lang = (rawLang || "es").toLowerCase().split("-")[0];
  return lang === "en" ? "en" : "es";
};

/** Devuelve la variante de un bloque de contenido segun el idioma. */
const pick = (block, lang) => block?.[lang] ?? block?.es ?? block;

/** Hook que devuelve el agregado del contenido de la landing en el idioma activo. */
export function useLandingContent() {
  const { i18n } = useTranslation();
  const lang = resolveLang(i18n.language);

  return useMemo(
    () => ({
      navbar: pick(landingNavbarContent, lang),
      hero: pick(landingHeroContent, lang),
      features: pick(landingFeaturesContent, lang),
      process: pick(landingProcessContent, lang),
      extension: pick(landingExtensionContent, lang),
      value: pick(landingValueContent, lang),
      finalCta: pick(landingFinalCtaContent, lang),
      footer: pick(landingFooterContent, lang),
      integration: pick(landingIntegrationContent, lang),
    }),
    [lang]
  );
}

/** @deprecated Usa `useLandingContent()` en su lugar. Mantiene la variante en español. */
export const landingContent = {
  navbar: landingNavbarContent.es,
  hero: landingHeroContent.es,
  features: landingFeaturesContent.es,
  process: landingProcessContent.es,
  extension: landingExtensionContent.es,
  value: landingValueContent.es,
  finalCta: landingFinalCtaContent.es,
  footer: landingFooterContent.es,
  integration: landingIntegrationContent.es,
};
