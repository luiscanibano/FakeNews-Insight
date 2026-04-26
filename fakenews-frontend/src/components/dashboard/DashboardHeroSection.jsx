/**
 * @file DashboardHeroSection.jsx
 * @description Componente del dashboard para renderizar analisis, resultados, navegacion y paneles operativos.
 */

function DashboardHeroSection() {
  return (
    <section className="auth-fade-up text-center" style={{ "--auth-delay": "40ms" }}>
      <div className="pointer-events-none absolute left-0 top-16 hidden w-full justify-center lg:flex" />
      <div className="dashboard-hero-title-wrap mx-auto max-w-4xl">
        <h1 className="dashboard-hero-title font-headline text-3xl font-extrabold leading-[1.08] tracking-tighter sm:text-5xl">
          <span className="landing-gradient-title">Selecciona una opción y empieza a</span>{" "}
          <em className="landing-title-emphasis mx-1 italic">analizar</em>
        </h1>
        <div className="dashboard-hero-underline" aria-hidden="true" />
      </div>
      <p className="mx-auto mt-3 max-w-2xl text-sm leading-relaxed text-on-surface-variant sm:text-base">
        Cambia de modo en un clic y procesa noticias por texto, URL o lotes CSV.
      </p>
    </section>
  );
}

export default DashboardHeroSection;
