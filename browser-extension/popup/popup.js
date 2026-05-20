/**
 * @file popup.js
 * @description Popup principal de la extensión con login, selector de idioma,
 * progreso porcentual y render FEVER alineado visualmente con la web.
 */

import { CONFIG } from "../lib/config.js";
import {
  buildVerificationHistorySavePayload,
  saveVerificationHistoryPayload,
  verifyText,
} from "../lib/api.js";
import {
  getLanguageOptions,
  getStoredLanguage,
  setStoredLanguage,
  t,
} from "../lib/i18n.js";
import { signInWithGoogle } from "../lib/google-auth.js";
import { clearSession, loadSession } from "../lib/storage.js";
import { SessionExpiredError, signIn, signOut } from "../lib/supabase.js";

const MIN_TEXT_LENGTH = 80;
const MAX_TEXT_LENGTH = 12000;
const ANALYSIS_PROGRESS_INITIAL = 9;
const ANALYSIS_PROGRESS_MAX = 92;

const VERIFY_TONE_MAP = {
  SUPPORTED: "real",
  REFUTED: "fake",
  CONFLICTING: "unknown",
  NOT_ENOUGH_INFO: "unknown",
};

const elements = {
  html: document.documentElement,

  brandLead: document.getElementById("brand-lead"),
  brandTail: document.getElementById("brand-tail"),

  sessionInfo: document.getElementById("session-info"),
  sessionEmail: document.getElementById("session-email"),
  logoutButton: document.getElementById("logout-button"),

  languageButton: document.getElementById("language-button"),
  languageMenu: document.getElementById("language-menu"),
  languageCurrentCode: document.getElementById("language-current-code"),
  languageSwitcher: document.getElementById("language-switcher"),

  views: {
    login: document.getElementById("view-login"),
    analyze: document.getElementById("view-analyze"),
    verify: document.getElementById("view-verify"),
  },

  loginTitle: document.getElementById("login-title"),
  loginSubtitle: document.getElementById("login-subtitle"),
  loginEmailLabel: document.getElementById("login-email-label"),
  loginPasswordLabel: document.getElementById("login-password-label"),
  loginDividerLabel: document.getElementById("login-divider-label"),
  loginGoogleLabel: document.getElementById("login-google-label"),
  loginFooterPrefix: document.getElementById("login-footer-prefix"),
  loginSubmitLabel: document.getElementById("login-submit-label"),
  loginForm: document.getElementById("login-form"),
  loginEmail: document.getElementById("login-email"),
  loginPassword: document.getElementById("login-password"),
  loginError: document.getElementById("login-error"),
  loginSubmit: document.getElementById("login-submit"),
  loginGoogleButton: document.getElementById("login-google-button"),
  openRegister: document.getElementById("open-register"),

  analyzeTitle: document.getElementById("analyze-title"),
  analyzeSubtitle: document.getElementById("analyze-subtitle"),
  useSelectionLabel: document.getElementById("use-selection-label"),
  analyzeFieldLabel: document.getElementById("analyze-field-label"),
  analyzeButtonLabel: document.getElementById("analyze-button-label"),
  useSelectionButton: document.getElementById("use-selection-button"),
  analyzeTextarea: document.getElementById("analyze-textarea"),
  charCounter: document.getElementById("char-counter"),
  analyzeError: document.getElementById("analyze-error"),
  analyzeButton: document.getElementById("analyze-button"),
  analysisProgressShell: document.getElementById("analysis-progress-shell"),
  analysisProgressTitle: document.getElementById("analysis-progress-title"),
  analysisProgressTrack: document.getElementById("analysis-progress-track"),
  analysisProgressBar: document.getElementById("analysis-progress-bar"),
  analysisProgressLabel: document.getElementById("analysis-progress-label"),
  analysisProgressStage: document.getElementById("analysis-progress-stage"),

  verifyTitle: document.getElementById("verify-title"),
  verifyOverallChip: document.getElementById("verify-overall-chip"),
  verifyOverallLabel: document.getElementById("verify-overall-label"),
  verifySummary: document.getElementById("verify-summary"),
  verifyError: document.getElementById("verify-error"),
  verifyClaimsTitle: document.getElementById("verify-claims-title"),
  verifyClaimsIntro: document.getElementById("verify-claims-intro"),
  verifyClaimsList: document.getElementById("verify-claims-list"),
  verifyBackButton: document.getElementById("verify-back-button"),
  verifyBackLabel: document.getElementById("verify-back-label"),
  verifySaveButton: document.getElementById("verify-save-button"),
  verifySaveError: document.getElementById("verify-save-error"),
  verifyPlanLabel: document.getElementById("verify-plan-label"),
  verifyPlanValue: document.getElementById("verify-plan-value"),
  verifyRemainingLabel: document.getElementById("verify-remaining-label"),
  verifyRemainingValue: document.getElementById("verify-remaining-value"),
  verifyClaimsCountLabel: document.getElementById("verify-claims-count-label"),
  verifyClaimsCountValue: document.getElementById("verify-claims-count-value"),
};

