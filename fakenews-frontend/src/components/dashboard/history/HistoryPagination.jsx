/**
 * @file HistoryPagination.jsx
 * @description Controles de paginación (anterior/siguiente) para la vista expandida del historial.
 */

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useTranslation } from "react-i18next";

/** Botones de paginación previa/siguiente con desactivado en extremos. */
function HistoryPagination({ currentPage, totalPages, onPrevious, onNext }) {
  const { t } = useTranslation("dashboard");
  return (
    <div className="flex w-full items-center justify-end gap-2 sm:w-auto">
      <button
        type="button"
        className="dash-btn"
        onClick={onPrevious}
        disabled={currentPage === 1}
        aria-label={t("history.previousAria")}
      >
        <ChevronLeft className="size-4" />
        {t("history.previous")}
      </button>
      <button
        type="button"
        className="dash-btn"
        onClick={onNext}
        disabled={currentPage === totalPages}
        aria-label={t("history.nextAria")}
      >
        {t("history.next")}
        <ChevronRight className="size-4" />
      </button>
    </div>
  );
}

export default HistoryPagination;
