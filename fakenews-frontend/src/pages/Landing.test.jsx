import React from "react";
import { act } from "react";
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

import "@/lib/i18n";
import i18n from "@/lib/i18n";
import Landing from "./Landing";

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useNavigate: () => vi.fn(),
  };
});

class ImmediateIntersectionObserver {
  constructor(callback) {
    this.callback = callback;
  }

  observe(target) {
    this.callback([{ isIntersecting: true, target }]);
  }

  unobserve() {}

  disconnect() {}
}

describe("<Landing />", () => {
  it("mantiene visibles las tarjetas de 'Contraste sin fricciones' al cambiar de ingles a español", async () => {
    const originalObserver = window.IntersectionObserver;
    window.IntersectionObserver = ImmediateIntersectionObserver;

    try {
      render(
        <MemoryRouter>
          <Landing />
        </MemoryRouter>
      );

      await act(async () => {
        await i18n.changeLanguage("en");
      });

      await act(async () => {
        await i18n.changeLanguage("es");
      });

      const browserCard = screen.getByText("Integración en tu navegador").closest("[class*='landing-reveal']");
      const historyCard = screen.getByText("Historial y Estadísticas").closest("[class*='landing-reveal']");

      expect(browserCard).toHaveClass("in-view");
      expect(historyCard).toHaveClass("in-view");
    } finally {
      window.IntersectionObserver = originalObserver;
    }
  });
});