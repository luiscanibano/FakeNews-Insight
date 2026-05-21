/**
 * @file accessControl.js
 * @description Modulo utilitario compartido para reglas de acceso, helpers y funciones transversales.
 */

export const USER_ROLE = {
  ADMIN: "admin",
  USER: "user",
  GUEST: "guest",
};

export const USER_PLAN = {
  FREE: "free",
  PRO: "pro",
  ULTRA: "ultra",
};

export const normalizeUserPlan = (rawPlan) => {
  const normalizedPlan = String(rawPlan || "").trim().toLowerCase();

  if (normalizedPlan === USER_PLAN.PRO || normalizedPlan === "pro_user") {
    return USER_PLAN.PRO;
  }

  if (normalizedPlan === USER_PLAN.ULTRA || normalizedPlan === "ultra_user") {
    return USER_PLAN.ULTRA;
  }

  return USER_PLAN.FREE;
};

/** Jerarquia numerica de planes para comparaciones de capacidad por nivel. */
const PLAN_ORDER = {
  [USER_PLAN.FREE]: 0,
  [USER_PLAN.PRO]: 1,
  [USER_PLAN.ULTRA]: 2,
};

/** Normaliza un perfil DB a objeto de acceso consistente con defaults de seguridad. */
export const resolveAccess = (profile) => {
  if (!profile) {
    return {
      role: USER_ROLE.GUEST,
      plan: USER_PLAN.FREE,
    };
  }

  const role = profile.role === USER_ROLE.ADMIN ? USER_ROLE.ADMIN : USER_ROLE.USER;
  const plan = normalizeUserPlan(profile.plan);

  return { role, plan };
};

/** Comprueba si el plan actual cumple el mínimo requerido por funcionalidad. */
export const hasMinimumPlan = (currentPlan, requiredPlan) =>
  PLAN_ORDER[currentPlan] >= PLAN_ORDER[requiredPlan];

/** Evalua permisos combinando rol y plan para cada feature de producto. */
export const canUseFeature = ({ role, plan }, feature) => {
  if (role === USER_ROLE.ADMIN) {
    return true;
  }

  switch (feature) {
    case "analysis.basic":
    case "history.basic":
      return true;
    case "analysis.bulk":
      return hasMinimumPlan(plan, USER_PLAN.ULTRA);
    case "analysis.api":
      return hasMinimumPlan(plan, USER_PLAN.ULTRA);
    default:
      return false;
  }
};

/** Devuelve el cupo mensual máximo de análisis según nivel de acceso. */
export const getMonthlyAnalysisLimit = ({ role, plan }) => {
  if (role === USER_ROLE.ADMIN) {
    return Number.POSITIVE_INFINITY;
  }

  if (plan === USER_PLAN.PRO) {
    return 500;
  }

  if (plan === USER_PLAN.ULTRA) {
    return 5000;
  }

  return 30;
};
