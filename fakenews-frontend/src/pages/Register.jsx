/**
 * @file Register.jsx
 * @description Pantalla de registro de nuevos usuarios con email/contraseña y OAuth Google.
 */

import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Eye, EyeOff } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useAuthStore } from "../store/authStore";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import AuthLayout from "../components/auth/AuthLayout";
import GoogleSignInButton from "../components/auth/GoogleSignInButton";
import { AuthErrorBanner } from "../components/auth/AuthFeedback";
import PasswordRequirementsChecklist from "../components/auth/PasswordRequirementsChecklist";
import { useAuthFormField } from "../hooks/useAuthFormField";
import { getPasswordValidationErrorKey } from "../lib/passwordValidation";

const REGISTER_DRAFT_STORAGE_KEY = "fakenews-register-draft";

const loadRegisterDraft = () => {
  if (typeof window === "undefined") {
    return { email: "", password: "", confirmPassword: "", acceptedLegal: false };
  }

  try {
    const rawDraft = window.sessionStorage.getItem(REGISTER_DRAFT_STORAGE_KEY);
    if (!rawDraft) {
      return { email: "", password: "", confirmPassword: "", acceptedLegal: false };
    }

    const parsed = JSON.parse(rawDraft);
    return {
      email: typeof parsed?.email === "string" ? parsed.email : "",
      password: typeof parsed?.password === "string" ? parsed.password : "",
      confirmPassword: typeof parsed?.confirmPassword === "string" ? parsed.confirmPassword : "",
      acceptedLegal: Boolean(parsed?.acceptedLegal),
    };
  } catch {
    return { email: "", password: "", confirmPassword: "", acceptedLegal: false };
  }
};

const validateRegisterForm = ({ email, password, confirmPassword, acceptedLegal }) => {
  if (!email) {
    return "register.errorEmailRequired";
  }

  const passwordErrorKey = getPasswordValidationErrorKey(password, "register");
  if (passwordErrorKey) {
    return passwordErrorKey;
  }

  if (password !== confirmPassword) {
    return "register.errorPasswordMismatch";
  }

  if (!acceptedLegal) {
    return "register.errorLegalRequired";
  }

  return "";
};

