/**
 * @file analysis.test.js
 * @description Tests del servicio verifyClaims (errores y happy path) usando fetch mockeado.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

import { getVerificationCsvStatus, saveVerificationToHistory, verifyClaims, verifyCsv, verifyUrl } from "../analysis";

const VALID_TEXT =
  "El Gobierno anuncio que la inflacion bajo al dos por ciento durante marzo y que el desempleo juvenil descendio cinco puntos en el ultimo año.";

describe("verifyClaims()", () => {
  beforeEach(() => {
    globalThis.fetch = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("rechaza si falta el token JWT", async () => {
    await expect(verifyClaims({ text: VALID_TEXT })).rejects.toThrow(/sesi/i);
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it("rechaza si el texto es demasiado corto", async () => {
    await expect(
      verifyClaims({ text: "x", jwtToken: "tok" })
    ).rejects.toThrow(/corto/i);
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it("devuelve el JSON cuando la respuesta es OK", async () => {
    const payload = { veredicto_global: "SUPPORTED", claims: [] };
    globalThis.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => payload,
    });
    const result = await verifyClaims({
      text: VALID_TEXT,
      jwtToken: "tok",
    });
    expect(result).toEqual(payload);
    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
    const [, options] = globalThis.fetch.mock.calls[0];
    expect(options.headers.Authorization).toBe("Bearer tok");
    expect(JSON.parse(options.body)).toEqual({
      texto: VALID_TEXT,
    });
  });

  it("rechaza si el texto supera el limite maximo de cliente", async () => {
    await expect(
      verifyClaims({ text: "a".repeat(12001), jwtToken: "tok" })
    ).rejects.toThrow(/superar/i);
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it("propaga mensaje 403 (cupo agotado)", async () => {
    globalThis.fetch.mockResolvedValueOnce({
      ok: false,
      status: 403,
      json: async () => ({ detail: "Has alcanzado tu limite diario" }),
    });
    await expect(
      verifyClaims({ text: VALID_TEXT, jwtToken: "tok" })
    ).rejects.toThrow(/limite diario/i);
  });

  it("usa fallback cuando el cuerpo no trae detail", async () => {
    globalThis.fetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: async () => ({}),
    });
    await expect(
      verifyClaims({ text: VALID_TEXT, jwtToken: "tok" })
    ).rejects.toThrow(/no se pudo verificar/i);
  });
});

describe("verifyUrl()", () => {
  beforeEach(() => {
    globalThis.fetch = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("rechaza si falta el token JWT", async () => {
    await expect(verifyUrl({ url: "https://example.org" })).rejects.toThrow(/sesi/i);
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it("rechaza si la URL no es http o https", async () => {
    await expect(verifyUrl({ url: "nota-local", jwtToken: "tok" })).rejects.toThrow(/url http o https/i);
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it("envia la URL al endpoint FEVER especifico", async () => {
    const payload = { run_id: "run-url-1", status: "pending", run_type: "url" };
    globalThis.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => payload,
    });

    const result = await verifyUrl({
      url: "https://example.org/noticia",
      jwtToken: "tok",
    });

    expect(result).toEqual(payload);
    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
    const [calledUrl, options] = globalThis.fetch.mock.calls[0];
    expect(calledUrl).toMatch(/\/verify\/url$/);
    expect(options.headers.Authorization).toBe("Bearer tok");
    expect(JSON.parse(options.body)).toEqual({
      url: "https://example.org/noticia",
    });
  });
});

describe("verifyCsv()", () => {
  beforeEach(() => {
    globalThis.fetch = vi.fn();
    globalThis.File = class FakeFile {
      constructor(parts, name, options = {}) {
        this.parts = parts;
        this.name = name;
        this.type = options.type || "text/csv";
      }
    };
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("rechaza si falta el token JWT", async () => {
    const file = new File(["texto\nuno"], "lote.csv", { type: "text/csv" });
    await expect(verifyCsv({ file })).rejects.toThrow(/sesi/i);
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it("rechaza si no se proporciona un archivo File", async () => {
    await expect(verifyCsv({ file: null, jwtToken: "tok" })).rejects.toThrow(/archivo csv/i);
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it("envia el archivo al endpoint FEVER CSV", async () => {
    const payload = { batch_id: "batch-1", status: "pending", total_rows: 2 };
    globalThis.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => payload,
    });

    const file = new File(["texto\nuno\ndos\n"], "lote.csv", { type: "text/csv" });
    const result = await verifyCsv({ file, jwtToken: "tok" });

    expect(result).toEqual(payload);
    const [calledUrl, options] = globalThis.fetch.mock.calls[0];
    expect(calledUrl).toMatch(/\/verify\/csv$/);
    expect(options.method).toBe("POST");
    expect(options.headers.Authorization).toBe("Bearer tok");
    expect(options.body).toBeInstanceOf(FormData);
  });
});

describe("getVerificationCsvStatus()", () => {
  beforeEach(() => {
    globalThis.fetch = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("consulta el estado del lote CSV", async () => {
    const payload = { batch_id: "batch-1", status: "processing", processed_rows: 1 };
    globalThis.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => payload,
    });

    const result = await getVerificationCsvStatus({ batchId: "batch-1", jwtToken: "tok" });

    expect(result).toEqual(payload);
    const [calledUrl, options] = globalThis.fetch.mock.calls[0];
    expect(calledUrl).toMatch(/\/verify\/csv\/batch-1$/);
    expect(options.headers.Authorization).toBe("Bearer tok");
  });
});

describe("saveVerificationToHistory()", () => {
  beforeEach(() => {
    globalThis.fetch = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("permite guardar un lote CSV completado usando batch_id", async () => {
    globalThis.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ saved: true, batch_id: "batch-1" }),
    });

    const result = await saveVerificationToHistory({ batchId: "batch-1", jwtToken: "tok" });

    expect(result).toEqual({ saved: true, batch_id: "batch-1" });
    const [, options] = globalThis.fetch.mock.calls[0];
    expect(JSON.parse(options.body)).toMatchObject({ batch_id: "batch-1", run_id: null });
  });
});
