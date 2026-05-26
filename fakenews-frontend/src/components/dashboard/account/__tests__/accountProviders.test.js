import { describe, expect, it } from "vitest";
import { resolveProviderState } from "../accountProviders";

describe("resolveProviderState", () => {
  it("marca OAuth-only para usuarios registrados solo con Google", () => {
    expect(
      resolveProviderState({
        identityProviders: ["google"],
        primaryProvider: "google",
      })
    ).toMatchObject({
      isOauthOnly: true,
      primaryOauthLabel: "Google",
    });
  });

  it("oculta cambio de contraseña si Google es el proveedor principal aunque exista email vinculado", () => {
    expect(
      resolveProviderState({
        identityProviders: ["email", "google"],
        primaryProvider: "google",
      })
    ).toMatchObject({
      isOauthOnly: true,
      primaryOauthLabel: "Google",
    });
  });

  it("oculta cambio de contraseña también cuando email es principal pero Google está vinculado", () => {
    expect(
      resolveProviderState({
        identityProviders: ["email", "google"],
        primaryProvider: "email",
      })
    ).toMatchObject({
      isOauthOnly: true,
      primaryOauthLabel: "Google",
    });
  });

  it("no marca OAuth-only para cuentas clásicas por email", () => {
    expect(
      resolveProviderState({
        identityProviders: ["email"],
        primaryProvider: "email",
      })
    ).toMatchObject({
      isOauthOnly: false,
      primaryOauthLabel: null,
    });
  });
});