import React from "react";
import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

import "@/lib/i18n";
import PasswordChangeSection from "./PasswordChangeSection";

describe("<PasswordChangeSection />", () => {
  it("oculta el formulario y muestra el mensaje de Google para cuentas OAuth-only", () => {
    render(
      <PasswordChangeSection
        isOauthOnly
        primaryOauthLabel="Google"
        primaryOauthUrl="https://myaccount.google.com/security"
        onChangePassword={vi.fn()}
        onSubmittingChange={vi.fn()}
      />
    );

    expect(screen.getByText("Contraseña gestionada por Google")).toBeInTheDocument();
    expect(
      screen.getByText(/Tu cuenta se registró con Google, así que no puedes cambiar la contraseña desde aquí/i)
    ).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /actualizar contraseña/i })).not.toBeInTheDocument();
  });

  it("mantiene el formulario clásico para cuentas con email y contraseña", () => {
    render(
      <PasswordChangeSection
        isOauthOnly={false}
        primaryOauthLabel={null}
        primaryOauthUrl={null}
        onChangePassword={vi.fn()}
        onSubmittingChange={vi.fn()}
      />
    );

    expect(screen.getByText("Cambiar contraseña")).toBeInTheDocument();
    expect(screen.getByLabelText(/contraseña actual/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /actualizar contraseña/i })).toBeInTheDocument();
  });

  it("permite mostrar y ocultar las contraseñas del formulario", () => {
    render(
      <PasswordChangeSection
        isOauthOnly={false}
        primaryOauthLabel={null}
        primaryOauthUrl={null}
        onChangePassword={vi.fn()}
        onSubmittingChange={vi.fn()}
      />
    );

    const currentPasswordInput = screen.getByLabelText(/contraseña actual/i);
    const newPasswordInput = screen.getByLabelText(/nueva contraseña/i);

    expect(currentPasswordInput).toHaveAttribute("type", "password");
    expect(newPasswordInput).toHaveAttribute("type", "password");

    fireEvent.click(screen.getAllByRole("button", { name: /mostrar|ocultar/i })[0]);

    expect(currentPasswordInput).toHaveAttribute("type", "text");
    expect(newPasswordInput).toHaveAttribute("type", "text");
  });
});