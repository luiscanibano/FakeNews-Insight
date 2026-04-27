/**
 * @file HistoryItem.jsx
 * @description Tarjeta visual de un analisis guardado en el historial del usuario.
 */

import { BarChart3 } from "lucide-react";
import { getVerdictStyles } from "./historyVerdict";

/** Render unitario de un analisis con titulo, veredicto, fragmento y metadatos. */
function HistoryItem({ analysis }) {
  return (
    <article className="rounded-2xl border border-outline-variant/25 bg-surface/50 p-3 sm:p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-semibold text-on-surface">{analysis.title}</p>
        <span
          className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider ${getVerdictStyles(
            analysis.verdictLabel
          )}`}
        >
          {analysis.verdictLabel}
        </span>
      </div>

      <p className="mt-2 text-xs leading-relaxed text-on-surface-variant">{analysis.excerpt}</p>

      <div className="mt-2 flex flex-wrap items-center gap-4 text-xs text-on-surface-variant">
        <span className="inline-flex items-center gap-1.5">
          <BarChart3 className="size-3.5 text-primary" />
          Fuerza SVM:{" "}
          {typeof analysis.confidence === "number" ? analysis.confidence.toFixed(2) : "--"}
        </span>
        <span>{analysis.timestampLabel}</span>
      </div>

      <p className="mt-1 break-all text-[11px] text-primary">{analysis.source}</p>
    </article>
  );
}

export default HistoryItem;
