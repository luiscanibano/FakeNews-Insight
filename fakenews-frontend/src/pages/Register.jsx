/**
 * @file Register.jsx
 * @description Pagina de aplicacion que orquesta componentes, estados y flujos de negocio por seccion.
 */

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../store/authStore";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import AuthLayout from "../components/auth/AuthLayout";

/** Icono visual para acciones de alta con Google. */
const GoogleIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true" className="size-4">
    <path
      d="M21.35 11.1h-9.18v2.98h5.3c-.23 1.52-1.75 4.46-5.3 4.46-3.19 0-5.79-2.65-5.79-5.92s2.6-5.92 5.79-5.92c1.81 0 3.03.77 3.72 1.43l2.53-2.44C16.81 4.2 14.69 3.3 12.17 3.3 7.21 3.3 3.2 7.36 3.2 12.32s4.01 9.02 8.97 9.02c5.18 0 8.61-3.64 8.61-8.77 0-.59-.06-1.03-.14-1.47Z"
      fill="currentColor"
    />
  </svg>
);

/** Pantalla de registro de nuevos usuarios. */
function Register() {
  const navigate = useNavigate();

  /** Estado local de credenciales. */
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  /** Estado y acciones globales del flujo de autenticacion. */
  const register = useAuthStore((state) => state.register);
  const loading = useAuthStore((state) => state.loading);
  const error = useAuthStore((state) => state.error);
  const clearError = useAuthStore((state) => state.clearError);
  const signInWithGoogle = useAuthStore((state) => state.signInWithGoogle);

  /** Lanza el alta del usuario usando el servicio de auth. */
  const handleSubmit = async (event) => {
    event.preventDefault();

    try {
      await register({ email, password });

      window.alert(
        "Registro completado. Revisa tu correo para confirmar la cuenta antes de iniciar sesion."
      );

      navigate("/login", { replace: true });
    } catch {
      /** Error is already handled in the store state. */
    }
  };

  /** Eliminar error al cambiar el email evita feedback stale. */
  const handleEmailChange = (event) => {
    if (error) {
      clearError();
    }

    setEmail(event.target.value);
  };

  /** Eliminar error al cambiar la contrasena mantiene el mensaje actualizado. */
  const handlePasswordChange = (event) => {
    if (error) {
      clearError();
    }

    setPassword(event.target.value);
  };

  /** Inicia el flujo OAuth para registro/inicio mediante Google. */
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
      title="Crear cuenta"
      description="Regístrate y empieza a detectar desinformación en tiempo real con IA avanzada."
      floatingCard
      bottomText="¿Ya tienes cuenta?"
      bottomLinkTo="/login"
      bottomLinkLabel={(
        <>
          <span>Inicia </span>
          <em className="landing-title-emphasis italic">sesión</em>
        </>
      )}
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
            autoComplete="new-password"
            required
            className="h-11 border-outline-variant/30 bg-surface-container-high/60 text-on-surface placeholder:text-on-surface-variant"
          />
        </div>

        {error ? (
          <p className="rounded-xl border border-error/30 bg-error-container/40 px-3 py-2 text-sm text-error" role="alert">
            {error}
          </p>
        ) : null}

        <div className="space-y-3">
          <Button type="submit" className="landing-shimmer h-11 w-full rounded-xl bg-primary font-bold text-on-primary" disabled={loading}>
            {loading ? "Registrando..." : "Registrarse"}
          </Button>
          <Button
            type="button"
            variant="outline"
            className="h-11 w-full rounded-xl border-outline-variant/40 bg-surface-container-high/60 text-on-surface"
            onClick={handleGoogleSignIn}
            disabled={loading}
          >
            <GoogleIcon />
            {loading ? "Redirigiendo..." : "Registrarse con Google"}
          </Button>
        </div>
      </form>
    </AuthLayout>
  );
}

export default Register;
