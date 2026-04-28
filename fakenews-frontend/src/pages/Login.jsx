/**
 * @file Login.jsx
 * @description Pantalla de inicio de sesión con email/contraseña y opción de OAuth Google.
 */

import { Link } from "react-router-dom";
import { useAuthStore } from "../store/authStore";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import AuthLayout from "../components/auth/AuthLayout";
import GoogleSignInButton from "../components/auth/GoogleSignInButton";
import { AuthErrorBanner } from "../components/auth/AuthFeedback";
import { useAuthFormField } from "../hooks/useAuthFormField";

/** Pantalla de inicio de sesión. */
function Login() {
  const login = useAuthStore((state) => state.login);
  const loading = useAuthStore((state) => state.loading);
  const error = useAuthStore((state) => state.error);
  const clearError = useAuthStore((state) => state.clearError);
  const signInWithGoogle = useAuthStore((state) => state.signInWithGoogle);

  const [email, handleEmailChange] = useAuthFormField({ error, clearError });
  const [password, handlePasswordChange] = useAuthFormField({ error, clearError });

  /** Ejecuta el login contra Supabase a traves del store. */
  const handleSubmit = async (event) => {
    event.preventDefault();

    try {
      await login({ email, password });
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
      title="Iniciar sesión"
      description="Accede a tu panel de verificación y continúa analizando titulares con precisión."
      floatingCard
      bottomText="¿No tienes cuenta?"
      bottomLinkTo="/register"
      bottomLinkLabel="Regístrate aquí"
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
            autoComplete="current-password"
            required
            className="h-11 border-outline-variant/30 bg-surface-container-high/60 text-on-surface placeholder:text-on-surface-variant"
          />
        </div>

        <AuthErrorBanner message={error} />

        <div className="space-y-3 pt-1">
          <Button
            type="submit"
            className="landing-shimmer h-11 w-full rounded-xl bg-primary font-bold text-on-primary"
            disabled={loading}
          >
            {loading ? "Entrando..." : "Entrar"}
          </Button>
          <GoogleSignInButton
            onClick={handleGoogleSignIn}
            loading={loading}
            idleLabel="Continuar con Google"
          />
        </div>

        <Link
          to="/forgot-password"
          className="mt-4 block text-center text-sm text-on-surface/70 underline underline-offset-4 transition-colors hover:text-on-surface"
        >
          ¿Has olvidado la contraseña?
        </Link>
      </form>
    </AuthLayout>
  );
}

export default Login;
