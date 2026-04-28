/**
 * @file service_worker.js
 * @description Background service worker (MV3). Atiende peticiones del content
 * script para hacer fetch al backend desde el origen `chrome-extension://...`,
 * evitando los problemas de CORS que aparecen al lanzar fetch desde el origen
 * de la página anfitriona. El popup sigue llamando a la API directamente.
 */

import { analyzeText, saveAnalysis } from "../lib/api.js";

const handlers = {
  "fn:analyze": (msg) => analyzeText(msg.text),
  "fn:save": (msg) => saveAnalysis(msg.runId),
};

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  const handler = handlers[message?.type];
  if (!handler) return false;

  (async () => {
    try {
      const data = await handler(message);
      sendResponse({ ok: true, data });
    } catch (error) {
      sendResponse({
        ok: false,
        sessionExpired: error?.name === "SessionExpiredError",
        message: error?.message || "Error desconocido.",
      });
    }
  })();

  // true => mantenemos abierto el canal para responder de forma asincrona.
  return true;
});
