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

/** Filtrar sin ordenar. Los conteos de los chips no necesitan el orden. */
function soloFiltrar(
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

  return resultado;
}

export function filtrarPropietarios(
  propietarios: readonly Propietario[],
  filtros: FiltrosDePropietarios,
): Propietario[] {
  const resultado = soloFiltrar(propietarios, filtros);

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

/**
 * Cuántos propietarios hay detrás de cada chip.
 *
 * ── 🔴 20-09 · Por qué los chips llevan número ──────────────────────────────
 *
 * «Todos · Persona · Empresa» y «Con saldo pendiente» no decían cuántos. Para
 * saber si hay empresas entre los 1.733 propietarios había que clickear y leer
 * el «N de 1.733» del otro extremo de la barra — y si la respuesta era cero,
 * la pantalla quedaba vacía sin explicar que ese filtro nunca tuvo nada.
 *
 * Es el mismo defecto que apareció seis veces el 19-09 por el otro lado: un
 * total que no cuadra con sus partes esconde una categoría sin nombre. Con el
 * número en el chip, las partes están a la vista y el que no suma se ve.
 *
 * ── La regla del número ─────────────────────────────────────────────────────
 *
 * Cada chip cuenta **lo que verías si lo clickearas ahora**: se respetan los
 * otros filtros puestos (la búsqueda, y el saldo para los de tipo). Contar
 * sobre la lista entera daría un número que no cuadra con lo que pasa al
 * clickear, y eso es peor que no tener número.
 */
export interface ConteosDePropietarios {
  todos: number;
  persona: number;
  empresa: number;
  conSaldo: number;
}

export function conteosDePropietarios(
  propietarios: readonly Propietario[],
  filtros: FiltrosDePropietarios,
): ConteosDePropietarios {
  const cuantos = (cambio: Partial<FiltrosDePropietarios>) =>
    soloFiltrar(propietarios, { ...filtros, ...cambio }).length;

  return {
    todos: cuantos({ tipo: 'all' }),
    persona: cuantos({ tipo: 'person' }),
    empresa: cuantos({ tipo: 'company' }),
    // El chip del saldo no depende de sí mismo: cuenta los que TIENEN saldo
    // dentro del tipo y la búsqueda puestos, esté prendido o apagado.
    conSaldo: cuantos({ soloConSaldo: true }),
  };
}