const state = {
  lastAnalysis: null,
  lastAnalysisSavePayload: null,
  lastInputText: "",
  currentLanguage: "es",
  analysisProgress: 0,
  progressTimer: null,
  saveLoading: false,
};

const syncLastAnalysisSavePayload = (report = state.lastAnalysis, inputText = state.lastInputText) => {
  state.lastAnalysisSavePayload = buildVerificationHistorySavePayload({
    runId: report?.run_id || null,
    report,
    inputText,
  });
};

const localeForLanguage = () =>
  state.currentLanguage === "en" ? "en-US" : "es-ES";

const formatNumber = (value) => Number(value || 0).toLocaleString(localeForLanguage());

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
    elements.sessionEmail.title = "";
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
  button.dataset.loading = isLoading ? "true" : "false";
  if (spinner) {
    spinner.classList.toggle("hidden", !isLoading);
  }
};

const closeLanguageMenu = () => {
  elements.languageMenu.classList.add("hidden");
  elements.languageButton.setAttribute("aria-expanded", "false");
};

const openLanguageMenu = () => {
  elements.languageMenu.classList.remove("hidden");
  elements.languageButton.setAttribute("aria-expanded", "true");
};

const toggleLanguageMenu = () => {
  if (elements.languageMenu.classList.contains("hidden")) {
    openLanguageMenu();
  } else {
    closeLanguageMenu();
  }
};

const getProgressStageText = (progress) => {
  if (progress < 35) {
    return t("analyze.loadingStagePreparing", {}, state.currentLanguage);
  }
  if (progress < 70) {
    return t("analyze.loadingStageSearching", {}, state.currentLanguage);
  }
  return t("analyze.loadingStageFinal", {}, state.currentLanguage);
};

const updateAnalysisProgressUI = (progress) => {
  state.analysisProgress = progress;
  elements.analysisProgressShell.classList.remove("hidden");
  elements.analysisProgressTrack.setAttribute("aria-valuenow", String(progress));
  elements.analysisProgressBar.style.width = `${progress}%`;
  elements.analysisProgressLabel.textContent = t(
    "analyze.progress",
    { progress },
    state.currentLanguage
  );
  elements.analysisProgressStage.textContent = getProgressStageText(progress);
};

const clearAnalysisProgress = () => {
  if (state.progressTimer) {
    window.clearInterval(state.progressTimer);
    state.progressTimer = null;
  }
};

const hideAnalysisProgress = () => {
  clearAnalysisProgress();
  elements.analysisProgressShell.classList.add("hidden");
  elements.analysisProgressBar.style.width = "0%";
  elements.analysisProgressTrack.setAttribute("aria-valuenow", "0");
  state.analysisProgress = 0;
};

const startAnalysisProgress = () => {
  clearAnalysisProgress();
  updateAnalysisProgressUI(ANALYSIS_PROGRESS_INITIAL);

  state.progressTimer = window.setInterval(() => {
    const next = Math.min(
      ANALYSIS_PROGRESS_MAX,
      state.analysisProgress + Math.max(3, Math.round((100 - state.analysisProgress) / 11))
    );
    updateAnalysisProgressUI(next);

    if (next >= ANALYSIS_PROGRESS_MAX) {
      clearAnalysisProgress();
    }
  }, 140);
};

