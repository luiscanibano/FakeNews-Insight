import { getSupabaseClient } from "./supabase";

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

// Obtiene usuarios para gestion administrativa con filtros simples por rol.
export const getAdminUsers = async ({ includeAdmins = false } = {}) => {
  const supabase = getSupabaseClient();
  const query = supabase
    .from("profiles")
    .select("id, display_name, plan, role, created_at")
    .order("created_at", { ascending: false });

  const { data, error } = await query;

  if (error) {
    throw new Error(error.message || "No se pudieron cargar los usuarios");
  }

  const normalizedUsers = (data || []).map(normalizeAdminUser);

  if (includeAdmins) {
    return normalizedUsers;
  }

  const visibleUsers = normalizedUsers.filter((user) => user.role !== "admin");

  if (visibleUsers.length > 0) {
    return visibleUsers;
  }

  const { data: authData } = await supabase.auth.getUser();
  const currentUserId = authData?.user?.id;
  const onlySelfAdminVisible =
    normalizedUsers.length === 1 &&
    normalizedUsers[0].id === currentUserId &&
    normalizedUsers[0].role === "admin";

  if (onlySelfAdminVisible) {
    throw new Error(
      "Tu cuenta admin no tiene lectura global sobre profiles (RLS). Ejecuta la politica de 'Admins read all profiles'."
    );
  }

  return visibleUsers;
};

// Actualiza el plan de un usuario desde el panel de administracion.
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

// Da de baja a un usuario eliminando su perfil y datos dependientes por cascada.
export const deactivateAdminUser = async ({ userId }) => {
  const supabase = getSupabaseClient();
  const { error } = await supabase.from("profiles").delete().eq("id", userId);

  if (error) {
    throw new Error(error.message || "No se pudo dar de baja al usuario");
  }
};
