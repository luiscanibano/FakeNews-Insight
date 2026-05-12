import { USER_PLAN } from "@/lib/accessControl";

const PLAN_ORDER = { [USER_PLAN.FREE]: 0, [USER_PLAN.PRO]: 1, [USER_PLAN.ULTRA]: 2 };

export const resolvePlanCardAction = ({ planKey, currentPlan, snapshot }) => {
  const targetOrder = PLAN_ORDER[planKey] ?? 0;
  const currentOrder = PLAN_ORDER[currentPlan] ?? 0;
  const hasActiveSubscription = Boolean(snapshot?.stripe_subscription_id);
  const cancelScheduled = Boolean(snapshot?.cancel_at_period_end);
  const downgradeScheduled = Boolean(snapshot?.scheduled_plan && !cancelScheduled);

  if (planKey === currentPlan) {
    if (cancelScheduled || downgradeScheduled) {
      return { kind: "resume" };
    }
    return { kind: "current" };
  }

  if (planKey === USER_PLAN.FREE) {
    if (!hasActiveSubscription) {
      return { kind: "current" };
    }
    return { kind: "cancel" };
  }

  if (targetOrder > currentOrder) {
    return hasActiveSubscription ? { kind: "upgrade" } : { kind: "subscribe" };
  }

  return { kind: "downgrade" };
};
