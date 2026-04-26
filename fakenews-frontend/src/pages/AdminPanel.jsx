/**
 * @file AdminPanel.jsx
 * @description Pagina de aplicacion que orquesta componentes, estados y flujos de negocio por seccion.
 */

import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "../components/ui/button";
import AdminKpiSections from "../components/admin/AdminKpiSections";
import AdminUsersTable from "../components/admin/AdminUsersTable";
import { useAuthStore } from "../store/authStore";
import { useAdminStore } from "../store/adminStore";

/** Panel inicial de administracion con KPIs y acciones basicas de gestion de usuarios. */
function AdminPanel() {
  const navigate = useNavigate();
  const logout = useAuthStore((state) => state.logout);
  const profile = useAuthStore((state) => state.profile);
  const user = useAuthStore((state) => state.user);

  const users = useAdminStore((state) => state.users);
  const loadingUsers = useAdminStore((state) => state.loadingUsers);
  const actionLoadingUserId = useAdminStore((state) => state.actionLoadingUserId);
  const error = useAdminStore((state) => state.error);
  const userKpis = useAdminStore((state) => state.userKpis);
  const simulatedApiCallsToday = useAdminStore((state) => state.simulatedApiCallsToday);
  const loadUsers = useAdminStore((state) => state.loadUsers);
  const loadUserKpis = useAdminStore((state) => state.loadUserKpis);
  const setUserPlan = useAdminStore((state) => state.setUserPlan);
  const deactivateUser = useAdminStore((state) => state.deactivateUser);

  /** Carga solo la primera pagina y los KPIs globales del panel administrativo. */
  useEffect(() => {
    loadUsers({ includeAdmins: false, page: 1, pageSize: 5 });
    loadUserKpis({ includeAdmins: false });
  }, [loadUserKpis, loadUsers]);

  /** Solicita al store el cambio de plan del usuario seleccionado. */
  const handleChangePlan = async (targetUser, plan) => {
    try {
      await setUserPlan({ targetUser, plan });
    } catch {
      /** Error is already handled in the store state. */
    }
  };

  /** Da de baja un usuario tras confirmacion y lo elimina de la lista actual. */
  const handleDeactivateUser = async (targetUser) => {
    const label = targetUser.display_name || targetUser.id.slice(0, 8);
    const accepted = window.confirm(
      `Vas a dar de baja a ${label}. Esta accion elimina su perfil y analisis. ¿Continuar?`
    );

    if (!accepted) {
      return;
    }

    try {
      await deactivateUser({ userId: targetUser.id });
    } catch {
      /** Error is already handled in the store state. */
    }
  };

  /** Cierra sesion desde el panel administrativo. */
  const handleLogout = async () => {
    try {
      await logout();
    } catch {
      /** Error is already handled in the store state. */
    }
  };

  return (
    <div className="stitch-landing dark relative min-h-screen overflow-hidden bg-surface text-on-surface">
      <div className="landing-mesh-gradient absolute inset-0 opacity-90" />
      <div className="landing-grid-pattern absolute inset-0 opacity-70" />
      <main className="relative z-10 mx-auto w-full max-w-7xl px-4 pb-10 pt-6 md:px-8">
        <header className="landing-navbar-shell mb-8 flex flex-col gap-3 rounded-2xl border border-outline-variant/20 px-4 py-3 sm:flex-row sm:items-center sm:justify-between md:px-6">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-primary/90">Administrador</p>
            <h1 className="font-headline text-xl font-bold text-on-surface">Panel de administrador</h1>
          </div>
          <div className="flex w-full items-center gap-2 sm:w-auto">
            <Button type="button" variant="outline" className="w-full sm:w-auto" onClick={handleLogout}>Cerrar sesión</Button>
          </div>
        </header>

        <section className="mb-8">
          <p className="text-lg text-on-surface">
            Hola, <span className="font-semibold text-primary">{profile?.display_name || user?.email || "admin"}</span>. Bienvenido al panel de administración.
          </p>
        </section>

        {error ? (
          <p className="mb-6 rounded-xl border border-error/40 bg-error-container/40 px-4 py-3 text-sm text-error">
            {error}
          </p>
        ) : null}

        <AdminKpiSections userKpis={userKpis} apiCallsToday={simulatedApiCallsToday} />

        <AdminUsersTable
          title="Gestión de usuarios"
          users={users}
          loading={loadingUsers}
          actionLoadingUserId={actionLoadingUserId}
          onChangePlan={handleChangePlan}
          onDeactivate={handleDeactivateUser}
          showMoreLabel="Mostrar más"
          onShowMore={() => navigate("/admin/users")}
        />
      </main>
    </div>
  );
}

export default AdminPanel;
