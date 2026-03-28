import { useEffect, useState } from "react";
import { Crown } from "lucide-react";
import { Button } from "../ui/button";

// Lista de usuarios administrables con acciones de plan y baja.
function AdminUsersTable({
  users,
  loading,
  actionLoadingUserId,
  onChangePlan,
  onDeactivate,
  title = "Gestion de usuarios",
  showMoreLabel,
  onShowMore,
  showUserId = false,
}) {
  const [draftPlansByUserId, setDraftPlansByUserId] = useState({});

  // Inicializa y sincroniza el plan seleccionado por fila con los datos actuales.
  useEffect(() => {
    const nextDrafts = {};
    users.forEach((managedUser) => {
      nextDrafts[managedUser.id] = managedUser.plan || "free";
    });
    setDraftPlansByUserId(nextDrafts);
  }, [users]);

  // Actualiza el plan elegido en la fila sin persistirlo todavia en backend.
  const handleDraftPlanChange = (userId, value) => {
    setDraftPlansByUserId((previous) => ({
      ...previous,
      [userId]: value,
    }));
  };

  return (
    <section className="landing-glass-card rounded-2xl border border-outline-variant/20 bg-surface-container/60 p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 font-headline text-2xl font-bold">
          <Crown className="size-5 text-primary" />
          {title}
        </h2>
        {showMoreLabel && onShowMore ? (
          <Button type="button" variant="outline" onClick={onShowMore}>
            {showMoreLabel}
          </Button>
        ) : null}
      </div>

      {loading ? (
        <p className="text-sm text-on-surface-variant">Cargando usuarios...</p>
      ) : users.length === 0 ? (
        <p className="text-sm text-on-surface-variant">No hay usuarios para mostrar.</p>
      ) : (
        <div className="space-y-3">
          {users.map((managedUser) => {
            const isPending = actionLoadingUserId === managedUser.id;
            const userLabel = managedUser.display_name || managedUser.id.slice(0, 8);

            return (
              <div
                key={managedUser.id}
                className="grid gap-2 rounded-xl border border-outline-variant/20 bg-surface/50 p-3 md:grid-cols-[1fr_130px_auto_auto] md:items-center"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-on-surface">{userLabel}</p>
                  {showUserId ? (
                    <p className="text-xs text-on-surface-variant">{managedUser.id}</p>
                  ) : null}
                </div>

                <select
                  className="h-10 rounded-lg border border-outline-variant/30 bg-surface-container-high px-3 text-xs font-bold uppercase tracking-wider text-primary"
                  value={draftPlansByUserId[managedUser.id] || "free"}
                  onChange={(event) => handleDraftPlanChange(managedUser.id, event.target.value)}
                  disabled={isPending}
                >
                  <option value="free">FREE</option>
                  <option value="pro">PRO</option>
                  <option value="ultra">ULTRA</option>
                </select>

                <Button
                  type="button"
                  className="bg-primary text-on-primary"
                  onClick={() =>
                    onChangePlan(
                      managedUser,
                      draftPlansByUserId[managedUser.id] || managedUser.plan || "free"
                    )
                  }
                  disabled={
                    isPending ||
                    (draftPlansByUserId[managedUser.id] || "free") === (managedUser.plan || "free")
                  }
                >
                  Guardar plan
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  onClick={() => onDeactivate(managedUser)}
                  disabled={isPending}
                >
                  Dar de baja
                </Button>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

export default AdminUsersTable;
