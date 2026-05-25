/**
 * @file HistoryDetailModal.jsx
 * @description Modal que muestra el detalle completo de una verificación FEVER guardada.
 */

import { useEffect } from "react";
import { X } from "lucide-react";
import { useTranslation } from "react-i18next";
import VerificationReport from "../VerificationReport";
import BatchResultView from "../result/BatchResultView";

function HistoryDetailModal({ analysis, isOpen, onClose }) {
  const { t } = useTranslation("dashboard");

  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleEscape = (event) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleEscape);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen, onClose]);

  if (!isOpen || !analysis) {
    return null;
  }

  const modalTitle = analysis.title || t("history.modalTitleFallback");
  const reportIdPrefix = `history-modal-${analysis.runId || analysis.id || "report"}`;

  return (
    <div
      className="dash-modal-overlay dash-modal-overlay-nav-safe"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <section className="dash-modal dash-modal-lg dash-modal-nav-safe" role="dialog" aria-modal="true" aria-labelledby="history-detail-modal-title">
        <div className="dash-modal-head">
          <div>
            <span className="dash-home-eyebrow">
              <span className="dash-home-eyebrow-dot" aria-hidden="true" />
              {t("history.modalEyebrow")}
            </span>
            <h2 id="history-detail-modal-title" className="dash-home-h1 mt-3" style={{ fontSize: "clamp(1.4rem, 2.7vw, 1.9rem)" }}>
              {modalTitle}
            </h2>
            <p className="dash-home-sub" style={{ marginTop: "0.4rem" }}>
              {analysis.timestampLabel}
            </p>
          </div>
          <button
            type="button"
            className="dash-modal-close"
            onClick={onClose}
            aria-label={t("history.closeDetailsAria")}
          >
            <X className="size-4" />
          </button>
        </div>

        {analysis.kind === "batch" ? (
          <BatchResultView result={analysis.batchResult} />
        ) : (
          <VerificationReport report={analysis.report} idPrefix={reportIdPrefix} />
        )}
      </section>
    </div>
  );
}

export default HistoryDetailModal;