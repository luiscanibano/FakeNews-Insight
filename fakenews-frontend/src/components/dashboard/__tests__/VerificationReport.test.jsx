/**
 * @file VerificationReport.test.jsx
 * @description Verifica que el componente renderiza veredicto global,
 *              claims, evidencias y citas numericas, asi como el cupo restante.
 */

import React from "react";
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";

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
    expect(screen.getByText("La tierra orbita el sol")).toBeInTheDocument();
    expect(screen.getByText(/Apoyado por \[1\]\./)).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /\[1\] NASA - orbita terrestre/ })
    ).toBeInTheDocument();
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
