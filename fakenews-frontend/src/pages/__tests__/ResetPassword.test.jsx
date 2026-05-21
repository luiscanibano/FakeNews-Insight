import React from "react";
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

const { getCurrentSessionMock } = vi.hoisted(() => ({
  getCurrentSessionMock: vi.fn().mockResolvedValue(null),
}));

const setRecoverySessionMock = vi.fn().mockResolvedValue(undefined);
const updatePasswordMock = vi.fn().mockResolvedValue(undefined);
const clearErrorMock = vi.fn();

const mockState = {
  setRecoverySession: setRecoverySessionMock,
  updatePassword: updatePasswordMock,
  loading: false,
  error: "",
  clearError: clearErrorMock,
};

vi.mock("../../store/authStore", () => ({
  useAuthStore: (selector) => selector(mockState),
}));

vi.mock("../../services/auth", () => ({
  getCurrentSession: getCurrentSessionMock,
}));

import ResetPassword from "../ResetPassword";

describe("<ResetPassword />", () => {
  const originalHash = window.location.hash;

  beforeEach(() => {
    setRecoverySessionMock.mockClear();
    updatePasswordMock.mockClear();
    clearErrorMock.mockClear();
    getCurrentSessionMock.mockClear();
    getCurrentSessionMock.mockResolvedValue(null);
    mockState.error = "";
    mockState.loading = false;
    window.history.replaceState(
      {},
      "",
      "/reset-password#type=recovery&access_token=test-access&refresh_token=test-refresh"
    );
  });

  afterEach(() => {
    window.location.hash = originalHash;
  });

  it("bloquea contraseñas débiles antes de invocar updatePassword", async () => {
    render(
      <MemoryRouter>
        <ResetPassword />
      </MemoryRouter>
    );

    const passwordInput = await screen.findByLabelText(/nueva contraseña/i);

    fireEvent.change(passwordInput, { target: { value: "weakpass" } });
    fireEvent.change(screen.getByLabelText(/confirmar contraseña/i), {
      target: { value: "weakpass" },
    });

    fireEvent.click(screen.getByRole("button", { name: /actualizar contraseña/i }));

    expect(updatePasswordMock).not.toHaveBeenCalled();
    expect(screen.getByRole("alert")).toHaveTextContent(/mayúscula|número|minúscula/i);
  });

  it("permite mostrar y ocultar la contraseña en recovery", async () => {
    render(
      <MemoryRouter>
        <ResetPassword />
      </MemoryRouter>
    );

    const passwordInput = await screen.findByLabelText(/nueva contraseña/i);
    expect(passwordInput).toHaveAttribute("type", "password");

    fireEvent.click(screen.getAllByRole("button", { name: /mostrar|ocultar/i })[0]);

    expect(passwordInput).toHaveAttribute("type", "text");
  });

  it("acepta el flujo de producción cuando Supabase ya ha establecido la sesión", async () => {
    window.location.hash = "";
    window.history.replaceState({}, "", "/reset-password?code=recovery-code");
    getCurrentSessionMock.mockResolvedValue({ user: { id: "user-1" } });

    render(
      <MemoryRouter>
        <ResetPassword />
      </MemoryRouter>
    );

    const passwordInput = await screen.findByLabelText(/nueva contraseña/i);

    expect(passwordInput).not.toBeDisabled();
    expect(screen.queryByText(/inválido|ha expirado/i)).not.toBeInTheDocument();
    expect(setRecoverySessionMock).not.toHaveBeenCalled();
  });
});