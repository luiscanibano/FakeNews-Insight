/**
 * @file popup.js
 * @description Controlador principal del popup. Hace de router entre las
 * vistas (login / analyze / result), invoca a Supabase Auth y al backend
 * FastAPI, y maneja errores de sesion expirada de forma uniforme.
 */

import { CONFIG } from "../lib/config.js";
import { analyzeText, saveAnalysis } from "../lib/api.js";
import { loadSession, clearSession } from "../lib/storage.js";
import { SessionExpiredError, signIn, signOut } from "../lib/supabase.js";

const MIN_TEXT_LENGTH = 10;

const elements = {
  // Header
  sessionInfo: document.getElementById("session-info"),
  sessionEmail: document.getElementById("session-email"),
  logoutButton: document.getElementById("logout-button"),

  // Vistas
  views: {
    login: document.getElementById("view-login"),
    analyze: document.getElementById("view-analyze"),
    result: document.getElementById("view-result"),
  },

  // Login
  loginForm: document.getElementById("login-form"),
  loginEmail: document.getElementById("login-email"),
  loginPassword: document.getElementById("login-password"),
  loginError: document.getElementById("login-error"),
  loginSubmit: document.getElementById("login-submit"),
  openRegister: document.getElementById("open-register"),

  // Analyze
  useSelectionButton: document.getElementById("use-selection-button"),
  analyzeTextarea: document.getElementById("analyze-textarea"),
  charCounter: document.getElementById("char-counter"),
  analyzeError: document.getElementById("analyze-error"),
  analyzeButton: document.getElementById("analyze-button"),

  // Result
  verdictLabel: document.getElementById("verdict-label"),
  verdictStrengthValue: document.getElementById("verdict-strength-value"),
  strengthBarFill: document.getElementById("strength-bar-fill"),
  quotaInfo: document.getElementById("quota-info"),
  resultError: document.getElementById("result-error"),
  resultSuccess: document.getElementById("result-success"),
  saveButton: document.getElementById("save-button"),
  newAnalysisButton: document.getElementById("new-analysis-button"),
};

/** Estado en memoria del popup (se reinicia al cerrarlo). */
const state = {
  lastAnalysis: null,
};

// ----- Utilidades de UI ------------------------------------------------------

const showView = (viewName) => {
  Object.entries(elements.views).forEach(([name, node]) => {
    if (!node) return;
    node.classList.toggle("hidden", name !== viewName);
  });
};

const showHeaderForSession = (session) => {
  if (session) {
    elements.sessionInfo.classList.remove("hidden");
    elements.sessionEmail.textContent = session.userEmail || "";
    elements.sessionEmail.title = session.userEmail || "";
  } else {
    elements.sessionInfo.classList.add("hidden");
    elements.sessionEmail.textContent = "";
  }
};

const setBanner = (node, message, visible = true) => {
  if (!node) return;
  if (!visible || !message) {
    node.textContent = "";
    node.classList.add("hidden");
    return;
  }
  node.textContent = message;
  node.classList.remove("hidden");
};

const setButtonLoading = (button, isLoading) => {
  if (!button) return;
  const spinner = button.querySelector(".spinner");
  button.disabled = isLoading;
  if (spinner) spinner.classList.toggle("hidden", !isLoading);
};

const handleSessionExpired = async () => {
  await clearSession();
  state.lastAnalysis = null;
  showHeaderForSession(null);
  showView("login");
  setBanner(
    elements.loginError,
    "Tu sesion ha expirado. Vuelve a iniciar sesion."
  );
};

// ----- Bootstrap -------------------------------------------------------------

const bootstrap = async () => {
  try {
    const session = await loadSession();
    if (session) {
      showHeaderForSession(session);
      showView("analyze");
      updateAnalyzeButtonState();
    } else {
      showHeaderForSession(null);
      showView("login");
    }
  } catch (error) {
    console.error("[FakeNews] Error inicializando el popup:", error);
    showHeaderForSession(null);
    showView("login");
    setBanner(elements.loginError, "No se pudo cargar la sesion guardada.");
  }
};

// ----- Login -----------------------------------------------------------------

elements.loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  setBanner(elements.loginError, "", false);

  const email = elements.loginEmail.value.trim();
  const password = elements.loginPassword.value;

  if (!email || !password) {
    setBanner(elements.loginError, "Introduce email y contrasena.");
    return;
  }

  setButtonLoading(elements.loginSubmit, true);
  try {
    const session = await signIn({ email, password });
    elements.loginPassword.value = "";
    showHeaderForSession(session);
    showView("analyze");
    updateAnalyzeButtonState();
  } catch (error) {
    setBanner(elements.loginError, error.message || "Error al iniciar sesion.");
  } finally {
    setButtonLoading(elements.loginSubmit, false);
  }
});

elements.openRegister.addEventListener("click", (event) => {
  event.preventDefault();
  if (CONFIG.WEB_REGISTER_URL) {
    chrome.tabs.create({ url: CONFIG.WEB_REGISTER_URL });
  }
});

elements.logoutButton.addEventListener("click", async () => {
  await signOut();
  state.lastAnalysis = null;
  showHeaderForSession(null);
  showView("login");
  setBanner(elements.loginError, "", false);
});

// ----- Analyze ---------------------------------------------------------------

