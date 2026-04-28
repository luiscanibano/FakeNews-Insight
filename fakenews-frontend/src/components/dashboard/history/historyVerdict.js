/**
 * @file historyVerdict.js
 * @description Helper para mapear el veredicto de un análisis a clases visuales.
 */

/** Asigna clase del verdict-dot según veredicto del análisis. */
export const getVerdictClass = (verdict) => {
  if (verdict === "FIABLE") return "dash-verdict-real";
  if (verdict === "FALSA") return "dash-verdict-fake";
  return "dash-verdict-other";
};

/** Compatibilidad con código legado. */
export const getVerdictStyles = (verdict) => {
  if (verdict === "FIABLE") {
    return "border-emerald-400/30 bg-emerald-500/15 text-emerald-200";
  }
  if (verdict === "FALSA") {
    return "border-red-400/30 bg-red-500/15 text-red-200";
  }
  return "border-amber-300/40 bg-amber-500/15 text-amber-100";
};
