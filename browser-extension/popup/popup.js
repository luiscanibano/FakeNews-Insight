/**
 * @file popup.js
 * @description Controlador principal del popup. Hace de router entre las
 * vistas (login / analyze / result), invoca a Supabase Auth y al backend
 * FastAPI, y maneja errores de sesion expirada de forma uniforme.
 */

import { CONFIG } from "../lib/config.js";
import { verifyText } from "../lib/api.js";
import { loadSession, clearSession } from "../lib/storage.js";
import { SessionExpiredError, signIn, signOut } from "../lib/supabase.js";

const MIN_TEXT_LENGTH = 80;
const MAX_TEXT_LENGTH = 12000;

const elements = {
  // Header
  sessionInfo: document.getElementById("session-info"),
  sessionEmail: document.getElementById("session-email"),
  logoutButton: document.getElementById("logout-button"),

  // Vistas
  views: {
    login: document.getElementById("view-login"),
    analyze: document.getElementById("view-analyze"),
    verify: document.getElementById("view-verify"),
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

  // Verify view
  verifyOverallLabel: document.getElementById("verify-overall-label"),
  verifySummary: document.getElementById("verify-summary"),
  verifyQuotaInfo: document.getElementById("verify-quota-info"),
  verifyError: document.getElementById("verify-error"),
  verifyClaimsList: document.getElementById("verify-claims-list"),
  verifyBackButton: document.getElementById("verify-back-button"),
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
    "Tu sesión ha expirado. Vuelve a iniciar sesión."
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
    console.error("[FEVER] Error inicializando el popup:", error);
    showHeaderForSession(null);
    showView("login");
    setBanner(elements.loginError, "No se pudo cargar la sesión guardada.");
  }
};

// ----- Login -----------------------------------------------------------------

elements.loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  setBanner(elements.loginError, "", false);

  const email = elements.loginEmail.value.trim();
  const password = elements.loginPassword.value;

  if (!email || !password) {
    setBanner(elements.loginError, "Introduce email y contraseña.");
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
    setBanner(elements.loginError, error.message || "Error al iniciar sesión.");
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
  elements.charCounter.textContent = `${length}/${MAX_TEXT_LENGTH.toLocaleString("es-ES")} caracteres`;
  elements.charCounter.dataset.warning = length > MAX_TEXT_LENGTH * 0.9 ? "true" : "false";
  elements.analyzeButton.disabled = length < MIN_TEXT_LENGTH || length > MAX_TEXT_LENGTH;
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
      setBanner(elements.analyzeError, "No se encontró la pestaña activa.");
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
        "No hay texto seleccionado en la página actual."
      );
      return;
    }

    elements.analyzeTextarea.value = selection.slice(0, MAX_TEXT_LENGTH);
    if (selection.length > MAX_TEXT_LENGTH) {
      setBanner(
        elements.analyzeError,
        `La selección superaba ${MAX_TEXT_LENGTH.toLocaleString("es-ES")} caracteres y se ha recortado.`
      );
    }
    updateAnalyzeButtonState();
  } catch (error) {
    setBanner(
      elements.analyzeError,
      "No se pudo leer la selección (la página puede bloquear el acceso)."
    );
    console.error("[FEVER] executeScript fallo:", error);
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

  if (text.length > MAX_TEXT_LENGTH) {
    setBanner(
      elements.analyzeError,
      `El texto no puede superar ${MAX_TEXT_LENGTH.toLocaleString("es-ES")} caracteres.`
    );
    return;
  }

  setButtonLoading(elements.analyzeButton, true);
  try {
    const report = await verifyText(text);
    state.lastAnalysis = report;
    renderVerifyReport(report);
    showView("verify");
  } catch (error) {
    if (error instanceof SessionExpiredError) {
      await handleSessionExpired();
      return;
    }
    setBanner(
      elements.analyzeError,
      error.message || "No se pudo verificar el texto."
    );
  } finally {
    setButtonLoading(elements.analyzeButton, false);
  }
});

// ----- Verify (contraste con evidencias por plan) ---------------------------

const VERIFY_LABEL_TEXT = {
  SUPPORTED: "VERIFICADO",
  REFUTED: "DESMENTIDO",
  CONFLICTING: "EVIDENCIAS CONTRADICTORIAS",
  NOT_ENOUGH_INFO: "EVIDENCIA INSUFICIENTE",
};

const VERIFY_LABEL_TONE = {
  SUPPORTED: "real",
  REFUTED: "fake",
  CONFLICTING: "unknown",
  NOT_ENOUGH_INFO: "unknown",
};

const renderVerifyReport = (report) => {
  setBanner(elements.verifyError, "", false);

  const overall = (report?.overall_label || "").toUpperCase();
  elements.verifyOverallLabel.dataset.tone = VERIFY_LABEL_TONE[overall] || "unknown";
  elements.verifyOverallLabel.textContent = VERIFY_LABEL_TEXT[overall] || overall || "—";
  elements.verifySummary.textContent = report?.summary || "";

  const plan = report?.plan || "";
  const remaining = report?.remaining_today;
  if (remaining !== undefined && remaining !== null) {
    elements.verifyQuotaInfo.textContent =
      `Plan ${plan.toUpperCase()} · Quedan ${remaining} verificaciones hoy.`;
  } else {
    elements.verifyQuotaInfo.textContent = plan
      ? `Plan ${plan.toUpperCase()} · Sin límite diario.`
      : "";
  }

  // Render claims (sin innerHTML para evitar XSS).
  elements.verifyClaimsList.replaceChildren();
  const claims = Array.isArray(report?.claims) ? report.claims : [];
  claims.forEach((claim) => {
    const li = document.createElement("li");
    li.className = "claim-item";

    const text = document.createElement("p");
    text.className = "claim-text";
    text.textContent = claim?.text || "";
    li.appendChild(text);

    const meta = document.createElement("p");
    meta.className = "claim-meta";
    const label = (claim?.label || "").toUpperCase();
    const conf = Number.isFinite(claim?.confidence)
      ? ` · ${(claim.confidence * 100).toFixed(0)}%`
      : "";
    meta.textContent = `${VERIFY_LABEL_TEXT[label] || label}${conf}`;
    meta.dataset.tone = VERIFY_LABEL_TONE[label] || "unknown";
    li.appendChild(meta);

    if (claim?.rationale) {
      const rationale = document.createElement("p");
      rationale.className = "claim-rationale";
      rationale.textContent = claim.rationale;
      li.appendChild(rationale);
    }

    const evidences = Array.isArray(claim?.evidences) ? claim.evidences : [];
    if (evidences.length > 0) {
      const ul = document.createElement("ul");
      ul.className = "evidence-list";
      evidences.forEach((ev) => {
        const evLi = document.createElement("li");
        const a = document.createElement("a");
        a.href = ev?.url || "#";
        a.textContent = ev?.title || ev?.url || "fuente";
        a.target = "_blank";
        a.rel = "noopener noreferrer";
        evLi.appendChild(a);
        ul.appendChild(evLi);
      });
      li.appendChild(ul);
    }

    elements.verifyClaimsList.appendChild(li);
  });
};

if (elements.verifyBackButton) {
  elements.verifyBackButton.addEventListener("click", () => {
    showView("analyze");
  });
}

// ----- Inicio ----------------------------------------------------------------

bootstrap();
