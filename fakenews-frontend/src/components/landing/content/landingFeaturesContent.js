/**
 * @file landingFeaturesContent.js
 * @description Caracteristicas, tarjetas y bloque de infraestructura de la landing.
 */

const FEATURES_IMAGE =
  "https://lh3.googleusercontent.com/aida-public/AB6AXuCRAhLi_WrycNR_rvJFSXZnocCBEl5HA_dJNTEiLLERKDkm1SH04AuKCWP4aeMcGa6Cw4lJ_3oGUclgSJlAliNKAzIv1ZDH2u4GNFzzPiS-fwyMLXq0l2qKb4rStlnWbXkbn7zQWlSoa5MYuo2C2pCO3-0FhalOjiWsXd3mIXhdudi6Q7KsV3Eu6n49htERwAjroZt_P42QJzA3CN5Sz6wqP5KsAK9pfEQuSEXiwZEOBXDDeirVwtzbbKvtHE-IG37jm-iCV_c3k0w";

export const landingFeaturesContent = {
  es: {
    badge: "Análisis profesional instantáneo",
    titlePrefix: "Análisis sin",
    titleEmphasis: "fricciones",
    description:
      "Nuestra tecnología se funde con tu flujo de trabajo diario para ofrecerte respuestas inmediatas.",
    primaryFeature: {
      title: "Análisis inteligente al instante",
      description:
        "Pega un texto o la URL de una noticia y nuestro modelo predictivo te devolverá un porcentaje de fiabilidad en milisegundos. Utilizamos modelos de lenguaje entrenados en cientos de miles de artículos verificados.",
      sampleUrl: "https://noticias-tech.com/articulo-sospechoso...",
      analyzeCta: "Analizar",
      points: [
        "Evaluación semántica y contraste con fuentes verificadas.",
        "Detección de señales de manipulación y sesgo narrativo.",
      ],
      stats: [
        { value: "87%", label: "Precisión media" },
        { value: "< 2s", label: "Tiempo de respuesta" },
        { value: "24/7", label: "Disponibilidad" },
      ],
    },
    cards: [
      {
        icon: "extension",
        title: "Integración en tu navegador",
        description:
          "No interrumpas tu lectura. Analiza la veracidad de los artículos directamente desde X (Twitter) o tu periódico digital favorito con nuestra extensión ligera.",
        points: [
          "Verifica noticias sin cambiar de pestaña.",
          "Atajos rápidos para analizar enlaces al instante.",
        ],
        metric: "+35% velocidad de verificación",
      },
      {
        icon: "stats",
        title: "Historial y Estadísticas",
        description:
          "Crea tu cuenta para guardar tus análisis, revisar tu historial de consultas y visualizar métricas globales sobre las tendencias de desinformación.",
        points: [
          "Dashboard con evolución de tus verificaciones.",
          "Alertas sobre patrones de desinformación emergentes.",
        ],
        metric: "Histórico completo en la nube",
      },
    ],
    infrastructure: {
      title: "Tecnología de Vanguardia",
      description:
        "Nuestra infraestructura corre sobre nodos distribuidos para garantizar una latencia inferior a 200ms en cualquier parte del mundo.",
      uptimeValue: "99.9%",
      uptimeLabel: "Uptime",
      latencyValue: "0.2s",
      latencyLabel: "Respuesta",
      image: FEATURES_IMAGE,
    },
  },
  en: {
    badge: "Instant professional analysis",
    titlePrefix: "Frictionless",
    titleEmphasis: "analysis",
    description:
      "Our technology blends into your daily workflow to give you instant answers.",
    primaryFeature: {
      title: "Smart analysis in seconds",
      description:
        "Paste a text or news URL and our predictive model returns a reliability score in milliseconds. We use language models trained on hundreds of thousands of verified articles.",
      sampleUrl: "https://tech-news.com/suspicious-article...",
      analyzeCta: "Analyze",
      points: [
        "Semantic evaluation and cross-checking with verified sources.",
        "Detection of manipulation signals and narrative bias.",
      ],
      stats: [
        { value: "87%", label: "Average accuracy" },
        { value: "< 2s", label: "Response time" },
        { value: "24/7", label: "Availability" },
      ],
    },
    cards: [
      {
        icon: "extension",
        title: "Browser integration",
        description:
          "Don't break your reading flow. Check the truthfulness of articles directly from X (Twitter) or your favorite news site with our lightweight extension.",
        points: [
          "Verify news without switching tabs.",
          "Shortcuts to analyze links instantly.",
        ],
        metric: "+35% verification speed",
      },
      {
        icon: "stats",
        title: "History & analytics",
        description:
          "Create an account to save your analyses, review your query history and visualize global metrics on misinformation trends.",
        points: [
          "Dashboard with your verification activity over time.",
          "Alerts on emerging misinformation patterns.",
        ],
        metric: "Full history in the cloud",
      },
    ],
    infrastructure: {
      title: "Cutting-edge technology",
      description:
        "Our infrastructure runs on distributed nodes to guarantee latency below 200ms anywhere in the world.",
      uptimeValue: "99.9%",
      uptimeLabel: "Uptime",
      latencyValue: "0.2s",
      latencyLabel: "Response",
      image: FEATURES_IMAGE,
    },
  },
};
