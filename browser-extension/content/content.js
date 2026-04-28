/**
 * @file content.js
 * @description Content script: cuando el usuario selecciona >=10 caracteres
 * en cualquier página HTTP/HTTPS, dibujamos un marco alrededor de la
 * selección (con la estetica de la extension) y un panel adjunto con el
 * boton "Analizar". El resultado del backend se renderiza en el propio
 * panel, sustituyendo el boton.
 *
 * Toda la UI vive dentro de un Shadow DOM para no contaminar ni ser
 * contaminada por los estilos de la página anfitriona.
 */

(() => {
  if (window.__fakenewsInsightContentLoaded) return;
  window.__fakenewsInsightContentLoaded = true;

  const MIN_TEXT_LENGTH = 10;
  const MAX_TEXT_LENGTH = 4000;
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
        <span class="fn-quota-chip fn-hidden" title="An\u00e1lisis restantes hoy"></span>
        <button type="button" class="fn-close" title="Cerrar" aria-label="Cerrar">&times;</button>
      </header>
      <div class="fn-panel-body" data-state="idle">
        <p class="fn-snippet" id="fn-snippet"></p>
        <button type="button" class="fn-button-primary" id="fn-analyze-btn">
          <span class="fn-mark fn-mark-sm" aria-hidden="true"></span>
          <span>Analizar con FakeNews Insight</span>
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
      .querySelector("#fn-analyze-btn")
      .addEventListener("click", (event) => {
        event.stopPropagation();
        runAnalysis(text);
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
        <span>Analizando con el modelo SVM...</span>
      </div>
      <div class="fn-progress" role="progressbar" aria-label="Analizando">
        <div class="fn-progress-bar"></div>
      </div>
      <p class="fn-loading-hint">El primer an&aacute;lisis tras un rato puede tardar 10-30s mientras arranca el servidor.</p>
    `,
      "loading"
    );
  };

  const renderNeedsLogin = (CONFIG) => {
    setPanelBody(
      `
      <p class="fn-text">
        Necesitas iniciar sesi&oacute;n en FakeNews Insight para analizar.
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

  const renderResult = (result, libs) => {
    const verdict = String(result?.veredicto || "").toUpperCase();
    let tone = "unknown";
    let label = verdict || "â€”";
    if (verdict === "REAL") {
      tone = "real";
      label = "REAL";
    } else if (verdict === "FAKE") {
      tone = "fake";
      label = "FALSO";
    }

    const strength = Number(result?.certeza_svm);
    const strengthText = Number.isFinite(strength)
      ? strength.toFixed(3)
      : "â€”";
    const magnitude = Number.isFinite(strength)
      ? Math.min(1, Math.abs(strength))
      : 0;

    const plan = String(result?.plan_usuario || "free").toUpperCase();
    const remaining = result?.analisis_restantes_hoy;
    const limit = result?.limite_diario;
    const quotaText =
      limit && remaining !== undefined && remaining !== null
        ? `Plan ${plan} &middot; Quedan ${remaining}/${limit} an&aacute;lisis hoy.`
        : `Plan ${plan} &middot; Sin l&iacute;mite diario.`;

    // Refresca chip + cache.
    const quotaPayload = {
      plan: result?.plan_usuario || "free",
      remaining: remaining ?? null,
      limit: limit ?? null,
      updatedAt: Date.now(),
    };
    saveQuotaCache(quotaPayload);
    renderQuotaChip(quotaPayload);

    const alreadySaved = Boolean(result?.guardado_en_historial);
    const runId = result?.analysis_run_id || "";

    // Tinta el marco según veredicto (verde/rojo/morado).
    if (activeWidget?.frame) {
      activeWidget.frame.dataset.tone = tone;
    }

    setPanelBody(
      `
      <div class="fn-verdict" data-tone="${tone}">${label}</div>
      <p class="fn-strength">Fuerza SVM: <strong>${strengthText}</strong></p>
      <div class="fn-bar"><div class="fn-bar-fill" style="width:${(magnitude * 100).toFixed(1)}%"></div></div>
      <p class="fn-quota">${quotaText}</p>
      <p class="fn-banner fn-banner-success fn-hidden" id="fn-save-msg"></p>
      <div class="fn-actions">
        <button
          type="button"
          class="fn-button-primary"
          id="fn-save-btn"
          ${alreadySaved || !runId ? "disabled" : ""}
        >
          ${alreadySaved ? "Guardado" : "Guardar en historial"}
        </button>
        <button type="button" class="fn-button-secondary" id="fn-close-btn">Cerrar</button>
      </div>
    `,
      "result"
    );

    activeWidget.panel
      .querySelector("#fn-close-btn")
      .addEventListener("click", destroyWidget);

    const saveBtn = activeWidget.panel.querySelector("#fn-save-btn");
    if (saveBtn && !saveBtn.disabled) {
      saveBtn.addEventListener("click", async () => {
        saveBtn.disabled = true;
        saveBtn.textContent = "Guardando...";
        try {
          const response = await sendToBackground("fn:save", { runId });
          const msg = activeWidget.panel.querySelector("#fn-save-msg");
          msg.textContent = response?.already_saved
            ? "Este análisis ya estaba en tu historial."
            : "Análisis guardado en tu historial.";
          msg.classList.remove("fn-hidden");
          saveBtn.textContent = "Guardado";
          activeWidget.onScroll?.();
        } catch (error) {
          if (error?.sessionExpired) {
            renderNeedsLogin(libs.CONFIG);
            return;
          }
          saveBtn.disabled = false;
          saveBtn.textContent = "Guardar en historial";
          const msg = activeWidget.panel.querySelector("#fn-save-msg");
          msg.textContent =
            error?.message || "No se pudo guardar el análisis.";
          msg.classList.remove("fn-hidden", "fn-banner-success");
          msg.classList.add("fn-banner-error");
        }
      });
    }
  };

  // ---------------------------------------------------------------------------
  // 6. Orquestador del análisis.
  // ---------------------------------------------------------------------------
  const runAnalysis = async (text) => {
    if (!activeWidget) return;
    if (!text || text.length < MIN_TEXT_LENGTH) return;

    renderLoading();

    let libs;
    try {
      libs = await loadLibs();
    } catch (error) {
      renderError("No se pudieron cargar los modulos de la extension.");
      console.error("[FakeNews] loadLibs fallo:", error);
      return;
    }

    const session = await libs.loadSession().catch(() => null);
    if (!session) {
      renderNeedsLogin(libs.CONFIG);
      return;
    }

    try {
      const result = await sendToBackground("fn:analyze", { text });
      renderResult(result, libs);
    } catch (error) {
      if (error?.sessionExpired) {
        renderNeedsLogin(libs.CONFIG);
        return;
      }
      renderError(error?.message || "No se pudo analizar el texto.");
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

      // Excluir inputs/contenteditable: ahÃ­ un overlay serÃ­a una molestia.
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
