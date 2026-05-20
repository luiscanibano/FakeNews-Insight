/**
 * @file VerificationReport.test.jsx
 * @description Verifica que el componente renderiza veredicto global,
 *              claims, evidencias y citas numericas, asi como el cupo restante.
 */

import React from "react";
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";

import "@/lib/i18n";
import VerificationReport from "../VerificationReport";

const sampleReport = {
  run_id: "abc",
  veredicto_global: "SUPPORTED",
  resumen: "1 afirmacion verificada.",
  model_version: "fever-stub-v0",
  duracion_ms: 42,
  verificaciones_restantes_hoy: 9,
  limite_diario: 10,
  claims: [
    {
      id: "c1",
      texto: "La tierra orbita el sol",
      veredicto: "SUPPORTED",
      confianza: 0.91,
      razonamiento: "Apoyado por [1].",
      evidencias: [
        {
          url: "https://example.org/orbita",
          titulo: "NASA - orbita terrestre",
          snippet: "La Tierra completa una orbita en 365 dias.",
          nli_label: "SUPPORTS",
          nli_score: 0.93,
        },
      ],
    },
  ],
};

describe("<VerificationReport />", () => {
  it("renderiza veredicto global, modelo y cupo restante", () => {
    render(<VerificationReport report={sampleReport} />);
    expect(screen.getByRole("heading", { level: 2 })).toBeInTheDocument();
    expect(screen.getByText(/Veredicto global/i)).toBeInTheDocument();
    expect(screen.getByText("fever-stub-v0")).toBeInTheDocument();
    expect(screen.getByText("9 / 10")).toBeInTheDocument();
  });

  it("explica las etiquetas FEVER/NLI del informe", () => {
    render(<VerificationReport report={sampleReport} />);
    expect(screen.getByText(/Cómo leer el resultado/i)).toBeInTheDocument();
    expect(screen.getByText(/No significa que sea falso/i)).toBeInTheDocument();
    expect(screen.getByText(/no una probabilidad absoluta/i)).toBeInTheDocument();
  });

  it("renderiza claims con cita numerica y evidencias", () => {
    render(<VerificationReport report={sampleReport} />);
    expect(screen.getByRole("heading", { level: 3, name: /Afirmaciones extraídas/i })).toBeInTheDocument();
    expect(screen.getByText(/Estas son las afirmaciones concretas/i)).toBeInTheDocument();
    expect(screen.getByText("La tierra orbita el sol")).toBeInTheDocument();
    expect(screen.getByText(/Apoyado por \[1\]\./)).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /\[1\] NASA - orbita terrestre/ })
    ).toBeInTheDocument();
    expect(
      screen.queryByText(/La Tierra completa una orbita en 365 dias\./i)
    ).not.toBeInTheDocument();
    expect(screen.queryByText(/^Apoya\s*\(93%\)$/i)).not.toBeInTheDocument();
  });

  it("muestra guardado manual para verificaciones cuando recibe callback", () => {
    render(
      <VerificationReport
        report={sampleReport}
        onSaveResult={() => {}}
        savedInHistory={false}
      />
    );

    expect(screen.getByRole("button", { name: /Guardar en historial/i })).toBeInTheDocument();
  });

  it("permite guardar cuando el run id llega fuera del report", () => {
    const onSaveResult = vi.fn();
    const reportWithoutRunId = {
      ...sampleReport,
      run_id: undefined,
    };

    render(
      <VerificationReport
        report={reportWithoutRunId}
        runId="run-123"
        onSaveResult={onSaveResult}
        savedInHistory={false}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: /Guardar en historial/i }));

    expect(onSaveResult).toHaveBeenCalledTimes(1);
  });

  it("permite guardar aunque el report no traiga run_id", () => {
    const onSaveResult = vi.fn();
    const reportWithoutRunId = {
      ...sampleReport,
      run_id: undefined,
    };

    render(
      <VerificationReport
        report={reportWithoutRunId}
        onSaveResult={onSaveResult}
        savedInHistory={false}
      />
    );

    const button = screen.getByRole("button", { name: /Guardar en historial/i });
    expect(button).not.toBeDisabled();

    fireEvent.click(button);

    expect(onSaveResult).toHaveBeenCalledTimes(1);
  });

  it("aplica color explicito a las etiquetas FEVER visibles", () => {
    render(<VerificationReport report={sampleReport} />);
    expect(screen.getByRole("heading", { level: 2 })).toHaveClass("text-emerald-300");
    expect(screen.getByText("Refutado", { selector: "dt" })).toHaveClass("text-rose-300");
    expect(screen.getByText("Información insuficiente", { selector: "dt" })).toHaveClass("text-white");
  });

  it("muestra mensaje cuando un claim no tiene evidencias", () => {
    const report = {
      ...sampleReport,
      claims: [
        {
          ...sampleReport.claims[0],
          evidencias: [],
        },
      ],
    };
    render(<VerificationReport report={report} />);
    expect(
      screen.getByText(/Sin evidencias web suficientes/i)
    ).toBeInTheDocument();
  });

  it("devuelve null cuando no hay reporte", () => {
    const { container } = render(<VerificationReport report={null} />);
    expect(container.firstChild).toBeNull();
  });
});
