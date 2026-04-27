/**
 * @file AuthFeedback.jsx
 * @description Banners de error y exito reutilizables en formularios de autenticacion.
 */

/** Banner de error con role="alert" para lectores de pantalla. */
export function AuthErrorBanner({ message }) {
  if (!message) {
    return null;
  }

  return (
    <p
      className="rounded-xl border border-error/30 bg-error-container/40 px-3 py-2 text-sm text-error"
      role="alert"
    >
      {message}
    </p>
  );
}

/** Banner de exito con role="status" para lectores de pantalla. */
export function AuthSuccessBanner({ message }) {
  if (!message) {
    return null;
  }

  return (
    <p
      className="rounded-xl border border-primary/25 bg-primary/15 px-3 py-2 text-sm text-primary"
      role="status"
    >
      {message}
    </p>
  );
}
