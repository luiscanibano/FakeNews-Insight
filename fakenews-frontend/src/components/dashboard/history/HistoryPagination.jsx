/**
 * @file HistoryPagination.jsx
 * @description Controles de paginación (anterior/siguiente) para la vista expandida del historial.
 */

import { ChevronLeft, ChevronRight } from "lucide-react";

/** Botones de paginación previa/siguiente con desactivado en extremos. */
function HistoryPagination({ currentPage, totalPages, onPrevious, onNext }) {
  return (
    <div className="flex w-full items-center justify-end gap-2 sm:w-auto">
      <button
        type="button"
        className="dash-btn"
        onClick={onPrevious}
        disabled={currentPage === 1}
        aria-label="Página anterior"
      >
        <ChevronLeft className="size-4" />
        Anterior
      </button>
      <button
        type="button"
        className="dash-btn"
        onClick={onNext}
        disabled={currentPage === totalPages}
        aria-label="Página siguiente"
      >
        Siguiente
        <ChevronRight className="size-4" />
      </button>
    </div>
  );
}

export default HistoryPagination;
