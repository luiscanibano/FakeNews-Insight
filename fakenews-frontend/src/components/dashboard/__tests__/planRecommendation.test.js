import { describe, expect, it } from "vitest";
import { shouldHighlightRecommendedPlan } from "../planRecommendation";

describe("shouldHighlightRecommendedPlan", () => {
  it("mantiene PRO como recomendado para usuarios FREE", () => {
    expect(
      shouldHighlightRecommendedPlan({
        planKey: "pro",
        recommended: true,
        currentPlan: "free",
      })
    ).toBe(true);
  });

  it("oculta Recommended en PRO cuando el usuario ya es PRO", () => {
    expect(
      shouldHighlightRecommendedPlan({
        planKey: "pro",
        recommended: true,
        currentPlan: "pro",
      })
    ).toBe(false);
  });

  it("oculta Recommended en PRO cuando el usuario ya es ULTRA", () => {
    expect(
      shouldHighlightRecommendedPlan({
        planKey: "pro",
        recommended: true,
        currentPlan: "ultra",
      })
    ).toBe(false);
  });
});