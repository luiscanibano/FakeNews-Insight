/**
 * @file PasswordChangeSection.jsx
 * @description Seccion de cambio de contrasena con soporte de cuentas OAuth-only.
 */

import { useState } from "react";
import { ExternalLink, KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import FeedbackBanner from "./FeedbackBanner";

const SECTION_BASE_CLASSES =
  "rounded-2xl border border-outline-variant/25 bg-surface/40 p-5";

/** Formulario para cambiar contrasena, deshabilitado para usuarios OAuth-only. */
function PasswordChangeSection({
  isOauthOnly,
  primaryOauthLabel,
  primaryOauthUrl,
  onChangePassword,
  onSubmittingChange,
}) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordMessage, setPasswordMessage] = useState("");
  const [passwordTone, setPasswordTone] = useState("error");
  const [isPasswordSubmitting, setIsPasswordSubmitting] = useState(false);

  const updateSubmitting = (value) => {
    setIsPasswordSubmitting(value);
    if (typeof onSubmittingChange === "function") {
      onSubmittingChange(value);
    }
  };

  const handleSubmitPassword = async (event) => {
    event.preventDefault();
    setPasswordMessage("");
    setPasswordTone("error");

    if (newPassword !== confirmPassword) {
      setPasswordMessage("La nueva contrasena y su confirmacion no coinciden.");
      return;
    }

    updateSubmitting(true);

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
      updateSubmitting(false);
    }
  };

  return (
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
            esta almacenada en nuestra plataforma. Cambia tu contrasena desde la configuracion
            de seguridad de tu cuenta {primaryOauthLabel || "externa"}.
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
  );
}

export default PasswordChangeSection;
