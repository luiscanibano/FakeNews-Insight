/**
 * @file DashboardHeroSection.jsx
 * @description Cabecera editorial sobria de la vista de análisis.
 */

function DashboardHeroSection() {
  return (
    <section className="dash-in" style={{ "--i": 0 }}>
      <span className="dash-home-eyebrow">
        <span className="dash-home-eyebrow-dot" aria-hidden="true" />
        Centro de análisis
      </span>

      <h1 className="dash-home-h1 mt-3">
        Selecciona una opción y{" "}
        <span className="dash-home-h1-soft">empieza a analizar.</span>
      </h1>

      <p className="dash-home-sub">
        Cambia de modo en un clic y procesa noticias por texto, URL o lotes CSV.
        Cada análisis se ejecuta contra el mismo modelo entrenado en español.
      </p>
    </section>
  );
}

export default DashboardHeroSection;
