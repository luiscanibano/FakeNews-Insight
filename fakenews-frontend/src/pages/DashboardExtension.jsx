/**
 * @file DashboardExtension.jsx
 * @description Pagina de aplicacion que orquesta componentes, estados y flujos de negocio por seccion.
 */

/** Placeholder de extension para futuras integraciones de descarga/estado/uso. */
function DashboardExtension() {
  return (
    <section className="auth-fade-up" style={{ "--auth-delay": "40ms" }}>
      <div className="landing-glass-card rounded-3xl border border-outline-variant/20 p-6 sm:p-8">
        <h1 className="font-headline text-2xl font-bold text-on-surface sm:text-3xl">
          Extension de navegador
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-on-surface-variant sm:text-base">
          Esta pagina quedo preparada para integrar descargas, estado de instalacion y uso de la extension.
        </p>
      </div>
    </section>
  );
}

export default DashboardExtension;
