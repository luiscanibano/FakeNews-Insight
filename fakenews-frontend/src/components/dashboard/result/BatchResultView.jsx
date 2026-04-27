/**
 * @file BatchResultView.jsx
 * @description Vista resumen del analisis por lotes (CSV).
 */

import { Button } from "@/components/ui/button";

/** Resumen de lote procesado con KPIs y acciones de exportacion. */
function BatchResultView({ result }) {
  return (
    <>
      <div className="text-center">
        <p className="text-sm text-on-surface-variant">Lote procesado correctamente</p>
        <h2 className="mt-2 font-headline text-2xl font-bold text-on-surface sm:text-3xl">
          {result.totalRows} noticias analizadas
        </h2>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-outline-variant/25 bg-surface/50 p-3 text-center">
          <p className="text-xs uppercase tracking-wider text-on-surface-variant">Archivo</p>
          <p className="mt-1 break-all text-sm font-semibold text-on-surface">{result.fileName}</p>
        </div>
        <div className="rounded-xl border border-outline-variant/25 bg-surface/50 p-3 text-center">
          <p className="text-xs uppercase tracking-wider text-on-surface-variant">Totales</p>
          <p className="mt-1 text-lg font-bold text-primary">{result.totalRows}</p>
        </div>
        <div className="rounded-xl border border-outline-variant/25 bg-surface/50 p-3 text-center">
          <p className="text-xs uppercase tracking-wider text-on-surface-variant">Sospechosas</p>
          <p className="mt-1 text-lg font-bold text-primary">{result.suspiciousRows}</p>
        </div>
      </div>

      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        <Button type="button" variant="outline" className="w-full sm:w-auto">
          Descargar reporte
        </Button>
        <Button type="button" variant="outline" className="w-full sm:w-auto">
          Guardar en historial
        </Button>
      </div>
    </>
  );
}

export default BatchResultView;
