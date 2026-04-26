/**
 * @file DashboardAccountPanel.jsx
 * @description Panel modal de gestion de cuenta del dashboard: contrasena, suscripcion y baja RGPD.
 */

import { useEffect, useState } from "react";
import { AlertTriangle, CreditCard, ExternalLink, KeyRound, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const SECTION_BASE_CLASSES =
  "rounded-2xl border border-outline-variant/25 bg-surface/40 p-5";

const PROVIDER_LABELS = {
  google: "Google",
  github: "GitHub",
  azure: "Microsoft",
  facebook: "Facebook",
  apple: "Apple",
};

const PROVIDER_ACCOUNT_URLS = {
  google: "https://myaccount.google.com/security",
  github: "https://github.com/settings/security",
  azure: "https://account.microsoft.com/security",
  facebook: "https://www.facebook.com/settings?tab=security",
  apple: "https://appleid.apple.com/account/manage",
};

/** Banner de mensaje con tono configurable success/error. */
function FeedbackBanner({ message, tone }) {
  if (!message) {
    return null;
  }

  const className =
    tone === "success"
      ? "mt-3 rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-400"
      : "mt-3 rounded-xl border border-error/30 bg-error-container/40 px-3 py-2 text-sm text-error";

  return <p className={className}>{message}</p>;
}

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
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordMessage, setPasswordMessage] = useState("");
  const [passwordTone, setPasswordTone] = useState("error");
  const [isPasswordSubmitting, setIsPasswordSubmitting] = useState(false);

  const [deleteConfirmation, setDeleteConfirmation] = useState("");
  const [deleteMessage, setDeleteMessage] = useState("");
  const [deleteTone, setDeleteTone] = useState("error");
  const [isDeleting, setIsDeleting] = useState(false);

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

  useEffect(() => {
    if (isOpen) {
      return;
    }

    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setPasswordMessage("");
    setPasswordTone("error");
    setDeleteConfirmation("");
    setDeleteMessage("");
    setDeleteTone("error");
  }, [isOpen]);

  if (!isOpen) {
    return null;
  }

  const normalizedProviders = (identityProviders || [])
    .map((value) => String(value || "").toLowerCase())
    .filter(Boolean);
  const normalizedPrimary = String(primaryProvider || "").toLowerCase();
  const hasEmailIdentity =
    normalizedProviders.includes("email") || normalizedPrimary === "email";
  const oauthProviders = normalizedProviders.filter((value) => value !== "email");
  if (normalizedPrimary && normalizedPrimary !== "email" && !oauthProviders.includes(normalizedPrimary)) {
    oauthProviders.unshift(normalizedPrimary);
  }
  const isOauthOnly =
    (normalizedPrimary && normalizedPrimary !== "email") ||
    (oauthProviders.length > 0 && !hasEmailIdentity);
  const primaryOauthProvider =
    (normalizedPrimary && normalizedPrimary !== "email" ? normalizedPrimary : null) ||
    oauthProviders[0] ||
    null;
  const primaryOauthLabel = primaryOauthProvider
    ? PROVIDER_LABELS[primaryOauthProvider] || primaryOauthProvider
    : null;
  const primaryOauthUrl = primaryOauthProvider
    ? PROVIDER_ACCOUNT_URLS[primaryOauthProvider] || null
    : null;

  const handleSubmitPassword = async (event) => {
    event.preventDefault();
    setPasswordMessage("");
    setPasswordTone("error");

    if (newPassword !== confirmPassword) {
      setPasswordMessage("La nueva contrasena y su confirmacion no coinciden.");
      return;
    }

    setIsPasswordSubmitting(true);

    try {
      await onChangePassword({ currentPassword, newPassword });
      setPasswordMessage("Contrasena actualizada correctamente.");
      setPasswordTone("success");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (error) {
      setPasswordMessage(error.message || "No se pudo actualizar la contrasena.");
    } finally {
      setIsPasswordSubmitting(false);
    }
  };

  const handleSubmitDelete = async (event) => {
    event.preventDefault();
    setDeleteMessage("");
    setDeleteTone("error");

    if (deleteConfirmation.trim().toUpperCase() !== "ELIMINAR") {
      setDeleteMessage("Escribe ELIMINAR en el campo para confirmar la baja.");
      return;
    }

    setIsDeleting(true);

    try {
      await onDeleteAccount({ confirmation: deleteConfirmation.trim().toUpperCase() });
    } catch (error) {
      setDeleteMessage(error.message || "No se pudo eliminar la cuenta.");
      setIsDeleting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[80] flex items-start justify-center overflow-y-auto overflow-x-hidden bg-black/70 p-4 pt-16 backdrop-blur-sm sm:items-center sm:pt-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !isPasswordSubmitting && !isDeleting) {
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
              {email ? `Sesion iniciada como ${email}.` : "Sesion iniciada."} Plan actual: {planLabel}.
            </p>
          </div>
          <Button
            type="button"
            size="icon-sm"
            variant="ghost"
            onClick={onClose}
            disabled={isPasswordSubmitting || isDeleting}
            aria-label="Cerrar panel de cuenta"
          >
            <X className="size-4" />
          </Button>
        </div>

        <div className="grid gap-4">
          <div className={SECTION_BASE_CLASSES}>
            <div className="mb-3 flex items-center gap-2 text-on-surface">
              <KeyRound className="size-4 text-primary" />
              <h3 className="text-sm font-semibold uppercase tracking-[0.16em]">
                Cambiar contrasena
              </h3>
            </div>
            {isOauthOnly ? (
              <div className="space-y-3">
                <p className="text-sm text-on-surface-variant">
                  Iniciaste sesion con {primaryOauthLabel || "un proveedor externo"}, por lo que tu
                  contrasena se gestiona directamente en {primaryOauthLabel || "el proveedor"} y no
                  esta almacenada en nuestra plataforma. Cambia tu contrasena desde la
                  configuracion de seguridad de tu cuenta {primaryOauthLabel || "externa"}.
                </p>
                {primaryOauthUrl ? (
                  <Button asChild variant="outline">
                    <a href={primaryOauthUrl} target="_blank" rel="noreferrer noopener">
                      <ExternalLink className="size-3.5" />
                      Abrir seguridad de {primaryOauthLabel}
                    </a>
                  </Button>
                ) : null}
              </div>
            ) : (
              <>
                <p className="text-sm text-on-surface-variant">
                  Por seguridad, te pediremos tu contrasena actual antes de aplicar el cambio.
                </p>

                <form onSubmit={handleSubmitPassword} className="mt-4 grid gap-3">
              <div className="grid gap-1.5">
                <Label htmlFor="account-current-password">Contrasena actual</Label>
                <Input
                  id="account-current-password"
                  type="password"
                  autoComplete="current-password"
                  value={currentPassword}
                  onChange={(event) => setCurrentPassword(event.target.value)}
                  required
                  disabled={isPasswordSubmitting}
                />
              </div>
              <div className="grid gap-1.5 sm:grid-cols-2 sm:gap-3">
                <div className="grid gap-1.5">
                  <Label htmlFor="account-new-password">Nueva contrasena</Label>
                  <Input
                    id="account-new-password"
                    type="password"
                    autoComplete="new-password"
                    value={newPassword}
                    onChange={(event) => setNewPassword(event.target.value)}
                    minLength={8}
                    required
                    disabled={isPasswordSubmitting}
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="account-confirm-password">Confirmar contrasena</Label>
                  <Input
                    id="account-confirm-password"
                    type="password"
                    autoComplete="new-password"
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    minLength={8}
                    required
                    disabled={isPasswordSubmitting}
                  />
                </div>
              </div>
              <div className="flex justify-end">
                <Button type="submit" disabled={isPasswordSubmitting}>
                  {isPasswordSubmitting ? "Actualizando..." : "Actualizar contrasena"}
                </Button>
              </div>
              <FeedbackBanner message={passwordMessage} tone={passwordTone} />
            </form>
              </>
            )}
          </div>

          <div className={SECTION_BASE_CLASSES}>
            <div className="mb-3 flex items-center gap-2 text-on-surface">
              <CreditCard className="size-4 text-primary" />
              <h3 className="text-sm font-semibold uppercase tracking-[0.16em]">
                Gestionar suscripcion
              </h3>
            </div>
            <p className="text-sm text-on-surface-variant">
              Cambia de plan, programa el regreso a Free al final del ciclo o reactiva una
              suscripcion desde el selector de planes.
            </p>
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
              <span className="rounded-full border border-outline-variant/30 bg-surface/60 px-3 py-1 text-xs uppercase tracking-[0.16em] text-primary">
                Plan {planLabel}
              </span>
              <div className="flex flex-wrap gap-2">
                <Button type="button" variant="outline" onClick={onOpenPlanSelector}>
                  Abrir selector de planes
                </Button>
              </div>
            </div>
          </div>

          <div className={`${SECTION_BASE_CLASSES} border-error/40 bg-error-container/15`}>
            <div className="mb-3 flex items-center gap-2 text-error">
              <AlertTriangle className="size-4" />
              <h3 className="text-sm font-semibold uppercase tracking-[0.16em]">
                Eliminar cuenta (RGPD)
              </h3>
            </div>
            <p className="text-sm text-on-surface-variant">
              Esta accion es irreversible. Eliminaremos tu cuenta y datos asociados.
              Para confirmar, escribe{" "}
              <span className="font-semibold text-on-surface">ELIMINAR</span> en el campo de abajo.
            </p>

            <form onSubmit={handleSubmitDelete} className="mt-4 grid gap-3">
              <div className="grid gap-1.5">
                <Label htmlFor="account-delete-confirmation">Confirmacion</Label>
                <Input
                  id="account-delete-confirmation"
                  type="text"
                  value={deleteConfirmation}
                  onChange={(event) => setDeleteConfirmation(event.target.value)}
                  placeholder="Escribe ELIMINAR"
                  disabled={isDeleting}
                  required
                />
              </div>
              <div className="flex justify-end">
                <Button
                  type="submit"
                  variant="destructive"
                  disabled={isDeleting}
                >
                  <Trash2 className="size-3.5" />
                  {isDeleting ? "Eliminando..." : "Eliminar mi cuenta"}
                </Button>
              </div>
              <FeedbackBanner message={deleteMessage} tone={deleteTone} />
            </form>
          </div>
        </div>
      </section>
    </div>
  );
}

export default DashboardAccountPanel;
