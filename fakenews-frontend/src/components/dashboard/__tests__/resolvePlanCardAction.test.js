/**
 * @file resolvePlanCardAction.test.js
 * @description Cubre la matriz de decisiones del selector de plan: actual, subscribe, upgrade, downgrade, cancel y resume.
 */

import { describe, expect, it } from "vitest";
import { resolvePlanCardAction } from "../resolvePlanCardAction";

describe("resolvePlanCardAction", () => {
  it("usuario FREE sin suscripción: PRO/ULTRA = subscribe; FREE = current", () => {
    const snapshot = { stripe_subscription_id: null };
    expect(resolvePlanCardAction({ planKey: "free", currentPlan: "free", snapshot }).kind).toBe("current");
    expect(resolvePlanCardAction({ planKey: "pro", currentPlan: "free", snapshot }).kind).toBe("subscribe");
    expect(resolvePlanCardAction({ planKey: "ultra", currentPlan: "free", snapshot }).kind).toBe("subscribe");
  });

  it("usuario PRO con suscripción activa: ULTRA = upgrade, FREE = cancel, PRO = current", () => {
    const snapshot = { stripe_subscription_id: "sub_x" };
    expect(resolvePlanCardAction({ planKey: "ultra", currentPlan: "pro", snapshot }).kind).toBe("upgrade");
    expect(resolvePlanCardAction({ planKey: "free", currentPlan: "pro", snapshot }).kind).toBe("cancel");
    expect(resolvePlanCardAction({ planKey: "pro", currentPlan: "pro", snapshot }).kind).toBe("current");
  });

  it("usuario ULTRA: PRO = downgrade, FREE = cancel", () => {
    const snapshot = { stripe_subscription_id: "sub_y" };
    expect(resolvePlanCardAction({ planKey: "pro", currentPlan: "ultra", snapshot }).kind).toBe("downgrade");
    expect(resolvePlanCardAction({ planKey: "free", currentPlan: "ultra", snapshot }).kind).toBe("cancel");
  });

  it("downgrade programado: la tarjeta del plan actual ofrece resume", () => {
    const snapshot = {
      stripe_subscription_id: "sub_z",
      scheduled_plan: "pro",
      cancel_at_period_end: false,
    };
    expect(resolvePlanCardAction({ planKey: "ultra", currentPlan: "ultra", snapshot }).kind).toBe("resume");
  });

  it("cancel programado: la tarjeta del plan actual ofrece resume", () => {
    const snapshot = { stripe_subscription_id: "sub_z", cancel_at_period_end: true };
    expect(resolvePlanCardAction({ planKey: "pro", currentPlan: "pro", snapshot }).kind).toBe("resume");
  });
});
