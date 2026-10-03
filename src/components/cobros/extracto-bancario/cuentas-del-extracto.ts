/**
 * La cuenta, los saldos y el período de la carga del extracto (Fase 1 de la
 * conciliación, 02-10-2026). PURO: lo usan `CargarExtracto` y la cabecera de
 * cuentas, y está probado al lado.
 *
 * Nico (P3): «la cuenta es OBLIGATORIA al cargar el extracto; la conciliación,
 * el saldo y el cierre van por cuenta». Las cuentas son los medios de pago de la
 * inmobiliaria con número (transferencia, Nequi o Daviplata); se registran en
 * Configuración → Medios de pago.
 */

import { useReducedMotion, type TargetAndTransition } from 'framer-motion';
import { motionDistance, motionDuration, motionEase } from '@leasefy/cadence';
import type {
  CuentaDelExtracto,
  FilaDeExtracto,
  FiltroDeCuenta,
  IndicadoresDeLaCuenta,
  ResultadoDeCarga,
} from '@/lib/api/conciliacion-bancaria.types';
import { plata } from './formato';

/** Dónde se registran las cuentas de la inmobiliaria. */
export const RUTA_DE_LOS_MEDIOS_DE_PAGO = '/panel/inmobiliaria/configuracion/medios-de-pago';

/** «Ahorros Bancolombia •••• 6789». */
export function nombreDeLaCuenta(c: Pick<CuentaDelExtracto, 'nombre' | 'numeroEnmascarado'>): string {
  return c.numeroEnmascarado ? `${c.nombre} ${c.numeroEnmascarado}` : c.nombre;
}

/** Lo que dice el selector de cada cuenta. */
export function opcionDeLaCuenta(c: CuentaDelExtracto): string {
  const banco = c.banco && !c.nombre.toLowerCase().includes(c.banco.toLowerCase()) ? ` · ${c.banco}` : '';
  const via = c.via === 'ARCHIVO' ? ' (recauda por archivo)' : '';
  return `${nombreDeLaCuenta(c)}${banco}${via}`;
}

/** El nombre de lo que se filtra: una cuenta, lo de antes sin cuenta o la pasarela. */
export function nombreDelFiltro(filtro: FiltroDeCuenta | null, cuentas: readonly CuentaDelExtracto[]): string {
  if (!filtro) return 'Todas las cuentas';
  if (filtro === 'sin-cuenta') return 'Sin cuenta (cargado antes)';
  if (filtro === 'pasarela') return 'Pasarela de pagos';
  const c = cuentas.find((x) => x.id === filtro);
  return c ? nombreDeLaCuenta(c) : 'Cuenta';
}

/** El período que sale de las fechas de las líneas (`YYYY-MM-DD`). */
export function periodoDeLasFilas(filas: readonly Pick<FilaDeExtracto, 'fecha'>[]): { desde: string; hasta: string } | null {
  if (filas.length === 0) return null;
  const fechas = filas.map((f) => f.fecha).sort();
  return { desde: fechas[0], hasta: fechas[fechas.length - 1] };
}

/** ¿El archivo trae la columna «Saldo» en alguna línea? */
export function traeLaColumnaDeSaldo(filas: readonly Pick<FilaDeExtracto, 'saldoCop'>[]): boolean {
  return filas.some((f) => typeof f.saldoCop === 'number');
}

/**
 * La cuenta en vivo con lo que la persona escribe: saldo inicial + líneas =
 * saldo final. `null` mientras falte uno de los dos saldos.
 */
export function cuadreEnVivo(
  filas: readonly Pick<FilaDeExtracto, 'valorCop'>[],
  inicialCop: number | undefined,
  finalCop: number | undefined,
): { sumaCop: number; diferenciaCop: number } | null {
  if (inicialCop === undefined || finalCop === undefined) return null;
  const sumaCop = filas.reduce((t, f) => t + f.valorCop, 0);
  return { sumaCop, diferenciaCop: inicialCop + sumaCop - finalCop };
}

