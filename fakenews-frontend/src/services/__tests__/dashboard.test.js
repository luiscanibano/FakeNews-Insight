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
});