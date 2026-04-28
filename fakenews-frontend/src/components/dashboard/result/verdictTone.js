/**
 * @file verdictTone.js
 * @description Helper para derivar estilo visual y badge según veredicto y fuerza SVM.
 */

import i18next from "i18next";

/** Traduce la etiqueta del badge de incertidumbre al idioma activo. */
const getUncertainBadgeText = () =>
  i18next.t("result.verdicts.uncertainBadge", {
    ns: "dashboard",
    defaultValue: "INCIERTO / DUDOSO",
  });

/** Deriva tono visual según veredicto y nivel de incertidumbre de la fuerza SVM. */
export const getVerdictTone = ({ verdictLabel, svmStrength }) => {
  const hasStrength = typeof svmStrength === "number";
  const threshold = 0.3;
  const epsilon = 0.0001;

  const isUncertain = !hasStrength || Math.abs(svmStrength - threshold) <= epsilon;

  if (isUncertain) {
    return {
      headingClass: "text-amber-200",
      badgeClass: "border-amber-300/40 bg-amber-500/15 text-amber-100",
      panelBorderClass: "border-amber-300/35",
      badgeText: getUncertainBadgeText(),
      showBadge: true,
    };
  }

  if (verdictLabel === "FIABLE") {
    return {
      headingClass: "text-emerald-300",
      badgeClass: "",
      panelBorderClass: "border-emerald-400/30",
      badgeText: "",
      showBadge: false,
    };
  }

  if (verdictLabel === "FALSA") {
    return {
      headingClass: "text-red-300",
      badgeClass: "",
      panelBorderClass: "border-red-400/30",
      badgeText: "",
      showBadge: false,
    };
  }

  return {
    headingClass: "text-on-surface",
    badgeClass: "",
    panelBorderClass: "border-outline-variant/25",
    badgeText: "",
    showBadge: false,
  };
};
