import React from "react";
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";

import "@/lib/i18n";
import HistoryItem from "./HistoryItem";

const sampleAnalysis = {
  id: "run-1",
  runId: "run-1",
  title: "Donald Trump warned Iran that the clock is ticking",
  excerpt: "Donald Trump warned Iran that the clock is ticking as talks stalled.",
  source: null,
  verdictLabel: "NOT_ENOUGH_INFO",
  confidence: null,
  modelVersion: "fever-stub-v0",
  timestampLabel: "18/05 11:45",
  claimsCount: 1,
  summary: "No hay evidencia suficiente para confirmar ni refutar.",
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

describe("<HistoryItem />", () => {
  it("abre el detalle del historial en una vista separada", () => {
    const onOpenDetails = vi.fn();
    render(<HistoryItem analysis={sampleAnalysis} onOpenDetails={onOpenDetails} />);

    fireEvent.click(screen.getAllByRole("button", { name: /Donald Trump warned Iran/i })[0]);

    expect(onOpenDetails).toHaveBeenCalledWith(sampleAnalysis);
  });

  it("permite eliminar una entrada del historial", () => {
    const onDelete = vi.fn();
    render(<HistoryItem analysis={sampleAnalysis} onDelete={onDelete} />);

    fireEvent.click(screen.getByRole("button", { name: /Eliminar .* del historial/i }));

    expect(onDelete).toHaveBeenCalledWith(sampleAnalysis);
  });
});