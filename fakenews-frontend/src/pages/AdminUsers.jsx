import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, UsersRound } from "lucide-react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import AdminUsersTable from "../components/admin/AdminUsersTable";
import { useAdminStore } from "../store/adminStore";

const PAGE_SIZE = 8;

// Listado completo de usuarios para gestion administrativa ampliada.
function AdminUsers() {
  const navigate = useNavigate();
  const users = useAdminStore((state) => state.users);
  const loadingUsers = useAdminStore((state) => state.loadingUsers);
  const actionLoadingUserId = useAdminStore((state) => state.actionLoadingUserId);
  const error = useAdminStore((state) => state.error);
  const loadUsers = useAdminStore((state) => state.loadUsers);
  const setUserPlan = useAdminStore((state) => state.setUserPlan);
  const deactivateUser = useAdminStore((state) => state.deactivateUser);

  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  // Carga el listado completo de usuarios via store centralizado.
  useEffect(() => {
    loadUsers({ includeAdmins: false });
  }, [loadUsers]);

  // Filtra por nombre visible o por prefijo del ID para facilitar busqueda de usuarios.
  const filteredUsers = useMemo(() => {
    const normalizedTerm = searchTerm.trim().toLowerCase();
    if (!normalizedTerm) {
      return users;
    }

    return users.filter((managedUser) => {
      const name = (managedUser.display_name || "").toLowerCase();
      const id = (managedUser.id || "").toLowerCase();
      return name.includes(normalizedTerm) || id.includes(normalizedTerm);
    });
  }, [users, searchTerm]);

  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / PAGE_SIZE));
  const safeCurrentPage = Math.min(currentPage, totalPages);

  const paginatedUsers = useMemo(() => {
    const start = (safeCurrentPage - 1) * PAGE_SIZE;
    return filteredUsers.slice(start, start + PAGE_SIZE);
  }, [filteredUsers, safeCurrentPage]);

  // Reinicia a primera pagina cuando cambia el texto de busqueda.
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  // Evita paginas fuera de rango cuando cambia el total filtrado.
  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  // Solicita el cambio de plan usando la accion de estado global del modulo admin.
  const handleChangePlan = async (targetUser, plan) => {
    try {
      await setUserPlan({ targetUser, plan });
    } catch {
      // Error is already handled in the store state.
    }
  };

  // Elimina el perfil de usuario tras confirmacion explicita del admin.
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
      // Error is already handled in the store state.
    }
  };

  return (
    <div className="stitch-landing dark min-h-screen bg-surface text-on-surface">
      <main className="mx-auto w-full max-w-6xl px-4 py-8 md:px-8">
        <header className="mb-6 flex items-center justify-between gap-3">
          <h1 className="flex items-center gap-2 font-headline text-3xl font-bold">
            <UsersRound className="size-6 text-primary" />
            Todos los usuarios
          </h1>
          <Button type="button" variant="outline" onClick={() => navigate("/admin")}>
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
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Buscar por nombre o ID..."
            className="h-10 border-outline-variant/30 bg-surface-container-high/60 text-on-surface"
          />
          <p className="text-sm text-on-surface-variant">
            {filteredUsers.length} usuario(s) encontrados
          </p>
        </section>

        <AdminUsersTable
          title="Todos los usuarios"
          users={paginatedUsers}
          loading={loadingUsers}
          actionLoadingUserId={actionLoadingUserId}
          onChangePlan={handleChangePlan}
          onDeactivate={handleDeactivateUser}
          showUserId
        />

        <section className="mt-4 flex items-center justify-between gap-3">
          <p className="text-sm text-on-surface-variant">
            Pagina {safeCurrentPage} de {totalPages}
          </p>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
              disabled={safeCurrentPage === 1}
            >
              Anterior
            </Button>
            <Button
              type="button"
              variant="outline"
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
