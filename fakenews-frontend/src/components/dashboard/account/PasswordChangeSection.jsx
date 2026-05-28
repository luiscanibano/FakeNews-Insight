/**
 * @file PasswordChangeSection.jsx
 * @description Sección de cambio de contraseña con soporte de cuentas OAuth-only.
 */

import { useState } from "react";
import { ExternalLink, Eye, EyeOff, KeyRound } from "lucide-react";
import { useTranslation } from "react-i18next";
import FeedbackBanner from "./FeedbackBanner";

/** Formulario para cambiar contraseña, deshabilitado para usuarios OAuth-only. */
function PasswordChangeSection({
  isOauthOnly,
  primaryOauthLabel,
  primaryOauthUrl,
  onChangePassword,
  onSubmittingChange,
}) {
  const { t } = useTranslation("dashboard");
  const providerLabel = primaryOauthLabel || t("password.oauthIntroFallbackProvider");
  const sectionTitle = isOauthOnly
    ? t("password.oauthTitle", { provider: providerLabel })
    : t("password.title");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordMessage, setPasswordMessage] = useState("");
  const [passwordTone, setPasswordTone] = useState("error");
  const [isPasswordSubmitting, setIsPasswordSubmitting] = useState(false);
  const [showPasswords, setShowPasswords] = useState(false);

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
      setPasswordMessage(t("password.errorMismatch"));
      return;
    }

    updateSubmitting(true);

    try {
      await onChangePassword({ currentPassword, newPassword });
      setPasswordMessage(t("password.successMessage"));
      setPasswordTone("success");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (error) {
      setPasswordMessage(error.message || t("password.fallbackError"));
    } finally {
      updateSubmitting(false);
    }
  };

  return (
    <div className="dash-section">
      <div className="dash-section-head">
        <KeyRound className="size-4 text-on-surface-variant" aria-hidden="true" />
        <h3 className="dash-section-title-sm">{sectionTitle}</h3>
      </div>

      {isOauthOnly ? (
        <div className="space-y-3">
          <p className="dash-section-text">
            {t("password.oauthIntro", { provider: providerLabel })}
          </p>
          {primaryOauthUrl ? (
            <a
              href={primaryOauthUrl}
              target="_blank"
              rel="noreferrer noopener"
              className="dash-btn"
            >
              <ExternalLink className="size-3.5" />
              {t("password.oauthOpen", { provider: providerLabel })}
            </a>
          ) : null}
        </div>
      ) : (
        <>
          <p className="dash-section-text">
            {t("password.intro")}
          </p>

          <form onSubmit={handleSubmitPassword} className="dash-form-grid mt-4">
            <div className="dash-form-grid">
              <div className="flex items-center justify-between gap-3">
                <label htmlFor="account-current-password" className="dash-form-label">
                  {t("password.current")}
                </label>
                <button
                  type="button"
                  onClick={() => setShowPasswords((current) => !current)}
                  className="inline-flex items-center gap-1 text-xs font-medium text-on-surface-variant transition-colors hover:text-on-surface"
                  aria-label={showPasswords ? t("password.hidePassword") : t("password.showPassword")}
                >
                  {showPasswords ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  <span>{showPasswords ? t("password.hidePassword") : t("password.showPassword")}</span>
                </button>
              </div>
              <div className="relative">
                <input
                  id="account-current-password"
                  type={showPasswords ? "text" : "password"}
                  autoComplete="current-password"
                  value={currentPassword}
                  onChange={(event) => setCurrentPassword(event.target.value)}
                  required
                  disabled={isPasswordSubmitting}
                  className="dash-input pr-11"
                />
                <button
                  type="button"
                  onClick={() => setShowPasswords((current) => !current)}
                  className="absolute inset-y-0 right-0 inline-flex items-center px-3 text-on-surface-variant transition-colors hover:text-on-surface"
                  aria-label={showPasswords ? t("password.hidePassword") : t("password.showPassword")}
                >
                  {showPasswords ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="dash-form-grid">
                <label htmlFor="account-new-password" className="dash-form-label">
                  {t("password.new")}
                </label>
                <div className="relative">
                  <input
                    id="account-new-password"
                    type={showPasswords ? "text" : "password"}
                    autoComplete="new-password"
                    value={newPassword}
                    onChange={(event) => setNewPassword(event.target.value)}
                    minLength={8}
                    required
                    disabled={isPasswordSubmitting}
                    className="dash-input pr-11"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPasswords((current) => !current)}
                    className="absolute inset-y-0 right-0 inline-flex items-center px-3 text-on-surface-variant transition-colors hover:text-on-surface"
                    aria-label={showPasswords ? t("password.hidePassword") : t("password.showPassword")}
                  >
                    {showPasswords ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
              </div>
              <div className="dash-form-grid">
                <label htmlFor="account-confirm-password" className="dash-form-label">
                  {t("password.confirm")}
                </label>
                <div className="relative">
                  <input
                    id="account-confirm-password"
                    type={showPasswords ? "text" : "password"}
                    autoComplete="new-password"
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    minLength={8}
                    required
                    disabled={isPasswordSubmitting}
                    className="dash-input pr-11"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPasswords((current) => !current)}
                    className="absolute inset-y-0 right-0 inline-flex items-center px-3 text-on-surface-variant transition-colors hover:text-on-surface"
                    aria-label={showPasswords ? t("password.hidePassword") : t("password.showPassword")}
                  >
                    {showPasswords ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
              </div>
            </div>

            <div className="dash-form-actions">
              <button type="submit" className="dash-cta" disabled={isPasswordSubmitting}>
                {isPasswordSubmitting ? t("password.submitting") : t("password.submit")}
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