/** La frase del cuadre en vivo. */
export function fraseDelCuadre(c: { sumaCop: number; diferenciaCop: number }): string {
  if (c.diferenciaCop === 0) return `Cuadra: el saldo inicial más ${plata(c.sumaCop)} de movimientos da el saldo final.`;
  return c.diferenciaCop > 0
    ? `No cuadra por ${plata(c.diferenciaCop)}: faltan salidas (o sobran entradas). El extracto entra igual y queda el aviso.`
    : `No cuadra por ${plata(-c.diferenciaCop)}: faltan entradas (o sobran salidas). El extracto entra igual y queda el aviso.`;
}

/** Los pedazos del resumen de una carga, en el orden en que se dicen. */
export function partesDelResultado(r: ResultadoDeCarga): string[] {
  const partes = [
    `${r.nuevas} ${r.nuevas === 1 ? 'nueva' : 'nuevas'}`,
    `${r.repetidas} ya ${r.repetidas === 1 ? 'estaba' : 'estaban'}`,
  ];
  if ((r.igualesEnElArchivo ?? 0) > 0) {
    partes.push(
      `${r.igualesEnElArchivo} ${r.igualesEnElArchivo === 1 ? 'línea idéntica a otra del archivo entró' : 'líneas idénticas a otras del archivo entraron'} (son movimientos distintos)`,
    );
  }
  if ((r.adoptadas ?? 0) > 0) {
    partes.push(`${r.adoptadas} de antes ${r.adoptadas === 1 ? 'tomó' : 'tomaron'} esta cuenta`);
  }
  partes.push(`${r.salidas} ${r.salidas === 1 ? 'salida' : 'salidas'} de plata`);
  const ilegibles = r.descartadas - (r.descartadasPorValor ?? 0);
  if (ilegibles > 0) partes.push(`${ilegibles} descartadas por ilegibles`);
  if ((r.descartadasPorValor ?? 0) > 0) partes.push(`${r.descartadasPorValor} sin cargar por su valor`);
  if (r.yaPagadasPorPasarela > 0) {
    partes.push(
      `${r.yaPagadasPorPasarela} ${r.yaPagadasPorPasarela === 1 ? 'traía' : 'traían'} el id de un pago en línea y ${r.yaPagadasPorPasarela === 1 ? 'quedó marcada' : 'quedaron marcadas'}`,
    );
  }
  return partes;
}

/** El porcentaje conciliado de una cuenta, para la cabecera. */
export function porcentajeLegible(i: Pick<IndicadoresDeLaCuenta, 'porcentajePorNumero' | 'porcentajePorValor'>): string {
  if (i.porcentajePorNumero === null || i.porcentajePorValor === null) return 'Sin entradas';
  const n = i.porcentajePorNumero.toLocaleString('es-CO', { maximumFractionDigits: 1 });
  const v = i.porcentajePorValor.toLocaleString('es-CO', { maximumFractionDigits: 1 });
  return `${n} % por número · ${v} % por valor`;
}

/**
 * Cómo aparecen y se van los bloques nuevos (el resultado, los saldos, la
 * propuesta de la pasarela): tokens de Cadence, sólo `transform` y `opacity`;
 * con movimiento reducido, en el lugar y sin esperar.
 */
export interface Aparecer {
  initial: TargetAndTransition;
  animate: TargetAndTransition;
  exit: TargetAndTransition;
}

export function aparecer(reducido: boolean): Aparecer {
  if (reducido) {
    return {
      initial: { opacity: 1 },
      animate: { opacity: 1, transition: { duration: 0 } },
      exit: { opacity: 0, transition: { duration: 0 } },
    };
  }
  return {
    initial: { opacity: 0, y: motionDistance.sm },
    animate: { opacity: 1, y: 0, transition: { duration: motionDuration.base, ease: motionEase.enter } },
    exit: { opacity: 0, y: -motionDistance.xs, transition: { duration: motionDuration.fast, ease: motionEase.exit } },
  };
}

export function useAparecer(): Aparecer {
  return aparecer(useReducedMotion() ?? false);
}
