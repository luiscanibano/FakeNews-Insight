/**
 * @file ResetPassword.jsx
 * @description Pagina de aplicacion que orquesta componentes, estados y flujos de negocio por seccion.
 */

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../store/authStore";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import AuthLayout from "../components/auth/AuthLayout";
import { AuthErrorBanner, AuthSuccessBanner } from "../components/auth/AuthFeedback";

/** Vista para establecer una nueva contrasena desde el enlace de recuperacion.
 */
function ResetPassword() {
  const navigate = useNavigate();
  /** Estado local de formulario y mensajes de estado.
 */
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [localError, setLocalError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isReady, setIsReady] = useState(false);

  /** Accion del store para persistir la nueva contrasena.
 */
  const setRecoverySession = useAuthStore((state) => state.setRecoverySession);
  const updatePassword = useAuthStore((state) => state.updatePassword);
  const loading = useAuthStore((state) => state.loading);
  const error = useAuthStore((state) => state.error);
  const clearError = useAuthStore((state) => state.clearError);

  /** Valida parametros del hash y crea sesion temporal de recovery en Supabase.
 */
  useEffect(() => {
    const initializeRecoverySession = async () => {
      const hashParams = new URLSearchParams(window.location.hash.slice(1));
      const type = hashParams.get("type");
      const accessToken = hashParams.get("access_token");
      const refreshToken = hashParams.get("refresh_token");

      if (type !== "recovery" || !accessToken || !refreshToken) {
        setLocalError(
          "El enlace de recuperacion es invalido o ha expirado. Solicita uno nuevo."
        );
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
  }, []);

  /** Valida el formulario y actualiza la contrasena.
 */
  const handleSubmit = async (event) => {
    event.preventDefault();

    setSuccessMessage("");
    setLocalError("");

    if (error) {
      clearError();
    }

    if (password.length < 6) {
      setLocalError("La contrasena debe tener al menos 6 caracteres.");
      return;
    }

    if (password !== confirmPassword) {
      setLocalError("Las contrasenas no coinciden.");
      return;
    }

    try {
      await updatePassword({ password });
      setSuccessMessage("Contrasena actualizada correctamente. Ya puedes iniciar sesion.");
      setTimeout(() => {
        navigate("/login", { replace: true });
      }, 1000);
    } catch {
      /** Error is already handled in the store state.
 */
    }
  };

  return (
    <AuthLayout
      title="Nueva contraseña"
      description="Establece una contraseña segura para volver a acceder a tu cuenta de forma inmediata."
      highlights={[
        "Verificación de token de recuperación al cargar la página.",
        "Validación local para evitar contraseñas débiles.",
        "Redirección automática al login tras actualización.",
      ]}
      bottomText="¿Quieres volver al acceso?"
      bottomLinkTo="/login"
      bottomLinkLabel="Ir al login"
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="space-y-2">
          <Label htmlFor="password" className="text-on-surface">Nueva contraseña</Label>
          <Input
            id="password"
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="new-password"
            required
            disabled={!isReady}
            className="h-11 border-outline-variant/30 bg-surface-container-high/60 text-on-surface placeholder:text-on-surface-variant"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="confirm-password" className="text-on-surface">Confirmar contraseña</Label>
          <Input
            id="confirm-password"
            type="password"
            placeholder="••••••••"
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
          {loading ? "Guardando..." : "Actualizar contraseña"}
        </Button>
      </form>
    </AuthLayout>
  );
}

export default ResetPassword;
