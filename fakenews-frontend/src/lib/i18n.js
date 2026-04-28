/**
 * @file i18n.js
 * @description Configuración global de i18next. Detecta el idioma del navegador o
 * el último elegido por el usuario (localStorage), con persistencia automática.
 * Idiomas soportados: inglés (defecto) y español.
 */

import i18next from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";

import esCommon from "../locales/es/common.json";
import esAuth from "../locales/es/auth.json";
import esDashboard from "../locales/es/dashboard.json";
import esAdmin from "../locales/es/admin.json";

import enCommon from "../locales/en/common.json";
import enAuth from "../locales/en/auth.json";
import enDashboard from "../locales/en/dashboard.json";
import enAdmin from "../locales/en/admin.json";

export const SUPPORTED_LANGUAGES = ["en", "es"];
export const DEFAULT_LANGUAGE = "en";
export const LANGUAGE_STORAGE_KEY = "app.lang";

i18next
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      es: {
        common: esCommon,
        auth: esAuth,
        dashboard: esDashboard,
        admin: esAdmin,
      },
      en: {
        common: enCommon,
        auth: enAuth,
        dashboard: enDashboard,
        admin: enAdmin,
      },
    },
    ns: ["common", "auth", "dashboard", "admin"],
    defaultNS: "common",
    lng: DEFAULT_LANGUAGE,
    fallbackLng: DEFAULT_LANGUAGE,
    supportedLngs: SUPPORTED_LANGUAGES,
    interpolation: { escapeValue: false },
    detection: {
      order: ["localStorage"],
      lookupLocalStorage: LANGUAGE_STORAGE_KEY,
      caches: ["localStorage"],
    },
  });

export default i18next;
