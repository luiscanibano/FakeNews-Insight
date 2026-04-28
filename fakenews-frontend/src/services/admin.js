/**
 * @file admin.js
 * @description Capa de servicios para acceso a API/Supabase, transformacion de datos y manejo uniforme de errores.
 */

import { getSupabaseClient } from "./supabase";

const UUID_V4_OR_V1_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const normalizeRole = (rawRole) => {
  if (rawRole === "admin") {
    return "admin";
  }

  return "user";
};

const normalizePlan = (rawPlan) => {
  if (rawPlan === "pro" || rawPlan === "pro_user") {
    return "pro";
  }

  if (rawPlan === "ultra" || rawPlan === "ultra_user") {
    return "ultra";
  }

  return "free";
};

const normalizeAdminUser = (user) => ({
  ...user,
  role: normalizeRole(user?.role),
  plan: normalizePlan(user?.plan),
});

const applyRoleScope = (query, includeAdmins) => {
  if (includeAdmins) {
    return query;
  }

  /** Incluye usuarios sin rol definido y excluye administradores.
 */
  return query.or("role.neq.admin,role.is.null");
};

const countScopedProfiles = async ({ includeAdmins = false, planValues = null }) => {
  const supabase = getSupabaseClient();
  let query = supabase.from("profiles").select("id", { count: "exact", head: true });
  query = applyRoleScope(query, includeAdmins);

  if (Array.isArray(planValues) && planValues.length > 0) {
    query = query.in("plan", planValues);
  }

  const { count, error } = await query;

  if (error) {
    throw new Error(error.message || "No se pudieron calcular los KPIs de usuarios");
  }

  return count || 0;
};

/** Obtiene usuarios para gestion administrativa con paginacion y busqueda en servidor.
 */
export const getAdminUsers = async ({
  includeAdmins = false,
  page = 1,
  pageSize = 10,
  searchTerm = "",
} = {}) => {
  const supabase = getSupabaseClient();
  const safePage = Math.max(1, page);
  const safePageSize = Math.max(1, Math.min(pageSize, 100));
  const from = (safePage - 1) * safePageSize;
  const to = from + safePageSize - 1;
  const normalizedSearch = searchTerm.trim();

  let query = supabase
    .from("profiles")
    .select("id, display_name, plan, role, created_at", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(from, to);

  query = applyRoleScope(query, includeAdmins);

  /** Si el termino es un UUID válido, busca por ID exacto; en otro caso por nombre.
 */
  if (normalizedSearch) {
    if (UUID_V4_OR_V1_REGEX.test(normalizedSearch)) {
      query = query.eq("id", normalizedSearch);
    } else {
      query = query.ilike("display_name", `%${normalizedSearch}%`);
    }
  }

  const { data, error, count } = await query;

  if (error) {
    throw new Error(error.message || "No se pudieron cargar los usuarios");
  }

  const normalizedUsers = (data || []).map(normalizeAdminUser);

  if (!includeAdmins && normalizedUsers.length === 0 && !normalizedSearch && safePage === 1) {
    const { data: authData } = await supabase.auth.getUser();
    const currentUserId = authData?.user?.id;
    const { data: diagnosticRows, error: diagnosticError } = await supabase
      .from("profiles")
      .select("id, role")
      .order("created_at", { ascending: false })
      .limit(2);

    if (!diagnosticError) {
      const normalizedDiagnostic = (diagnosticRows || []).map(normalizeAdminUser);
      const onlySelfAdminVisible =
        normalizedDiagnostic.length === 1 &&
        normalizedDiagnostic[0].id === currentUserId &&
        normalizedDiagnostic[0].role === "admin";

      if (onlySelfAdminVisible) {
        throw new Error(
          "Tu cuenta admin no tiene lectura global sobre profiles (RLS). Ejecuta la politica de 'Admins read all profiles'."
        );
      }
    }
  }

  return {
    users: normalizedUsers,
    totalCount: count || 0,
    page: safePage,
    pageSize: safePageSize,
  };
};

/** Obtiene los contadores globales de usuarios por plan sin cargar los perfiles completos.
 */
export const getAdminUserKpis = async ({ includeAdmins = false } = {}) => {
  const [total, pro, ultra] = await Promise.all([
    countScopedProfiles({ includeAdmins }),
    countScopedProfiles({ includeAdmins, planValues: ["pro", "pro_user"] }),
    countScopedProfiles({ includeAdmins, planValues: ["ultra", "ultra_user"] }),
  ]);

  return {
    total,
    pro,
    ultra,
    free: Math.max(0, total - pro - ultra),
  };
};

/** Actualiza el plan de un usuario desde el panel de administracion.
 */
export const updateAdminUserPlan = async ({ userId, plan }) => {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("profiles")
    .update({ plan })
    .eq("id", userId)
    .select("id, display_name, plan, role, created_at")
    .single();

  if (error) {
    throw new Error(error.message || "No se pudo actualizar el plan");
  }

  return normalizeAdminUser(data);
};

/** Da de baja a un usuario eliminando su perfil y datos dependientes por cascada.
 */
export const deactivateAdminUser = async ({ userId }) => {
  const supabase = getSupabaseClient();
  const { error } = await supabase.from("profiles").delete().eq("id", userId);

  if (error) {
    throw new Error(error.message || "No se pudo dar de baja al usuario");
  }
};
