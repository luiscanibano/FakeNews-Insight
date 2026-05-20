/**
 * @file Register.jsx
 * @description Pantalla de registro de nuevos usuarios con email/contraseña y OAuth Google.
 */

import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuthStore } from "../store/authStore";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import AuthLayout from "../components/auth/AuthLayout";
import GoogleSignInButton from "../components/auth/GoogleSignInButton";
import { AuthErrorBanner } from "../components/auth/AuthFeedback";
import { useAuthFormField } from "../hooks/useAuthFormField";

/** Pantalla de registro de nuevos usuarios. */
function Register() {
  const navigate = useNavigate();
  const { t } = useTranslation("auth");

  const register = useAuthStore((state) => state.register);
  const loading = useAuthStore((state) => state.loading);
  const error = useAuthStore((state) => state.error);
  const clearError = useAuthStore((state) => state.clearError);
  const signInWithGoogle = useAuthStore((state) => state.signInWithGoogle);

  const [email, handleEmailChange] = useAuthFormField({ error, clearError });
  const [password, handlePasswordChange] = useAuthFormField({ error, clearError });

  /** Lanza el alta del usuario usando el servicio de auth. */
  const handleSubmit = async (event) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const submittedEmail = String(formData.get("email") || email).trim();
    const submittedPassword = String(formData.get("password") || password);

    try {
      await register({ email: submittedEmail, password: submittedPassword });

      navigate("/login", {
        replace: true,
        state: {
          successMessage: t("register.successMessage"),
        },
      });
    } catch {
      /** Error gestionado por el store. */
    }
  };

  /** Inicia el flujo OAuth para registro/inicio mediante Google. */
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
      title={t("register.title")}
      description={t("register.description")}
      floatingCard
      bottomText={t("register.bottomText")}
      bottomLinkTo="/login"
      bottomLinkLabel={
        <>
          <span>{t("register.bottomLinkPrefix")}</span>
          <em className="landing-title-emphasis italic">{t("register.bottomLinkEmphasis")}</em>
        </>
      }
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
            autoComplete="new-password"
            required
            className="h-11 border-outline-variant/30 bg-surface-container-high/60 text-on-surface placeholder:text-on-surface-variant"
          />
        </div>

        <AuthErrorBanner message={error} />

        <div className="space-y-3">
          <Button
            type="submit"
            className="landing-shimmer h-11 w-full rounded-xl bg-primary font-bold text-on-primary"
            disabled={loading}
          >
            {loading ? t("register.loading") : t("register.submit")}
          </Button>
          <GoogleSignInButton
            onClick={handleGoogleSignIn}
            loading={loading}
            idleLabel={t("register.google")}
            loadingLabel={t("register.googleLoading")}
          />
        </div>
      </form>
    </AuthLayout>
  );
}

export default Register;
