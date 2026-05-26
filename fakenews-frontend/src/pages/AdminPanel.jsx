/**
 * @file AdminPanel.jsx
 * @description Página de aplicación que orquesta componentes, estados y flujos de negocio por seccion.
 */

import { useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowRight, LogOut, ShieldCheck, UsersRound } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "../components/ui/button";
import AdminKpiSections from "../components/admin/AdminKpiSections";
import AdminUsersTable from "../components/admin/AdminUsersTable";
import { useAuthStore } from "../store/authStore";
import { useAdminStore } from "../store/adminStore";
import LandingBackground from "../components/landing/LandingBackground";

/** Panel inicial de administracion con KPIs y acciones basicas de gestion de usuarios.
 */
function AdminPanel() {
  const navigate = useNavigate();
  const { t } = useTranslation("admin");
  const logout = useAuthStore((state) => state.logout);
  const profile = useAuthStore((state) => state.profile);
  const user = useAuthStore((state) => state.user);

  const users = useAdminStore((state) => state.users);
  const loadingUsers = useAdminStore((state) => state.loadingUsers);
  const actionLoadingUserId = useAdminStore((state) => state.actionLoadingUserId);
  const error = useAdminStore((state) => state.error);
  const userKpis = useAdminStore((state) => state.userKpis);
  const requestKpis = useAdminStore((state) => state.requestKpis);
  const loadingRequestKpis = useAdminStore((state) => state.loadingRequestKpis);
  const loadUsers = useAdminStore((state) => state.loadUsers);
  const loadUserKpis = useAdminStore((state) => state.loadUserKpis);
  const loadRequestKpis = useAdminStore((state) => state.loadRequestKpis);
  const setUserPlan = useAdminStore((state) => state.setUserPlan);
  const deactivateUser = useAdminStore((state) => state.deactivateUser);

  /** Carga solo la primera página y los KPIs globales del panel administrativo.
 */
  useEffect(() => {
    loadUsers({ includeAdmins: false, page: 1, pageSize: 5 });
    loadUserKpis({ includeAdmins: false });
    loadRequestKpis();
  }, [loadRequestKpis, loadUserKpis, loadUsers]);

  /** Solicita al store el cambio de plan del usuario seleccionado.
 */
  const handleChangePlan = async (targetUser, plan) => {
    try {
      await setUserPlan({ targetUser, plan });
    } catch {
      /** Error is already handled in the store state.
 */
    }
  };

  /** Da de baja un usuario tras confirmacion y lo elimina de la lista actual.
 */
  const handleDeactivateUser = async (targetUser) => {
    const label = targetUser.display_name || targetUser.id.slice(0, 8);
    const accepted = window.confirm(t("confirmDeactivate", { name: label }));

    if (!accepted) {
      return;
    }

    try {
      await deactivateUser({ userId: targetUser.id });
    } catch {
      /** Error is already handled in the store state.
 */
    }
  };

  /** Cierra sesión desde el panel administrativo.
 */
  const handleLogout = async () => {
    try {
      await logout();
    } catch {
      /** Error is already handled in the store state.
 */
    }
  };

  return (
    <div className="stitch-landing dark relative isolate min-h-screen overflow-x-hidden bg-surface text-on-surface font-body selection:bg-primary/30 selection:text-primary">
      <LandingBackground />

      <header className="fixed top-0 z-50 w-full px-4 pt-4 md:px-6">
        <div className="landing-navbar-shell mx-auto flex min-h-16 w-full max-w-7xl flex-wrap items-center gap-3 rounded-2xl border border-outline-variant/20 px-4 py-3 md:px-6 md:py-0">
          <Link to="/" className="group flex items-center gap-3 text-on-surface">
            <span className="landing-brand-mark" aria-hidden="true">
              <span className="landing-brand-grid" />
              <span className="landing-brand-glyph">
                <span className="landing-brand-bar landing-brand-bar-a" />
                <span className="landing-brand-bar landing-brand-bar-b" />
                <span className="landing-brand-dot" />
              </span>
            </span>
            <span className="leading-tight">
              <span className="landing-brand-lead">FakeNews</span>
              <span className="landing-brand-tail">Insight</span>
            </span>
          </Link>

          <div className="ml-auto flex w-full flex-wrap items-center justify-end gap-2 md:w-auto">
            <Button type="button" variant="ghost" onClick={handleLogout} className="dash-tab">
              <LogOut className="size-4" />
              {t("panel.logout")}
            </Button>
          </div>
        </div>
      </header>

      <main className="relative z-10 mx-auto w-full max-w-7xl px-4 pb-12 pt-32 sm:px-6">
        <section className="mb-8">
          <span className="dash-home-eyebrow">
            <span className="dash-home-eyebrow-dot" aria-hidden="true" />
            {t("panel.eyebrow")}
          </span>
          <h1 className="dash-home-h1 mt-3">
            {t("panel.titlePrefix")} <span className="dash-home-h1-soft">{t("panel.titleSoft")}</span>
          </h1>
          <p className="mt-4 max-w-3xl text-base leading-7 text-on-surface-variant md:text-lg">
            {t("panel.greeting", { name: profile?.display_name || user?.email || t("panel.fallbackName") })}
          </p>
        </section>

        {error ? (
          <p className="mb-6 rounded-2xl border border-error/40 bg-error-container/40 px-4 py-3 text-sm text-error">
            {error}
          </p>
        ) : null}

        <AdminKpiSections
          userKpis={userKpis}
          requestKpis={requestKpis}
          loadingRequestKpis={loadingRequestKpis}
        />

        <section className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_280px]">
          <AdminUsersTable
            title={t("panel.usersTitle")}
            users={users}
            loading={loadingUsers}
            actionLoadingUserId={actionLoadingUserId}
            onChangePlan={handleChangePlan}
            onDeactivate={handleDeactivateUser}
            showMoreLabel={t("panel.showMore")}
            onShowMore={() => navigate("/admin/users")}
          />

          <aside className="dash-in dash-panel space-y-4" style={{ "--i": 4 }}>
            <header className="dash-panel-head">
              <div>
                <p className="dash-panel-meta">{t("panel.summaryMeta")}</p>
                <h2 className="dash-panel-title flex items-center gap-2">
                  <ShieldCheck className="size-4 text-primary" />
                  {t("panel.summaryTitle")}
                </h2>
              </div>
            </header>
            <p className="dash-section-text">
              {t("panel.summaryDescription")}
            </p>
            <div className="rounded-2xl border border-outline-variant/20 bg-surface/45 p-4">
              <p className="text-xs uppercase tracking-[0.16em] text-on-surface-variant/80">
                {t("panel.visibleUsers")}
              </p>
              <p className="mt-2 font-headline text-3xl font-semibold text-on-surface">
                {users.length}
              </p>
            </div>
            <Button type="button" variant="outline" className="w-full" onClick={() => navigate("/admin/users")}>
              <UsersRound className="size-4" />
              {t("panel.openUsers")}
              <ArrowRight className="size-4" />
            </Button>
          </aside>
        </section>
      </main>
    </div>
  );
}

export default AdminPanel;
