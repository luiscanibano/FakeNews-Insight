import React from "react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";

const registerMock = vi.fn().mockResolvedValue(undefined);
const clearErrorMock = vi.fn();
const signInWithGoogleMock = vi.fn();

const mockState = {
  register: registerMock,
  loading: false,
  error: "",
  clearError: clearErrorMock,
  signInWithGoogle: signInWithGoogleMock,
  login: vi.fn(),
};

vi.mock("../../store/authStore", () => ({
  useAuthStore: (selector) => selector(mockState),
}));

import Login from "../Login";
import Register from "../Register";

describe("<Register />", () => {
  beforeEach(() => {
    registerMock.mockClear();
    clearErrorMock.mockClear();
    mockState.error = "";
    mockState.loading = false;
  });

  it("envia email y password al store al hacer submit aunque lleguen por autofill", async () => {
    render(
      <MemoryRouter initialEntries={["/register"]}>
        <Routes>
          <Route path="/register" element={<Register />} />
          <Route path="/login" element={<Login />} />
        </Routes>
      </MemoryRouter>
    );

    const emailInput = screen.getByLabelText(/correo/i);
    const passwordInput = screen.getByLabelText(/contraseña/i);

    emailInput.value = "nuevo@test.com";
    passwordInput.value = "clave-autofill";

    await act(async () => {
      fireEvent.submit(screen.getByRole("button", { name: /^registrarse$/i }).closest("form"));
    });

    expect(registerMock).toHaveBeenCalledWith({
      email: "nuevo@test.com",
      password: "clave-autofill",
    });
  });

  it("redirige a login mostrando mensaje de éxito sin usar alertas nativas", async () => {
    const alertSpy = vi.spyOn(window, "alert").mockImplementation(() => {});

    render(
      <MemoryRouter initialEntries={["/register"]}>
        <Routes>
          <Route path="/register" element={<Register />} />
          <Route path="/login" element={<Login />} />
        </Routes>
      </MemoryRouter>
    );

    fireEvent.change(screen.getByLabelText(/correo/i), {
      target: { value: "nuevo@test.com" },
    });
    fireEvent.change(screen.getByLabelText(/contraseña/i), {
      target: { value: "password123" },
    });

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /^registrarse$/i }));
    });

    expect(await screen.findByText(/registro completado/i)).toBeInTheDocument();
    expect(alertSpy).not.toHaveBeenCalled();

    alertSpy.mockRestore();
  });
});