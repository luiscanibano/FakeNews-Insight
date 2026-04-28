/**
 * @file DashboardAccountPanel.jsx
 * @description Modal de gestion de cuenta: orquesta sub-secciones de contraseña, suscripcion y baja RGPD.
 */

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { useTranslation } from "react-i18next";
import PasswordChangeSection from "./account/PasswordChangeSection";
import SubscriptionSection from "./account/SubscriptionSection";
import DeleteAccountSection from "./account/DeleteAccountSection";
import { resolveProviderState } from "./account/accountProviders";

/** Modal de cuenta con tres secciones: contraseña, suscripcion, baja. */
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
  const { t } = useTranslation("dashboard");
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
      className="dash-modal-overlay"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !isAnyActionInFlight) {
          onClose();
        }
      }}
    >
      <section className="dash-modal dash-modal-md" role="dialog" aria-modal="true">
        <div className="dash-modal-head">
          <div>
            <span className="dash-home-eyebrow">
              <span className="dash-home-eyebrow-dot" aria-hidden="true" />
              {t("account.myAccount")}
            </span>
            <h2 className="dash-home-h1 mt-3" style={{ fontSize: "clamp(1.4rem, 2.6vw, 1.8rem)" }}>
              {t("account.manageTitle")}
            </h2>
            <p className="dash-home-sub" style={{ marginTop: "0.4rem" }}>
              {email ? t("account.sessionAs", { email }) : t("account.sessionGeneric")}{" "}
              {t("account.currentPlan", { plan: planLabel })}
            </p>
          </div>
          <button
            type="button"
            className="dash-modal-close"
            onClick={onClose}
            disabled={isAnyActionInFlight}
            aria-label={t("account.closePanelAria")}
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="grid gap-3.5">
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
