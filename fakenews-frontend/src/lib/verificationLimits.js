import { USER_PLAN } from "./accessControl";

export const VERIFY_TEXT_MIN_LENGTH = 80;

export const VERIFY_TEXT_LIMITS_BY_PLAN = {
  [USER_PLAN.FREE]: 2000,
  [USER_PLAN.PRO]: 6000,
  [USER_PLAN.ULTRA]: 12000,
};

export const getVerifyTextMaxLength = (plan) =>
  VERIFY_TEXT_LIMITS_BY_PLAN[plan] || VERIFY_TEXT_LIMITS_BY_PLAN[USER_PLAN.FREE];