const completeAnalysisProgress = () => {
  clearAnalysisProgress();
  updateAnalysisProgressUI(100);
  window.setTimeout(() => {
    hideAnalysisProgress();
  }, 180);
};

const updateAnalyzeButtonState = () => {
  const length = elements.analyzeTextarea.value.trim().length;
  elements.charCounter.textContent = t(
    "analyze.counter",
    { count: formatNumber(length), max: formatNumber(MAX_TEXT_LENGTH) },
    state.currentLanguage
  );
  elements.charCounter.dataset.warning = length > MAX_TEXT_LENGTH * 0.9 ? "true" : "false";
  elements.analyzeButton.disabled = length < MIN_TEXT_LENGTH || length > MAX_TEXT_LENGTH;
};

const renderLanguageMenu = () => {
  const options = getLanguageOptions(state.currentLanguage);
  elements.languageCurrentCode.textContent = state.currentLanguage.toUpperCase();
  elements.languageButton.title = t("app.languageLabel", {}, state.currentLanguage);
  elements.languageMenu.replaceChildren();

  options.forEach((option) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `language-option${option.active ? " is-active" : ""}`;
    button.dataset.language = option.code;
    button.setAttribute("role", "option");
    button.setAttribute("aria-selected", option.active ? "true" : "false");
    button.innerHTML = `
      <span class="language-option-code">${option.shortLabel}</span>
      <span class="language-option-label">${option.label}</span>
    `;
    button.addEventListener("click", async () => {
      state.currentLanguage = await setStoredLanguage(option.code);
      applyTranslations();
      closeLanguageMenu();
    });
    elements.languageMenu.appendChild(button);
  });
};

const updateVerifySaveButtonState = () => {
  const saved = Boolean(state.lastAnalysis?.saved_to_history);
  const canSave = Boolean(state.lastAnalysis) && !saved && !state.saveLoading;
  elements.verifySaveButton.disabled = !canSave;
  elements.verifySaveButton.textContent = saved
    ? t("verify.savedHistory", {}, state.currentLanguage)
    : state.saveLoading
    ? t("verify.savingHistory", {}, state.currentLanguage)
    : t("verify.saveHistory", {}, state.currentLanguage);
};

const renderClaim = (claim, index) => {
  const item = document.createElement("li");
  item.className = "claim-item";

  const head = document.createElement("div");
  head.className = "claim-head";

  const claimIndex = document.createElement("span");
  claimIndex.className = "claim-index";
  claimIndex.textContent = `#${index + 1}`;

  const text = document.createElement("p");
  text.className = "claim-text";
  text.textContent = claim?.text || "";

  const label = String(claim?.label || "").toUpperCase();
  const badge = document.createElement("span");
  badge.className = "claim-badge";
  badge.dataset.tone = VERIFY_TONE_MAP[label] || "unknown";
  badge.textContent = t(`verdict.${label}`, {}, state.currentLanguage);

  const confidence = document.createElement("span");
  confidence.className = "claim-confidence";
  confidence.title = t("verify.confidence", {}, state.currentLanguage);
  confidence.textContent = `${Math.round((claim?.confidence ?? 0) * 100)}%`;

  head.append(claimIndex, text, badge, confidence);
  item.appendChild(head);

  if (claim?.rationale) {
    const rationale = document.createElement("p");
    rationale.className = "claim-rationale";
    rationale.textContent = claim.rationale;
    item.appendChild(rationale);
  }

  const evidences = Array.isArray(claim?.evidences) ? claim.evidences : [];
  if (evidences.length > 0) {
    const evidenceCard = document.createElement("div");
    evidenceCard.className = "evidence-card";

    const evidenceLabel = document.createElement("p");
    evidenceLabel.className = "evidence-label";
    evidenceLabel.textContent = t("verify.evidences", {}, state.currentLanguage);
    evidenceCard.appendChild(evidenceLabel);

    const list = document.createElement("ol");
    list.className = "evidence-inline-list";

    evidences.forEach((evidence, evidenceIndex) => {
      const listItem = document.createElement("li");
      listItem.className = "evidence-inline-item";

      const link = document.createElement("a");
      link.href = evidence?.url || "#";
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      link.className = "evidence-link";
      link.textContent = `[${evidenceIndex + 1}] ${evidence?.title || evidence?.url || "Fuente"}`;
      listItem.appendChild(link);

      if (evidenceIndex < evidences.length - 1) {
        const comma = document.createElement("span");
        comma.className = "evidence-comma";
        comma.textContent = ",";
        listItem.appendChild(comma);
      }

      list.appendChild(listItem);
    });

    evidenceCard.appendChild(list);
    item.appendChild(evidenceCard);
  } else {
    const noEvidence = document.createElement("p");
    noEvidence.className = "claim-empty";
    noEvidence.textContent = t("verify.noEvidence", {}, state.currentLanguage);
    item.appendChild(noEvidence);
  }

  return item;
};

