/**
 * @file analysis.test.js
 * @description Tests del servicio verifyClaims (errores y happy path) usando fetch mockeado.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

import { verifyClaims } from "../analysis";

const VALID_TEXT =
  "El Gobierno anuncio que la inflacion bajo al dos por ciento durante marzo y que el desempleo juvenil descendio cinco puntos en el ultimo año.";

describe("verifyClaims()", () => {
  beforeEach(() => {
    global.fetch = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("rechaza si falta el token JWT", async () => {
    await expect(verifyClaims({ text: VALID_TEXT })).rejects.toThrow(/sesi/i);
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
      text: VALID_TEXT,
      jwtToken: "tok",
    });
    expect(result).toEqual(payload);
    expect(global.fetch).toHaveBeenCalledTimes(1);
    const [, options] = global.fetch.mock.calls[0];
    expect(options.headers.Authorization).toBe("Bearer tok");
    expect(JSON.parse(options.body)).toEqual({
      texto: VALID_TEXT,
    });
  });

  it("rechaza si el texto supera el limite maximo de cliente", async () => {
    await expect(
      verifyClaims({ text: "a".repeat(12001), jwtToken: "tok" })
    ).rejects.toThrow(/superar/i);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("propaga mensaje 403 (cupo agotado)", async () => {
    global.fetch.mockResolvedValueOnce({
      ok: false,
      status: 403,
      json: async () => ({ detail: "Has alcanzado tu limite diario" }),
    });
    await expect(
      verifyClaims({ text: VALID_TEXT, jwtToken: "tok" })
    ).rejects.toThrow(/limite diario/i);
  });

  it("usa fallback cuando el cuerpo no trae detail", async () => {
    global.fetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: async () => ({}),
    });
    await expect(
      verifyClaims({ text: VALID_TEXT, jwtToken: "tok" })
    ).rejects.toThrow(/no se pudo verificar/i);
  });
});
