/**
 * @file service_worker.js
 * @description Background service worker (MV3). Atiende peticiones del content
 * script para hacer fetch al backend desde el origen `chrome-extension://...`,
 * evitando los problemas de CORS que aparecen al lanzar fetch desde el origen
 * de la página anfitriona. El popup sigue llamando a la API directamente.
 */

import {
  buildVerificationHistorySavePayload,
  saveVerificationHistoryPayload,
  verifyText,
} from "../lib/api.js";

const handlers = {
  "fn:verify": (msg) => verifyText(msg.text),
  "fn:save-history": (msg) =>
    saveVerificationHistoryPayload(
      msg.payload ||
        buildVerificationHistorySavePayload({
          runId: msg.runId,
          report: msg.report || null,
          inputText: msg.inputText || "",
        })
    ),
};

const CONTENT_SCRIPT_FILES = ["content/content.js"];

const isInjectableUrl = (url) => typeof url === "string" && /^https?:\/\//i.test(url);

const injectContentScriptIntoOpenTabs = async () => {
  const tabs = await chrome.tabs.query({});

  await Promise.all(
    tabs
      .filter((tab) => Number.isInteger(tab.id) && isInjectableUrl(tab.url))
      .map(async (tab) => {
        try {
          await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            files: CONTENT_SCRIPT_FILES,
          });
        } catch (error) {
          console.warn("[FEVER] No se pudo inyectar content script en tab", {
            tabId: tab.id,
            url: tab.url,
            error: error?.message || error,
          });
        }
      })
  );
};

chrome.runtime.onInstalled.addListener(() => {
  injectContentScriptIntoOpenTabs().catch((error) => {
    console.error("[FEVER] Inyeccion inicial fallo:", error);
  });
});

chrome.runtime.onStartup.addListener(() => {
  injectContentScriptIntoOpenTabs().catch((error) => {
    console.error("[FEVER] Inyeccion al arrancar fallo:", error);
  });
});

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
