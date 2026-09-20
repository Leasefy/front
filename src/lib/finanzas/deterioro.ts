/**
 * El deterioro de cartera en el editor: recalcular sin volver a preguntarle al
 * back. Puro.
 *
 * ── Por qué se recalcula acá ────────────────────────────────────────────────
 *
 * El contador BAJA un 100 % a 60 % y tiene que ver, en el mismo gesto, cuánto
 * queda de provisión y —sobre todo— cuánto se asienta. Un botón «recalcular»
 * que va al servidor entre cada cambio convierte una decisión en un trámite, y
 * peor: deja la pantalla mostrando el número viejo mientras la persona ya
 * decidió con el nuevo.
 *
 * La aritmética es la MISMA del back (`deterioro/deterioro-de-cartera.ts`):
 * `provisión = redondear(cartera × porcentaje / 100)` por tramo, y el
 * movimiento es la diferencia con la provisión APROBADA del mes anterior. Lo
 * que se manda a guardar son los porcentajes, no los pesos: el número que se
 * asienta lo vuelve a calcular el back sobre la cartera que él ve.
 *
 * ── 🔴 Lo que se asienta es el MOVIMIENTO, no el saldo ──────────────────────
 *
 * La provisión es un saldo acumulado (una cuenta correctora del activo). Cada
 * mes se asienta la DIFERENCIA: gasto cuando la cartera empeoró, recuperación
 * —negativa— cuando mejoró. Asentar el saldo entero cada mes lo duplicaría, y
 * es el error que esta pantalla existe para hacer imposible.
 */

import type { TramoCalculado, TramoDeDeterioro } from '@/lib/api/finanzas.types';

/** La provisión de un tramo con el porcentaje que tenga puesto. Al peso. */
export function provisionDelTramo(carteraCop: number, porcentaje: number): number {
  if (!Number.isFinite(carteraCop) || !Number.isFinite(porcentaje)) return 0;
  return Math.round((Math.max(0, carteraCop) * porcentaje) / 100);
}

/** Los tramos con la provisión recalculada según los porcentajes editados. */
export function recalcularTramos(
  tramos: readonly TramoCalculado[],
  porcentajes: Readonly<Record<string, number>>,
): TramoCalculado[] {
  return tramos.map((t) => {
    const porcentaje = porcentajes[t.nombre] ?? t.porcentaje;
    return { ...t, porcentaje, provisionCop: provisionDelTramo(t.carteraCop, porcentaje) };
  });
}

/** Lo que suma la provisión de todos los tramos. */
export function totalProvisionado(tramos: readonly { provisionCop: number }[]): number {
  return tramos.reduce((suma, t) => suma + t.provisionCop, 0);
}

/**
 * 🔴 EL ASIENTO DEL MES. Positivo = gasto por deterioro; negativo =
 * recuperación; cero = no hay asiento que hacer.
 */
export function movimientoDelMes(provisionCop: number, provisionAnteriorCop: number): number {
  return Math.round(provisionCop) - Math.round(provisionAnteriorCop);
}

/** Cómo se lee el movimiento, en una frase. Es la línea que firma el contador. */
export function queSeAsienta(movimientoCop: number): string {
  if (movimientoCop > 0) {
    return 'Se asienta un GASTO por deterioro: la cartera empeoró contra el mes anterior.';
  }
  if (movimientoCop < 0) {
    return 'Se asienta una RECUPERACIÓN: la cartera mejoró contra el mes anterior, así que la provisión baja.';
  }
  return 'No hay asiento que hacer: la provisión quedó igual que la del mes anterior.';
}

/** ¿Algún porcentaje quedó fuera de 0-100? El back lo rechaza; acá se avisa antes. */
export function porcentajesFueraDeRango(tramos: readonly TramoDeDeterioro[]): string[] {
  return tramos
    .filter((t) => !Number.isFinite(t.porcentaje) || t.porcentaje < 0 || t.porcentaje > 100)
    .map((t) => t.nombre);
}

/** ¿Se movió algún porcentaje respecto de lo que trajo el back? */
export function hayCambios(
  tramos: readonly TramoCalculado[],
  porcentajes: Readonly<Record<string, number>>,
): boolean {
  return tramos.some((t) => (porcentajes[t.nombre] ?? t.porcentaje) !== t.porcentaje);
}

/** Los tramos tal como los pide el POST: sólo la forma, sin los pesos. */
export function tramosParaGuardar(tramos: readonly TramoCalculado[]): TramoDeDeterioro[] {
  return tramos.map((t) => ({
    nombre: t.nombre,
    desdeDias: t.desdeDias,
    hastaDias: t.hastaDias,
    porcentaje: t.porcentaje,
  }));
}
