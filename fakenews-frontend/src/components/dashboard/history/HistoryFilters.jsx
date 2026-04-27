/**
 * @file HistoryFilters.jsx
 * @description Buscador y indicador de paginacion para la vista expandida del historial.
 */

import { Input } from "@/components/ui/input";

/** Buscador con campo de texto y resumen de pagina actual sobre el total. */
function HistoryFilters({ searchInput, onSearchInputChange, currentPage, totalPages }) {
  return (
    <div className="mb-4 grid gap-3 md:grid-cols-[1fr_auto] md:items-center">
      <Input
        type="search"
        value={searchInput}
        onChange={(event) => onSearchInputChange(event.target.value)}
        placeholder="Buscar por titulo, fragmento, fuente o veredicto..."
        className="h-10 border-outline-variant/30 bg-surface-container-high/60 text-on-surface"
      />
      <p className="text-sm text-on-surface-variant">
        Pagina {currentPage} de {totalPages}
      </p>
    </div>
  );
}

export default HistoryFilters;
