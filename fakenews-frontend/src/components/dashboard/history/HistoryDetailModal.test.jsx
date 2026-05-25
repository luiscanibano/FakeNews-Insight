import React from "react";
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";

import "@/lib/i18n";
import HistoryDetailModal from "./HistoryDetailModal";

const sampleAnalysis = {
  id: "run-1",
  runId: "run-1",
  title: "Donald Trump warned Iran that the clock is ticking",
  timestampLabel: "18/05 11:45",
  report: {
    run_id: "run-1",
    veredicto_global: "NOT_ENOUGH_INFO",
    resumen: "No hay evidencia suficiente para confirmar ni refutar.",
    model_version: "fever-stub-v0",
    duracion_ms: 42,
    claims: [
      {
        id: "claim-1",
        texto: "Trump warned Iran that the clock is ticking.",
        veredicto: "NOT_ENOUGH_INFO",
        confianza: 0.56,
        razonamiento: "Apoyado parcialmente por [1].",
        evidencias: [
          {
            url: "https://example.org/story",
            titulo: "Example story",
            snippet: "Snippet",
            nli_label: "NOT ENOUGH INFO",
            nli_score: 0.56,
          },
        ],
      },
    ],
  },
};

describe("<HistoryDetailModal />", () => {
  it("muestra el informe FEVER en un modal separado", () => {
    render(<HistoryDetailModal analysis={sampleAnalysis} isOpen onClose={() => {}} />);

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText(/Cómo leer el resultado/i)).toBeInTheDocument();
    expect(screen.getByText(/Afirmaciones extraídas/i)).toBeInTheDocument();
  });

  it("permite cerrar el modal", () => {
    const onClose = vi.fn();
    render(<HistoryDetailModal analysis={sampleAnalysis} isOpen onClose={onClose} />);

    fireEvent.click(screen.getByRole("button", { name: /Cerrar detalle/i }));

    expect(onClose).toHaveBeenCalled();
  });

  it("muestra el resumen de un lote CSV guardado", () => {
    render(
      <HistoryDetailModal
        analysis={{
          id: "batch-1",
          batchId: "batch-1",
          kind: "batch",
          title: "lote.csv",
          timestampLabel: "18/05 11:45",
          batchResult: {
            kind: "batch",
            fileName: "lote.csv",
            totalRows: 12,
            processedRows: 12,
            successRows: 10,
            failedRows: 2,
            items: [{ row_index: 1, status: "completed", overall_label: "SUPPORTED" }],
            batchId: "batch-1",
          },
        }}
        isOpen
        onClose={() => {}}
      />
    );

    expect(screen.getByText(/lote procesado/i)).toBeInTheDocument();
    expect(screen.getByText(/12 textos analizados/i)).toBeInTheDocument();
  });
});