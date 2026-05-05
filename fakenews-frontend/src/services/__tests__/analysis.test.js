/**
 * @file analysis.test.js
 * @description Tests del servicio verifyClaims (errores y happy path) usando fetch mockeado.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

import { verifyClaims } from "../analysis";

describe("verifyClaims()", () => {
  beforeEach(() => {
    global.fetch = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("rechaza si falta el token JWT", async () => {
    await expect(verifyClaims({ text: "texto largo de prueba" })).rejects.toThrow(/sesi/i);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("rechaza si el texto es demasiado corto", async () => {
    await expect(
      verifyClaims({ text: "x", jwtToken: "tok" })
    ).rejects.toThrow(/corto/i);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("devuelve el JSON cuando la respuesta es OK", async () => {
    const payload = { veredicto_global: "SUPPORTED", claims: [] };
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => payload,
    });
    const result = await verifyClaims({
      text: "texto suficientemente largo",
      jwtToken: "tok",
    });
    expect(result).toEqual(payload);
    expect(global.fetch).toHaveBeenCalledTimes(1);
    const [, options] = global.fetch.mock.calls[0];
    expect(options.headers.Authorization).toBe("Bearer tok");
    expect(JSON.parse(options.body)).toEqual({
      texto: "texto suficientemente largo",
    });
  });

  it("propaga mensaje 403 (plan insuficiente)", async () => {
    global.fetch.mockResolvedValueOnce({
      ok: false,
      status: 403,
      json: async () => ({ detail: "Solo Super Pro" }),
    });
    await expect(
      verifyClaims({ text: "texto suficientemente largo", jwtToken: "tok" })
    ).rejects.toThrow(/super pro/i);
  });

  it("usa fallback cuando el cuerpo no trae detail", async () => {
    global.fetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: async () => ({}),
    });
    await expect(
      verifyClaims({ text: "texto suficientemente largo", jwtToken: "tok" })
    ).rejects.toThrow(/no se pudo verificar/i);
  });
});