/** Pantalla de registro de nuevos usuarios. */
function Register() {
  const navigate = useNavigate();
  const { t } = useTranslation("auth");
  const [draft] = useState(() => loadRegisterDraft());

  const register = useAuthStore((state) => state.register);
  const loading = useAuthStore((state) => state.loading);
  const error = useAuthStore((state) => state.error);
  const clearError = useAuthStore((state) => state.clearError);
  const signInWithGoogle = useAuthStore((state) => state.signInWithGoogle);

  const [email, handleEmailChange] = useAuthFormField({ initialValue: draft.email, error, clearError });
  const [password, handlePasswordChange] = useAuthFormField({ initialValue: draft.password, error, clearError });
  const [confirmPassword, handleConfirmPasswordChange] = useAuthFormField({ initialValue: draft.confirmPassword, error, clearError });
  const [acceptedLegal, setAcceptedLegal] = useState(draft.acceptedLegal);
  const [showPasswords, setShowPasswords] = useState(false);
  const [localError, setLocalError] = useState("");

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    window.sessionStorage.setItem(
      REGISTER_DRAFT_STORAGE_KEY,
      JSON.stringify({ email, password, confirmPassword, acceptedLegal })
    );
  }, [email, password, confirmPassword, acceptedLegal]);

  const clearRegisterDraft = () => {
    if (typeof window === "undefined") {
      return;
    }

    window.sessionStorage.removeItem(REGISTER_DRAFT_STORAGE_KEY);
  };

  const clearMessages = () => {
    if (localError) {
      setLocalError("");
    }
    if (error) {
      clearError();
    }
  };

  const handleLegalChange = (event) => {
    clearMessages();
    setAcceptedLegal(event.target.checked);
  };

  /** Lanza el alta del usuario usando el servicio de auth. */
  const handleSubmit = async (event) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const submittedEmail = String(formData.get("email") || email).trim();
    const submittedPassword = String(formData.get("password") || password);
    const submittedConfirmPassword = String(formData.get("confirmPassword") || confirmPassword);
    const submittedAcceptedLegal = formData.get("acceptedLegal") === "on" || acceptedLegal;

    const validationError = validateRegisterForm({
      email: submittedEmail,
      password: submittedPassword,
      confirmPassword: submittedConfirmPassword,
      acceptedLegal: submittedAcceptedLegal,
    });

    if (validationError) {
      setLocalError(t(validationError));
      return;
    }

    try {
      await register({ email: submittedEmail, password: submittedPassword });
      clearRegisterDraft();

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
    clearMessages();

    if (!acceptedLegal) {
      setLocalError(t("register.errorLegalRequired"));
      return;
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
            onChange={(event) => {
              clearMessages();
              handleEmailChange(event);
            }}
            autoComplete="email"
            required
            className="h-11 border-outline-variant/30 bg-surface-container-high/60 text-on-surface placeholder:text-on-surface-variant"
          />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between gap-3">
            <Label htmlFor="password" className="text-on-surface">
              {t("fields.password")}
            </Label>
            <button
              type="button"
              onClick={() => setShowPasswords((current) => !current)}
              className="inline-flex items-center gap-1 text-xs font-medium text-on-surface-variant transition-colors hover:text-on-surface"
              aria-label={showPasswords ? t("register.hidePassword") : t("register.showPassword")}
            >
              {showPasswords ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              <span>{showPasswords ? t("register.hidePassword") : t("register.showPassword")}</span>
            </button>
          </div>
          <div className="relative">
            <Input
              id="password"
              name="password"
              type={showPasswords ? "text" : "password"}
              placeholder={t("fields.passwordPlaceholder")}
              value={password}
              onChange={(event) => {
                clearMessages();
                handlePasswordChange(event);
              }}
              autoComplete="new-password"
              required
              className="h-11 border-outline-variant/30 bg-surface-container-high/60 pr-11 text-on-surface placeholder:text-on-surface-variant"
            />
            <button
              type="button"
              onClick={() => setShowPasswords((current) => !current)}
              className="absolute inset-y-0 right-0 inline-flex items-center px-3 text-on-surface-variant transition-colors hover:text-on-surface"
              aria-label={showPasswords ? t("register.hidePassword") : t("register.showPassword")}
            >
              {showPasswords ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          </div>
          <PasswordRequirementsChecklist password={password} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="confirmPassword" className="text-on-surface">
            {t("fields.confirmPassword")}
          </Label>
          <div className="relative">
            <Input
              id="confirmPassword"
              name="confirmPassword"
              type={showPasswords ? "text" : "password"}
              placeholder={t("fields.passwordPlaceholder")}
              value={confirmPassword}
              onChange={(event) => {
                clearMessages();
                handleConfirmPasswordChange(event);
              }}
              autoComplete="new-password"
              required
              className="h-11 border-outline-variant/30 bg-surface-container-high/60 pr-11 text-on-surface placeholder:text-on-surface-variant"
            />
            <button
              type="button"
              onClick={() => setShowPasswords((current) => !current)}
              className="absolute inset-y-0 right-0 inline-flex items-center px-3 text-on-surface-variant transition-colors hover:text-on-surface"
              aria-label={showPasswords ? t("register.hidePassword") : t("register.showPassword")}
            >
              {showPasswords ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          </div>
        </div>

        <div className="rounded-2xl border border-outline-variant/20 bg-surface-container-high/40 p-3 text-sm text-on-surface-variant">
          <label className="flex items-start gap-3">
            <input
              id="acceptedLegal"
              name="acceptedLegal"
              type="checkbox"
              checked={acceptedLegal}
              onChange={handleLegalChange}
              required
              className="mt-0.5 h-4 w-4 rounded border border-outline-variant/50 bg-surface accent-primary"
            />
            <span>
              {t("register.legalPrefix")} {" "}
              <Link to="/privacy" className="font-medium text-primary hover:underline">
                {t("register.privacyLink")}
              </Link>{" "}
              {t("register.legalConnector")} {" "}
              <Link to="/terms" className="font-medium text-primary hover:underline">
                {t("register.termsLink")}
              </Link>
              .
            </span>
          </label>
        </div>

        <AuthErrorBanner message={localError || error} />

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
