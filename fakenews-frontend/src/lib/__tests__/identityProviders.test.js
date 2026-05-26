import { describe, expect, it } from "vitest";

import { collectIdentityProviders } from "../identityProviders";

describe("collectIdentityProviders", () => {
  it("ignora el proveedor email sintético en cuentas registradas solo con Google", () => {
    expect(
      collectIdentityProviders({
        app_metadata: {
          provider: "google",
          providers: ["google", "email"],
        },
        identities: [{ provider: "google" }],
      })
    ).toEqual(["google"]);
  });

  it("mantiene email cuando existe identidad real de email/password vinculada", () => {
    expect(
      collectIdentityProviders({
        app_metadata: {
          provider: "google",
          providers: ["google", "email"],
        },
        identities: [{ provider: "email" }, { provider: "google" }],
      })
    ).toEqual(["google", "email"]);
  });

  it("sigue detectando cuentas clásicas por email sin identidades OAuth", () => {
    expect(
      collectIdentityProviders({
        app_metadata: {
          provider: "email",
          providers: ["email"],
        },
      })
    ).toEqual(["email"]);
  });
});