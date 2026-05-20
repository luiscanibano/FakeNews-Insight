/**
 * @file ResetPassword.jsx
 * @description Página de aplicación que orquesta componentes, estados y flujos de negocio por seccion.
 */

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuthStore } from "../store/authStore";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import AuthLayout from "../components/auth/AuthLayout";
import { AuthErrorBanner, AuthSuccessBanner } from "../components/auth/AuthFeedback";

/** Vista para establecer una nueva contraseña desde el enlace de recuperación.
 */
function ResetPassword() {
  const navigate = useNavigate();
  const { t } = useTranslation("auth");
  /** Estado local de formulario y mensajes de estado.
 */
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [localError, setLocalError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isReady, setIsReady] = useState(false);

  /** Acción del store para persistir la nueva contraseña.
 */
  const setRecoverySession = useAuthStore((state) => state.setRecoverySession);
  const updatePassword = useAuthStore((state) => state.updatePassword);
  const loading = useAuthStore((state) => state.loading);
  const error = useAuthStore((state) => state.error);
  const clearError = useAuthStore((state) => state.clearError);

  /** Válida parametros del hash y crea sesión temporal de recovery en Supabase.
 */
  useEffect(() => {
    const initializeRecoverySession = async () => {
      const hashParams = new URLSearchParams(window.location.hash.slice(1));
      const type = hashParams.get("type");
      const accessToken = hashParams.get("access_token");
      const refreshToken = hashParams.get("refresh_token");

      if (type !== "recovery" || !accessToken || !refreshToken) {
        setLocalError(t("reset.errorInvalidLink"));
        return;
      }

      try {
        await setRecoverySession({ accessToken, refreshToken });
        setIsReady(true);
      } catch (sessionError) {
        setLocalError(sessionError.message);
      }
    };

    initializeRecoverySession();
  }, [setRecoverySession, t]);

  /** Válida el formulario y actualiza la contraseña.
 */
  const handleSubmit = async (event) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const submittedPassword = String(formData.get("password") || password);
    const submittedConfirmPassword = String(
      formData.get("confirmPassword") || confirmPassword
    );

    setSuccessMessage("");
    setLocalError("");

    if (error) {
      clearError();
    }

    if (submittedPassword.length < 6) {
      setLocalError(t("reset.errorMinLength"));
      return;
    }

    if (submittedPassword !== submittedConfirmPassword) {
      setLocalError(t("reset.errorMismatch"));
      return;
    }

    try {
      await updatePassword({ password: submittedPassword });
      setSuccessMessage(t("reset.successMessage"));
      setTimeout(() => {
        navigate("/login", {
          replace: true,
          state: {
            successMessage: t("reset.successMessage"),
          },
        });
      }, 1000);
    } catch {
      /** Error is already handled in the store state.
 */
    }
  };

  return (
    <AuthLayout
      title={t("reset.title")}
      description={t("reset.description")}
      highlights={t("reset.highlights", { returnObjects: true })}
      bottomText={t("reset.bottomText")}
      bottomLinkTo="/login"
      bottomLinkLabel={t("reset.bottomLink")}
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="space-y-2">
          <Label htmlFor="password" className="text-on-surface">{t("fields.newPassword")}</Label>
          <Input
            id="password"
            name="password"
            type="password"
            placeholder={t("fields.passwordPlaceholder")}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="new-password"
            required
            disabled={!isReady}
            className="h-11 border-outline-variant/30 bg-surface-container-high/60 text-on-surface placeholder:text-on-surface-variant"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="confirm-password" className="text-on-surface">{t("fields.confirmPassword")}</Label>
          <Input
            id="confirm-password"
            name="confirmPassword"
            type="password"
            placeholder={t("fields.passwordPlaceholder")}
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            autoComplete="new-password"
            required
            disabled={!isReady}
            className="h-11 border-outline-variant/30 bg-surface-container-high/60 text-on-surface placeholder:text-on-surface-variant"
          />
        </div>

        <AuthErrorBanner message={localError} />
        <AuthErrorBanner message={error} />
        <AuthSuccessBanner message={successMessage} />

        <Button
          type="submit"
          className="landing-shimmer h-11 w-full rounded-xl bg-primary font-bold text-on-primary"
          disabled={loading || !isReady}
        >
          {loading ? t("reset.loading") : t("reset.submit")}
        </Button>
      </form>
    </AuthLayout>
  );
}

export default ResetPassword;
