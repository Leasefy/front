'use client';

/**
 * El archivo del lote al banco, mostrado CON EL CENTRO DE PROCESOS.
 *
 * Nico (22-09-2026): «ese diseño de carga de lotes es horrible». Descargar el
 * archivo abría un diálogo que se quedaba en «Pidiendo el archivo y cotejando
 * el hash…» con un spinner, y al cerrarlo no quedaba rastro. Ahora el archivo
 * es el resultado de un proceso: se ve acá con la MISMA fila del centro del
 * header —quién lo generó, cuándo, cómo quedó, «Descargar»— y se baja desde
 * el storage sin volver a pedirlo al back.
 *
 * Lo que NO se pierde:
 *   · 🔴 el aviso SIN-VERIFICAR va arriba de la fila, antes de bajar nada;
 *   · el hash: si el archivo no está en el centro (se generó antes de que
 *     existiera, o su copia venció) se vuelve a pedir con el POST de siempre,
 *     que coteja el hash y no lo entrega si cambió;
 *   · sin la migración del centro en el back (`procesoId` ausente) se baja
 *     como antes, por el GET del lote.
 */

import { useCallback, useState } from 'react';
import { Banner } from '@leasefy/cadence';

import { FilaDeProceso } from '@/components/procesos/FilaDeProceso';
import { estaActivo } from '@/components/procesos/estado-del-proceso';
import { descargarArchivoDelProceso, type Navegar } from '@/components/procesos/descargar-archivo-del-proceso';
import { useCentroDeProcesos } from '@/lib/hooks/use-centro-de-procesos';
import { RECURSO_LOTE } from '@/lib/api/procesos.service';
import type { Proceso } from '@/lib/api/procesos.types';
import { lotesDeDispersionApi } from '@/lib/api/lotes-de-dispersion.service';
import type { ArchivoGenerado, EstadoDelLote } from '@/lib/api/lotes-de-dispersion.types';
import { formatDateTime } from '@/lib/format';
import { esSinVerificar } from './estado-del-lote';

const CON_ARCHIVO: readonly EstadoDelLote[] = ['ARCHIVO_GENERADO', 'PAGADO'];

function descargable(p: Proceso | null): p is Proceso {
  return Boolean(p && p.estado === 'TERMINADO' && p.archivo && !p.archivo.vencido);
}

function mensajeDe(e: unknown, respaldo: string): string {
  return e instanceof Error && e.message ? e.message : respaldo;
}

/**
 * El estado del archivo de UN lote y cómo bajarlo. Lo usa el detalle: el botón
 * «Descargar archivo» de arriba y la sección de abajo hacen lo mismo.
 */
export function useArchivoDelLote(
  loteId: string,
  estado: EstadoDelLote,
  guardar: (contenido: Blob | string, nombre: string) => void,
  navegar?: Navegar,
) {
  const tieneArchivo = CON_ARCHIVO.includes(estado);
  const centro = useCentroDeProcesos(
    { recursoTipo: RECURSO_LOTE, recursoId: loteId, limite: 1 },
    { activo: tieneArchivo },
  );
  const proceso = centro.data?.procesos[0] ?? null;
  const [preparando, setPreparando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ultimo, setUltimo] = useState<ArchivoGenerado | null>(null);

  const porElGetDelLote = useCallback(
    async (nombre: string) => {
      const blob = await lotesDeDispersionApi.descargarArchivo(loteId);
      guardar(blob, nombre);
    },
    [guardar, loteId],
  );

  const descargar = useCallback(async () => {
    setError(null);
    // 1. Ya está en el centro: se baja de ahí, sin pedirle nada al back.
    if (descargable(proceso)) {
      try {
        await descargarArchivoDelProceso(proceso.id, navegar);
        return;
      } catch {
        /* la copia no está (storage): se vuelve a pedir abajo */
      }
    }
    // 2. No está (o venció): el POST de siempre, que coteja el hash. Deja un
    //    proceso nuevo con su archivo.
    setPreparando(true);
    try {
      const r = await lotesDeDispersionApi.generarArchivo(loteId);
      setUltimo(r);
      await centro.refetch();
      if (r.procesoId) {
        try {
          await descargarArchivoDelProceso(r.procesoId, navegar);
          return;
        } catch {
          /* el archivo no quedó en el storage: por el GET del lote */
        }
      }
      // 3. Sin centro en el back: como antes.
      await porElGetDelLote(r.nombreArchivo);
    } catch (e) {
      setError(mensajeDe(e, 'No se pudo descargar el archivo.'));
    } finally {
      setPreparando(false);
    }
  }, [centro, loteId, navegar, porElGetDelLote, proceso]);

  return { tieneArchivo, proceso, preparando, error, ultimo, descargar, refetch: centro.refetch };
}

