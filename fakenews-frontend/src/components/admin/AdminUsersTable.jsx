/**
 * @file AdminUsersTable.jsx
 * @description Listado de usuarios admin con presentación alineada con el dashboard.
 */

import { useState } from "react";
import { Crown, UserRound } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "../ui/button";

/** Tabla de usuarios administrables con acciones de plan y baja de cuenta. */
function AdminUsersTable({
  users,
  loading,
  actionLoadingUserId,
  onChangePlan,
  onDeactivate,
  title,
  showMoreLabel,
  onShowMore,
  showUserId = false,
}) {
  const { t } = useTranslation("admin");
  const resolvedTitle = title || t("usersTable.defaultTitle");
  const [draftPlanOverridesByUserId, setDraftPlanOverridesByUserId] = useState({});

  /** Actualiza el borrador de plan local sin persistir en backend hasta confirmar. */
  const handleDraftPlanChange = (userId, value) => {
    setDraftPlanOverridesByUserId((previous) => ({
      ...previous,
      [userId]: value,
    }));
  };

  return (
    <section className="dash-in dash-panel space-y-5" style={{ "--i": 3 }}>
      <div className="dash-panel-head flex-wrap gap-3">
        <div>
          <p className="dash-panel-meta">{t("usersTable.meta")}</p>
          <h2 className="dash-panel-title flex items-center gap-2">
            <Crown className="size-5 text-primary" />
            {resolvedTitle}
          </h2>
        </div>
        {showMoreLabel && onShowMore ? (
          <Button type="button" variant="outline" onClick={onShowMore}>
            {showMoreLabel}
          </Button>
        ) : null}
      </div>

      {loading ? (
        <p className="text-sm text-on-surface-variant">{t("usersTable.loading")}</p>
      ) : users.length === 0 ? (
        <p className="text-sm text-on-surface-variant">{t("usersTable.empty")}</p>
      ) : (
        <div className="space-y-3">
          {users.map((managedUser) => {
            const isPending = actionLoadingUserId === managedUser.id;
            const userLabel = managedUser.display_name || managedUser.id.slice(0, 8);
            const selectedPlan = draftPlanOverridesByUserId[managedUser.id] || managedUser.plan || "free";

            return (
              <div
                key={managedUser.id}
                className="grid gap-3 rounded-2xl border border-outline-variant/20 bg-surface/45 p-4 md:grid-cols-[minmax(0,1fr)_150px_auto_auto] md:items-center"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2 text-on-surface">
                    <span className="flex size-9 items-center justify-center rounded-full border border-outline-variant/20 bg-surface-container-high/60">
                      <UserRound className="size-4 text-primary" />
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-on-surface">{userLabel}</p>
                      <p className="text-xs uppercase tracking-[0.14em] text-on-surface-variant/80">
                        {(managedUser.plan || "free").toUpperCase()}
                      </p>
                    </div>
                  </div>
                  {showUserId ? (
                    <p className="mt-2 break-all text-xs text-on-surface-variant">{managedUser.id}</p>
                  ) : null}
                </div>

                <select
                  className="h-11 w-full rounded-xl border border-outline-variant/30 bg-surface-container-high/70 px-3 text-xs font-bold uppercase tracking-[0.16em] text-primary md:w-auto"
                  value={selectedPlan}
                  onChange={(event) => handleDraftPlanChange(managedUser.id, event.target.value)}
                  disabled={isPending}
                >
                  <option value="free">FREE</option>
                  <option value="pro">PRO</option>
                  <option value="ultra">ULTRA</option>
                </select>

                <Button
                  type="button"
                  className="w-full md:w-auto"
                  onClick={() =>
                    onChangePlan(
                      managedUser,
                      selectedPlan
                    )
                  }
                  disabled={
                    isPending ||
                    selectedPlan === (managedUser.plan || "free")
                  }
                >
                  {t("usersTable.savePlan")}
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  className="w-full md:w-auto"
                  onClick={() => onDeactivate(managedUser)}
                  disabled={isPending}
                >
                  {t("usersTable.deactivate")}
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
