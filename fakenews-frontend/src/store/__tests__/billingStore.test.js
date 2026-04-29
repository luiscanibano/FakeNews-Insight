/**
 * @file billingStore.test.js
 * @description Cubre flujos de selectPlan, cancel, resume y portal del billingStore con servicios mockeados.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../services/billing", () => ({
  fetchBillingSnapshot: vi.fn(),
  createBillingCheckout: vi.fn(),
  confirmBillingCheckout: vi.fn(),
  cancelBillingSubscription: vi.fn(),
  resumeBillingSubscription: vi.fn(),
  openBillingPortal: vi.fn(),
}));

vi.mock("../../services/auth", () => ({
  getAccessToken: vi.fn(async () => "fake-jwt"),
}));

import {
  cancelBillingSubscription,
  createBillingCheckout,
  fetchBillingSnapshot,
  openBillingPortal,
  resumeBillingSubscription,
} from "../../services/billing";
import { useBillingStore } from "../billingStore";

beforeEach(() => {
  useBillingStore.getState().reset();
  vi.clearAllMocks();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("billingStore", () => {
  it("loadSnapshot guarda el snapshot recibido del backend", async () => {
    fetchBillingSnapshot.mockResolvedValueOnce({ plan: "pro" });
    const snapshot = await useBillingStore.getState().loadSnapshot();
    expect(snapshot).toEqual({ plan: "pro" });
    expect(useBillingStore.getState().snapshot).toEqual({ plan: "pro" });
    expect(useBillingStore.getState().loading).toBe(false);
  });

  it("selectPlan delega en createBillingCheckout y guarda lastAction", async () => {
    createBillingCheckout.mockResolvedValueOnce({ status: "checkout", checkout_url: "https://x" });
    const result = await useBillingStore.getState().selectPlan("pro");
    expect(result.status).toBe("checkout");
    expect(createBillingCheckout).toHaveBeenCalledWith({ plan: "pro", jwtToken: "fake-jwt" });
    expect(useBillingStore.getState().lastAction.type).toBe("checkout");
  });

  it("cancelSubscription propaga errores guardando el mensaje en error", async () => {
    cancelBillingSubscription.mockRejectedValueOnce(new Error("boom"));
    await expect(useBillingStore.getState().cancelSubscription()).rejects.toThrow("boom");
    expect(useBillingStore.getState().error).toBe("boom");
    expect(useBillingStore.getState().actionInFlight).toBeNull();
  });

  it("resumeSubscription invoca el servicio resume", async () => {
    resumeBillingSubscription.mockResolvedValueOnce({ status: "resumed" });
    const result = await useBillingStore.getState().resumeSubscription();
    expect(result).toEqual({ status: "resumed" });
    expect(resumeBillingSubscription).toHaveBeenCalled();
  });

  it("openPortal abre la URL del Customer Portal en nueva pestaña", async () => {
    openBillingPortal.mockResolvedValueOnce({ url: "https://portal.test" });
    const openSpy = vi.spyOn(window, "open").mockImplementation(() => null);
    const result = await useBillingStore.getState().openPortal();
    expect(result).toEqual({ url: "https://portal.test" });
    expect(openSpy).toHaveBeenCalledWith("https://portal.test", "_blank", "noopener,noreferrer");
  });
});
