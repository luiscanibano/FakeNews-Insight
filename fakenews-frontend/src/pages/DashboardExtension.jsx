/**
 * @file DashboardExtension.jsx
 * @description Página informativa de la extensión de navegador: descarga,
 * pasos de instalación en modo desarrollador y enlace a la documentación.
 */

import { Download, ArrowRight } from "lucide-react";

const RELEASES_URL =
  "https://github.com/luiscanibano/TFG-Informatica---Luis-Canibano/releases";

const INSTALL_STEPS = [
  {
    title: "Descarga el ZIP",
    description:
      "Pulsa el botón 'Descargar extensión' para abrir la página de Releases del repositorio y baja el último ZIP de la extensión.",
  },
  {
    title: "Descomprime la carpeta",
    description:
      "Extrae el ZIP en una ubicación estable de tu equipo (no la borres mientras uses la extensión).",
  },
  {
    title: "Activa el modo desarrollador",
    description:
      "Abre chrome://extensions o edge://extensions y activa el interruptor 'Modo desarrollador' en la esquina superior derecha.",
  },
  {
    title: "Carga la extensión descomprimida",
    description:
      "Pulsa 'Cargar descomprimida' y selecciona la carpeta que acabas de extraer. Fija el icono en la barra de herramientas para tenerlo a mano.",
  },
  {
    title: "Inicia sesión",
    description:
      "Abre el popup, usa el mismo email y contraseña de FakeNews Insight y empieza a analizar textos sin salir de la página que estés leyendo.",
  },
];

function DashboardExtension() {
  return (
    <section className="space-y-8">
      <div className="dash-in" style={{ "--i": 0 }}>
        <span className="dash-home-eyebrow">
          <span className="dash-home-eyebrow-dot" aria-hidden="true" />
          Extensión de navegador
        </span>

        <h1 className="dash-home-h1 mt-3">
          Verifica desde tu navegador,{" "}
          <span className="dash-home-h1-soft">sin abrir el dashboard.</span>
        </h1>

        <p className="dash-home-sub">
          La extensión reutiliza tu cuenta de FakeNews Insight, respeta tu cuota
          diaria y permite guardar resultados en tu historial con un clic.
        </p>

        <div className="mt-5 flex flex-wrap items-center gap-3">
          <a
            href={RELEASES_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="dash-cta"
          >
            <Download className="size-4" />
            Descargar extensión
            <ArrowRight className="dash-cta-arrow size-4" aria-hidden="true" />
          </a>
          <span className="dash-panel-meta">
            Compatible con Google Chrome y Microsoft Edge (Manifest V3).
          </span>
        </div>
      </div>

      <div className="dash-in dash-panel" style={{ "--i": 1 }}>
        <header className="dash-panel-head">
          <div>
            <h2 className="dash-panel-title">Cómo instalarla</h2>
            <p className="dash-panel-meta">
              Por ahora la extensión se instala manualmente en modo desarrollador.
            </p>
          </div>
        </header>

        <ol className="dash-list">
          {INSTALL_STEPS.map((step, index) => (
            <li
              key={step.title}
              className="dash-step dash-in"
              style={{ "--i": index + 2 }}
            >
              <span className="dash-step-num">{index + 1}</span>
              <div>
                <h3 className="dash-step-title">{step.title}</h3>
                <p className="dash-step-desc">{step.description}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

export default DashboardExtension;
