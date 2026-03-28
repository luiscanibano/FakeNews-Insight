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

// Define jerarquia de planes para comparaciones de permisos por nivel.
const PLAN_ORDER = {
  [USER_PLAN.FREE]: 0,
  [USER_PLAN.PRO]: 1,
  [USER_PLAN.ULTRA]: 2,
};

// Normaliza perfil de base de datos a un objeto de acceso consistente.
export const resolveAccess = (profile) => {
  if (!profile) {
    return {
      role: USER_ROLE.GUEST,
      plan: USER_PLAN.FREE,
    };
  }

  const role = profile.role === USER_ROLE.ADMIN ? USER_ROLE.ADMIN : USER_ROLE.USER;
  const plan = Object.prototype.hasOwnProperty.call(PLAN_ORDER, profile.plan)
    ? profile.plan
    : USER_PLAN.FREE;

  return { role, plan };
};

// Comprueba si el plan actual alcanza el minimo requerido por una funcionalidad.
export const hasMinimumPlan = (currentPlan, requiredPlan) =>
  PLAN_ORDER[currentPlan] >= PLAN_ORDER[requiredPlan];

// Evalua permisos de caracteristicas combinando rol y plan del usuario.
export const canUseFeature = ({ role, plan }, feature) => {
  if (role === USER_ROLE.ADMIN) {
    return true;
  }

  switch (feature) {
    case "analysis.basic":
    case "history.basic":
      return true;
    case "analysis.bulk":
      return hasMinimumPlan(plan, USER_PLAN.PRO);
    case "analysis.api":
      return hasMinimumPlan(plan, USER_PLAN.ULTRA);
    default:
      return false;
  }
};

// Devuelve el cupo mensual maximo de analisis segun el nivel de acceso.
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