const renderVerifyReport = (report) => {
  setBanner(elements.verifyError, "", false);

  const overall = String(report?.overall_label || "").toUpperCase();
  const claims = Array.isArray(report?.claims) ? report.claims : [];
  const plan = String(report?.plan || "").toUpperCase();
  const remaining = report?.remaining_today;
  const limit = report?.daily_limit;

  elements.verifyOverallLabel.dataset.tone = VERIFY_TONE_MAP[overall] || "unknown";
  elements.verifyOverallLabel.textContent = t(`verdict.${overall}`, {}, state.currentLanguage);
  elements.verifySummary.textContent = report?.summary || t("verify.summaryFallback", {}, state.currentLanguage);

  elements.verifyPlanValue.textContent = plan || "—";
  elements.verifyRemainingValue.textContent =
    remaining !== undefined && remaining !== null
      ? `${remaining}${limit ? ` / ${limit}` : ""}`
      : "—";
  elements.verifyClaimsCountValue.textContent = String(claims.length);

  updateVerifySaveButtonState();
  setBanner(elements.verifySaveError, state.lastAnalysis?.saveError || "", Boolean(state.lastAnalysis?.saveError));

  elements.verifyClaimsList.replaceChildren();
  if (!claims.length) {
    const empty = document.createElement("p");
    empty.className = "claim-empty claim-empty-standalone";
    empty.textContent = t("verify.noClaims", {}, state.currentLanguage);
    elements.verifyClaimsList.appendChild(empty);
    return;
  }

  claims.forEach((claim, index) => {
    elements.verifyClaimsList.appendChild(renderClaim(claim, index));
  });
};

const applyTranslations = () => {
  elements.html.lang = state.currentLanguage;

  elements.brandLead.textContent = t("app.lead", {}, state.currentLanguage);
  elements.brandTail.textContent = t("app.tail", {}, state.currentLanguage);
  elements.logoutButton.textContent = t("auth.logout", {}, state.currentLanguage);

  elements.loginTitle.textContent = t("auth.title", {}, state.currentLanguage);
  elements.loginSubtitle.textContent = t("auth.subtitle", {}, state.currentLanguage);
  elements.loginEmailLabel.textContent = t("auth.email", {}, state.currentLanguage);
  elements.loginPasswordLabel.textContent = t("auth.password", {}, state.currentLanguage);
  elements.loginDividerLabel.textContent = t("auth.divider", {}, state.currentLanguage);
  elements.loginGoogleLabel.textContent = t("auth.google", {}, state.currentLanguage);
  elements.loginFooterPrefix.textContent = t("auth.footer", {}, state.currentLanguage);
  elements.loginSubmitLabel.textContent = t("auth.submit", {}, state.currentLanguage);
  elements.loginEmail.placeholder = t("auth.emailPlaceholder", {}, state.currentLanguage);
  elements.loginPassword.placeholder = t("auth.passwordPlaceholder", {}, state.currentLanguage);
  elements.openRegister.textContent = t("auth.register", {}, state.currentLanguage);

  elements.analyzeTitle.textContent = t("analyze.title", {}, state.currentLanguage);
  elements.analyzeSubtitle.textContent = t("analyze.subtitle", {}, state.currentLanguage);
  elements.useSelectionLabel.textContent = t("analyze.useSelection", {}, state.currentLanguage);
  elements.analyzeFieldLabel.textContent = t("analyze.fieldLabel", {}, state.currentLanguage);
  elements.analyzeButtonLabel.textContent = t("analyze.verify", {}, state.currentLanguage);
  elements.analyzeTextarea.placeholder = t("analyze.placeholder", {}, state.currentLanguage);
  elements.analysisProgressTitle.textContent = t("analyze.loadingTitle", {}, state.currentLanguage);
  if (state.analysisProgress > 0) {
    updateAnalysisProgressUI(state.analysisProgress);
  }

  elements.verifyTitle.textContent = t("verify.title", {}, state.currentLanguage);
  elements.verifyOverallChip.textContent = t("verify.overall", {}, state.currentLanguage);
  elements.verifyClaimsTitle.textContent = t("verify.claimsTitle", {}, state.currentLanguage);
  elements.verifyClaimsIntro.textContent = t("verify.claimsIntro", {}, state.currentLanguage);
  elements.verifyBackLabel.textContent = t("verify.back", {}, state.currentLanguage);
  elements.verifyPlanLabel.textContent = t("verify.plan", {}, state.currentLanguage);
  elements.verifyRemainingLabel.textContent = t("verify.remaining", {}, state.currentLanguage);
  elements.verifyClaimsCountLabel.textContent = t("verify.claimsCount", {}, state.currentLanguage);
  updateAnalyzeButtonState();
  renderLanguageMenu();

  if (state.lastAnalysis) {
    renderVerifyReport(state.lastAnalysis);
  }
};

