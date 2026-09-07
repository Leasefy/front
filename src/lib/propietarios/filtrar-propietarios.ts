/**
 * Buscar, filtrar y ordenar el directorio de propietarios.
 *
 * ── 🔴 Por qué esto salió de la tabla ───────────────────────────────────────
 *
 * `PropietarioTable` buscaba, filtraba y ordenaba con estado propio. La
 * página, en cambio, **paginaba primero** y le pasaba a la tabla las 10 filas
 * de la página actual. Así, cada filtro corría sobre esas 10 y nada más:
 *
 *   · buscar «Martínez» estando en la página 1 decía «No se encontraron
 *     propietarios» aunque Martínez estuviera en la página 3 — la pantalla
 *     afirmaba que no existe alguien que sí existe, y no había forma de
 *     saberlo desde la pantalla;
 *   · «Con saldo pendiente» mostraba los morosos *de esta página*, que es un
 *     número sin significado;
 *   · ordenar por canon ordenaba 10 filas al azar, así que el «más alto»
 *     de la tabla no era el más alto de la inmobiliaria.
 *
 * El orden correcto es filtrar → ordenar → paginar, y para eso el filtro
 * tiene que vivir donde está la lista COMPLETA: en la página. La tabla queda
 * controlada (recibe `filtros` y avisa cambios), y esta función —pura y
 * probada— es la que decide qué se ve.
 */

import type { Propietario } from '@/lib/types/inmobiliaria';

export type CampoDeOrden =
  | 'name'
  | 'propertyCount'
  | 'totalMonthlyRent'
  | 'pendingBalance'
  | 'lastPaymentDate';
export type SentidoDeOrden = 'asc' | 'desc';
export type TipoDePropietario = 'all' | 'person' | 'company';

export interface FiltrosDePropietarios {
  busqueda: string;
  tipo: TipoDePropietario;
  soloConSaldo: boolean;
  campo: CampoDeOrden;
  sentido: SentidoDeOrden;
}

export const FILTROS_INICIALES: FiltrosDePropietarios = {
  busqueda: '',
  tipo: 'all',
  soloConSaldo: false,
  campo: 'name',
  sentido: 'asc',
};

/** ¿Hay algo puesto que explique por qué la lista es más corta? El orden no cuenta. */
export function hayFiltros(filtros: FiltrosDePropietarios): boolean {
  return (
    filtros.busqueda.trim().length > 0 ||
    filtros.tipo !== 'all' ||
    filtros.soloConSaldo
  );
}

/**
 * `email`, `phone` y `documentNumber` llegan en `null` desde el back —un
 * propietario sin teléfono es normal, no un error— y `null.includes(...)`
 * revienta el render entero. Se normaliza acá, una vez.
 */
function contiene(valor: string | null | undefined, aguja: string): boolean {
  return (valor ?? '').toLowerCase().includes(aguja);
}

export function filtrarPropietarios(
  propietarios: readonly Propietario[],
  filtros: FiltrosDePropietarios,
): Propietario[] {
  let resultado = [...propietarios];

  const aguja = filtros.busqueda.trim().toLowerCase();
  if (aguja) {
    resultado = resultado.filter(
      (p) =>
        contiene(p.name, aguja) ||
        contiene(p.email, aguja) ||
        contiene(p.documentNumber, aguja) ||
        contiene(p.phone, aguja),
    );
  }

  // `undefined > 0` es false, que es lo correcto, pero conviene decirlo en vez
  // de confiar en la coerción.
  if (filtros.soloConSaldo) {
    resultado = resultado.filter((p) => (p.pendingBalance ?? 0) > 0);
  }

  if (filtros.tipo === 'person') {
    resultado = resultado.filter((p) => p.documentType !== 'NIT');
  } else if (filtros.tipo === 'company') {
    resultado = resultado.filter((p) => p.documentType === 'NIT');
  }

  resultado.sort((a, b) => {
    let aVal: string | number = a[filtros.campo] ?? '';
    let bVal: string | number = b[filtros.campo] ?? '';

    if (typeof aVal === 'string') {
      aVal = aVal.toLowerCase();
      bVal = String(bVal ?? '').toLowerCase();
    }

    if (aVal < bVal) return filtros.sentido === 'asc' ? -1 : 1;
    if (aVal > bVal) return filtros.sentido === 'asc' ? 1 : -1;
    return 0;
  });

  return resultado;
}