export type ArchivoDelLoteEstado = ReturnType<typeof useArchivoDelLote>;

/** La sección «El archivo al banco» del detalle. */
export function ArchivoDelLote({
  archivo,
  generadoAt,
  navegar,
}: {
  archivo: ArchivoDelLoteEstado;
  generadoAt: string | null;
  navegar?: Navegar;
}) {
  const { proceso, ultimo, error, preparando } = archivo;
  if (!archivo.tieneArchivo && !proceso) return null;

  const nombre = ultimo?.nombreArchivo ?? proceso?.archivo?.nombre ?? null;
  const sinVerificar = ultimo ? !ultimo.layoutVerificado || esSinVerificar(ultimo.nombreArchivo) : nombre ? esSinVerificar(nombre) : false;

  return (
    <section className="space-y-3 rounded-lg border border-border bg-surface shadow-sm" data-testid="archivo-del-lote">
      <header className="px-4 pt-4">
        <h2 className="text-body-sm font-semibold text-fg">El archivo al banco</h2>
        <p className="text-caption text-fg-muted">
          Queda en el centro de procesos: lo bajas desde aquí o desde el botón de procesos de arriba.
        </p>
      </header>

      {sinVerificar && (
        <div className="px-4">
          <Banner variant="warning" title="Este layout no se verificó contra un archivo real del banco">
            La primera vez, revisa que el banco lo valide sin errores antes de autorizar el pago. El nombre del
            archivo lleva <span className="font-mono">SIN-VERIFICAR</span> para que el aviso viaje hasta el
            escritorio.
          </Banner>
        </div>
      )}

      {/* 🔴 23-09 (Nico: «todas las cargas déjalas que sucedan allí»): el
          archivo EN PREPARACIÓN no se pinta acá con su barra —eso lo muestra
          el centro—; acá sólo el archivo ya hecho, con «Descargar». */}
      {proceso && estaActivo(proceso) ? (
        <p className="border-t border-border-faint px-4 py-3 text-caption text-fg-muted" data-testid="archivo-en-el-centro">
          Se está preparando: lo sigues en el centro de procesos, arriba a la derecha, y aparece aquí cuando esté.
        </p>
      ) : proceso ? (
        <ul className="border-t border-border-faint">
          <FilaDeProceso proceso={proceso} onCambio={() => void archivo.refetch()} navegar={navegar} />
        </ul>
      ) : (
        <p className="border-t border-border-faint px-4 py-3 text-caption text-fg-muted" data-testid="archivo-sin-proceso">
          {preparando
            ? 'Preparando el archivo y cotejando su hash…'
            : `Se generó${generadoAt ? ` el ${formatDateTime(generadoAt)}` : ''} antes del centro de procesos, o su copia venció. «Descargar archivo» lo vuelve a preparar —cotejando que sea el mismo— y lo deja aquí.`}
        </p>
      )}

      {error && (
        <div className="px-4 pb-4">
          <Banner variant="danger">{error}</Banner>
        </div>
      )}
      {!error && <div className="pb-1" />}
    </section>
  );
}
