/**
 * @file DashboardAccountPanel.jsx
 * @description Modal de gestion de cuenta: orquesta sub-secciones de contrasena, suscripcion y baja RGPD.
 */

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import PasswordChangeSection from "./account/PasswordChangeSection";
import SubscriptionSection from "./account/SubscriptionSection";
import DeleteAccountSection from "./account/DeleteAccountSection";
import { resolveProviderState } from "./account/accountProviders";

/** Modal de cuenta con tres secciones: contrasena, suscripcion, baja. */
function DashboardAccountPanel({
  isOpen,
  email,
  planLabel,
  identityProviders = [],
  primaryProvider = "",
  onClose,
  onChangePassword,
  onOpenPlanSelector,
  onDeleteAccount,
}) {
  const [isPasswordSubmitting, setIsPasswordSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  /** Bloquea el scroll del body y captura ESC mientras el modal esta abierto. */
  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleEscape = (event) => {
      if (event.key === "Escape" && !isPasswordSubmitting && !isDeleting) {
        onClose();
      }
    };

    window.addEventListener("keydown", handleEscape);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen, onClose, isPasswordSubmitting, isDeleting]);

  if (!isOpen) {
    return null;
  }

  const { isOauthOnly, primaryOauthLabel, primaryOauthUrl } = resolveProviderState({
    identityProviders,
    primaryProvider,
  });

  const isAnyActionInFlight = isPasswordSubmitting || isDeleting;

  return (
    <div
      className="fixed inset-0 z-[80] flex items-start justify-center overflow-y-auto overflow-x-hidden bg-black/70 p-4 pt-16 backdrop-blur-sm sm:items-center sm:pt-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !isAnyActionInFlight) {
          onClose();
        }
      }}
    >
      <section className="landing-glass-card my-auto w-full max-w-3xl overflow-hidden rounded-3xl border border-outline-variant/25 p-5 sm:p-7">
        <div className="mb-5 flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] uppercase tracking-[0.2em] text-on-surface-variant">
              Mi cuenta
            </p>
            <h2 className="mt-1 text-xl font-semibold text-on-surface sm:text-2xl">
              Gestiona tu cuenta y privacidad
            </h2>
            <p className="mt-1 text-sm text-on-surface-variant">
              {email ? `Sesion iniciada como ${email}.` : "Sesion iniciada."} Plan actual:{" "}
              {planLabel}.
            </p>
          </div>
          <Button
            type="button"
            size="icon-sm"
            variant="ghost"
            onClick={onClose}
            disabled={isAnyActionInFlight}
            aria-label="Cerrar panel de cuenta"
          >
            <X className="size-4" />
          </Button>
        </div>

        <div className="grid gap-4">
          <PasswordChangeSection
            isOauthOnly={isOauthOnly}
            primaryOauthLabel={primaryOauthLabel}
            primaryOauthUrl={primaryOauthUrl}
            onChangePassword={onChangePassword}
            onSubmittingChange={setIsPasswordSubmitting}
          />

          <SubscriptionSection
            planLabel={planLabel}
            onOpenPlanSelector={onOpenPlanSelector}
          />

          <DeleteAccountSection
            onDeleteAccount={onDeleteAccount}
            onSubmittingChange={setIsDeleting}
          />
        </div>
      </section>
    </div>
  );
}

export default DashboardAccountPanel;
