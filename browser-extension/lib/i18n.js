const LANGUAGE_STORAGE_KEY = "fakenews-insight-language";

const TRANSLATIONS = {
  es: {
    app: {
      lead: "FakeNews",
      tail: "Insight",
      languageLabel: "Idioma",
    },
    language: {
      es: "Español",
      en: "English",
    },
    auth: {
      title: "Inicia sesión",
      subtitle:
        "Usa la cuenta de FakeNews Insight para revisar textos y verificar afirmaciones desde cualquier web sin abrir el panel.",
      email: "Correo electrónico",
      password: "Contraseña",
      emailPlaceholder: "tu@email.com",
      passwordPlaceholder: "••••••••",
      submit: "Entrar",
      google: "Continuar con Google",
      divider: "o",
      footer: "¿No tienes cuenta?",
      register: "Regístrate en la web",
      logout: "Cerrar sesión",
      missingCredentials: "Introduce email y contraseña.",
      expired: "Tu sesión ha expirado. Vuelve a iniciar sesión.",
    },
    analyze: {
      title: "Revisar texto",
      subtitle:
        "Pega una afirmación, titular o cuerpo de texto, o usa la selección de la pestaña actual.",
      useSelection: "Usar selección actual",
      fieldLabel: "Texto a revisar",
      placeholder:
        "Pega una afirmación verificable o un fragmento informativo (mínimo 80 caracteres)…",
      verify: "Verificar afirmaciones",
      selectionMissing: "No hay texto seleccionado en la página actual.",
      selectionReadError:
        "No se pudo leer la selección (la página puede bloquear el acceso).",
      activeTabMissing: "No se encontró la pestaña activa.",
      tooShort: "El texto debe tener al menos {{min}} caracteres.",
      tooLong: "El texto no puede superar {{max}} caracteres.",
      truncatedSelection:
        "La selección superaba {{max}} caracteres y se ha recortado.",
      counter: "{{count}}/{{max}} caracteres",
      progress: "Procesando contexto · {{progress}}%",
      loadingTitle: "Verificando afirmaciones seleccionadas...",
      loadingHint:
        "El primer contraste tras un rato puede tardar 10-30s mientras arranca el servidor.",
      loadingStagePreparing: "Preparando el contraste del texto seleccionado...",
      loadingStageSearching: "Buscando evidencias relevantes en fuentes abiertas...",
      loadingStageFinal: "Contrastando afirmaciones y preparando el veredicto...",
    },
    verify: {
      title: "Verificación de afirmaciones",
      overall: "Veredicto global",
      claimsTitle: "Afirmaciones extraídas",
      claimsIntro:
        "Estas son las afirmaciones concretas que el sistema ha extraído del texto para contrastarlas con evidencias web.",
      evidences: "Evidencias",
      noEvidence: "Sin evidencias web suficientes.",
      noClaims: "No se pudieron extraer afirmaciones verificables.",
      plan: "Plan",
      remaining: "Verificaciones restantes hoy",
      claimsCount: "Afirmaciones",
      openExtension: "Abrir extensión",
      createAccount: "Crear cuenta",
      needsLogin: "Necesitas iniciar sesión en FakeNews Insight para revisar.",
      openPopupHint:
        "Pulsa el icono de FakeNews Insight en la barra del navegador para iniciar sesión.",
      saveHistory: "Guardar en historial",
      savingHistory: "Guardando...",
      savedHistory: "Guardado en historial",
      saveHistoryError: "No se pudo guardar la verificación en historial.",
      back: "Volver",
      close: "Cerrar",
      confidence: "Confianza agregada",
      summaryFallback: "Sin resumen adicional.",
    },
    verdict: {
      SUPPORTED: "VERIFICADO",
      REFUTED: "DESMENTIDO",
      CONFLICTING: "EVIDENCIAS CONTRADICTORIAS",
      NOT_ENOUGH_INFO: "EVIDENCIA INSUFICIENTE",
    },
    quota: {
      remaining: "Plan {{plan}} · Quedan {{remaining}}/{{limit}} verificaciones hoy.",
      unlimited: "Plan {{plan}} · Sin límite diario.",
      chipRemaining: "{{plan}} · {{remaining}}/{{limit}} hoy",
      chipUnlimited: "{{plan}} · sin límite",
    },
    errors: {
      genericVerify: "No se pudo verificar el texto.",
      loadModules: "No se pudieron cargar los módulos de la extensión.",
      sessionLoad: "No se pudo cargar la sesión guardada.",
      invalidSession: "Tu sesión no es válida. Inicia sesión de nuevo.",
      missingVerification: "No se encontró la verificación para guardar.",
    },
  },
  en: {
    app: {
      lead: "FakeNews",
      tail: "Insight",
      languageLabel: "Language",
    },
    language: {
      es: "Spanish",
      en: "English",
    },
    auth: {
      title: "Sign in",
      subtitle:
        "Use your FakeNews Insight account to review text and verify claims from any website without opening the dashboard.",
      email: "Email",
      password: "Password",
      emailPlaceholder: "you@email.com",
      passwordPlaceholder: "••••••••",
      submit: "Sign in",
      google: "Continue with Google",
      divider: "or",
      footer: "Need an account?",
      register: "Create it on the website",
      logout: "Sign out",
      missingCredentials: "Enter your email and password.",
      expired: "Your session expired. Sign in again.",
    },
    analyze: {
      title: "Review text",
      subtitle:
        "Paste a claim, headline or text body, or use the current selection from the active tab.",
      useSelection: "Use current selection",
      fieldLabel: "Text to review",
      placeholder:
        "Paste a verifiable claim or informative fragment (minimum 80 characters)...",
      verify: "Verify claims",
      selectionMissing: "There is no selected text on the current page.",
      selectionReadError:
        "The selection could not be read (the page may block access).",
      activeTabMissing: "The active tab could not be found.",
      tooShort: "Text must be at least {{min}} characters long.",
      tooLong: "Text cannot exceed {{max}} characters.",
      truncatedSelection:
        "The selection exceeded {{max}} characters and was trimmed.",
      counter: "{{count}}/{{max}} characters",
      progress: "Processing context · {{progress}}%",
      loadingTitle: "Verifying selected claims...",
      loadingHint:
        "The first verification after some idle time may take 10-30s while the server wakes up.",
      loadingStagePreparing: "Preparing the selected text for verification...",
      loadingStageSearching: "Searching relevant evidence across open sources...",
      loadingStageFinal: "Cross-checking claims and preparing the verdict...",
    },
    verify: {
      title: "Claim verification",
      overall: "Overall verdict",
      claimsTitle: "Extracted claims",
      claimsIntro:
        "These are the specific claims the system extracted from the text to cross-check against web evidence.",
      evidences: "Evidence",
      noEvidence: "Not enough web evidence.",
      noClaims: "No verifiable claims could be extracted.",
      plan: "Plan",
      remaining: "Remaining verifications today",
      claimsCount: "Claims",
      openExtension: "Open extension",
      createAccount: "Create account",
      needsLogin: "You need to sign in to FakeNews Insight to review this text.",
      openPopupHint:
        "Click the FakeNews Insight icon in the browser toolbar to sign in.",
      saveHistory: "Save to history",
      savingHistory: "Saving...",
      savedHistory: "Saved to history",
      saveHistoryError: "The verification could not be saved to history.",
      back: "Back",
      close: "Close",
      confidence: "Aggregate confidence",
      summaryFallback: "No additional summary.",
    },
    verdict: {
      SUPPORTED: "SUPPORTED",
      REFUTED: "REFUTED",
      CONFLICTING: "CONFLICTING EVIDENCE",
      NOT_ENOUGH_INFO: "NOT ENOUGH INFO",
    },
    quota: {
      remaining: "Plan {{plan}} · {{remaining}}/{{limit}} verifications left today.",
      unlimited: "Plan {{plan}} · Unlimited daily usage.",
      chipRemaining: "{{plan}} · {{remaining}}/{{limit}} today",
      chipUnlimited: "{{plan}} · unlimited",
    },
    errors: {
      genericVerify: "The text could not be verified.",
      loadModules: "The extension modules could not be loaded.",
      sessionLoad: "The saved session could not be loaded.",
      invalidSession: "Your session is not valid. Sign in again.",
      missingVerification: "The verification to save could not be found.",
    },
  },
};

