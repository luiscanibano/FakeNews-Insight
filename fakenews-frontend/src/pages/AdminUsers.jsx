/**
 * @file AdminUsers.jsx
 * @description Página de aplicación que orquesta componentes, estados y flujos de negocio por seccion.
 */

import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, UsersRound } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import AdminUsersTable from "../components/admin/AdminUsersTable";
import { useAdminStore } from "../store/adminStore";
import LandingBackground from "../components/landing/LandingBackground";

const PAGE_SIZE = 8;

/** Listado completo de usuarios para gestion administrativa ampliada.
 */
function AdminUsers() {
  const navigate = useNavigate();
  const { t } = useTranslation("admin");
  const users = useAdminStore((state) => state.users);
  const totalUsersCount = useAdminStore((state) => state.totalUsersCount);
  const loadingUsers = useAdminStore((state) => state.loadingUsers);
  const actionLoadingUserId = useAdminStore((state) => state.actionLoadingUserId);
  const error = useAdminStore((state) => state.error);
  const loadUsers = useAdminStore((state) => state.loadUsers);
  const setUserPlan = useAdminStore((state) => state.setUserPlan);
  const deactivateUser = useAdminStore((state) => state.deactivateUser);

  const [searchInput, setSearchInput] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  /** Debounce simple para evitar peticiones en cada pulsacion de tecla.
 */
  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setSearchTerm(searchInput.trim());
      setCurrentPage(1);
    }, 300);

    return () => window.clearTimeout(timeoutId);
  }, [searchInput]);

  const totalPages = Math.max(1, Math.ceil(totalUsersCount / PAGE_SIZE));
  const safeCurrentPage = Math.min(currentPage, totalPages);

  /** Carga la página actual de usuarios según filtro de busqueda en servidor.
 */
  useEffect(() => {
    loadUsers({
      includeAdmins: false,
      page: safeCurrentPage,
      pageSize: PAGE_SIZE,
      searchTerm,
    });
  }, [loadUsers, safeCurrentPage, searchTerm]);

  /** Solicita el cambio de plan usando la acción de estado global del modulo admin.
 */
  const handleChangePlan = async (targetUser, plan) => {
    try {
      await setUserPlan({ targetUser, plan });
    } catch {
      /** Error is already handled in the store state.
 */
    }
  };

  /** Elimina el perfil de usuario tras confirmacion explicita del admin.
 */
  const handleDeactivateUser = async (targetUser) => {
    const label = targetUser.display_name || targetUser.id.slice(0, 8);
    const accepted = window.confirm(t("confirmDeactivate", { name: label }));

    if (!accepted) {
      return;
    }

    try {
      await deactivateUser({ userId: targetUser.id });
      await loadUsers({
        includeAdmins: false,
        page: safeCurrentPage,
        pageSize: PAGE_SIZE,
        searchTerm,
      });
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
            <Button type="button" variant="outline" onClick={() => navigate("/admin")}>
              <ArrowLeft className="size-4" />
              {t("users.back")}
            </Button>
          </div>
        </div>
      </header>

      <main className="relative z-10 mx-auto w-full max-w-7xl px-4 pb-12 pt-32 sm:px-6">
        <section className="mb-8">
          <span className="dash-home-eyebrow">
            <span className="dash-home-eyebrow-dot" aria-hidden="true" />
            {t("users.eyebrow")}
          </span>
          <h1 className="dash-home-h1 mt-3">
            {t("users.titlePrefix")} <span className="dash-home-h1-soft">{t("users.titleSoft")}</span>
          </h1>
          <p className="mt-4 max-w-3xl text-base leading-7 text-on-surface-variant md:text-lg">
            {t("users.subtitle")}
          </p>
        </section>

        {error ? (
          <p className="mb-4 rounded-2xl border border-error/40 bg-error-container/40 px-4 py-3 text-sm text-error">
            {error}
          </p>
        ) : null}

        <section className="dash-in dash-panel mb-6 grid gap-3 md:grid-cols-[1fr_auto] md:items-center" style={{ "--i": 1 }}>
          <Input
            type="search"
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            placeholder={t("users.searchPlaceholder")}
            className="h-11 border-outline-variant/30 bg-surface-container-high/60 text-on-surface"
          />
          <p className="text-sm text-on-surface-variant">
            {t("users.found", { count: totalUsersCount })}
          </p>
        </section>

        <AdminUsersTable
          title={t("users.title")}
          users={users}
          loading={loadingUsers}
          actionLoadingUserId={actionLoadingUserId}
          onChangePlan={handleChangePlan}
          onDeactivate={handleDeactivateUser}
          showUserId
        />

        <section className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-on-surface-variant">
            {t("users.page", { current: safeCurrentPage, total: totalPages })}
          </p>
          <div className="flex w-full items-center gap-2 sm:w-auto">
            <Button
              type="button"
              variant="outline"
              className="flex-1 sm:flex-initial"
              onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
              disabled={safeCurrentPage === 1}
            >
              {t("users.previous")}
            </Button>
            <Button
              type="button"
              variant="outline"
              className="flex-1 sm:flex-initial"
              onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
              disabled={safeCurrentPage === totalPages}
            >
              {t("users.next")}
            </Button>
          </div>
        </section>
      </main>
    </div>
  );
}

export default AdminUsers;
