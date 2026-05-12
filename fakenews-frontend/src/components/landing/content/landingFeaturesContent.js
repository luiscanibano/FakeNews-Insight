/**
 * @file landingFeaturesContent.js
 * @description Caracteristicas, tarjetas y bloque de infraestructura de la landing.
 */

const FEATURES_IMAGE =
  "https://lh3.googleusercontent.com/aida-public/AB6AXuCRAhLi_WrycNR_rvJFSXZnocCBEl5HA_dJNTEiLLERKDkm1SH04AuKCWP4aeMcGa6Cw4lJ_3oGUclgSJlAliNKAzIv1ZDH2u4GNFzzPiS-fwyMLXq0l2qKb4rStlnWbXkbn7zQWlSoa5MYuo2C2pCO3-0FhalOjiWsXd3mIXhdudi6Q7KsV3Eu6n49htERwAjroZt_P42QJzA3CN5Sz6wqP5KsAK9pfEQuSEXiwZEOBXDDeirVwtzbbKvtHE-IG37jm-iCV_c3k0w";

export const landingFeaturesContent = {
  es: {
    badge: "Verificación profesional con evidencias",
    titlePrefix: "Contraste sin",
    titleEmphasis: "fricciones",
    description:
      "Nuestra tecnología se funde con tu flujo diario para pasar del texto a una verificación explicable con evidencias.",
    primaryFeature: {
      title: "Verificación inteligente por afirmación",
      description:
        "Pega un texto o la URL de una noticia y el sistema separa afirmaciones, recupera evidencias y calcula un veredicto FEVER/NLI interpretable según tu plan.",
      sampleUrl: "https://noticias-tech.com/articulo-sospechoso...",
      analyzeCta: "Analizar",
      points: [
        "Extracción de claims y contraste con evidencias web.",
        "Inferencia NLI para apoyar, refutar o marcar información insuficiente.",
      ],
      stats: [
        { value: "72.8%", label: "Accuracy FEVER" },
        { value: "< 2s", label: "Tiempo de respuesta" },
        { value: "24/7", label: "Disponibilidad" },
      ],
    },
    cards: [
      {
        icon: "extension",
        title: "Integración en tu navegador",
        description:
          "No interrumpas tu lectura. Selecciona texto en cualquier web y lanza el análisis o la verificación de afirmaciones con nuestra extensión ligera.",
        points: [
          "Contrasta fragmentos sin cambiar de pestaña.",
          "Contraste básico, avanzado o completo según tu plan.",
        ],
        metric: "Claims y evidencias en contexto",
      },
      {
        icon: "stats",
        title: "Historial y Estadísticas",
        description:
          "Crea tu cuenta para guardar análisis, revisar verificaciones anteriores y visualizar cómo evolucionan tus consultas de claims y evidencias.",
        points: [
          "Dashboard con evolución de análisis y verificaciones.",
          "Historial trazable de textos, veredictos y fuentes.",
        ],
        metric: "Histórico completo en la nube",
      },
    ],
    infrastructure: {
      title: "Tecnología de Vanguardia",
      description:
        "La plataforma combina gestión de cuotas, extracción de claims y un agente FEVER/NLI que consulta evidencias externas cuando necesitas una explicación más profunda.",
      uptimeValue: "99.9%",
      uptimeLabel: "Uptime",
      latencyValue: "NLI",
      latencyLabel: "FEVER",
      image: FEATURES_IMAGE,
    },
  },
  en: {
    badge: "Professional evidence-backed verification",
    titlePrefix: "Frictionless",
    titleEmphasis: "analysis",
    description:
      "Our technology blends into your daily workflow to move from raw text to explainable verification with evidence.",
    primaryFeature: {
      title: "Claim-level smart verification",
      description:
        "Paste a text or news URL and the system splits claims, retrieves evidence and computes an interpretable FEVER/NLI verdict according to your plan.",
      sampleUrl: "https://tech-news.com/suspicious-article...",
      analyzeCta: "Analyze",
      points: [
        "Claim extraction and cross-checking with web evidence.",
        "NLI inference to support, refute or mark insufficient information.",
      ],
      stats: [
        { value: "72.8%", label: "FEVER accuracy" },
        { value: "< 2s", label: "Response time" },
        { value: "24/7", label: "Availability" },
      ],
    },
    cards: [
      {
        icon: "extension",
        title: "Browser integration",
        description:
          "Don't break your reading flow. Select text on any site and launch fast analysis or claim verification with our lightweight extension.",
        points: [
          "Check fragments without switching tabs.",
          "Basic, advanced or full checking depending on your plan.",
        ],
        metric: "Claims and evidence in context",
      },
      {
        icon: "stats",
        title: "History & analytics",
        description:
          "Create an account to save analyses, review previous verifications and visualize how your claim and evidence activity evolves.",
        points: [
          "Dashboard with analysis and verification activity over time.",
          "Traceable history of texts, verdicts and sources.",
        ],
        metric: "Full history in the cloud",
      },
    ],
    infrastructure: {
      title: "Cutting-edge technology",
      description:
        "The platform combines quota management, claim extraction and a FEVER/NLI agent that consults external evidence when you need deeper explanation.",
      uptimeValue: "99.9%",
      uptimeLabel: "Uptime",
      latencyValue: "NLI",
      latencyLabel: "FEVER",
      image: FEATURES_IMAGE,
    },
  },
};
