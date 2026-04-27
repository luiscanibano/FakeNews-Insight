/**
 * @file DashboardResultPanel.test.jsx
 * @description Comprueba que el panel selecciona la sub-vista correcta segun `result.kind` e `isAnalysing`.
 */

import React from "react";
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import DashboardResultPanel from "../DashboardResultPanel";

describe("<DashboardResultPanel />", () => {
  it("muestra el estado vacio cuando no hay resultado ni analisis activo", () => {
    render(<DashboardResultPanel result={null} isAnalysing={false} />);
    /** EmptyResultView muestra el copy de "Esperando tu primer analisis". */
    expect(document.body.textContent).toMatch(/esperando/i);
  });

  it("muestra estado de analisis en curso", () => {
    render(<DashboardResultPanel result={null} isAnalysing={true} />);
    expect(document.body.textContent).toMatch(/ejecutando/i);
  });

  it("muestra resultado individual cuando `result.kind` es 'single'", () => {
    const result = {
      kind: "single",
      mode: "text",
      verdictLabel: "FIABLE",
      normalizedScore: 88,
      source: "Texto pegado manualmente",
      excerpt: "Contenido analizado de prueba",
    };

    render(
      <DashboardResultPanel result={result} isAnalysing={false} onSaveResult={() => {}} />
    );

    expect(screen.getByText(/FIABLE/)).toBeInTheDocument();
  });

  it("muestra resultado batch cuando `result.kind` es 'batch'", () => {
    const result = {
      kind: "batch",
      fileName: "lote.csv",
      totalRows: 120,
      suspiciousRows: 18,
    };

    render(<DashboardResultPanel result={result} isAnalysing={false} />);

    expect(screen.getByText(/lote\.csv/)).toBeInTheDocument();
  });
});
