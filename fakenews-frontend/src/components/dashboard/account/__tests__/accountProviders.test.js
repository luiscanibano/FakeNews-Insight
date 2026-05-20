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

  it("mantiene cambio de contraseña para cuentas con email aunque también tengan Google vinculado", () => {
    expect(
      resolveProviderState({
        identityProviders: ["email", "google"],
        primaryProvider: "google",
      })
    ).toMatchObject({
      isOauthOnly: false,
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