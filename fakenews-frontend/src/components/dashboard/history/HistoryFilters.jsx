/**
 * @file HistoryFilters.jsx
 * @description Buscador y indicador de paginación para la vista expandida del historial.
 */

import { Search } from "lucide-react";
import { useTranslation } from "react-i18next";

/** Buscador con campo de texto y resumen de página actual sobre el total. */
function HistoryFilters({ searchInput, onSearchInputChange, currentPage, totalPages }) {
  const { t } = useTranslation("dashboard");
  return (
    <div className="my-4 grid gap-3 md:grid-cols-[1fr_auto] md:items-center">
      <div className="dash-input-shell flex items-center gap-2 px-3">
        <Search className="size-4 text-on-surface-variant" aria-hidden="true" />
        <input
          type="search"
          value={searchInput}
          onChange={(event) => onSearchInputChange(event.target.value)}
          placeholder={t("history.filterPlaceholder")}
          className="dash-textarea !min-h-0 !py-2 !px-0 text-sm"
          style={{ minHeight: 0, height: "2.4rem", padding: "0.4rem 0", resize: "none" }}
        />
      </div>
      <p className="dash-panel-meta">
        {t("history.pageOf", { current: currentPage, total: totalPages })}
      </p>
    </div>
  );
}

export default HistoryFilters;
