/**
 * @file landingExtensionContent.js
 * @description Contenido de la seccion de la landing dedicada a la extension
 * de navegador FakeNews Insight.
 */

export const landingExtensionContent = {
  eyebrow: "Extension de navegador",
  title: "Analiza cualquier noticia sin salir de la web.",
  description:
    "Selecciona un parrafo en tu medio favorito y un marco morado lo envuelve al instante con un panel para verificarlo en un click. Sin copiar, sin pegar, sin abrir pestanas.",
  bullets: [
    "Funciona en cualquier sitio HTTP/HTTPS, dentro de tu sesión FakeNews.",
    "Veredicto inline con barra de fuerza SVM y cuota diaria visible.",
    "Compatible con Chrome, Edge y derivados (Manifest V3).",
  ],
  ctaPrimary: "Descargar v0.3.0",
  ctaSecondary: "Como funciona",
  releasesUrl: "https://github.com/Luis-CG/TFG-Informatica---Luis-Canibano/releases",
  // Mock para el preview animado.
  preview: {
    snippet:
      "Científicos confirman que el cafe matutino aumenta la productividad un 37% según un nuevo meta-análisis publicado este mes.",
    verdict: "REAL",
    strength: 0.612,
    plan: "FREE",
    remaining: 8,
    limit: 10,
  },
};
