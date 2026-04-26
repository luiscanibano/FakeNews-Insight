/**
 * @file DashboardHistory.jsx
 * @description Pagina de aplicacion que orquesta componentes, estados y flujos de negocio por seccion.
 */

import { useEffect, useMemo, useState } from "react";
import { BarChart3, BookOpenText, Search } from "lucide-react";
import { useAuthStore } from "../store/authStore";
import { useHistoryStore } from "../store/historyStore";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";

const PREVIEW_ITEMS_COUNT = 5;
const PAGE_SIZE = 7;

/** Asigna estilos de estado segun veredicto para chips de historial. */
const getVerdictStyles = (verdict) => {
  if (verdict === "FIABLE") {
    return "border-emerald-400/30 bg-emerald-500/15 text-emerald-200";
  }

  if (verdict === "FALSA") {
    return "border-red-400/30 bg-red-500/15 text-red-200";
  }

  return "border-amber-300/40 bg-amber-500/15 text-amber-100";
};

/** Pagina de historial guardado manualmente por el usuario autenticado. */
function DashboardHistory() {
  const user = useAuthStore((state) => state.user);
  const historyLoading = useHistoryStore((state) => state.loading);
  const historyError = useHistoryStore((state) => state.error);
  const historyItems = useHistoryStore((state) => state.items);
  const fetchHistory = useHistoryStore((state) => state.fetchHistory);

  const [searchInput, setSearchInput] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [showAllAnalyses, setShowAllAnalyses] = useState(false);

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
    }, 250);

    return () => window.clearTimeout(timeoutId);
  }, [searchInput]);

  /** Reinicia la pagina cuando cambian vista completa o filtro de busqueda. */
  useEffect(() => {
    setCurrentPage(1);
  }, [showAllAnalyses, searchTerm]);

  /** Filtra analisis por campos visibles para un buscador util al usuario final. */
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

      return haystack.includes(searchTerm);
    });
  }, [historyItems, searchTerm]);

  const totalPages = Math.max(1, Math.ceil(filteredItems.length / PAGE_SIZE));
  const safeCurrentPage = Math.min(currentPage, totalPages);

  /** Evita paginas fuera de rango cuando cambia el total de resultados. */
  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const previewItems = historyItems.slice(0, PREVIEW_ITEMS_COUNT);
  const paginatedItems = filteredItems.slice(
    (safeCurrentPage - 1) * PAGE_SIZE,
    safeCurrentPage * PAGE_SIZE
  );

  const visibleItems = showAllAnalyses ? paginatedItems : previewItems;
  const hasMoreThanPreview = historyItems.length > PREVIEW_ITEMS_COUNT;

  return (
    <section className="space-y-6">
      <div className="auth-fade-up text-center" style={{ "--auth-delay": "40ms" }}>
        <div className="dashboard-hero-title-wrap mx-auto max-w-5xl">
          <h1 className="dashboard-hero-title font-headline text-3xl font-extrabold leading-[1.08] tracking-tighter sm:text-5xl">
            <span className="landing-gradient-title">Historial de análisis</span>{" "}
            <em className="landing-title-emphasis mx-1 italic">guardados</em>
          </h1>
          <div className="dashboard-hero-underline" aria-hidden="true" />
        </div>

        <p className="mx-auto mt-3 max-w-3xl text-sm leading-relaxed text-on-surface-variant sm:text-base">
          Consulta tus verificaciones guardadas con una vista rapida de 3 analisis o abre la vista
          completa para buscar y paginar resultados.
        </p>
      </div>

      <div className="auth-fade-up landing-glass-card rounded-3xl border border-outline-variant/20 p-4 sm:p-6" style={{ "--auth-delay": "90ms" }}>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="font-headline text-xl font-bold text-on-surface sm:text-2xl">
              Registros guardados
            </h2>
            <p className="text-xs text-on-surface-variant sm:text-sm">
              {showAllAnalyses
                ? `${filteredItems.length} analisis coinciden con la busqueda.`
                : `Mostrando vista previa de ${Math.min(PREVIEW_ITEMS_COUNT, historyItems.length)} analisis.`}
            </p>
          </div>

          <div className="inline-flex items-center gap-2 rounded-full border border-outline-variant/25 bg-surface/55 px-3 py-1 text-[11px] text-on-surface-variant">
            <BookOpenText className="size-3.5 text-primary" />
            Guardado manual desde resultados
          </div>
        </div>

        {historyLoading ? (
          <p className="mt-3 text-sm text-primary">Cargando historial guardado...</p>
        ) : null}

        {historyError ? (
          <p className="mt-3 rounded-xl border border-error/30 bg-error-container/40 px-3 py-2 text-sm text-error">
            {historyError}
          </p>
        ) : null}

        {showAllAnalyses && !historyLoading ? (
          <div className="mb-4 grid gap-3 md:grid-cols-[1fr_auto] md:items-center">
            <Input
              type="search"
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder="Buscar por titulo, fragmento, fuente o veredicto..."
              className="h-10 border-outline-variant/30 bg-surface-container-high/60 text-on-surface"
            />
            <p className="text-sm text-on-surface-variant">
              Pagina {safeCurrentPage} de {totalPages}
            </p>
          </div>
        ) : null}

        <div className="space-y-3">
          {!historyLoading && historyItems.length === 0 ? (
            <div className="rounded-2xl border border-outline-variant/25 bg-surface/45 p-4 text-sm text-on-surface-variant">
              Aun no has guardado analisis en tu historial.
            </div>
          ) : null}

          {!historyLoading && showAllAnalyses && filteredItems.length === 0 ? (
            <div className="rounded-2xl border border-outline-variant/25 bg-surface/45 p-4 text-sm text-on-surface-variant">
              No hay resultados para esa busqueda. Prueba con otra palabra clave.
            </div>
          ) : null}

          {visibleItems.map((analysis) => (
            <article
              key={analysis.id}
              className="rounded-2xl border border-outline-variant/25 bg-surface/50 p-3 sm:p-4"
            >
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
                  Fuerza SVM: {typeof analysis.confidence === "number" ? analysis.confidence.toFixed(2) : "--"}
                </span>
                <span>{analysis.timestampLabel}</span>
              </div>

              <p className="mt-1 break-all text-[11px] text-primary">{analysis.source}</p>
            </article>
          ))}
        </div>

        {!historyLoading && historyItems.length > 0 ? (
          <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
              {!showAllAnalyses && hasMoreThanPreview ? (
                <Button
                  type="button"
                  className="landing-shimmer h-10 rounded-xl bg-primary px-4 text-sm font-semibold text-on-primary"
                  onClick={() => setShowAllAnalyses(true)}
                >
                  <Search className="size-4" />
                  Mostrar todos los analisis
                </Button>
              ) : null}

              {showAllAnalyses ? (
                <Button
                  type="button"
                  variant="outline"
                  className="h-10 rounded-xl"
                  onClick={() => {
                    setShowAllAnalyses(false);
                    setSearchInput("");
                  }}
                >
                  Volver a vista previa
                </Button>
              ) : null}
            </div>

            {showAllAnalyses ? (
              <div className="flex w-full items-center gap-2 sm:w-auto">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1 sm:flex-initial"
                  onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                  disabled={safeCurrentPage === 1}
                >
                  Anterior
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1 sm:flex-initial"
                  onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
                  disabled={safeCurrentPage === totalPages}
                >
                  Siguiente
                </Button>
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </section>
  );
}

export default DashboardHistory;
