/**
 * @file Register.jsx
 * @description Pantalla de registro de nuevos usuarios con email/contrasena y OAuth Google.
 */

import { useNavigate } from "react-router-dom";
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

    try {
      await register({ email, password });

      window.alert(
        "Registro completado. Revisa tu correo para confirmar la cuenta antes de iniciar sesion."
      );

      navigate("/login", { replace: true });
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
      title="Crear cuenta"
      description="Regístrate y empieza a detectar desinformación en tiempo real con IA avanzada."
      floatingCard
      bottomText="¿Ya tienes cuenta?"
      bottomLinkTo="/login"
      bottomLinkLabel={
        <>
          <span>Inicia </span>
          <em className="landing-title-emphasis italic">sesión</em>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="space-y-2">
          <Label htmlFor="email" className="text-on-surface">
            Correo electrónico
          </Label>
          <Input
            id="email"
            type="email"
            placeholder="tu@email.com"
            value={email}
            onChange={handleEmailChange}
            autoComplete="email"
            required
            className="h-11 border-outline-variant/30 bg-surface-container-high/60 text-on-surface placeholder:text-on-surface-variant"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="password" className="text-on-surface">
            Contraseña
          </Label>
          <Input
            id="password"
            type="password"
            placeholder="••••••••"
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
            {loading ? "Registrando..." : "Registrarse"}
          </Button>
          <GoogleSignInButton
            onClick={handleGoogleSignIn}
            loading={loading}
            idleLabel="Registrarse con Google"
          />
        </div>
      </form>
    </AuthLayout>
  );
}

export default Register;
