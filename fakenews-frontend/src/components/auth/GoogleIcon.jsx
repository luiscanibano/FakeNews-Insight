/**
 * @file GoogleIcon.jsx
 * @description Logo SVG de Google reutilizado en botones OAuth de las pantallas de auth.
 */

/** Glifo SVG simplificado de Google, sin texto, hereda color del padre. */
function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="size-4">
      <path
        d="M21.35 11.1h-9.18v2.98h5.3c-.23 1.52-1.75 4.46-5.3 4.46-3.19 0-5.79-2.65-5.79-5.92s2.6-5.92 5.79-5.92c1.81 0 3.03.77 3.72 1.43l2.53-2.44C16.81 4.2 14.69 3.3 12.17 3.3 7.21 3.3 3.2 7.36 3.2 12.32s4.01 9.02 8.97 9.02c5.18 0 8.61-3.64 8.61-8.77 0-.59-.06-1.03-.14-1.47Z"
        fill="currentColor"
      />
    </svg>
  );
}

export default GoogleIcon;
