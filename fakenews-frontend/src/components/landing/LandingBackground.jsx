/**
 * @file LandingBackground.jsx
 * @description Componente de la landing page orientado a contenido, comunicacion de valor y conversion.
 */

/** Renderiza la atmosfera visual compartida por landing y vistas derivadas. */
function LandingBackground() {
  return (
    <div className="pointer-events-none fixed inset-0 -z-10 bg-surface">
      <div className="landing-mesh-gradient absolute inset-0 opacity-80" />
      <div className="landing-grid-pattern absolute inset-0 opacity-60" />
      <div className="absolute left-[10%] top-[20%] h-[30vw] w-[30vw] animate-pulse-slow rounded-full bg-primary/10 blur-[120px]" />
      <div
        className="absolute bottom-[20%] right-[10%] h-[25vw] w-[25vw] animate-pulse-slow rounded-full bg-primary-container/10 blur-[100px]"
        style={{ animationDelay: "2s" }}
      />
    </div>
  );
}

export default LandingBackground;
