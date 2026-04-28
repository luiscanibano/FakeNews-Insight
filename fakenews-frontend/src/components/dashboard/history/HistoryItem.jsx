/**
 * @file HistoryItem.jsx
 * @description Tarjeta visual de un análisis guardado en el historial del usuario.
 */

import { ArrowUpRight } from "lucide-react";
import { getVerdictClass } from "./historyVerdict";

/** Render unitario de un análisis con titulo, veredicto, fragmento y metadatos. */
function HistoryItem({ analysis, index = 0 }) {
  return (
    <article
      className="dash-list-row dash-in"
      style={{ "--i": Math.min(index, 6) }}
    >
      <div className="min-w-0">
        <div className="dash-list-row-title">
          <ArrowUpRight className="size-3.5 text-on-surface-variant" aria-hidden="true" />
          <span className="truncate">{analysis.title}</span>
        </div>

        {analysis.excerpt ? (
          <p className="mt-1 truncate text-xs text-on-surface-variant/80">
            {analysis.excerpt}
          </p>
        ) : null}

        <div className="dash-list-row-meta">
          <span>
            SVM{" "}
            {typeof analysis.confidence === "number"
              ? analysis.confidence.toFixed(2)
              : "--"}
          </span>
          <span>{analysis.timestampLabel}</span>
          {analysis.source ? (
            <a
              href={analysis.source}
              target="_blank"
              rel="noopener noreferrer"
              className="dash-link truncate"
            >
              {analysis.source}
            </a>
          ) : null}
        </div>
      </div>

      <span className={`dash-verdict ${getVerdictClass(analysis.verdictLabel)}`}>
        <span className="dash-verdict-dot" aria-hidden="true" />
        {analysis.verdictLabel}
      </span>
    </article>
  );
}

export default HistoryItem;
