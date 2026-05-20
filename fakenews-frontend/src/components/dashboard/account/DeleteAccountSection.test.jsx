import React from "react";
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";

import "@/lib/i18n";
import DeleteAccountSection from "./DeleteAccountSection";

describe("<DeleteAccountSection />", () => {
  it("muestra DELETE como palabra de confirmacion independientemente del idioma", () => {
    render(<DeleteAccountSection onDeleteAccount={vi.fn()} />);

    expect(screen.getByText("DELETE")).toBeInTheDocument();
    expect(screen.getByText(/suscripciones activas/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/DELETE/i)).toBeInTheDocument();
  });

  it("bloquea el envio si la confirmacion no es DELETE", () => {
    const onDeleteAccount = vi.fn();
    render(<DeleteAccountSection onDeleteAccount={onDeleteAccount} />);

    fireEvent.change(screen.getByLabelText(/confirmaci/i), {
      target: { value: "ELIMINAR" },
    });
    fireEvent.click(screen.getByRole("button", { name: /eliminar mi cuenta/i }));

    expect(onDeleteAccount).not.toHaveBeenCalled();
    expect(screen.getByText(/escribe DELETE/i)).toBeInTheDocument();
  });
});