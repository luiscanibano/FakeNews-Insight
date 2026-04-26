/**
 * @file Login.jsx
 * @description Pagina de aplicacion que orquesta componentes, estados y flujos de negocio por seccion.
 */

import { useState } from "react";
import { Link } from "react-router-dom";
import { useAuthStore } from "../store/authStore";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import AuthLayout from "../components/auth/AuthLayout";

/** Icono visual para los botones de autenticacion con Google. */
const GoogleIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true" className="size-4">
    <path
      d="M21.35 11.1h-9.18v2.98h5.3c-.23 1.52-1.75 4.46-5.3 4.46-3.19 0-5.79-2.65-5.79-5.92s2.6-5.92 5.79-5.92c1.81 0 3.03.77 3.72 1.43l2.53-2.44C16.81 4.2 14.69 3.3 12.17 3.3 7.21 3.3 3.2 7.36 3.2 12.32s4.01 9.02 8.97 9.02c5.18 0 8.61-3.64 8.61-8.77 0-.59-.06-1.03-.14-1.47Z"
      fill="currentColor"
    />
  </svg>
);

/** Pantalla de inicio de sesion. */
function Login() {
  /** Estado local de los campos del formulario. */
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  /** Estado y acciones centralizadas en el store de autenticacion. */
  const login = useAuthStore((state) => state.login);
  const loading = useAuthStore((state) => state.loading);
  const error = useAuthStore((state) => state.error);
  const clearError = useAuthStore((state) => state.clearError);
  const signInWithGoogle = useAuthStore((state) => state.signInWithGoogle);

  /** Ejecuta el login contra Supabase a traves del store. */
  const handleSubmit = async (event) => {
    event.preventDefault();

    try {
      await login({ email, password });
    } catch {
      /** Error is already handled in the store state. */
    }
  };

  /** Limpia error global al editar el correo para mejorar la UX. */
  const handleEmailChange = (event) => {
    if (error) {
      clearError();
    }

    setEmail(event.target.value);
  };

  /** Limpia error global al editar la contraseña. */
  const handlePasswordChange = (event) => {
    if (error) {
      clearError();
    }

    setPassword(event.target.value);
  };

  /** Lanza el flujo OAuth con Google y delega errores en el store. */
  const handleGoogleSignIn = async () => {
    if (error) {
      clearError();
    }

    try {
      await signInWithGoogle();
    } catch {
      /** Error is already handled in the store state. */
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
          <Label htmlFor="email" className="text-on-surface">Correo electrónico</Label>
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
          <Label htmlFor="password" className="text-on-surface">Contraseña</Label>
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

        {error ? (
          <p className="rounded-xl border border-error/30 bg-error-container/40 px-3 py-2 text-sm text-error" role="alert">
            {error}
          </p>
        ) : null}

        <div className="space-y-3 pt-1">
          <Button type="submit" className="landing-shimmer h-11 w-full rounded-xl bg-primary font-bold text-on-primary" disabled={loading}>
            {loading ? "Entrando..." : "Entrar"}
          </Button>
          <Button
            type="button"
            variant="outline"
            className="h-11 w-full rounded-xl border-outline-variant/40 bg-surface-container-high/60 text-on-surface"
            onClick={handleGoogleSignIn}
            disabled={loading}
          >
            <GoogleIcon />
            {loading ? "Redirigiendo..." : "Continuar con Google"}
          </Button>
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
