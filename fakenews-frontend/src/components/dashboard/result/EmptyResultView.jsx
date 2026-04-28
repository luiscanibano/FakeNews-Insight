/**
 * @file EmptyResultView.jsx
 * @description Estado vacio del panel de resultados antes del primer análisis.
 */

import { Button } from "@/components/ui/button";

/** Placeholder mostrado antes de cualquier análisis para guiar al usuario. */
function EmptyResultView() {
  return (
    <>
      <div className="text-center">
        <h2 className="mt-2 font-headline text-2xl font-bold text-on-surface sm:text-3xl">
          Esperando tu primer análisis
        </h2>
        <p className="mx-auto mt-2 max-w-2xl text-sm text-on-surface-variant">
          Cuando analices una noticia, aqui veras el veredicto, la fuerza SVM y las acciones
          disponibles.
        </p>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-outline-variant/25 bg-surface/50 p-3 text-center">
          <p className="text-xs uppercase tracking-wider text-on-surface-variant">Veredicto</p>
          <p className="mt-1 text-lg font-bold text-on-surface/50">--</p>
        </div>
        <div className="rounded-xl border border-outline-variant/25 bg-surface/50 p-3 text-center">
          <p className="text-xs uppercase tracking-wider text-on-surface-variant">Fuerza SVM</p>
          <p className="mt-1 text-lg font-bold text-on-surface/50">--</p>
        </div>
      </div>

      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        <Button type="button" variant="outline" className="w-full sm:w-auto" disabled>
          Guardar en historial
        </Button>
        <Button type="button" variant="outline" className="w-full sm:w-auto" disabled>
          Generar enlace público
        </Button>
        <Button type="button" variant="outline" className="w-full sm:w-auto" disabled>
          Reportar fallo
        </Button>
      </div>
    </>
  );
}

export default EmptyResultView;
