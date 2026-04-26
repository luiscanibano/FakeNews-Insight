/**
 * @file landingContent.js
 * @description Componente de la landing page orientado a contenido, comunicacion de valor y conversion.
 */

export const landingContent = {
  navbar: {
    brand: "FakeNews Insight",
    links: [
      { label: "Características", href: "#features" },
      { label: "Cómo funciona", href: "#process" },
      { label: "Precios", href: "#pricing" },
    ],
    cta: "Empieza ahora",
  },
  hero: {
    badge: "Impulsado por IA de última generación",
    titlePrefix: "Descubre la verdad detrás de cada",
    titleEmphasis: "titular",
    description:
      "FakeNews Insight utiliza Inteligencia Artificial y Procesamiento de Lenguaje Natural para detectar desinformación en tiempo real. Analiza textos, enlaces y navega con confianza.",
    ctaPrimary: "Empieza ahora",
    ctaSecondary: "Ver demo interactiva",
    panelSubtitle: "Análisis contextual de titulares",
    panelStatus: "Análisis activo",
    sampleUrl:
      "https://newswire.global/politica/ultima-hora-declaracion-viral-trump",
    signals: [
      { label: "Credibilidad de la fuente", value: "91%" },
      { label: "Consistencia semántica", value: "84%" },
      { label: "Riesgo de manipulación", value: "36%" },
    ],
    trustStats: [
      { value: "1.2M+", label: "Artículos analizados" },
      { value: "97.8%", label: "Precisión media" },
      { value: "< 2s", label: "Tiempo de respuesta" },
    ],
    analyzingLabel: "Analizando URL...",
    scoreLabel: "Score de fiabilidad",
    verifiedLabel: "Contenido verificado",
  },
  features: {
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
      image:
        "https://lh3.googleusercontent.com/aida-public/AB6AXuCRAhLi_WrycNR_rvJFSXZnocCBEl5HA_dJNTEiLLERKDkm1SH04AuKCWP4aeMcGa6Cw4lJ_3oGUclgSJlAliNKAzIv1ZDH2u4GNFzzPiS-fwyMLXq0l2qKb4rStlnWbXkbn7zQWlSoa5MYuo2C2pCO3-0FhalOjiWsXd3mIXhdudi6Q7KsV3Eu6n49htERwAjroZt_P42QJzA3CN5Sz6wqP5KsAK9pfEQuSEXiwZEOBXDDeirVwtzbbKvtHE-IG37jm-iCV_c3k0w",
    },
  },
  process: {
    title: "Desarrollado con tecnología de vanguardia.",
    description:
      "Tres pasos para blindar tu consumo de información.",
    steps: [
      {
        number: "01",
        title: "Introduce la información",
        eta: "Paso inicial · 15s",
        description:
          "Pega un texto dudoso o el enlace de un artículo directamente en nuestra plataforma o usa el clic derecho en tu navegador.",
        details: [
          "Acepta texto libre, titulares o URL completas.",
          "Detección automática de idioma y normalización de contenido.",
        ],
      },
      {
        number: "02",
        title: "La IA procesa los datos",
        eta: "Análisis IA · < 2s",
        description:
          "Nuestra API analiza los patrones lingüísticos, la reputación de la fuente y el contexto semántico en segundos.",
        details: [
          "Cruce con señales de credibilidad y consistencia narrativa.",
          "Evaluación de sesgo, manipulación y patrones virales sospechosos.",
        ],
      },
      {
        number: "03",
        title: "Obtén el veredicto",
        eta: "Resultado · inmediato",
        description:
          "Recibe un indicador visual claro: Fiable o falso, acompañado de un desglose detallado de los motivos de la puntuación.",
        details: [
          "Puntuación de fiabilidad con explicación interpretable.",
          "Recomendaciones para contrastar con fuentes adicionales.",
        ],
      },
    ],
  },
  integration: {
    title: "Una plataforma que va más allá.",
    description:
      "Integra nuestro modelo en tu aplicación o analiza noticias de forma masiva con Ultra. Ofrecemos SDKs para los lenguajes más populares y una documentación pensada para desarrolladores.",
    items: [
      { icon: "api", label: "REST API" },
      { icon: "sdk", label: "SDK Python" },
      { icon: "node", label: "Node.js" },
    ],
  },
  value: {
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
  finalCta: {
    title: "Activa tu escudo contra la desinformación.",
    description:
      "Crea tu cuenta gratuita y empieza hoy a validar titulares con IA en segundos.",
    cta: "Crear cuenta",
  },
  footer: {
    brand: "FakeNews Insight",
    description:
      "Utilizamos inteligencia artificial para crear una red de seguridad digital global contra la desinformación.",
    columns: [
      {
        title: "Producto",
        links: [
          { label: "Características", href: "#features" },
          { label: "Precios", href: "#pricing" },
          { label: "API", href: "#" },
        ],
      },
      {
        title: "Compañía",
        links: [
          { label: "Privacidad", href: "#" },
          { label: "Términos", href: "#" },
          { label: "Contacto", href: "#" },
        ],
      },
    ],
    socials: [
      { label: "Twitter", href: "#" },
      { label: "LinkedIn", href: "#" },
    ],
    copyright: "© 2026 FakeNews Insight. Protegiendo la verdad digital.",
  },
};