const handleSessionExpired = async () => {
  await clearSession();
  state.lastAnalysis = null;
  state.lastAnalysisSavePayload = null;
  state.lastInputText = "";
  state.saveLoading = false;
  showHeaderForSession(null);
  showView("login");
  setBanner(elements.loginError, t("auth.expired", {}, state.currentLanguage));
};

const bootstrap = async () => {
  try {
    const [session, language] = await Promise.all([loadSession(), getStoredLanguage()]);
    state.currentLanguage = language;
    applyTranslations();

    if (session) {
      showHeaderForSession(session);
      showView("analyze");
    } else {
      showHeaderForSession(null);
      showView("login");
    }
  } catch (error) {
    console.error("[FEVER] Error inicializando el popup:", error);
    showHeaderForSession(null);
    showView("login");
    setBanner(elements.loginError, t("errors.sessionLoad", {}, state.currentLanguage));
  }
};

elements.languageButton.addEventListener("click", () => {
  toggleLanguageMenu();
});

window.addEventListener("mousedown", (event) => {
  if (!elements.languageSwitcher.contains(event.target)) {
    closeLanguageMenu();
  }
});

window.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    closeLanguageMenu();
  }
});

elements.loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  setBanner(elements.loginError, "", false);

  const email = elements.loginEmail.value.trim();
  const password = elements.loginPassword.value;

  if (!email || !password) {
    setBanner(elements.loginError, t("auth.missingCredentials", {}, state.currentLanguage));
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
    setBanner(elements.loginError, error.message || t("errors.invalidSession", {}, state.currentLanguage));
  } finally {
    setButtonLoading(elements.loginSubmit, false);
  }
});

