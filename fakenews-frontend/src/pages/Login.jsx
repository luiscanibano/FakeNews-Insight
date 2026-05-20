/**
 * @file Login.jsx
 * @description Pantalla de inicio de sesión con email/contraseña y opción de OAuth Google.
 */

import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuthStore } from "../store/authStore";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import AuthLayout from "../components/auth/AuthLayout";
import GoogleSignInButton from "../components/auth/GoogleSignInButton";
import { AuthErrorBanner, AuthSuccessBanner } from "../components/auth/AuthFeedback";
import { useAuthFormField } from "../hooks/useAuthFormField";

/** Pantalla de inicio de sesión. */
function Login() {
  const location = useLocation();
  const { t } = useTranslation("auth");
  const login = useAuthStore((state) => state.login);
  const loading = useAuthStore((state) => state.loading);
  const error = useAuthStore((state) => state.error);
  const clearError = useAuthStore((state) => state.clearError);
  const signInWithGoogle = useAuthStore((state) => state.signInWithGoogle);
  const [successMessage, setSuccessMessage] = useState(
    location.state?.successMessage || ""
  );

  const handleBeforeChange = () => {
    if (successMessage) {
      setSuccessMessage("");
    }
  };

  const [email, handleEmailChange] = useAuthFormField({
    error,
    clearError,
    onBeforeChange: handleBeforeChange,
  });
  const [password, handlePasswordChange] = useAuthFormField({
    error,
    clearError,
    onBeforeChange: handleBeforeChange,
  });

  /** Ejecuta el login contra Supabase a traves del store. */
  const handleSubmit = async (event) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const submittedEmail = String(formData.get("email") || email).trim();
    const submittedPassword = String(formData.get("password") || password);

    if (successMessage) {
      setSuccessMessage("");
    }

    try {
      await login({ email: submittedEmail, password: submittedPassword });
    } catch {
      /** Error gestionado por el store. */
    }
  };

  /** Lanza el flujo OAuth con Google y delega errores en el store. */
  const handleGoogleSignIn = async () => {
    if (error) {
      clearError();
    }

    try {
      await signInWithGoogle();
    } catch {
      /** Error gestionado por el store. */
    }
  };

  return (
    <AuthLayout
      title={t("login.title")}
      description={t("login.description")}
      floatingCard
      bottomText={t("login.bottomText")}
      bottomLinkTo="/register"
      bottomLinkLabel={t("login.bottomLink")}
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="space-y-2">
          <Label htmlFor="email" className="text-on-surface">
            {t("fields.email")}
          </Label>
          <Input
            id="email"
            name="email"
            type="email"
            placeholder={t("fields.emailPlaceholder")}
            value={email}
            onChange={handleEmailChange}
            autoComplete="email"
            required
            className="h-11 border-outline-variant/30 bg-surface-container-high/60 text-on-surface placeholder:text-on-surface-variant"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="password" className="text-on-surface">
            {t("fields.password")}
          </Label>
          <Input
            id="password"
            name="password"
            type="password"
            placeholder={t("fields.passwordPlaceholder")}
            value={password}
            onChange={handlePasswordChange}
            autoComplete="current-password"
            required
            className="h-11 border-outline-variant/30 bg-surface-container-high/60 text-on-surface placeholder:text-on-surface-variant"
          />
        </div>

  <AuthSuccessBanner message={successMessage} />
        <AuthErrorBanner message={error} />

        <div className="space-y-3 pt-1">
          <Button
            type="submit"
            className="landing-shimmer h-11 w-full rounded-xl bg-primary font-bold text-on-primary"
            disabled={loading}
          >
            {loading ? t("login.loading") : t("login.submit")}
          </Button>
          <GoogleSignInButton
            onClick={handleGoogleSignIn}
            loading={loading}
            idleLabel={t("login.google")}
            loadingLabel={t("login.googleLoading")}
          />
        </div>

        <Link
          to="/forgot-password"
          className="mt-4 block text-center text-sm text-on-surface/70 underline underline-offset-4 transition-colors hover:text-on-surface"
        >
          {t("login.forgot")}
        </Link>
      </form>
    </AuthLayout>
  );
}

export default Login;
