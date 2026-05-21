import { describe, expect, it } from "vitest";
import { USER_PLAN } from "../accessControl";
import { getVerifyDailyLimit, getVerifyTextMaxLength } from "../verificationLimits";

describe("verificationLimits", () => {
  it("alinea la cuota diaria con los planes publicados", () => {
    expect(getVerifyDailyLimit(USER_PLAN.FREE)).toBe(5);
    expect(getVerifyDailyLimit(USER_PLAN.PRO)).toBe(50);
    expect(getVerifyDailyLimit(USER_PLAN.ULTRA)).toBe(50);
  });

  it("mantiene los límites de claims/evidencias implícitos por longitud de texto por plan", () => {
    expect(getVerifyTextMaxLength(USER_PLAN.FREE)).toBe(2000);
    expect(getVerifyTextMaxLength(USER_PLAN.PRO)).toBe(6000);
    expect(getVerifyTextMaxLength(USER_PLAN.ULTRA)).toBe(12000);
  });
});