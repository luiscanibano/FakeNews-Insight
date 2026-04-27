/**
 * @file GoogleSignInButton.jsx
 * @description Boton OAuth de Google reutilizable entre login y registro.
 */

import { Button } from "@/components/ui/button";
import GoogleIcon from "./GoogleIcon";

/** Boton estandar para iniciar el flujo OAuth de Google. */
function GoogleSignInButton({ onClick, loading, idleLabel, loadingLabel = "Redirigiendo..." }) {
  return (
    <Button
      type="button"
      variant="outline"
      className="h-11 w-full rounded-xl border-outline-variant/40 bg-surface-container-high/60 text-on-surface"
      onClick={onClick}
      disabled={loading}
    >
      <GoogleIcon />
      {loading ? loadingLabel : idleLabel}
    </Button>
  );
}

export default GoogleSignInButton;
