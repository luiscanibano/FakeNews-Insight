/**
 * @file PasswordChangeSection.jsx
 * @description Sección de cambio de contraseña con soporte de cuentas OAuth-only.
 */

import { useState } from "react";
import { ExternalLink, KeyRound } from "lucide-react";
import FeedbackBanner from "./FeedbackBanner";

/** Formulario para cambiar contraseña, deshabilitado para usuarios OAuth-only. */
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
      setPasswordMessage("La nueva contraseña y su confirmación no coinciden.");
      return;
    }

    updateSubmitting(true);

    try {
      await onChangePassword({ currentPassword, newPassword });
      setPasswordMessage("Contraseña actualizada correctamente.");
      setPasswordTone("success");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (error) {
      setPasswordMessage(error.message || "No se pudo actualizar la contraseña.");
    } finally {
      updateSubmitting(false);
    }
  };

  return (
    <div className="dash-section">
      <div className="dash-section-head">
        <KeyRound className="size-4 text-on-surface-variant" aria-hidden="true" />
        <h3 className="dash-section-title-sm">Cambiar contraseña</h3>
      </div>

      {isOauthOnly ? (
        <div className="space-y-3">
          <p className="dash-section-text">
            Iniciaste sesión con {primaryOauthLabel || "un proveedor externo"}, por lo que tu
            contraseña se gestiona directamente en {primaryOauthLabel || "el proveedor"} y no
            está almacenada en nuestra plataforma.
          </p>
          {primaryOauthUrl ? (
            <a
              href={primaryOauthUrl}
              target="_blank"
              rel="noreferrer noopener"
              className="dash-btn"
            >
              <ExternalLink className="size-3.5" />
              Abrir seguridad de {primaryOauthLabel}
            </a>
          ) : null}
        </div>
      ) : (
        <>
          <p className="dash-section-text">
            Por seguridad, te pediremos tu contraseña actual antes de aplicar el cambio.
          </p>

          <form onSubmit={handleSubmitPassword} className="dash-form-grid mt-4">
            <div className="dash-form-grid">
              <label htmlFor="account-current-password" className="dash-form-label">
                Contraseña actual
              </label>
              <input
                id="account-current-password"
                type="password"
                autoComplete="current-password"
                value={currentPassword}
                onChange={(event) => setCurrentPassword(event.target.value)}
                required
                disabled={isPasswordSubmitting}
                className="dash-input"
              />
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="dash-form-grid">
                <label htmlFor="account-new-password" className="dash-form-label">
                  Nueva contraseña
                </label>
                <input
                  id="account-new-password"
                  type="password"
                  autoComplete="new-password"
                  value={newPassword}
                  onChange={(event) => setNewPassword(event.target.value)}
                  minLength={8}
                  required
                  disabled={isPasswordSubmitting}
                  className="dash-input"
                />
              </div>
              <div className="dash-form-grid">
                <label htmlFor="account-confirm-password" className="dash-form-label">
                  Confirmar contraseña
                </label>
                <input
                  id="account-confirm-password"
                  type="password"
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  minLength={8}
                  required
                  disabled={isPasswordSubmitting}
                  className="dash-input"
                />
              </div>
            </div>

            <div className="dash-form-actions">
              <button type="submit" className="dash-cta" disabled={isPasswordSubmitting}>
                {isPasswordSubmitting ? "Actualizando..." : "Actualizar contraseña"}
              </button>
            </div>

            <FeedbackBanner message={passwordMessage} tone={passwordTone} />
          </form>
        </>
      )}
    </div>
  );
}

export default PasswordChangeSection;
