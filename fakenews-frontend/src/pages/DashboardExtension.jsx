/**
 * @file DashboardExtension.jsx
 * @description Pagina informativa de la extension de navegador: descarga,
 * pasos de instalacion en modo desarrollador y enlace a la documentacion.
 */

const RELEASES_URL =
  "https://github.com/luiscanibano/TFG-Informatica---Luis-Canibano/releases";

const INSTALL_STEPS = [
  {
    title: "Descarga el ZIP",
    description:
      "Pulsa el boton 'Descargar extension' para abrir la pagina de Releases del repositorio y baja el ultimo ZIP de la extension.",
  },
  {
    title: "Descomprime la carpeta",
    description:
      "Extrae el ZIP en una ubicacion estable de tu equipo (no la borres mientras uses la extension).",
  },
  {
    title: "Activa el modo desarrollador",
    description:
      "Abre chrome://extensions o edge://extensions y activa el interruptor 'Modo desarrollador' en la esquina superior derecha.",
  },
  {
    title: "Carga la extension descomprimida",
    description:
      "Pulsa 'Cargar descomprimida' y selecciona la carpeta que acabas de extraer. Fija el icono en la barra de herramientas para tenerlo a mano.",
  },
  {
    title: "Inicia sesion",
    description:
      "Abre el popup, usa el mismo email y contrasena de FakeNews Insight y empieza a analizar textos sin salir de la pagina que estes leyendo.",
  },
];

function DashboardExtension() {
  return (
    <section className="auth-fade-up" style={{ "--auth-delay": "40ms" }}>
      <div className="landing-glass-card rounded-3xl border border-outline-variant/20 p-6 sm:p-8">
        <h1 className="font-headline text-2xl font-bold text-on-surface sm:text-3xl">
          Extension de navegador
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-on-surface-variant sm:text-base">
          Analiza cualquier titular o parrafo sospechoso desde el navegador sin
          abrir el dashboard. La extension reutiliza tu cuenta de FakeNews
          Insight, respeta tu cuota diaria y permite guardar resultados en tu
          historial con un clic.
        </p>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
          <a
            href={RELEASES_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-on-primary shadow transition hover:bg-primary/90"
          >
            Descargar extension
          </a>
          <span className="text-xs text-on-surface-variant">
            Compatible con Google Chrome y Microsoft Edge (Manifest V3).
          </span>
        </div>
      </div>

      <div className="mt-6 landing-glass-card rounded-3xl border border-outline-variant/20 p-6 sm:p-8">
        <h2 className="font-headline text-xl font-bold text-on-surface sm:text-2xl">
          Como instalarla
        </h2>
        <p className="mt-2 text-sm text-on-surface-variant">
          Por ahora la extension se instala manualmente en modo desarrollador.
          Sigue estos pasos:
        </p>

        <ol className="mt-5 space-y-4">
          {INSTALL_STEPS.map((step, index) => (
            <li
              key={step.title}
              className="flex gap-4 rounded-2xl border border-outline-variant/20 bg-surface/40 p-4"
            >
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/15 text-sm font-semibold text-primary">
                {index + 1}
              </span>
              <div>
                <h3 className="text-sm font-semibold text-on-surface">
                  {step.title}
                </h3>
                <p className="mt-1 text-sm text-on-surface-variant">
                  {step.description}
                </p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

export default DashboardExtension;
