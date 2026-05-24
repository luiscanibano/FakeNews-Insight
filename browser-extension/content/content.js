/**
 * @file content.js
 * @description Content script: cuando el usuario selecciona >=80 caracteres
 * en cualquier página HTTP/HTTPS, dibujamos un marco alrededor de la
 * seleccion (con la estetica de la extension) y un panel adjunto con el
 * boton "Verificar". El informe FEVER/NLI se renderiza en el propio panel.
 *
 * Toda la UI vive dentro de un Shadow DOM para no contaminar ni ser
 * contaminada por los estilos de la página anfitriona.
 */

(() => {
  if (window.__fakenewsInsightContentLoaded) return;
  window.__fakenewsInsightContentLoaded = true;

  const MIN_TEXT_LENGTH = 80;
  const MAX_TEXT_LENGTH = 12000;
  const LOADING_PROGRESS_INITIAL = 9;
  const LOADING_PROGRESS_MAX = 92;
  const LOADING_PROGRESS_COMPLETE_DELAY_MS = 180;
  const TASK_POLL_INTERVAL_MS = 1500;
  const QUOTA_CACHE_KEY = "fakenews-insight-quota";

  // ---------------------------------------------------------------------------
  // 0. Cache de cuota: ultimo valor conocido devuelto por el backend.
  // ---------------------------------------------------------------------------
  const loadQuotaCache = () =>
    new Promise((resolve) => {
      try {
        chrome.storage.local.get([QUOTA_CACHE_KEY], (data) => {
          resolve(data?.[QUOTA_CACHE_KEY] || null);
        });
      } catch {
        resolve(null);
      }
    });

  const saveQuotaCache = (quota) => {
    try {
      chrome.storage.local.set({ [QUOTA_CACHE_KEY]: quota });
    } catch {
      /* ignored */
    }
  };

  const renderQuotaChip = (quota) => {
    if (!activeWidget || !quota) return;
    const chip = activeWidget.panel.querySelector(".fn-quota-chip");
    if (!chip) return;
    const plan = String(quota.plan || "free").toUpperCase();
    if (
      quota.limit !== null &&
      quota.limit !== undefined &&
      quota.remaining !== null &&
      quota.remaining !== undefined
    ) {
      chip.innerHTML = `${escapeHtml(
        translate(
          "quota.chipRemaining",
          { plan, remaining: quota.remaining, limit: quota.limit },
          `${plan} · ${quota.remaining}/${quota.limit} today`
        )
      )}`.replace(
        `${quota.remaining}/${quota.limit}`,
        `<strong>${quota.remaining}/${quota.limit}</strong>`
      );
      chip.dataset.low = quota.remaining <= 1 ? "true" : "false";
    } else {
      chip.textContent = translate(
        "quota.chipUnlimited",
        { plan },
        `${plan} · unlimited`
      );
      chip.dataset.low = "false";
    }
    chip.classList.remove("fn-hidden");
  };

  const normalizePlan = (plan) => {
    const normalized = String(plan || "").trim().toLowerCase();
    if (normalized === "free" || normalized === "pro" || normalized === "ultra") {
      return normalized;
    }
    return "";
  };

  const inferPlanFromReport = (report = {}) => {
    const maxClaims = Number(report?.max_claims || 0);
    const maxEvidences = Number(report?.max_evidences || 0);
    const maxChars = Number(report?.max_chars || 0);
    const dailyLimit = Number(report?.daily_limit || 0);

    if (maxClaims >= 8 || maxEvidences >= 5 || maxChars >= 12000) {
      return "ultra";
    }

    if (maxClaims >= 3 || maxEvidences >= 3 || maxChars >= 6000 || dailyLimit >= 50) {
      return "pro";
    }

    if (maxClaims >= 1 || maxEvidences >= 1 || maxChars >= 2000) {
      return "free";
    }

    return "";
  };

  const resolveDisplayedPlan = (report = {}) => {
    const reportedPlan = normalizePlan(report?.plan);
    const inferredPlan = inferPlanFromReport(report);
    const cachedPlan = normalizePlan(activeWidget?.cachedQuota?.plan);

    if (!reportedPlan) {
      return inferredPlan || cachedPlan || "free";
    }

    if (reportedPlan === "free" && (inferredPlan === "pro" || inferredPlan === "ultra")) {
      return inferredPlan;
    }

    if (reportedPlan === "pro" && inferredPlan === "ultra") {
      return inferredPlan;
    }

    return reportedPlan;
  };

  // ---------------------------------------------------------------------------
  // 1. Carga perezosa de los modulos compartidos con el popup.
  // ---------------------------------------------------------------------------
  let libsPromise = null;
  const loadLibs = () => {
    if (libsPromise) return libsPromise;
    libsPromise = (async () => {
      const [config, storage, i18n] = await Promise.all([
        import(chrome.runtime.getURL("lib/config.js")),
        import(chrome.runtime.getURL("lib/storage.js")),
        import(chrome.runtime.getURL("lib/i18n.js")),
      ]);
      return {
        CONFIG: config.CONFIG,
        loadSession: storage.loadSession,
        getStoredLanguage: i18n.getStoredLanguage,
        translate: i18n.t,
      };
    })();
    return libsPromise;
  };

  /**
   * Proxy hacia el service worker: evita CORS al hacer fetch desde el origen
   * de la página anfitriona. Lanza Error con flag sessionExpired si toca.
   */
  const sendToBackground = (type, payload) =>
    new Promise((resolve, reject) => {
      chrome.runtime.sendMessage({ type, ...payload }, (response) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
          return;
        }
        if (!response?.ok) {
          const error = new Error(response?.message || "Error de red.");
          if (response?.sessionExpired) error.sessionExpired = true;
          reject(error);
          return;
        }
        resolve(response.data);
      });
    });

  const serializeVerificationReport = (report) => {
    if (!report || typeof report !== "object") {
      return null;
    }

    const claims = Array.isArray(report.claims)
      ? report.claims.map((claim) => ({
          text: claim?.text || claim?.texto || "",
          label: claim?.label || claim?.veredicto || null,
          confidence:
            claim?.confidence !== undefined && claim?.confidence !== null
              ? claim.confidence
              : claim?.confianza ?? null,
          rationale: claim?.rationale || claim?.razonamiento || "",
          evidences: Array.isArray(claim?.evidences || claim?.evidencias)
            ? (claim.evidences || claim.evidencias).map((evidence) => ({
                title: evidence?.title || evidence?.titulo || "",
                url: evidence?.url || "",
                nli_label: evidence?.nli_label || evidence?.etiqueta_nli || null,
              }))
            : [],
        }))
      : [];

    return {
      run_id: report?.run_id || null,
      overall_label: report?.overall_label || report?.veredicto_global || null,
      summary: report?.summary || report?.resumen || "",
      model_version: report?.model_version || report?.modelo_version || null,
      duration_ms:
        report?.duration_ms !== undefined && report?.duration_ms !== null
          ? report.duration_ms
          : report?.duracion_ms ?? null,
      claims,
    };
  };

  const buildVerificationHistorySavePayload = ({ runId = null, report = null, inputText = "" } = {}) => ({
    run_id: runId || null,
    input_text: inputText || undefined,
    report: serializeVerificationReport(report) || undefined,
  });

  const delay = (ms) =>
    new Promise((resolve) => {
      window.setTimeout(resolve, ms);
    });

  const getTaskStateUi = (status) => {
    const language = currentLanguage === "en" ? "en" : "es";
    const copy = {
      es: {
        pendingLabel: "En cola",
        pendingCopy: "La verificación ya está encolada. Puedes cerrar este panel y seguirla desde la extensión.",
        processingLabel: "Analizando",
        processingCopy: "El backend está verificando afirmaciones y reuniendo evidencias para este texto.",
      },
      en: {
        pendingLabel: "Queued",
        pendingCopy: "This verification is queued already. You can close this panel and keep tracking it in the extension.",
        processingLabel: "Checking",
        processingCopy: "The backend is verifying claims and collecting evidence for this text.",
      },
    }[language];

    if (status === "processing") {
      return {
        label: copy.processingLabel,
        description: copy.processingCopy,
      };
    }

    return {
      label: copy.pendingLabel,
      description: copy.pendingCopy,
    };
  };

  const renderTaskLoadingState = (status = "pending") => {
    if (!activeWidget) return;

    const ui = getTaskStateUi(status);
    const body = activeWidget.panel.querySelector(".fn-panel-body");
    if (!body || body.dataset.state !== "loading") {
      return;
    }

    const badge = body.querySelector(".fn-task-state-badge");
    const copy = body.querySelector(".fn-task-state-copy");
    if (badge) {
      badge.dataset.state = status;
      badge.textContent = ui.label;
    }
    if (copy) {
      copy.textContent = ui.description;
    }
  };

  const mapTaskToReport = (task) => ({
    ...(task?.result || {}),
    run_id: task?.runId || task?.result?.run_id || null,
    plan: task?.plan ?? task?.result?.plan ?? null,
    remaining_today: task?.remainingToday ?? task?.result?.remaining_today ?? null,
    daily_limit: task?.dailyLimit ?? task?.result?.daily_limit ?? null,
    max_claims: task?.maxClaims ?? task?.result?.max_claims ?? null,
    max_evidences: task?.maxEvidences ?? task?.result?.max_evidences ?? null,
    max_chars: task?.maxChars ?? task?.result?.max_chars ?? null,
    saved_to_history: Boolean(task?.savedInHistory),
  });

  const waitForVerificationTask = async (taskId) => {
    const normalizedTaskId = String(taskId || "").trim();
    if (!normalizedTaskId) {
      throw new Error(translate("errors.genericVerify", {}, "The text could not be verified."));
    }

    while (activeWidget && String(activeWidget.taskId || "").trim() === normalizedTaskId) {
      const task = await sendToBackground("fn:task-get", {
        taskId: normalizedTaskId,
        refresh: true,
      });

      if (task?.status === "completed" && task?.result) {
        return mapTaskToReport(task);
      }

      if (task?.status === "failed") {
        throw new Error(
          task?.error ||
            translate("errors.genericVerify", {}, "The text could not be verified.")
        );
      }

      renderTaskLoadingState(task?.status || "pending");

      await delay(TASK_POLL_INTERVAL_MS);
    }

    return null;
  };

  // ---------------------------------------------------------------------------
  // 2. Shadow DOM contenedor unico.
  // ---------------------------------------------------------------------------
  const hostEl = document.createElement("div");
  hostEl.id = "fakenews-insight-host";
  hostEl.style.cssText = [
    "all: initial",
    "position: fixed",
    "top: 0",
    "left: 0",
    "width: 0",
    "height: 0",
    "z-index: 2147483647",
    "pointer-events: none",
  ].join(";");
  document.documentElement.appendChild(hostEl);
  const shadow = hostEl.attachShadow({ mode: "open" });

  const styleLink = document.createElement("link");
  styleLink.rel = "stylesheet";
  styleLink.href = chrome.runtime.getURL("content/content.css");
  shadow.appendChild(styleLink);

  /** Capa donde flotaran marco + panel. */
  const layer = document.createElement("div");
  layer.className = "fn-layer";
  shadow.appendChild(layer);

  // ---------------------------------------------------------------------------
  // 3. Estado del widget activo.
  //    activeWidget = { frame, panel, anchorRange, text, onScroll }
  // ---------------------------------------------------------------------------
  let activeWidget = null;
  let loadingProgressTimer = null;
  let loadingProgressFinalizeTimer = null;
  let currentLanguage = "es";
  let translateMessage = null;

  const getLocale = () => (currentLanguage === "en" ? "en-US" : "es-ES");

  const formatNumber = (value) => Number(value || 0).toLocaleString(getLocale());

  const translate = (key, values = {}, fallback = key) => {
    if (typeof translateMessage === "function") {
      return translateMessage(key, values, currentLanguage);
    }
    return fallback;
  };

  const hydrateRuntimeContext = async () => {
    const libs = await loadLibs();
    translateMessage = libs.translate;
    currentLanguage = await libs.getStoredLanguage();
    return libs;
  };

  hydrateRuntimeContext().catch(() => null);

  const clearLoadingProgressTimer = () => {
    if (loadingProgressTimer) {
      window.clearInterval(loadingProgressTimer);
      loadingProgressTimer = null;
    }

    if (loadingProgressFinalizeTimer) {
      window.clearTimeout(loadingProgressFinalizeTimer);
      loadingProgressFinalizeTimer = null;
    }
  };

  const destroyWidget = () => {
    clearLoadingProgressTimer();
    if (!activeWidget) return;
    activeWidget.frame?.remove();
    activeWidget.panel?.remove();
    if (activeWidget.onScroll) {
      window.removeEventListener("scroll", activeWidget.onScroll, true);
      window.removeEventListener("resize", activeWidget.onScroll);
    }
    activeWidget = null;
  };

  const getPanelState = () =>
    activeWidget?.panel?.querySelector(".fn-panel-body")?.dataset.state || null;

  const getLoadingStage = (progress) => {
    if (progress < 35) {
      return translate(
        "analyze.loadingStagePreparing",
        {},
        "Preparing the selected text for verification..."
      );
    }
    if (progress < 70) {
      return translate(
        "analyze.loadingStageSearching",
        {},
        "Searching relevant evidence across open sources..."
      );
    }
    return translate(
      "analyze.loadingStageFinal",
      {},
      "Cross-checking claims and preparing the verdict..."
    );
  };

  const updateLoadingProgress = (progress) => {
    if (!activeWidget) return;

    const body = activeWidget.panel.querySelector(".fn-panel-body");
    if (!body || body.dataset.state !== "loading") return;

    const progressbar = body.querySelector(".fn-progress");
    const progressFill = body.querySelector(".fn-progress-bar");
    const progressLabel = body.querySelector(".fn-loading-progress");
    const stageLabel = body.querySelector(".fn-loading-stage");

    if (progressbar) {
      progressbar.setAttribute("aria-valuenow", String(progress));
    }

    if (progressFill) {
      progressFill.style.width = `${progress}%`;
    }

    if (progressLabel) {
      progressLabel.textContent = translate(
        "analyze.progress",
        { progress },
        `Processing context · ${progress}%`
      );
    }

    if (stageLabel) {
      stageLabel.textContent = getLoadingStage(progress);
    }
  };

  const startLoadingProgress = () => {
    clearLoadingProgressTimer();

    let progress = LOADING_PROGRESS_INITIAL;
    updateLoadingProgress(progress);

    loadingProgressTimer = window.setInterval(() => {
      progress = Math.min(
        LOADING_PROGRESS_MAX,
        progress + Math.max(3, Math.round((100 - progress) / 11))
      );
      updateLoadingProgress(progress);

      if (progress >= LOADING_PROGRESS_MAX) {
        clearLoadingProgressTimer();
      }
    }, 140);
  };

  const transitionFromLoading = (nextStep, { complete = false } = {}) => {
    if (!activeWidget || typeof nextStep !== "function") {
      return;
    }

    const body = activeWidget.panel.querySelector(".fn-panel-body");
    if (!body || body.dataset.state !== "loading") {
      clearLoadingProgressTimer();
      nextStep();
      return;
    }

    clearLoadingProgressTimer();
    if (!complete) {
      nextStep();
      return;
    }

    updateLoadingProgress(100);
    loadingProgressFinalizeTimer = window.setTimeout(() => {
      loadingProgressFinalizeTimer = null;

      if (!activeWidget) {
        return;
      }

      const currentBody = activeWidget.panel.querySelector(".fn-panel-body");
      if (currentBody !== body || currentBody?.dataset.state !== "loading") {
        return;
      }

      nextStep();
    }, LOADING_PROGRESS_COMPLETE_DELAY_MS);
  };

  // ---------------------------------------------------------------------------
  // 4. Construccion del marco + panel anclados a la selección.
  // ---------------------------------------------------------------------------
  const buildWidget = (text, range) => {
    destroyWidget();

    const frame = document.createElement("div");
    frame.className = "fn-frame";

    const panel = document.createElement("div");
    panel.className = "fn-panel";
    panel.innerHTML = `
      <header class="fn-panel-header">
        <span class="fn-brand-mark" aria-hidden="true">
          <span class="fn-brand-grid"></span>
          <span class="fn-brand-glyph">
            <span class="fn-brand-bar fn-brand-bar-a"></span>
            <span class="fn-brand-bar fn-brand-bar-b"></span>
            <span class="fn-brand-dot"></span>
          </span>
        </span>
        <span class="fn-brand-text">
          <strong class="fn-panel-title">${escapeHtml(translate("app.lead", {}, "FakeNews"))}</strong>
          <span class="fn-panel-subtitle">${escapeHtml(translate("app.tail", {}, "Insight"))}</span>
        </span>
        <span class="fn-quota-chip fn-hidden" title="Verificaciones restantes hoy"></span>
        <button type="button" class="fn-close" title="${escapeHtml(translate("verify.close", {}, "Close"))}" aria-label="${escapeHtml(translate("verify.close", {}, "Close"))}">&times;</button>
      </header>
      <div class="fn-panel-body" data-state="idle">
        <p class="fn-snippet" id="fn-snippet"></p>
        <p class="fn-summary">${escapeHtml(
          translate(
            "analyze.counter",
            { count: formatNumber(text.length), max: formatNumber(MAX_TEXT_LENGTH) },
            `${formatNumber(text.length)}/${formatNumber(MAX_TEXT_LENGTH)}`
          )
        )}</p>
        <button type="button" class="fn-button-primary" id="fn-verify-btn">
          <span>${escapeHtml(translate("analyze.verify", {}, "Verify claims"))}</span>
        </button>
      </div>
    `;

    layer.appendChild(frame);
    layer.appendChild(panel);

    // Pinta de inmediato la cuota cacheada (si existe) en el header.
    loadQuotaCache().then((quota) => {
      if (activeWidget?.panel === panel) {
        activeWidget.cachedQuota = quota;
        renderQuotaChip(quota);
      }
    });

    // Snippet del texto seleccionado (truncado).
    const snippetEl = panel.querySelector("#fn-snippet");
    snippetEl.textContent =
      text.length > 140 ? `"${text.slice(0, 137).trimEnd()}..."` : `"${text}"`;

    panel.querySelector(".fn-close").addEventListener("click", (event) => {
      event.stopPropagation();
      destroyWidget();
    });

    panel
      .querySelector("#fn-verify-btn")
      .addEventListener("click", (event) => {
        event.stopPropagation();
        runVerification(text);
      });

    const reposition = () => {
      if (!activeWidget) return;
      try {
        const rects = Array.from(activeWidget.anchorRange.getClientRects());
        const visibleRects = rects.filter((r) => r.width > 0 && r.height > 0);
        if (visibleRects.length === 0) {
          destroyWidget();
          return;
        }

        const minLeft = Math.min(...visibleRects.map((r) => r.left));
        const minTop = Math.min(...visibleRects.map((r) => r.top));
        const maxRight = Math.max(...visibleRects.map((r) => r.right));
        const maxBottom = Math.max(...visibleRects.map((r) => r.bottom));

        // Padding visual para que el marco no quede pegado al texto.
        const pad = 4;
        frame.style.left = `${minLeft - pad}px`;
        frame.style.top = `${minTop - pad}px`;
        frame.style.width = `${maxRight - minLeft + pad * 2}px`;
        frame.style.height = `${maxBottom - minTop + pad * 2}px`;

        // Panel: por defecto debajo del marco; si no cabe, encima.
        const margin = 8;
        const panelRect = panel.getBoundingClientRect();
        let panelTop = maxBottom + pad + margin;
        if (panelTop + panelRect.height > window.innerHeight - margin) {
          panelTop = minTop - pad - margin - panelRect.height;
        }
        if (panelTop < margin) panelTop = margin;

        let panelLeft = minLeft - pad;
        if (panelLeft + panelRect.width > window.innerWidth - margin) {
          panelLeft = window.innerWidth - panelRect.width - margin;
        }
        if (panelLeft < margin) panelLeft = margin;

        panel.style.top = `${panelTop}px`;
        panel.style.left = `${panelLeft}px`;
      } catch {
        destroyWidget();
      }
    };

    activeWidget = {
      frame,
      panel,
      anchorRange: range.cloneRange(),
      text,
      onScroll: reposition,
      report: null,
      runId: null,
      savePayload: null,
      savedInHistory: false,
      saveLoading: false,
      saveError: "",
      cachedQuota: null,
    };

    window.addEventListener("scroll", reposition, {
      passive: true,
      capture: true,
    });
    window.addEventListener("resize", reposition);

    requestAnimationFrame(reposition);
  };

  // ---------------------------------------------------------------------------
  // 5. Renderers del cuerpo del panel.
  // ---------------------------------------------------------------------------
  const setPanelBody = (html, state = "idle") => {
    if (!activeWidget) return;
    const body = activeWidget.panel.querySelector(".fn-panel-body");
    body.dataset.state = state;
    body.innerHTML = html;
    requestAnimationFrame(() => activeWidget?.onScroll?.());
  };

  const renderLoading = (taskStatus = "pending") => {
    clearLoadingProgressTimer();
    const taskUi = getTaskStateUi(taskStatus);
    setPanelBody(
      `
      <div class="fn-loading">
        <span class="fn-spinner" aria-hidden="true"></span>
        <span>${escapeHtml(translate("analyze.loadingTitle", {}, "Verifying selected claims..."))}</span>
      </div>
      <div class="fn-task-state-row">
        <span class="fn-task-state-badge" data-state="${escapeHtml(taskStatus)}">${escapeHtml(taskUi.label)}</span>
      </div>
      <div class="fn-progress" role="progressbar" aria-label="Verificando" aria-valuenow="${LOADING_PROGRESS_INITIAL}" aria-valuemin="0" aria-valuemax="100">
        <div class="fn-progress-bar" style="width: ${LOADING_PROGRESS_INITIAL}%"></div>
      </div>
      <p class="fn-loading-progress">${escapeHtml(
        translate(
          "analyze.progress",
          { progress: LOADING_PROGRESS_INITIAL },
          `Processing context · ${LOADING_PROGRESS_INITIAL}%`
        )
      )}</p>
      <p class="fn-loading-stage">${getLoadingStage(LOADING_PROGRESS_INITIAL)}</p>
      <p class="fn-task-state-copy">${escapeHtml(taskUi.description)}</p>
      <p class="fn-loading-hint">${escapeHtml(translate("analyze.loadingHint", {}, "The first verification after some idle time may take 10-30s while the server wakes up."))}</p>
    `,
      "loading"
    );
    startLoadingProgress();
  };

  const renderNeedsLogin = (CONFIG) => {
    clearLoadingProgressTimer();
    setPanelBody(
      `
      <p class="fn-text">
        ${escapeHtml(translate("verify.needsLogin", {}, "You need to sign in to FakeNews Insight to review this text."))}
      </p>
      <div class="fn-actions">
        <button type="button" class="fn-button-primary" id="fn-open-popup">
          ${escapeHtml(translate("verify.openExtension", {}, "Open extension"))}
        </button>
        <a href="${CONFIG.WEB_REGISTER_URL}" target="_blank" rel="noopener noreferrer" class="fn-link">
          ${escapeHtml(translate("verify.createAccount", {}, "Create account"))}
        </a>
      </div>
    `,
      "needs-login"
    );
    activeWidget.panel
      .querySelector("#fn-open-popup")
      .addEventListener("click", () => {
        alert(
          translate(
            "verify.openPopupHint",
            {},
            "Click the FakeNews Insight icon in the browser toolbar to sign in."
          )
        );
      });
  };

  const renderError = (message) => {
    clearLoadingProgressTimer();
    setPanelBody(
      `
      <p class="fn-banner fn-banner-error">${escapeHtml(message)}</p>
      <div class="fn-actions">
        <button type="button" class="fn-button-secondary" id="fn-close-btn">${escapeHtml(translate("verify.close", {}, "Close"))}</button>
      </div>
    `,
      "error"
    );
    activeWidget.panel
      .querySelector("#fn-close-btn")
      .addEventListener("click", destroyWidget);
  };

  const VERIFY_LABEL_TONE = {
    SUPPORTED: "real",
    REFUTED: "fake",
    CONFLICTING: "unknown",
    NOT_ENOUGH_INFO: "unknown",
  };

  const getVerdictLabel = (label) => {
    const normalized = String(label || "").toUpperCase();
    return translate(`verdict.${normalized}`, {}, normalized || "—");
  };

  const buildQuotaText = (plan, remaining, limit) => {
    if (remaining !== undefined && remaining !== null && limit !== undefined && limit !== null) {
      return translate(
        "quota.remaining",
        { plan, remaining, limit },
        `Plan ${plan} · ${remaining}/${limit} verifications left today.`
      );
    }

    return translate(
      "quota.unlimited",
      { plan },
      `Plan ${plan} · Unlimited daily usage.`
    );
  };

  const renderEvidence = (evidence, evidenceIndex, evidencesLength) => {
    const url = String(evidence?.url || "#");
    const label = evidence?.title || evidence?.url || "Fuente";

    return `
      <li class="fn-evidence-inline-item">
        <a href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer">[${evidenceIndex + 1}] ${escapeHtml(label)}</a>
        ${evidenceIndex < evidencesLength - 1 ? '<span class="fn-evidence-comma">,</span>' : ""}
      </li>
    `;
  };

  const renderClaim = (claim, index) => {
    const label = String(claim?.label || "").toUpperCase();
    const tone = VERIFY_LABEL_TONE[label] || "unknown";
    const evidences = Array.isArray(claim?.evidences) ? claim.evidences : [];
    const confidence = Math.round((claim?.confidence ?? 0) * 100);

    return `
      <li>
        <details class="fn-claim">
          <summary class="fn-claim-summary">
            <div class="fn-claim-head">
              <span class="fn-claim-index">#${index + 1}</span>
              <p class="fn-claim-text">${escapeHtml(claim?.text || "")}</p>
              <span class="fn-claim-badge" data-tone="${tone}">${escapeHtml(getVerdictLabel(label))}</span>
              <span class="fn-claim-confidence" title="${escapeHtml(translate("verify.confidence", {}, "Aggregate confidence"))}">${confidence}%</span>
            </div>
            <span class="fn-claim-chevron" aria-hidden="true"></span>
          </summary>
          <div class="fn-claim-body">
            ${claim?.rationale ? `<p class="fn-rationale">${escapeHtml(claim.rationale)}</p>` : ""}
            ${evidences.length > 0
              ? `
                <div class="fn-evidence-card">
                  <p class="fn-evidence-label">${escapeHtml(translate("verify.evidences", {}, "Evidence"))}</p>
                  <ol class="fn-evidences-inline">
                    ${evidences.map((evidence, evidenceIndex) => renderEvidence(evidence, evidenceIndex, evidences.length)).join("")}
                  </ol>
                </div>
              `
              : `<p class="fn-no-evidence">${escapeHtml(translate("verify.noEvidence", {}, "Not enough web evidence."))}</p>`}
          </div>
        </details>
      </li>
    `;
  };

  const attachVerifyActions = () => {
    const closeButton = activeWidget?.panel?.querySelector("#fn-close-btn");
    if (closeButton) {
      closeButton.addEventListener("click", destroyWidget);
    }

    const saveButton = activeWidget?.panel?.querySelector("#fn-save-btn");
    if (saveButton) {
      saveButton.addEventListener("click", handleSaveVerification);
    }
  };

  const renderVerifyReportContent = (report) => {
    clearLoadingProgressTimer();
    const overall = String(report?.overall_label || "").toUpperCase();
    const tone = VERIFY_LABEL_TONE[overall] || "unknown";
    const label = getVerdictLabel(overall);

    const resolvedPlan = resolveDisplayedPlan(report);
    const plan = String(resolvedPlan || "free").toUpperCase();
    const remaining = report?.remaining_today ?? activeWidget?.cachedQuota?.remaining ?? null;
    const limit = report?.daily_limit ?? activeWidget?.cachedQuota?.limit ?? null;
    const quotaText = buildQuotaText(plan, remaining, limit);

    if (activeWidget) {
      activeWidget.report = {
        ...report,
        run_id: report?.run_id || activeWidget.runId || null,
      };
      activeWidget.runId = report?.run_id || activeWidget.runId || null;
      activeWidget.savePayload = buildVerificationHistorySavePayload({
        runId: activeWidget.runId,
        report: activeWidget.report,
        inputText: activeWidget.text,
      });
      activeWidget.savedInHistory = Boolean(report?.saved_to_history || activeWidget.savedInHistory);
    }

    const quotaPayload = {
      plan: resolvedPlan || "free",
      remaining: remaining ?? null,
      limit: limit ?? null,
      updatedAt: Date.now(),
    };
    if (activeWidget) {
      activeWidget.cachedQuota = quotaPayload;
    }
    saveQuotaCache(quotaPayload);
    renderQuotaChip(quotaPayload);

    if (activeWidget?.frame) {
      activeWidget.frame.dataset.tone = tone;
    }

    const claims = Array.isArray(report?.claims) ? report.claims : [];
    const claimsHtml = claims.length
      ? claims.map((claim, index) => renderClaim(claim, index)).join("")
      : `<p class="fn-claim-empty">${escapeHtml(translate("verify.noClaims", {}, "No verifiable claims could be extracted."))}</p>`;

    const canSave = Boolean(activeWidget?.report) && !activeWidget?.savedInHistory && !activeWidget?.saveLoading;
    const saveButtonText = activeWidget?.savedInHistory
      ? translate("verify.savedHistory", {}, "Saved to history")
      : activeWidget?.saveLoading
      ? translate("verify.savingHistory", {}, "Saving...")
      : translate("verify.saveHistory", {}, "Save to history");

    setPanelBody(
      `
      <section class="fn-report-card fn-overview-card">
        <div class="fn-report-head">
          <p class="fn-chip">${escapeHtml(translate("verify.overall", {}, "Overall verdict"))}</p>
          <button type="button" class="fn-button-secondary fn-button-compact" id="fn-save-btn" ${canSave ? "" : "disabled"}>${escapeHtml(saveButtonText)}</button>
        </div>
        <div class="fn-verdict" data-tone="${tone}">${escapeHtml(label)}</div>
        ${report?.summary ? `<p class="fn-overview-summary">${escapeHtml(report.summary)}</p>` : ""}
        ${activeWidget?.saveError ? `<p class="fn-banner fn-banner-error">${escapeHtml(activeWidget.saveError)}</p>` : ""}
        <div class="fn-meta-grid">
          <div class="fn-meta-item">
            <span class="fn-meta-label">${escapeHtml(translate("verify.plan", {}, "Plan"))}</span>
            <strong class="fn-meta-value">${escapeHtml(plan || "—")}</strong>
          </div>
          <div class="fn-meta-item">
            <span class="fn-meta-label">${escapeHtml(translate("verify.remaining", {}, "Remaining verifications today"))}</span>
            <strong class="fn-meta-value">${remaining !== undefined && remaining !== null ? `${remaining}${limit ? ` / ${limit}` : ""}` : "—"}</strong>
          </div>
          <div class="fn-meta-item">
            <span class="fn-meta-label">${escapeHtml(translate("verify.claimsCount", {}, "Claims"))}</span>
            <strong class="fn-meta-value">${claims.length}</strong>
          </div>
        </div>
        <p class="fn-quota">${escapeHtml(quotaText)}</p>
      </section>
      <section class="fn-report-card fn-section-card">
        <h3 class="fn-section-title">${escapeHtml(translate("verify.claimsTitle", {}, "Extracted claims"))}</h3>
        <p class="fn-section-copy">${escapeHtml(translate("verify.claimsIntro", {}, "These are the specific claims the system extracted from the text to cross-check against web evidence."))}</p>
      </section>
      <ol class="fn-claims">${claimsHtml}</ol>
      <div class="fn-actions">
        <button type="button" class="fn-button-secondary" id="fn-close-btn">${escapeHtml(translate("verify.close", {}, "Close"))}</button>
      </div>
    `,
      "verify"
    );
    attachVerifyActions();
  };

  const renderVerifyReport = (report) => {
    transitionFromLoading(() => renderVerifyReportContent(report), { complete: true });
  };

  const handleSaveVerification = async () => {
    if (!activeWidget || !activeWidget.report || activeWidget.saveLoading || activeWidget.savedInHistory) {
      return;
    }

    activeWidget.saveLoading = true;
    activeWidget.saveError = "";
    renderVerifyReport(activeWidget.report);

    let libs = null;
    let showLogin = false;
    try {
      libs = await hydrateRuntimeContext();
      const session = await libs.loadSession().catch(() => null);
      if (!session) {
        showLogin = true;
      } else {
        const savePayload =
          activeWidget.savePayload ||
          buildVerificationHistorySavePayload({
            runId: activeWidget.runId || null,
            report: activeWidget.report,
            inputText: activeWidget.text,
          });

        const response = await sendToBackground("fn:save-history", {
          payload: savePayload,
        });

        activeWidget.runId = response?.run_id || activeWidget.runId;
        activeWidget.savedInHistory = true;
        activeWidget.report = {
          ...activeWidget.report,
          run_id: activeWidget.runId,
          saved_to_history: true,
        };
        activeWidget.savePayload = buildVerificationHistorySavePayload({
          runId: activeWidget.runId,
          report: activeWidget.report,
          inputText: activeWidget.text,
        });
        if (activeWidget.taskId) {
          await sendToBackground("fn:task-dismiss", {
            taskId: activeWidget.taskId,
          }).catch(() => null);
        }
      }
    } catch (error) {
      if (error?.sessionExpired) {
        showLogin = true;
      } else {
        activeWidget.saveError = error?.message || translate("verify.saveHistoryError", {}, "The verification could not be saved to history.");
      }
    } finally {
      activeWidget.saveLoading = false;
      if (showLogin && libs) {
        renderNeedsLogin(libs.CONFIG);
        return;
      }
      renderVerifyReport(activeWidget.report);
    }
  };

  // ---------------------------------------------------------------------------
  // 6. Orquestador de la verificacion.
  // ---------------------------------------------------------------------------
  const runVerification = async (text) => {
    if (!activeWidget) return;
    if (!text || text.length < MIN_TEXT_LENGTH) return;

    let libs;
    try {
      libs = await hydrateRuntimeContext();
    } catch (error) {
      renderError(translate("errors.loadModules", {}, "The extension modules could not be loaded."));
      console.error("[FEVER] loadLibs fallo:", error);
      return;
    }

    renderLoading("pending");

    const session = await libs.loadSession().catch(() => null);
    if (!session) {
      renderNeedsLogin(libs.CONFIG);
      return;
    }

    try {
      const task = await sendToBackground("fn:verify-submit", {
        text,
        source: "content",
      });

      if (!activeWidget) {
        return;
      }

      activeWidget.taskId = task?.taskId || task?.runId || null;
      activeWidget.runId = task?.runId || null;
      renderTaskLoadingState(task?.status || "pending");

      const report = task?.result ? mapTaskToReport(task) : await waitForVerificationTask(activeWidget.taskId);
      if (!report) {
        return;
      }

      renderVerifyReport(report);
    } catch (error) {
      if (error?.sessionExpired) {
        renderNeedsLogin(libs.CONFIG);
        return;
      }
      renderError(error?.message || translate("errors.genericVerify", {}, "The text could not be verified."));
    }
  };

  // ---------------------------------------------------------------------------
  // 7. Listener de selección + cierre por interaccion externa.
  // ---------------------------------------------------------------------------
  const handleMouseUp = (event) => {
    if (activeWidget) {
      const path = typeof event?.composedPath === "function" ? event.composedPath() : [];
      if (path.includes(activeWidget.panel) || path.includes(activeWidget.frame)) {
        return;
      }
    }

    setTimeout(() => {
      const selection = window.getSelection();
      if (!selection || selection.isCollapsed) {
        if (getPanelState() === "idle") destroyWidget();
        return;
      }

      const text = selection.toString().trim();
      if (text.length < MIN_TEXT_LENGTH) {
        if (getPanelState() === "idle") destroyWidget();
        return;
      }

      // Excluir inputs/contenteditable: ahi un overlay seria una molestia.
      const anchorNode = selection.anchorNode;
      const anchorElement =
        anchorNode && anchorNode.nodeType === 1
          ? anchorNode
          : anchorNode?.parentElement;
      if (anchorElement) {
        const tag = anchorElement.tagName?.toLowerCase();
        if (
          tag === "input" ||
          tag === "textarea" ||
          anchorElement.isContentEditable
        ) {
          destroyWidget();
          return;
        }
      }

      try {
        const range = selection.getRangeAt(0);
        if (!range || range.collapsed) {
          destroyWidget();
          return;
        }
        buildWidget(text.slice(0, MAX_TEXT_LENGTH), range);
      } catch {
        destroyWidget();
      }
    }, 0);
  };

  /** Cierre con click fuera, solo si el widget no ha sido analizado todavia. */
  const handleDocumentMouseDown = (event) => {
    if (!activeWidget) return;
    const path = event.composedPath();
    if (path.includes(activeWidget.panel)) return;
    if (path.includes(activeWidget.frame)) return;

    if (getPanelState() === "idle") destroyWidget();
  };

  document.addEventListener("mouseup", handleMouseUp, true);
  document.addEventListener("mousedown", handleDocumentMouseDown, true);
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") destroyWidget();
  });

  // ---------------------------------------------------------------------------
  // Utilidades.
  // ---------------------------------------------------------------------------
  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }
})();
