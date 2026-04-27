/**
 * @file HistoryPagination.jsx
 * @description Controles de paginacion (anterior/siguiente) para la vista expandida del historial.
 */

import { Button } from "@/components/ui/button";

/** Botones de paginacion previa/siguiente con desactivado en extremos. */
function HistoryPagination({ currentPage, totalPages, onPrevious, onNext }) {
  return (
    <div className="flex w-full items-center gap-2 sm:w-auto">
      <Button
        type="button"
        variant="outline"
        className="flex-1 sm:flex-initial"
        onClick={onPrevious}
        disabled={currentPage === 1}
      >
        Anterior
      </Button>
      <Button
        type="button"
        variant="outline"
        className="flex-1 sm:flex-initial"
        onClick={onNext}
        disabled={currentPage === totalPages}
      >
        Siguiente
      </Button>
    </div>
  );
}

export default HistoryPagination;
