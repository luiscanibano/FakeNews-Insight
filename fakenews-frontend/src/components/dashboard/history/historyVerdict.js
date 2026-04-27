/**
 * @file historyVerdict.js
 * @description Helper para mapear el veredicto de un analisis a clases visuales del chip.
 */

/** Asigna estilos de estado segun veredicto para chips de historial. */
export const getVerdictStyles = (verdict) => {
  if (verdict === "FIABLE") {
    return "border-emerald-400/30 bg-emerald-500/15 text-emerald-200";
  }

  if (verdict === "FALSA") {
    return "border-red-400/30 bg-red-500/15 text-red-200";
  }

  return "border-amber-300/40 bg-amber-500/15 text-amber-100";
};
