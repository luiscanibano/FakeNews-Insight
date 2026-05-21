import { GITHUB_RELEASES_URL } from "@/lib/constants";

/**
 * @file landingExtensionContent.js
 * @description Contenido de la seccion de la landing dedicada a la extension
 * de navegador FakeNews Insight.
 */

export const landingExtensionContent = {
  es: {
    eyebrow: "Extension de navegador",
    title: "Verifica afirmaciones sin salir de la web.",
    description:
      "Selecciona un parrafo en tu medio favorito y un marco morado lo envuelve al instante con un panel para analizarlo o contrastar sus claims. Sin copiar, sin pegar, sin abrir pestanas.",
    bullets: [
      "Funciona en cualquier sitio HTTP/HTTPS, dentro de tu sesión FakeNews Insight.",
      "Veredicto inline con cuota diaria visible.",
      "Verificación FEVER con evidencias web según tu plan.",
      "Compatible con Chrome, Edge y derivados (Manifest V3).",
    ],
    ctaPrimary: "Descargar v0.3.0",
    ctaSecondary: "Como funciona",
    releasesUrl: GITHUB_RELEASES_URL,
    preview: {
      snippet:
        "Científicos confirman que el cafe matutino aumenta la productividad un 37% según un nuevo meta-análisis publicado este mes.",
      verdict: "REAL",
      strength: 0.612,
      plan: "FREE",
      remaining: 8,
      limit: 10,
    },
  },
  en: {
    eyebrow: "Browser extension",
    title: "Verify claims without leaving the web.",
    description:
      "Select a paragraph on your favorite outlet and a purple frame wraps it instantly with a panel to analyze it or check its claims. No copy, no paste, no extra tabs.",
    bullets: [
      "Works on any HTTP/HTTPS site, inside your FakeNews Insight session.",
      "Inline verdict with visible daily quota.",
      "FEVER verification with web evidence according to your plan.",
      "Compatible with Chrome, Edge and derivatives (Manifest V3).",
    ],
    ctaPrimary: "Download v0.3.0",
    ctaSecondary: "How it works",
    releasesUrl: GITHUB_RELEASES_URL,
    preview: {
      snippet:
        "Scientists confirm that morning coffee boosts productivity by 37% according to a new meta-analysis published this month.",
      verdict: "REAL",
      strength: 0.612,
      plan: "FREE",
      remaining: 8,
      limit: 10,
    },
  },
};
