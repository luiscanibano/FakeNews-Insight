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

class IdleIntersectionObserver {
  observe() {}

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

  it("mantiene visible el footer al cambiar de idioma aunque el observer no vuelva a dispararse", async () => {
    const originalObserver = window.IntersectionObserver;
    window.IntersectionObserver = IdleIntersectionObserver;

    try {
      render(
        <MemoryRouter>
          <Landing />
        </MemoryRouter>
      );

      await act(async () => {
        await i18n.changeLanguage("en");
      });

      const footerDescription = screen.getByText(
        "We use AI, web evidence and NLI inference to verify claims in a traceable way."
      );

      expect(footerDescription.closest("[class*='landing-reveal']")).toHaveClass("in-view");
    } finally {
      window.IntersectionObserver = originalObserver;
    }
  });

  it("revela el footer al hacer scroll despues de cambiar el idioma aunque el observer falle", async () => {
    const originalObserver = window.IntersectionObserver;
    const originalInnerHeight = window.innerHeight;
    const originalGetBoundingClientRect = HTMLElement.prototype.getBoundingClientRect;

    let footerTop = 1400;

    window.IntersectionObserver = IdleIntersectionObserver;
    window.innerHeight = 900;
    HTMLElement.prototype.getBoundingClientRect = function mockGetBoundingClientRect() {
      const text = this.textContent || "";

      if (text.includes("We use AI, web evidence and NLI inference to verify claims in a traceable way.")) {
        return {
          x: 0,
          y: footerTop,
          top: footerTop,
          bottom: footerTop + 180,
          left: 0,
          right: 900,
          width: 900,
          height: 180,
          toJSON: () => ({}),
        };
      }

      return {
        x: 0,
        y: 1200,
        top: 1200,
        bottom: 1380,
        left: 0,
        right: 900,
        width: 900,
        height: 180,
        toJSON: () => ({}),
      };
    };

    try {
      render(
        <MemoryRouter>
          <Landing />
        </MemoryRouter>
      );

      await act(async () => {
        await i18n.changeLanguage("en");
      });

      const footerDescription = screen.getByText(
        "We use AI, web evidence and NLI inference to verify claims in a traceable way."
      );
      const footerContainer = footerDescription.closest("[class*='landing-reveal']");

      expect(footerContainer).not.toHaveClass("in-view");

      footerTop = 640;

      await act(async () => {
        window.dispatchEvent(new Event("scroll"));
      });

      expect(footerContainer).toHaveClass("in-view");
    } finally {
      window.IntersectionObserver = originalObserver;
      window.innerHeight = originalInnerHeight;
      HTMLElement.prototype.getBoundingClientRect = originalGetBoundingClientRect;
    }
  });
});