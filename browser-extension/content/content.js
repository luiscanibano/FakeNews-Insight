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
      chip.innerHTML = `${plan} &middot; <strong>${quota.remaining}/${quota.limit}</strong> hoy`;
      chip.dataset.low = quota.remaining <= 1 ? "true" : "false";
    } else {
      chip.innerHTML = `${plan} &middot; sin l&iacute;mite`;
      chip.dataset.low = "false";
    }
    chip.classList.remove("fn-hidden");
  };

  // ---------------------------------------------------------------------------
  // 1. Carga perezosa de los modulos compartidos con el popup.
  // ---------------------------------------------------------------------------
  let libsPromise = null;
  const loadLibs = () => {
    if (libsPromise) return libsPromise;
    libsPromise = (async () => {
      const [config, storage] = await Promise.all([
        import(chrome.runtime.getURL("lib/config.js")),
        import(chrome.runtime.getURL("lib/storage.js")),
      ]);
      return {
        CONFIG: config.CONFIG,
        loadSession: storage.loadSession,
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

  const destroyWidget = () => {
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
        <span class="fn-mark" aria-hidden="true"></span>
        <strong class="fn-panel-title">FakeNews Insight</strong>
        <span class="fn-quota-chip fn-hidden" title="Verificaciones restantes hoy"></span>
        <button type="button" class="fn-close" title="Cerrar" aria-label="Cerrar">&times;</button>
      </header>
      <div class="fn-panel-body" data-state="idle">
        <p class="fn-snippet" id="fn-snippet"></p>
        <p class="fn-summary">${text.length.toLocaleString("es-ES")}/${MAX_TEXT_LENGTH.toLocaleString("es-ES")} caracteres</p>
        <button type="button" class="fn-button-primary" id="fn-verify-btn">
          <span class="fn-mark fn-mark-sm" aria-hidden="true"></span>
          <span>Verificar afirmaciones</span>
        </button>
      </div>
    `;

    layer.appendChild(frame);
    layer.appendChild(panel);

    // Pinta de inmediato la cuota cacheada (si existe) en el header.
    loadQuotaCache().then((quota) => {
      if (activeWidget?.panel === panel) renderQuotaChip(quota);
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

  const renderLoading = () => {
    setPanelBody(
      `
      <div class="fn-loading">
        <span class="fn-spinner" aria-hidden="true"></span>
        <span>Buscando evidencias y contrastando claims...</span>
      </div>
      <div class="fn-progress" role="progressbar" aria-label="Verificando">
        <div class="fn-progress-bar"></div>
      </div>
      <p class="fn-loading-hint">El primer contraste tras un rato puede tardar 10-30s mientras arranca el servidor.</p>
    `,
      "loading"
    );
  };

  const renderNeedsLogin = (CONFIG) => {
    setPanelBody(
      `
      <p class="fn-text">
        Necesitas iniciar sesi&oacute;n en FakeNews Insight para revisar.
      </p>
      <div class="fn-actions">
        <button type="button" class="fn-button-primary" id="fn-open-popup">
          Abrir extensi&oacute;n
        </button>
        <a href="${CONFIG.WEB_REGISTER_URL}" target="_blank" rel="noopener noreferrer" class="fn-link">
          Crear cuenta
        </a>
      </div>
    `,
      "needs-login"
    );
    activeWidget.panel
      .querySelector("#fn-open-popup")
      .addEventListener("click", () => {
        alert(
          "Pulsa el icono de FakeNews Insight en la barra del navegador para iniciar sesión."
        );
      });
  };

  const renderError = (message) => {
    setPanelBody(
      `
      <p class="fn-banner fn-banner-error">${escapeHtml(message)}</p>
      <div class="fn-actions">
        <button type="button" class="fn-button-secondary" id="fn-close-btn">Cerrar</button>
      </div>
    `,
      "error"
    );
    activeWidget.panel
      .querySelector("#fn-close-btn")
      .addEventListener("click", destroyWidget);
  };

  const VERIFY_LABEL_TEXT = {
    SUPPORTED: "VERIFICADO",
    REFUTED: "DESMENTIDO",
    CONFLICTING: "CONTRADICTORIO",
    NOT_ENOUGH_INFO: "EVIDENCIA INSUFICIENTE",
  };

  const VERIFY_LABEL_TONE = {
    SUPPORTED: "real",
    REFUTED: "fake",
    CONFLICTING: "unknown",
    NOT_ENOUGH_INFO: "unknown",
  };

  const renderVerifyReport = (report) => {
    const overall = String(report?.overall_label || "").toUpperCase();
    const tone = VERIFY_LABEL_TONE[overall] || "unknown";
    const label = VERIFY_LABEL_TEXT[overall] || overall || "—";

    const plan = String(report?.plan || "free").toUpperCase();
    const remaining = report?.remaining_today;
    const limit = report?.daily_limit;
    const quotaText =
      limit && remaining !== undefined && remaining !== null
        ? `Plan ${plan} &middot; Quedan ${remaining}/${limit} verificaciones hoy.`
        : `Plan ${plan} &middot; Sin l&iacute;mite diario.`;

    const quotaPayload = {
      plan: report?.plan || "free",
      remaining: remaining ?? null,
      limit: limit ?? null,
      updatedAt: Date.now(),
    };
    saveQuotaCache(quotaPayload);
    renderQuotaChip(quotaPayload);

    if (activeWidget?.frame) {
      activeWidget.frame.dataset.tone = tone;
    }

    const claims = Array.isArray(report?.claims) ? report.claims : [];
    const claimsHtml = claims.length
      ? claims.map((claim, index) => renderClaim(claim, index)).join("")
      : `<p class="fn-text">No se pudieron extraer afirmaciones verificables.</p>`;

    setPanelBody(
      `
      <div class="fn-verdict" data-tone="${tone}">${escapeHtml(label)}</div>
      ${report?.summary ? `<p class="fn-summary">${escapeHtml(report.summary)}</p>` : ""}
      <p class="fn-quota">${quotaText}</p>
      <ol class="fn-claims">${claimsHtml}</ol>
      <div class="fn-actions">
        <button type="button" class="fn-button-secondary" id="fn-close-btn">Cerrar</button>
      </div>
    `,
      "verify"
    );

    activeWidget.panel
      .querySelector("#fn-close-btn")
      .addEventListener("click", destroyWidget);
  };

  const renderClaim = (claim, index) => {
    const label = String(claim?.label || "").toUpperCase();
    const tone = VERIFY_LABEL_TONE[label] || "unknown";
    const confidence = Number.isFinite(claim?.confidence)
      ? ` · ${Math.round(claim.confidence * 100)}%`
      : "";
    const evidences = Array.isArray(claim?.evidences) ? claim.evidences : [];
    const evidencesHtml = evidences.length
      ? `<ul class="fn-evidences">${evidences.map(renderEvidence).join("")}</ul>`
      : `<p class="fn-no-evidence">Sin evidencias web suficientes.</p>`;

    return `
      <li class="fn-claim">
        <p class="fn-claim-text"><strong>#${index + 1}</strong> ${escapeHtml(claim?.text || "")}</p>
        <p class="fn-claim-meta" data-tone="${tone}">${escapeHtml(VERIFY_LABEL_TEXT[label] || label)}${confidence}</p>
        ${claim?.rationale ? `<p class="fn-rationale">${escapeHtml(claim.rationale)}</p>` : ""}
        ${evidencesHtml}
      </li>
    `;
  };

  const renderEvidence = (evidence) => {
    const url = String(evidence?.url || "#");
    const label = evidence?.title || evidence?.url || "Fuente";
    const nli = evidence?.nli_label ? ` · ${evidence.nli_label}` : "";
    return `
      <li>
        <a href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(label)}</a>
        ${nli ? `<span>${escapeHtml(nli)}</span>` : ""}
      </li>
    `;
  };

  // ---------------------------------------------------------------------------
  // 6. Orquestador de la verificacion.
  // ---------------------------------------------------------------------------
  const runVerification = async (text) => {
    if (!activeWidget) return;
    if (!text || text.length < MIN_TEXT_LENGTH) return;

    renderLoading();

    let libs;
    try {
      libs = await loadLibs();
    } catch (error) {
      renderError("No se pudieron cargar los modulos de la extension.");
      console.error("[FEVER] loadLibs fallo:", error);
      return;
    }

    const session = await libs.loadSession().catch(() => null);
    if (!session) {
      renderNeedsLogin(libs.CONFIG);
      return;
    }

    try {
      const report = await sendToBackground("fn:verify", { text });
      renderVerifyReport(report);
    } catch (error) {
      if (error?.sessionExpired) {
        renderNeedsLogin(libs.CONFIG);
        return;
      }
      renderError(error?.message || "No se pudo verificar el texto.");
    }
  };

  // ---------------------------------------------------------------------------
  // 7. Listener de selección + cierre por interaccion externa.
  // ---------------------------------------------------------------------------
  const handleMouseUp = () => {
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
