/**
 * @file landingContent.js
 * @description Agregador de contenido de la landing. Re-exporta cada bloque temático
 * desde `./content/*` y mantiene el objeto `landingContent` por compatibilidad.
 */

import { landingNavbarContent } from "./content/landingNavbarContent";
import { landingHeroContent } from "./content/landingHeroContent";
import { landingFeaturesContent } from "./content/landingFeaturesContent";
import { landingProcessContent } from "./content/landingProcessContent";
import { landingIntegrationContent } from "./content/landingIntegrationContent";
import { landingValueContent } from "./content/landingValueContent";
import { landingFinalCtaContent } from "./content/landingFinalCtaContent";
import { landingFooterContent } from "./content/landingFooterContent";

export {
  landingNavbarContent,
  landingHeroContent,
  landingFeaturesContent,
  landingProcessContent,
  landingIntegrationContent,
  landingValueContent,
  landingFinalCtaContent,
  landingFooterContent,
};

/** Mapa agregado del contenido de la landing usado por `Landing.jsx` y modales. */
export const landingContent = {
  navbar: landingNavbarContent,
  hero: landingHeroContent,
  features: landingFeaturesContent,
  process: landingProcessContent,
  integration: landingIntegrationContent,
  value: landingValueContent,
  finalCta: landingFinalCtaContent,
  footer: landingFooterContent,
};
