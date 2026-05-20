/**
 * @file DashboardHistory.jsx
 * @description Página del dashboard que orquesta carga, filtrado y paginacion del historial guardado.
 */

import { useEffect, useMemo, useState } from "react";
import { BookOpenText, Search } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useAuthStore } from "../store/authStore";
import { useHistoryStore } from "../store/historyStore";
import HistoryItem from "../components/dashboard/history/HistoryItem";
import HistoryDetailModal from "../components/dashboard/history/HistoryDetailModal";
import HistoryFilters from "../components/dashboard/history/HistoryFilters";
import HistoryPagination from "../components/dashboard/history/HistoryPagination";

const PREVIEW_ITEMS_COUNT = 5;
const PAGE_SIZE = 7;
const SEARCH_DEBOUNCE_MS = 250;

/** Página de historial guardado manualmente por el usuario autenticado. */
function DashboardHistory() {
  const { t } = useTranslation("dashboard");
  const user = useAuthStore((state) => state.user);
  const historyLoading = useHistoryStore((state) => state.loading);
  const historyError = useHistoryStore((state) => state.error);
  const historyItems = useHistoryStore((state) => state.items);
  const fetchHistory = useHistoryStore((state) => state.fetchHistory);
  const deleteHistoryItem = useHistoryStore((state) => state.deleteHistoryItem);
  const deleteLoadingId = useHistoryStore((state) => state.deleteLoadingId);

  const [searchInput, setSearchInput] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [showAllAnalyses, setShowAllAnalyses] = useState(false);
  const [selectedAnalysis, setSelectedAnalysis] = useState(null);

  useEffect(() => {
    if (!user?.id) {
      return;
    }

    fetchHistory({ userId: user.id });
  }, [user?.id, fetchHistory]);

  /** Debounce de busqueda para reducir calculos y evitar saltos al teclear. */
  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setSearchTerm(searchInput.trim().toLowerCase());
      setCurrentPage(1);
    }, SEARCH_DEBOUNCE_MS);

    return () => window.clearTimeout(timeoutId);
  }, [searchInput]);

  /** Filtra análisis por campos visibles para un buscador util al usuario final. */
  const filteredItems = useMemo(() => {
    if (!searchTerm) {
      return historyItems;
    }

    return historyItems.filter((analysis) => {
      const haystack = [
        analysis.title,
        analysis.excerpt,
        analysis.source,
        analysis.verdictLabel,
        analysis.timestampLabel,
      ]
        .join(" ")
        .toLowerCase();

      const reportHaystack = [
        analysis.summary,
        analysis.report?.resumen,
        ...(analysis.report?.claims || []).map((claim) => claim.texto),
        ...(analysis.report?.claims || []).flatMap((claim) =>
          (claim.evidencias || []).map((evidence) => evidence.titulo || evidence.url)
        ),
      ]
        .join(" ")
        .toLowerCase();

      return haystack.includes(searchTerm) || reportHaystack.includes(searchTerm);
    });
  }, [historyItems, searchTerm]);

  const handleDeleteHistoryItem = async (analysis) => {
    if (selectedAnalysis?.id === analysis.id) {
      setSelectedAnalysis(null);
    }
    await deleteHistoryItem({ runId: analysis.runId || analysis.id });
  };

  const totalPages = Math.max(1, Math.ceil(filteredItems.length / PAGE_SIZE));
  const safeCurrentPage = Math.min(currentPage, totalPages);

  const previewItems = historyItems.slice(0, PREVIEW_ITEMS_COUNT);
  const paginatedItems = filteredItems.slice(
    (safeCurrentPage - 1) * PAGE_SIZE,
    safeCurrentPage * PAGE_SIZE
  );

  const visibleItems = showAllAnalyses ? paginatedItems : previewItems;
  const hasMoreThanPreview = historyItems.length > PREVIEW_ITEMS_COUNT;

  const handleBackToPreview = () => {
    setShowAllAnalyses(false);
    setSearchInput("");
    setCurrentPage(1);
  };

  const handleShowAllChange = (nextValue) => {
    setShowAllAnalyses(nextValue);
    setCurrentPage(1);
  };

  return (
    <section className="space-y-8">
      <div className="dash-in" style={{ "--i": 0 }}>
        <span className="dash-home-eyebrow">
          <span className="dash-home-eyebrow-dot" aria-hidden="true" />
          {t("history.eyebrow")}
        </span>

        <h1 className="dash-home-h1 mt-3">
          {t("history.titlePrefix")}{" "}
          <span className="dash-home-h1-soft">{t("history.titleSoft")}</span>
        </h1>

        <p className="dash-home-sub">
          {t("history.subtitle")}
        </p>
      </div>

      <div className="dash-in dash-panel" style={{ "--i": 1 }}>
        <header className="dash-panel-head flex-wrap">
          <div>
            <h2 className="dash-panel-title">{t("history.savedRecords")}</h2>
            <p className="dash-panel-meta">
              {showAllAnalyses
                ? t("history.matchesFound", { count: filteredItems.length })
                : t("history.previewMeta", {
                    count: Math.min(PREVIEW_ITEMS_COUNT, historyItems.length),
                  })}
            </p>
          </div>

          <span className="dash-pill">
            <BookOpenText className="size-3.5" />
            {t("history.historyModel")}
          </span>
        </header>

        {historyLoading ? (
          <p className="dash-panel-meta">{t("history.loadingHistory")}</p>
        ) : null}

        {historyError ? (
          <p className="dash-alert dash-alert-error mt-2">{historyError}</p>
        ) : null}

        {showAllAnalyses && !historyLoading ? (
          <HistoryFilters
            searchInput={searchInput}
            onSearchInputChange={setSearchInput}
            currentPage={safeCurrentPage}
            totalPages={totalPages}
          />
        ) : null}

        <div className="dash-list">
          {!historyLoading && historyItems.length === 0 ? (
            <div className="dash-list-empty">
              {t("history.emptyHistory")}
            </div>
          ) : null}

          {!historyLoading && showAllAnalyses && filteredItems.length === 0 ? (
            <div className="dash-list-empty">
              {t("history.emptySearch")}
            </div>
          ) : null}

          {visibleItems.map((analysis, index) => (
            <HistoryItem
              key={analysis.id}
              analysis={analysis}
              index={index}
              onDelete={handleDeleteHistoryItem}
              onOpenDetails={setSelectedAnalysis}
              isDeleting={deleteLoadingId === (analysis.runId || analysis.id)}
            />
          ))}
        </div>

        {!historyLoading && historyItems.length > 0 ? (
          <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
              {!showAllAnalyses && hasMoreThanPreview ? (
                <button
                  type="button"
                  className="dash-cta"
                  onClick={() => handleShowAllChange(true)}
                >
                  <Search className="size-4" />
                  {t("history.showAll")}
                </button>
              ) : null}

              {showAllAnalyses ? (
                <button type="button" className="dash-btn" onClick={handleBackToPreview}>
                  {t("history.backToPreview")}
                </button>
              ) : null}
            </div>

            {showAllAnalyses ? (
              <HistoryPagination
                currentPage={safeCurrentPage}
                totalPages={totalPages}
                onPrevious={() => setCurrentPage((page) => Math.max(1, page - 1))}
                onNext={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
              />
            ) : null}
          </div>
        ) : null}
      </div>

      <HistoryDetailModal
        analysis={selectedAnalysis}
        isOpen={Boolean(selectedAnalysis)}
        onClose={() => setSelectedAnalysis(null)}
      />
    </section>
  );
}

export default DashboardHistory;
