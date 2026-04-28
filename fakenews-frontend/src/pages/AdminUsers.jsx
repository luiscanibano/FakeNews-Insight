/**
 * @file AdminUsers.jsx
 * @description Página de aplicación que orquesta componentes, estados y flujos de negocio por seccion.
 */

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, UsersRound } from "lucide-react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import AdminUsersTable from "../components/admin/AdminUsersTable";
import { useAdminStore } from "../store/adminStore";

const PAGE_SIZE = 8;

/** Listado completo de usuarios para gestion administrativa ampliada. */
function AdminUsers() {
  const navigate = useNavigate();
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

  /** Debounce simple para evitar peticiones en cada pulsacion de tecla. */
  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setSearchTerm(searchInput.trim());
    }, 300);

    return () => window.clearTimeout(timeoutId);
  }, [searchInput]);

  /** Carga la página actual de usuarios según filtro de busqueda en servidor. */
  useEffect(() => {
    loadUsers({
      includeAdmins: false,
      page: currentPage,
      pageSize: PAGE_SIZE,
      searchTerm,
    });
  }, [currentPage, loadUsers, searchTerm]);

  const totalPages = Math.max(1, Math.ceil(totalUsersCount / PAGE_SIZE));
  const safeCurrentPage = Math.min(currentPage, totalPages);

  /** Reinicia a primera página cuando cambia el filtro de busqueda aplicado. */
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  /** Evita páginas fuera de rango cuando cambia el total filtrado. */
  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  /** Solicita el cambio de plan usando la acción de estado global del modulo admin. */
  const handleChangePlan = async (targetUser, plan) => {
    try {
      await setUserPlan({ targetUser, plan });
    } catch {
      /** Error is already handled in the store state. */
    }
  };

  /** Elimina el perfil de usuario tras confirmacion explicita del admin. */
  const handleDeactivateUser = async (targetUser) => {
    const label = targetUser.display_name || targetUser.id.slice(0, 8);
    const accepted = window.confirm(
      `Vas a dar de baja a ${label}. Esta acción elimina su perfil y análisis. ¿Continuar?`
    );

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
      /** Error is already handled in the store state. */
    }
  };

  return (
    <div className="stitch-landing dark min-h-screen bg-surface text-on-surface">
      <main className="mx-auto w-full max-w-6xl px-4 py-8 md:px-8">
        <header className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h1 className="flex items-center gap-2 font-headline text-3xl font-bold">
            <UsersRound className="size-6 text-primary" />
            Todos los usuarios
          </h1>
          <Button type="button" variant="outline" className="w-full sm:w-auto" onClick={() => navigate("/admin")}>
            <ArrowLeft className="size-4" />
            Volver al panel
          </Button>
        </header>

        {error ? (
          <p className="mb-4 rounded-xl border border-error/40 bg-error-container/40 px-4 py-3 text-sm text-error">
            {error}
          </p>
        ) : null}

        <section className="mb-4 grid gap-3 md:grid-cols-[1fr_auto] md:items-center">
          <Input
            type="search"
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            placeholder="Buscar por nombre o ID completo..."
            className="h-10 border-outline-variant/30 bg-surface-container-high/60 text-on-surface"
          />
          <p className="text-sm text-on-surface-variant">
            {totalUsersCount} usuario(s) encontrados
          </p>
        </section>

        <AdminUsersTable
          title="Todos los usuarios"
          users={users}
          loading={loadingUsers}
          actionLoadingUserId={actionLoadingUserId}
          onChangePlan={handleChangePlan}
          onDeactivate={handleDeactivateUser}
          showUserId
        />

        <section className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-on-surface-variant">
            Página {safeCurrentPage} de {totalPages}
          </p>
          <div className="flex w-full items-center gap-2 sm:w-auto">
            <Button
              type="button"
              variant="outline"
              className="flex-1 sm:flex-initial"
              onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
              disabled={safeCurrentPage === 1}
            >
              Anterior
            </Button>
            <Button
              type="button"
              variant="outline"
              className="flex-1 sm:flex-initial"
              onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
              disabled={safeCurrentPage === totalPages}
            >
              Siguiente
            </Button>
          </div>
        </section>
      </main>
    </div>
  );
}

export default AdminUsers;
