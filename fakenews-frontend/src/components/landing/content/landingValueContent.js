/**
 * @file landingValueContent.js
 * @description Catalogo de planes mostrado en la landing y en el modal de selección.
 */

export const landingValueContent = {
  es: {
    title: "Planes para verificar con más contexto.",
    description: "Empieza contrastando afirmaciones y escala a más evidencias FEVER con ULTRA.",
    recommendedLabel: "Recomendado",
    plans: [
      {
        key: "free",
        name: "Free",
        price: "0€",
        interval: "/mes",
        recommended: false,
        cta: "Empezar gratis",
        features: [
          "5 contrastes básicos/día",
          "1 claim y 1 evidencia por revisión",
          "Historial personal de verificaciones",
          "Extensión navegador",
        ],
      },
      {
        key: "pro",
        name: "Pro",
        price: "2,99€",
        interval: "/mes",
        recommended: true,
        cta: "Suscribirse",
        features: [
          "50 contrastes avanzados/día",
          "Hasta 3 claims y 3 evidencias por claim",
          "Historial completo",
          "Extensión navegador",
        ],
      },
      {
        key: "ultra",
        name: "Ultra",
        price: "14,99€",
        interval: "/mes",
        recommended: false,
        cta: "Suscribirse",
        features: [
          "200 contrastes premium/día",
          "Agente FEVER completo",
          "Hasta 8 claims y 5 evidencias por claim",
          "Análisis masivo por CSV",
          "Soporte prioritario",
        ],
      },
    ],
  },
  en: {
    title: "Plans for deeper verification.",
    description: "Start by checking claims and scale to deeper FEVER evidence on ULTRA.",
    recommendedLabel: "Recommended",
    plans: [
      {
        key: "free",
        name: "Free",
        price: "€0",
        interval: "/month",
        recommended: false,
        cta: "Start free",
        features: [
          "5 basic checks/day",
          "1 claim and 1 evidence per review",
          "Personal verification history",
          "Browser extension",
        ],
      },
      {
        key: "pro",
        name: "Pro",
        price: "€2.99",
        interval: "/month",
        recommended: true,
        cta: "Subscribe",
        features: [
          "50 advanced checks/day",
          "Up to 3 claims and 3 evidence items per claim",
          "Full history",
          "Browser extension",
        ],
      },
      {
        key: "ultra",
        name: "Ultra",
        price: "€14.99",
        interval: "/month",
        recommended: false,
        cta: "Subscribe",
        features: [
          "200 premium checks/day",
          "Full FEVER agent",
          "Up to 8 claims and 5 evidence items per claim",
          "Bulk CSV analysis",
          "Priority support",
        ],
      },
    ],
  },
};
