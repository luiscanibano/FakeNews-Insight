/**
 * @file accessControl.test.js
 * @description Garantiza que el guardado de rol/plan respeta defaults seguros y la jerarquia de planes.
 */

import { describe, expect, it } from "vitest";
import {
  USER_PLAN,
  USER_ROLE,
  canUseFeature,
  hasMinimumPlan,
  resolveAccess,
} from "../accessControl";

describe("resolveAccess", () => {
  it("devuelve guest/free cuando no hay perfil", () => {
    expect(resolveAccess(null)).toEqual({
      role: USER_ROLE.GUEST,
      plan: USER_PLAN.FREE,
    });
  });

  it("normaliza un perfil estandar a user/free cuando faltan datos", () => {
    expect(resolveAccess({})).toEqual({
      role: USER_ROLE.USER,
      plan: USER_PLAN.FREE,
    });
  });

  it("respeta rol admin solo cuando viene explicito en el perfil", () => {
    expect(resolveAccess({ role: "admin", plan: "pro" })).toEqual({
      role: USER_ROLE.ADMIN,
      plan: USER_PLAN.PRO,
    });
  });

  it("degrada planes desconocidos a free", () => {
    expect(resolveAccess({ plan: "enterprise" }).plan).toBe(USER_PLAN.FREE);
  });
});

describe("hasMinimumPlan / canUseFeature", () => {
  it("PRO cubre PRO pero no ULTRA", () => {
    expect(hasMinimumPlan(USER_PLAN.PRO, USER_PLAN.PRO)).toBe(true);
    expect(hasMinimumPlan(USER_PLAN.PRO, USER_PLAN.ULTRA)).toBe(false);
  });

  it("admin tiene acceso a todas las features sin importar el plan", () => {
    expect(
      canUseFeature({ role: USER_ROLE.ADMIN, plan: USER_PLAN.FREE }, "analysis.api")
    ).toBe(true);
  });

  it("usuario free no puede usar bulk ni api", () => {
    const access = { role: USER_ROLE.USER, plan: USER_PLAN.FREE };
    expect(canUseFeature(access, "analysis.bulk")).toBe(false);
    expect(canUseFeature(access, "analysis.api")).toBe(false);
  });

  it("usuario ultra puede usar bulk y api", () => {
    const access = { role: USER_ROLE.USER, plan: USER_PLAN.ULTRA };
    expect(canUseFeature(access, "analysis.bulk")).toBe(true);
    expect(canUseFeature(access, "analysis.api")).toBe(true);
  });
});
