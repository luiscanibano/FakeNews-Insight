/**
 * @file landingHeroContent.js
 * @description Copy, demo simulada y stats del hero de la landing.
 */

export const landingHeroContent = {
  es: {
    badge: "Verificación FEVER con evidencias web",
    titlePrefix: "Contrasta cada",
    titleEmphasis: "afirmación",
    description:
      "FakeNews Insight extrae afirmaciones, busca evidencias y aplica inferencia de lenguaje natural para explicar si el contenido está apoyado, refutado o sigue sin información suficiente.",
    ctaPrimary: "Empieza ahora",
    ctaSecondary: "Ver demo interactiva",
    panelSubtitle: "Verificación contextual de claims",
    panelStatus: "FEVER activo",
    sampleUrl:
      "https://newswire.global/politica/ultima-hora-declaracion-viral-trump",
    signals: [
      { label: "Evidencia encontrada", value: "91%" },
      { label: "Consistencia NLI", value: "84%" },
      { label: "Claims sin soporte", value: "36%" },
    ],
    trustStats: [
      { value: "196k+", label: "Pares FEVER entrenados" },
      { value: "72.8%", label: "Accuracy test FEVER" },
      { value: "< 2s", label: "Tiempo de respuesta" },
    ],
    analyzingLabel: "Buscando evidencias...",
    scoreLabel: "Confianza FEVER",
    verifiedLabel: "Claims contrastados",
  },
  en: {
    badge: "FEVER verification with web evidence",
    titlePrefix: "Check every",
    titleEmphasis: "claim",
    description:
      "FakeNews Insight extracts claims, retrieves evidence and applies natural language inference to explain whether content is supported, refuted or still lacks enough information.",
    ctaPrimary: "Get started",
    ctaSecondary: "See interactive demo",
    panelSubtitle: "Contextual claim verification",
    panelStatus: "FEVER active",
    sampleUrl:
      "https://newswire.global/politics/breaking-viral-trump-statement",
    signals: [
      { label: "Evidence found", value: "91%" },
      { label: "NLI consistency", value: "84%" },
      { label: "Unsupported claims", value: "36%" },
    ],
    trustStats: [
      { value: "196k+", label: "FEVER pairs trained" },
      { value: "72.8%", label: "FEVER test accuracy" },
      { value: "< 2s", label: "Response time" },
    ],
    analyzingLabel: "Retrieving evidence...",
    scoreLabel: "FEVER confidence",
    verifiedLabel: "Claims checked",
  },
};
