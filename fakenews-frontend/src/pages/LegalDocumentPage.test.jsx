import React from "react";
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

import "@/lib/i18n";
import LegalDocumentPage from "./LegalDocumentPage";

describe("<LegalDocumentPage />", () => {
  it("renderiza la política de privacidad en español", () => {
    render(
      <MemoryRouter>
        <LegalDocumentPage documentKey="privacy" />
      </MemoryRouter>
    );

    expect(screen.getByRole("heading", { level: 1, name: /Política de privacidad/i })).toBeInTheDocument();
    expect(screen.getAllByText(/fakenewsinsight@gmail.com/i)).toHaveLength(2);
  });

  it("renderiza los términos y condiciones", () => {
    render(
      <MemoryRouter>
        <LegalDocumentPage documentKey="terms" />
      </MemoryRouter>
    );

    expect(screen.getByRole("heading", { level: 1, name: /Términos y condiciones/i })).toBeInTheDocument();
    expect(screen.getByText(/Objeto del servicio/i)).toBeInTheDocument();
  });
});