const updateAnalyzeButtonState = () => {
  const length = elements.analyzeTextarea.value.trim().length;
  elements.charCounter.textContent = `${length} caracter${length === 1 ? "" : "es"}`;
  elements.analyzeButton.disabled = length < MIN_TEXT_LENGTH;
};

elements.analyzeTextarea.addEventListener("input", updateAnalyzeButtonState);

elements.useSelectionButton.addEventListener("click", async () => {
  setBanner(elements.analyzeError, "", false);
  try {
    const [tab] = await chrome.tabs.query({
      active: true,
      currentWindow: true,
    });
    if (!tab?.id) {
      setBanner(elements.analyzeError, "No se encontro la pestana activa.");
      return;
    }

    const results = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => window.getSelection()?.toString() || "",
    });

    const selection = (results?.[0]?.result || "").trim();
    if (!selection) {
      setBanner(
        elements.analyzeError,
        "No hay texto seleccionado en la pagina actual."
      );
      return;
    }

    elements.analyzeTextarea.value = selection;
    updateAnalyzeButtonState();
  } catch (error) {
    setBanner(
      elements.analyzeError,
      "No se pudo leer la seleccion (la pagina puede bloquear el acceso)."
    );
    console.error("[FakeNews] executeScript fallo:", error);
  }
});

elements.analyzeButton.addEventListener("click", async () => {
  setBanner(elements.analyzeError, "", false);
  const text = elements.analyzeTextarea.value.trim();
  if (text.length < MIN_TEXT_LENGTH) {
    setBanner(
      elements.analyzeError,
      `El texto debe tener al menos ${MIN_TEXT_LENGTH} caracteres.`
    );
    return;
  }

  setButtonLoading(elements.analyzeButton, true);
  try {
    const result = await analyzeText(text);
    state.lastAnalysis = result;
    renderResult(result);
    showView("result");
  } catch (error) {
    if (error instanceof SessionExpiredError) {
      await handleSessionExpired();
      return;
    }
    setBanner(
      elements.analyzeError,
      error.message || "No se pudo analizar el texto."
    );
  } finally {
    setButtonLoading(elements.analyzeButton, false);
  }
});

// ----- Result ----------------------------------------------------------------

const renderResult = (result) => {
  setBanner(elements.resultError, "", false);
  setBanner(elements.resultSuccess, "", false);

  const verdict = (result?.veredicto || "").toUpperCase();
  let tone = "unknown";
  let label = verdict || "—";
  if (verdict === "REAL") {
    tone = "real";
    label = "REAL";
  } else if (verdict === "FAKE") {
    tone = "fake";
    label = "FALSO";
  }

  elements.verdictLabel.dataset.tone = tone;
  elements.verdictLabel.textContent = label;

  const strength = Number(result?.certeza_svm);
  if (Number.isFinite(strength)) {
    const formatted = strength.toFixed(3);
    elements.verdictStrengthValue.textContent = formatted;
    // certeza_svm puede ser cualquier real (signo => clase). Mostramos magnitud.
    const magnitude = Math.min(1, Math.abs(strength));
    elements.strengthBarFill.style.width = `${(magnitude * 100).toFixed(1)}%`;
  } else {
    elements.verdictStrengthValue.textContent = "—";
    elements.strengthBarFill.style.width = "0%";
  }

  const plan = result?.plan_usuario || "free";
  const remaining = result?.analisis_restantes_hoy;
  const limit = result?.limite_diario;
  if (limit && remaining !== undefined && remaining !== null) {
    elements.quotaInfo.textContent =
      `Plan ${plan.toUpperCase()} · Quedan ${remaining}/${limit} analisis hoy.`;
  } else {
    elements.quotaInfo.textContent = `Plan ${plan.toUpperCase()} · Sin limite diario.`;
  }

  // Estado del boton de guardar segun el backend
  const alreadySaved = Boolean(result?.guardado_en_historial);
  elements.saveButton.disabled = alreadySaved || !result?.analysis_run_id;
  elements.saveButton.querySelector(".button-label").textContent = alreadySaved
    ? "Guardado"
    : "Guardar en historial";
};

elements.saveButton.addEventListener("click", async () => {
  const runId = state.lastAnalysis?.analysis_run_id;
  if (!runId) return;

  setBanner(elements.resultError, "", false);
  setBanner(elements.resultSuccess, "", false);
  setButtonLoading(elements.saveButton, true);

  try {
    const response = await saveAnalysis(runId);
    if (response?.already_saved) {
      setBanner(elements.resultSuccess, "Este analisis ya estaba en tu historial.");
    } else {
      setBanner(elements.resultSuccess, "Analisis guardado en tu historial.");
    }
    elements.saveButton.querySelector(".button-label").textContent = "Guardado";
    elements.saveButton.disabled = true;
  } catch (error) {
    if (error instanceof SessionExpiredError) {
      await handleSessionExpired();
      return;
    }
    setBanner(
      elements.resultError,
      error.message || "No se pudo guardar el analisis."
    );
  } finally {
    setButtonLoading(elements.saveButton, false);
  }
});

elements.newAnalysisButton.addEventListener("click", () => {
  state.lastAnalysis = null;
  elements.analyzeTextarea.value = "";
  setBanner(elements.analyzeError, "", false);
  updateAnalyzeButtonState();
  showView("analyze");
});

// ----- Inicio ----------------------------------------------------------------

bootstrap();
