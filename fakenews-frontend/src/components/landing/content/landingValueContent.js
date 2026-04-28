/**
 * @file landingValueContent.js
 * @description Catalogo de planes mostrado en la landing y en el modal de selección.
 */

export const landingValueContent = {
  es: {
    title: "Planes para todos los buscadores de verdad.",
    description: "Analiza en tiempo real con PRO, ve más allá con ULTRA.",
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
          "Hasta 20 noticias/día",
          "Último modelo IA",
          "Historial personal",
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
          "Análisis ilimitados",
          "Último modelo IA (Plus)",
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
          "Todo lo de Pro",
          "Análisis masivo por CSV",
          "Acceso a API Key personal",
          "Soporte prioritario",
        ],
      },
    ],
  },
  en: {
    title: "Plans for every truth seeker.",
    description: "Analyze in real time with PRO, go further with ULTRA.",
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
          "Up to 20 news/day",
          "Latest AI model",
          "Personal history",
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
          "Unlimited analyses",
          "Latest AI model (Plus)",
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
          "Everything in Pro",
          "Bulk CSV analysis",
          "Personal API key access",
          "Priority support",
        ],
      },
    ],
  },
};