elements.loginGoogleButton.addEventListener("click", async () => {
  setBanner(elements.loginError, "", false);
  setButtonLoading(elements.loginGoogleButton, true);

  try {
    const session = await signInWithGoogle();
    showHeaderForSession(session);
    showView("analyze");
    updateAnalyzeButtonState();
  } catch (error) {
    setBanner(elements.loginError, error.message || t("errors.invalidSession", {}, state.currentLanguage));
  } finally {
    setButtonLoading(elements.loginGoogleButton, false);
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
  state.lastAnalysisSavePayload = null;
  state.lastInputText = "";
  state.saveLoading = false;
  showHeaderForSession(null);
  showView("login");
  setBanner(elements.loginError, "", false);
});

elements.analyzeTextarea.addEventListener("input", updateAnalyzeButtonState);

elements.useSelectionButton.addEventListener("click", async () => {
  setBanner(elements.analyzeError, "", false);
  try {
    const [tab] = await chrome.tabs.query({
      active: true,
      currentWindow: true,
    });
    if (!tab?.id) {
      setBanner(elements.analyzeError, t("analyze.activeTabMissing", {}, state.currentLanguage));
      return;
    }

    const results = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => window.getSelection()?.toString() || "",
    });

    const selection = (results?.[0]?.result || "").trim();
    if (!selection) {
      setBanner(elements.analyzeError, t("analyze.selectionMissing", {}, state.currentLanguage));
      return;
    }

    elements.analyzeTextarea.value = selection.slice(0, MAX_TEXT_LENGTH);
    if (selection.length > MAX_TEXT_LENGTH) {
      setBanner(
        elements.analyzeError,
        t(
          "analyze.truncatedSelection",
          { max: formatNumber(MAX_TEXT_LENGTH) },
          state.currentLanguage
        )
      );
    }
    updateAnalyzeButtonState();
  } catch (error) {
    setBanner(elements.analyzeError, t("analyze.selectionReadError", {}, state.currentLanguage));
    console.error("[FEVER] executeScript fallo:", error);
  }
});

elements.analyzeButton.addEventListener("click", async () => {
  setBanner(elements.analyzeError, "", false);
  const text = elements.analyzeTextarea.value.trim();

  if (text.length < MIN_TEXT_LENGTH) {
    setBanner(
      elements.analyzeError,
      t("analyze.tooShort", { min: MIN_TEXT_LENGTH }, state.currentLanguage)
    );
    return;
  }

  if (text.length > MAX_TEXT_LENGTH) {
    setBanner(
      elements.analyzeError,
      t("analyze.tooLong", { max: formatNumber(MAX_TEXT_LENGTH) }, state.currentLanguage)
    );
    return;
  }

  setButtonLoading(elements.analyzeButton, true);
  startAnalysisProgress();

  try {
    const report = await verifyText(text);
    state.lastAnalysis = { ...report, saveError: "" };
    state.lastInputText = text;
    syncLastAnalysisSavePayload(state.lastAnalysis, text);
    state.saveLoading = false;
    completeAnalysisProgress();
    renderVerifyReport(state.lastAnalysis);
    showView("verify");
  } catch (error) {
    hideAnalysisProgress();
    if (error instanceof SessionExpiredError) {
      await handleSessionExpired();
      return;
    }
    setBanner(elements.analyzeError, error.message || t("errors.genericVerify", {}, state.currentLanguage));
  } finally {
    setButtonLoading(elements.analyzeButton, false);
  }
});

elements.verifySaveButton.addEventListener("click", async () => {
  if (!state.lastAnalysis || state.saveLoading || state.lastAnalysis.saved_to_history) {
    return;
  }

  state.saveLoading = true;
  state.lastAnalysis.saveError = "";
  updateVerifySaveButtonState();
  setBanner(elements.verifySaveError, "", false);

  try {
    const savePayload =
      state.lastAnalysisSavePayload ||
      buildVerificationHistorySavePayload({
        runId: state.lastAnalysis?.run_id || null,
        report: state.lastAnalysis,
        inputText: state.lastInputText,
      });

    const response = await saveVerificationHistoryPayload(savePayload);

    state.lastAnalysis = {
      ...state.lastAnalysis,
      run_id: response?.run_id || state.lastAnalysis.run_id || null,
      saved_to_history: true,
      saveError: "",
    };
    syncLastAnalysisSavePayload(state.lastAnalysis, state.lastInputText);
    renderVerifyReport(state.lastAnalysis);
  } catch (error) {
    if (error instanceof SessionExpiredError) {
      await handleSessionExpired();
      return;
    }
    state.lastAnalysis = {
      ...state.lastAnalysis,
      saveError: error.message || t("verify.saveHistoryError", {}, state.currentLanguage),
    };
    renderVerifyReport(state.lastAnalysis);
  } finally {
    state.saveLoading = false;
    updateVerifySaveButtonState();
  }
});

elements.verifyBackButton.addEventListener("click", () => {
  showView("analyze");
});

bootstrap();
