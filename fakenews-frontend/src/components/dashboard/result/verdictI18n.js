/**
 * @file verdictI18n.js
 * @description Helper para traducir las etiquetas canónicas de veredicto
 * (FIABLE / FALSA / DUDOSA) al idioma activo. La etiqueta canónica se
 * mantiene en español como clave estable para tono visual y filtros.
 */

import i18next from "i18next";

/** Devuelve la etiqueta de veredicto traducida o la original si no hay clave. */
export const translateVerdictLabel = (verdictLabel) => {
  if (!verdictLabel) return verdictLabel;
  const resultKey = `result.verdicts.${verdictLabel}`;
  const resultTranslation = i18next.t(resultKey, { ns: "dashboard", defaultValue: "" });

  if (resultTranslation) {
    return resultTranslation;
  }

  const verifyKey = `verify.verdict.${verdictLabel}`;
  return i18next.t(verifyKey, { ns: "dashboard", defaultValue: verdictLabel });
};
