import { USER_PLAN } from "@/lib/accessControl";

export const shouldHighlightRecommendedPlan = ({
  planKey,
  recommended,
  currentPlan,
}) => {
  if (!recommended) {
    return false;
  }

  if (planKey !== USER_PLAN.PRO) {
    return true;
  }

  return currentPlan === USER_PLAN.FREE;
};