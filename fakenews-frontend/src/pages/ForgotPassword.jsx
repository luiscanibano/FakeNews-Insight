/**
 * @file ForgotPassword.jsx
 * @description Página de aplicación que orquesta componentes, estados y flujos de negocio por seccion.
 */

import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useAuthStore } from "../store/authStore";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import AuthLayout from "../components/auth/AuthLayout";
import { AuthErrorBanner, AuthSuccessBanner } from "../components/auth/AuthFeedback";

/** Clave para persistir el cooldown entre recargas de página.
 */
const COOLDOWN_STORAGE_KEY = "forgot-password-cooldown-until";

/** Pantalla para solicitar el enlace de recuperación de contraseña.
 */
function ForgotPassword() {
  const { t } = useTranslation("auth");
  /** Estado local del formulario y de mensajes visuales.
 */
  const [email, setEmail] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [localError, setLocalError] = useState("");
  const [cooldownUntil, setCooldownUntil] = useState(() => {
    if (typeof window === "undefined") {
      return 0;
    }

    const savedCooldown = Number(window.localStorage.getItem(COOLDOWN_STORAGE_KEY));
    return Number.isFinite(savedCooldown) ? savedCooldown : 0;
  });
  const [cooldownSeconds, setCooldownSeconds] = useState(0);

  const requestPasswordReset = useAuthStore(
    (state) => state.requestPasswordReset
  );
  const loading = useAuthStore((state) => state.loading);
  const error = useAuthStore((state) => state.error);
  const clearError = useAuthStore((state) => state.clearError);

  /** Inicia el bloqueo temporal para evitar reenviar solicitudes de forma inmediata.
 */
  const startCooldown = (seconds) => {
    const until = Date.now() + seconds * 1000;
    setCooldownUntil(until);
    window.localStorage.setItem(COOLDOWN_STORAGE_KEY, String(until));
  };

  /** Limpia errores globales al entrar y al salir de la vista.
 */
  useEffect(() => {
    clearError();

    return () => {
      clearError();
    };
  }, [clearError]);

  /** Mantiene un contador en segundos y elimina el cooldown al terminar.
 */
  useEffect(() => {
    if (!cooldownUntil) {
      setCooldownSeconds(0);
      return;
    }

    const updateCooldown = () => {
      const remaining = Math.max(0, Math.ceil((cooldownUntil - Date.now()) / 1000));
      setCooldownSeconds(remaining);

      if (remaining === 0) {
        setCooldownUntil(0);
        window.localStorage.removeItem(COOLDOWN_STORAGE_KEY);
      }
    };

    updateCooldown();

    const timer = setInterval(updateCooldown, 1000);

    return () => clearInterval(timer);
  }, [cooldownUntil]);

  /** Al escribir, limpia errores previos para no mostrar mensajes obsoletos.
 */
  const handleEmailChange = (event) => {
    if (error) {
      clearError();
    }

    setLocalError("");
    setSuccessMessage("");
    setEmail(event.target.value);
  };

  /** Envia la peticion de recuperación y gestiona el cooldown según resultado.
 */
  const handleSubmit = async (event) => {
    event.preventDefault();

    if (cooldownSeconds > 0) {
      setLocalError(t("forgot.cooldownError", { seconds: cooldownSeconds }));
      return;
    }

    const redirectTo = `${window.location.origin}/reset-password`;

    try {
      await requestPasswordReset({ email, redirectTo });
      setSuccessMessage(t("forgot.successMessage"));
      startCooldown(30);
    } catch (requestError) {
      const message = requestError?.message?.toLowerCase() || "";
      if (message.includes("límite") || message.includes("rate limit")) {
        startCooldown(60);
      }
    }
  };

  return (
    <AuthLayout
      title={t("forgot.title")}
      description={t("forgot.description")}
      bottomText={t("forgot.bottomText")}
      bottomLinkTo="/login"
      bottomLinkLabel={t("forgot.bottomLink")}
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="space-y-2">
          <Label htmlFor="email" className="text-on-surface">{t("fields.email")}</Label>
          <Input
            id="email"
            type="email"
            placeholder={t("fields.emailPlaceholder")}
            value={email}
            onChange={handleEmailChange}
            autoComplete="email"
            required
            className="h-11 border-outline-variant/30 bg-surface-container-high/60 text-on-surface placeholder:text-on-surface-variant"
          />
        </div>

        <AuthErrorBanner message={localError} />
        <AuthErrorBanner message={error} />
        <AuthSuccessBanner message={successMessage} />

        <Button
          type="submit"
          className="landing-shimmer h-11 w-full rounded-xl bg-primary font-bold text-on-primary"
          disabled={loading || cooldownSeconds > 0}
        >
          {loading
            ? t("forgot.loading")
            : cooldownSeconds > 0
            ? t("forgot.retryIn", { seconds: cooldownSeconds })
            : t("forgot.submit")}
        </Button>
      </form>
    </AuthLayout>
  );
}

export default ForgotPassword;
