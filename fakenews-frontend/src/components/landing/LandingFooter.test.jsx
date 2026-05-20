import React from "react";
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";

import LandingFooter from "./LandingFooter";
import { landingFooterContent } from "./content/landingFooterContent";

describe("<LandingFooter />", () => {
  it("actualiza los enlaces del footer con legales, contacto y solo LinkedIn", () => {
    render(<LandingFooter content={landingFooterContent.es} />);

    expect(screen.queryByText("API")).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Política de privacidad" })).toHaveAttribute("href", "/privacy");
    expect(screen.getByRole("link", { name: "Términos y condiciones" })).toHaveAttribute("href", "/terms");
    expect(screen.getByRole("link", { name: "fakenewsinsight@gmail.com" })).toHaveAttribute("href", "mailto:fakenewsinsight@gmail.com");
    expect(screen.queryByText("Twitter")).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "LinkedIn" })).toHaveAttribute(
      "href",
      "https://www.linkedin.com/in/luis-ca%C3%B1ibano-mateos-7a403139a?originalSubdomain=es"
    );
  });
});