export const resolveLanguage = (rawLanguage) => {
  const normalized = String(rawLanguage || "").toLowerCase().split("-")[0];
  return Object.prototype.hasOwnProperty.call(TRANSLATIONS, normalized)
    ? normalized
    : "es";
};

const getDictionaryValue = (dictionary, key) =>
  key.split(".").reduce((accumulator, segment) => accumulator?.[segment], dictionary);

const interpolate = (template, values) =>
  String(template).replace(/{{\s*(\w+)\s*}}/g, (_match, token) => {
    const replacement = values?.[token];
    return replacement === undefined || replacement === null ? "" : String(replacement);
  });

const readStoredLanguage = () =>
  new Promise((resolve) => {
    try {
      chrome.storage.local.get([LANGUAGE_STORAGE_KEY], (result) => {
        resolve(resolveLanguage(result?.[LANGUAGE_STORAGE_KEY] || navigator.language));
      });
    } catch {
      resolve(resolveLanguage(navigator.language));
    }
  });

export const getStoredLanguage = () => readStoredLanguage();

export const setStoredLanguage = (language) =>
  new Promise((resolve) => {
    const resolved = resolveLanguage(language);
    try {
      chrome.storage.local.set({ [LANGUAGE_STORAGE_KEY]: resolved }, () => {
        resolve(resolved);
      });
    } catch {
      resolve(resolved);
    }
  });

export const getLanguageOptions = (language) => {
  const resolved = resolveLanguage(language);
  return ["es", "en"].map((code) => ({
    code,
    shortLabel: code.toUpperCase(),
    label: t(`language.${code}`, {}, resolved),
    active: code === resolved,
  }));
};

export const t = (key, values = {}, language = "es") => {
  const resolved = resolveLanguage(language);
  const dictionary = TRANSLATIONS[resolved] || TRANSLATIONS.es;
  const fallback = getDictionaryValue(TRANSLATIONS.es, key) || key;
  const template = getDictionaryValue(dictionary, key) || fallback;
  return interpolate(template, values);
};

export { LANGUAGE_STORAGE_KEY };