'use client';

/**
 * Dos cosas de /cobros que tenían que dejar de afirmar lo que no sabían.
 *
 * C2 — el resumen del mes. `useCobroSummary` exponía el error y la página no
 * lo leía: con el servidor caído armaba un resumen de ceros y la franja decía
 * «$0 recaudado». Ahora pasa por los estados de la casa: esqueleto mientras
 * carga, `FalloDeCarga` con reintento si falló, los números si llegaron.
 *
 * C3 — los conteos de las pestañas. El filtro de estado viaja al servidor, así
 * que con «En mora» puesto el listado sólo trae los de mora y las demás
 * pestañas caían a 0, como si no hubiera pagados ni pendientes.
 */

import type { ReactNode } from 'react';
import { ArrowsClockwise } from '@phosphor-icons/react';
import { FalloDeCarga } from '@/components/estado/FalloDeCarga';
import { EsqueletoIndicadores } from '@/components/estado/EsqueletoTabla';
import { Button } from '@/components/ui/button';
import type { Cobro, CobroStatus, CobroSummary } from '@/lib/types/inmobiliaria';

export type PestanaDeEstado = CobroStatus | 'all';
export type ConteosPorEstado = Record<PestanaDeEstado, number>;

const CEROS: ConteosPorEstado = { all: 0, pending: 0, paid: 0, partial: 0, late: 0, defaulted: 0 };

export function contarPorEstado(cobros: readonly Cobro[]): ConteosPorEstado {
  const conteos: ConteosPorEstado = { ...CEROS, all: cobros.length };
  for (const cobro of cobros) conteos[cobro.status] = (conteos[cobro.status] ?? 0) + 1;
  return conteos;
}

/**
 * El resumen del servidor sólo trae pagados, pendientes (con los parciales
 * adentro) y en mora. Es el respaldo cuando no hay un conteo propio.
 */
function desdeElResumen(resumen: CobroSummary): ConteosPorEstado {
  return {
    ...CEROS,
    all: resumen.cobrosPaid + resumen.cobrosPending + resumen.cobrosLate,
    paid: resumen.cobrosPaid,
    pending: resumen.cobrosPending,
    late: resumen.cobrosLate,
  };
}

/**
 * De dónde sale cada número, en orden:
 *   1. Sin filtro de estado, del listado: es el conteo exacto del mes (y del
 *      propietario, si hay uno elegido).
 *   2. Con filtro, del último conteo sin filtro del mismo mes y propietario
 *      (`recordados`), y la pestaña activa con lo que trajo el listado.
 *   3. Si todavía no hubo un conteo sin filtro (se entró directo con «En
 *      mora»), del resumen del mes. El resumen es de toda la inmobiliaria: con
 *      un propietario elegido no sirve y se deja sólo la pestaña activa.
 * Un 0 no pinta insignia: un dato que no se sabe no se muestra como cero.
 */
export function conteosDePestanas({
  estado,
  cobros,
  recordados,
  resumen,
  filtradoPorPropietario,
}: {
  estado: PestanaDeEstado;
  /** `null` mientras el listado carga. */
  cobros: readonly Cobro[] | null;
  recordados: ConteosPorEstado | null;
  resumen: CobroSummary | null | undefined;
  filtradoPorPropietario: boolean;
}): ConteosPorEstado {
  if (estado === 'all' && cobros) return contarPorEstado(cobros);
  const base =
    recordados ?? (resumen && !filtradoPorPropietario ? desdeElResumen(resumen) : CEROS);
  if (estado === 'all' || !cobros) return base;
  return { ...base, [estado]: cobros.length };
}

export function FranjaDelResumen({
  resumen,
  cargando,
  error,
  onReintentar,
  children,
}: {
  resumen: CobroSummary | null | undefined;
  cargando: boolean;
  error: unknown;
  onReintentar: () => void | Promise<unknown>;
  children: (resumen: CobroSummary) => ReactNode;
}) {
  if (resumen) {
    return (
      <>
        {/* Ya hubo números y un refresco posterior falló: no se borran, pero
            se dice que pueden estar viejos. */}
        {Boolean(error) && (
          <div
            role="alert"
            data-testid="resumen-desactualizado"
            className="mb-3 flex flex-wrap items-center justify-between gap-3 rounded-md border border-border bg-warning-soft px-4 py-2.5"
          >
            <p className="text-sm text-fg">
              No se pudo actualizar el resumen del mes: estos números son de la última carga.
            </p>
            <Button variant="outline" size="sm" className="gap-2" onClick={() => void onReintentar()}>
              <ArrowsClockwise className="h-4 w-4" aria-hidden="true" />
              Intentar de nuevo
            </Button>
          </div>
        )}
        {children(resumen)}
      </>
    );
  }

  if (cargando) return <EsqueletoIndicadores />;

  if (error) {
    return <FalloDeCarga error={error} queEs="el resumen del mes" onReintentar={onReintentar} />;
  }

  return null;
}

// ── C4 y C7: dos preguntas que la página hacía en línea ─────────────────────

/**
 * C7 — ¿se puede avanzar al mes siguiente?
 *
 * La flecha «siguiente» no tenía tope: se llegaba a noviembre de 2031 y la
 * pantalla mostraba una tabla vacía perfectamente convincente, sin decir que
 * ese mes todavía no existe. Un vacío que se ve igual que «no hay cobros» es
 * peor que un botón apagado.
 *
 * Los meses PASADOS siguen abiertos: ahí sí hay cartera vieja que mirar.
 * Comparar `'YYYY-MM'` como texto es correcto — ese formato ordena bien.
 */
export function puedeAvanzarAlMesSiguiente(
  mesActual: string,
  mesTope: string,
): boolean {
  return mesActual < mesTope;
}

/** Lo que la pantalla de cobros puede tener filtrado, sin contar el mes. */
export interface FiltrosDeCobrosPuestos {
  status?: string;
  search?: string;
  consignacionId?: string;
  propietarioId?: string;
}

/**
 * C4 — ¿la persona está filtrando?
 *
 * Es lo que separa «no hay cobros» de «tus filtros no dan nada»: eran el mismo
 * cartel, así que buscar mal se leía como cartera vacía y la salida ofrecida
 * (ir a la migración) no servía para nada.
 *
 * 🔴 El MES no cuenta como filtro. Siempre hay uno puesto, así que contarlo
 * haría que el vacío dijera «quita los filtros» todas las veces — también en
 * una inmobiliaria recién creada que nunca generó un cobro, que es justo el
 * caso donde el otro mensaje es el correcto.
 */
export function hayFiltrosDeCobros(filtros: FiltrosDeCobrosPuestos): boolean {
  return (
    (filtros.status !== undefined && filtros.status !== 'all') ||
    Boolean(filtros.search?.trim()) ||
    Boolean(filtros.consignacionId) ||
    Boolean(filtros.propietarioId)
  );
}
