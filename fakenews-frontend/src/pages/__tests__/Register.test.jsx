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
    signInWithGoogleMock.mockClear();
    mockState.error = "";
    mockState.loading = false;
    window.sessionStorage.clear();
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
    const passwordInput = screen.getByLabelText(/^contraseña$/i);
    const confirmPasswordInput = screen.getByLabelText(/confirmar contraseña/i);
    const legalCheckbox = screen.getByRole("checkbox");

    emailInput.value = "nuevo@test.com";
    passwordInput.value = "ClaveAuto123";
    confirmPasswordInput.value = "ClaveAuto123";
    legalCheckbox.checked = true;

    await act(async () => {
      fireEvent.submit(screen.getByRole("button", { name: /^registrarse$/i }).closest("form"));
    });

    expect(registerMock).toHaveBeenCalledWith({
      email: "nuevo@test.com",
      password: "ClaveAuto123",
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
    fireEvent.change(screen.getByLabelText(/^contraseña$/i), {
      target: { value: "Password123" },
    });
    fireEvent.change(screen.getByLabelText(/confirmar contraseña/i), {
      target: { value: "Password123" },
    });
    fireEvent.click(screen.getByRole("checkbox"));

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /^registrarse$/i }));
    });

    expect(await screen.findByText(/registro completado/i)).toBeInTheDocument();
    expect(alertSpy).not.toHaveBeenCalled();

    alertSpy.mockRestore();
  });

  it("bloquea el submit cuando la confirmacion no coincide", async () => {
    render(
      <MemoryRouter initialEntries={["/register"]}>
        <Routes>
          <Route path="/register" element={<Register />} />
        </Routes>
      </MemoryRouter>
    );

    fireEvent.change(screen.getByLabelText(/correo/i), {
      target: { value: "nuevo@test.com" },
    });
    fireEvent.change(screen.getByLabelText(/^contraseña$/i), {
      target: { value: "Password123" },
    });
    fireEvent.change(screen.getByLabelText(/confirmar contraseña/i), {
      target: { value: "Password456" },
    });
    fireEvent.click(screen.getByRole("checkbox"));

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /^registrarse$/i }));
    });

    expect(registerMock).not.toHaveBeenCalled();
    expect(screen.getByRole("alert")).toHaveTextContent(/no coinciden/i);
  });

  it("permite mostrar y ocultar la contraseña", () => {
    render(
      <MemoryRouter initialEntries={["/register"]}>
        <Routes>
          <Route path="/register" element={<Register />} />
        </Routes>
      </MemoryRouter>
    );

    const passwordInput = screen.getByLabelText(/^contraseña$/i);
    const toggleButtons = screen.getAllByRole("button", { name: /mostrar|ocultar/i });

    expect(passwordInput).toHaveAttribute("type", "password");

    fireEvent.click(toggleButtons[0]);

    expect(passwordInput).toHaveAttribute("type", "text");
  });

  it("exige aceptar los legales antes del registro con Google", async () => {
    render(
      <MemoryRouter initialEntries={["/register"]}>
        <Routes>
          <Route path="/register" element={<Register />} />
        </Routes>
      </MemoryRouter>
    );

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /registrarse con google/i }));
    });

    expect(signInWithGoogleMock).not.toHaveBeenCalled();
    expect(screen.getByRole("alert")).toHaveTextContent(/debes aceptar/i);
  });

  it("recupera el borrador si el usuario vuelve desde los documentos legales", () => {
    const TermsPage = () => <div>Términos</div>;

    const { unmount } = render(
      <MemoryRouter initialEntries={["/register"]}>
        <Routes>
          <Route path="/register" element={<Register />} />
          <Route path="/terms" element={<TermsPage />} />
        </Routes>
      </MemoryRouter>
    );

    fireEvent.change(screen.getByLabelText(/correo/i), {
      target: { value: "draft@test.com" },
    });
    fireEvent.change(screen.getByLabelText(/^contraseña$/i), {
      target: { value: "DraftPass1" },
    });
    fireEvent.change(screen.getByLabelText(/confirmar contraseña/i), {
      target: { value: "DraftPass1" },
    });
    fireEvent.click(screen.getByRole("checkbox"));

    unmount();

    render(
      <MemoryRouter initialEntries={["/register"]}>
        <Routes>
          <Route path="/register" element={<Register />} />
          <Route path="/terms" element={<TermsPage />} />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByLabelText(/correo/i)).toHaveValue("draft@test.com");
    expect(screen.getByLabelText(/^contraseña$/i)).toHaveValue("DraftPass1");
    expect(screen.getByLabelText(/confirmar contraseña/i)).toHaveValue("DraftPass1");
    expect(screen.getByRole("checkbox")).toBeChecked();
  });
});