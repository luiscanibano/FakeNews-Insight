/**
 * @file Login.test.jsx
 * @description Verifica que el formulario de login invoca la accion `login` del store con los datos introducidos.
 */

import React from "react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

const loginMock = vi.fn().mockResolvedValue(undefined);
const clearErrorMock = vi.fn();
const signInWithGoogleMock = vi.fn();

/** Estado mutable compartido por todos los selectores del store mockeado. */
const mockState = {
  login: loginMock,
  loading: false,
  error: "",
  clearError: clearErrorMock,
  signInWithGoogle: signInWithGoogleMock,
};

vi.mock("../../store/authStore", () => ({
  useAuthStore: (selector) => selector(mockState),
}));

import Login from "../Login";

describe("<Login />", () => {
  beforeEach(() => {
    loginMock.mockClear();
    clearErrorMock.mockClear();
    mockState.error = "";
    mockState.loading = false;
  });

  it("envia email y password al store al hacer submit", async () => {
    render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>
    );

    fireEvent.change(screen.getByLabelText(/correo/i), {
      target: { value: "user@test.com" },
    });
    fireEvent.change(screen.getByLabelText(/contraseña/i), {
      target: { value: "supersecret" },
    });

    fireEvent.click(screen.getByRole("button", { name: /entrar/i }));

    expect(loginMock).toHaveBeenCalledTimes(1);
    expect(loginMock).toHaveBeenCalledWith({
      email: "user@test.com",
      password: "supersecret",
    });
  });

  it("muestra el banner de error cuando el store reporta uno", () => {
    mockState.error = "Credenciales invalidas";

    render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>
    );

    expect(screen.getByRole("alert")).toHaveTextContent("Credenciales invalidas");
  });
});
