import { describe, expect, it } from "vitest";
import { normalizeRecentAnalysis } from "../dashboard";

describe("normalizeRecentAnalysis", () => {
  it("prioriza el texto introducido por el usuario frente al summary tecnico", () => {
    const result = normalizeRecentAnalysis(
      {
        id: "run-1",
        input_text: "Este es el texto real que introdujo el usuario para verificar una noticia.",
        summary: "Texto analizado: 1 afirmacion(es) extraida(s)",
        overall_label: "SUPPORTED",
        created_at: "2026-05-20T10:00:00Z",
      },
      0
    );

    expect(result.title).toContain("Este es el texto real que introdujo el usuario");
    expect(result.title).not.toContain("Texto analizado:");
  });

  it("normaliza lotes CSV como una entrada de actividad unica", () => {
    const result = normalizeRecentAnalysis(
      {
        id: "batch-1",
        filename: "lote.csv",
        total_rows: 12,
        processed_rows: 12,
        failed_rows: 2,
        created_at: "2026-05-20T10:00:00Z",
      },
      0
    );

    expect(result.title).toBe("lote.csv");
    expect(result.metricLabel).toContain("12/12 filas");
    expect(result.verdictLabel).toBe("CONFLICTING");
  });
});