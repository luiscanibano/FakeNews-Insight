import React from "react";
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";

import "@/lib/i18n";
import LanguageSwitcher from "./LanguageSwitcher";

describe("<LanguageSwitcher />", () => {
  it("mantiene el trigger compacto con globo y abreviatura en todos los tamaños", () => {
    render(<LanguageSwitcher />);

    const trigger = screen.getByRole("button", { name: /idioma/i });
    const container = trigger.parentElement;
    const compactLabel = screen.getByText("ES");

    expect(container).toHaveClass("right-3", "top-3", "sm:right-4", "sm:top-4");
    expect(compactLabel).toBeVisible();
    expect(screen.queryByText("🇪🇸")).not.toBeInTheDocument();
    expect(trigger).not.toHaveTextContent(/español/i);
  });
});