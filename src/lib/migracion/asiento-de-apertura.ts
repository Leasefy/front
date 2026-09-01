/**
 * Las reglas del asiento de apertura, sin React.
 *
 * Es lo que hace cualquier contador al arrancar un sistema: UN asiento con la
 * fecha de corte y los saldos de cada cuenta —lo que había en bancos, lo que
 * los inquilinos debían, lo que se le debía a los propietarios— que tiene que
 * cuadrar (débitos = créditos) para poder existir.
 *
 * Todo lo que decide **si el botón se puede apretar** vive acá y es puro. La
 * pantalla (`AsientoDeApertura.tsx`) sólo pinta lo que estas funciones dicen.
 * Las reglas son las de `asientos.service.ts` del back (`validar()`): acá se
 * anticipan para que la persona vea el problema antes de mandar, no un 400.
 */

import { MAX_COP_POR_MOVIMIENTO, type MovimientoNuevo } from '@/lib/api/contabilidad.service';

/** Una fila del formulario. Los montos en pesos enteros; `NaN`/0 = vacío. */
export interface FilaDeApertura {
  id: string;
  cuentaId: string | null;
  debitoCop: number;
  creditoCop: number;
}

export type ProblemaDeApertura =
  | 'SIN_FECHA'
  | 'POCAS_LINEAS'
  | 'SIN_CUENTA'
  | 'SIN_MONTO'
  | 'AMBIGUA'
  | 'FUERA_DE_RANGO'
  | 'CUENTA_REPETIDA'
  | 'DESCUADRADO';

let contador = 0;

export function filaVacia(): FilaDeApertura {
  contador += 1;
  return { id: `fila-${Date.now().toString(36)}-${contador}`, cuentaId: null, debitoCop: 0, creditoCop: 0 };
}

function monto(n: number): number {
  return Number.isFinite(n) && n > 0 ? n : 0;
}

/** Una fila sin cuenta y sin monto no cuenta para nada: es la que quedó de más. */
export function estaVacia(fila: FilaDeApertura): boolean {
  return !fila.cuentaId && monto(fila.debitoCop) === 0 && monto(fila.creditoCop) === 0;
}

/** Las filas que realmente van a viajar. */
export function filasConContenido(filas: readonly FilaDeApertura[]): FilaDeApertura[] {
  return filas.filter((f) => !estaVacia(f));
}

export function totalesDeApertura(filas: readonly FilaDeApertura[]): {
  debitos: number;
  creditos: number;
  diferencia: number;
} {
  let debitos = 0;
  let creditos = 0;
  for (const f of filasConContenido(filas)) {
    debitos += monto(f.debitoCop);
    creditos += monto(f.creditoCop);
  }
  return { debitos, creditos, diferencia: debitos - creditos };
}

/** `AAAA-MM-DD` y que el día exista: `aDiaContable` del back rechaza el resto. */
export function esFechaContable(fecha: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) return false;
  const [a, m, d] = fecha.split('-').map(Number);
  const dt = new Date(Date.UTC(a, m - 1, d));
  return dt.getUTCFullYear() === a && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
}

/**
 * Todo lo que impide mandar, en el orden en que conviene leerlo. Vacío =
 * se puede. Cada código replica una regla del `validar()` del back.
 */
export function problemasDeApertura(
  filas: readonly FilaDeApertura[],
  fecha: string,
): ProblemaDeApertura[] {
  const problemas = new Set<ProblemaDeApertura>();
  if (!esFechaContable(fecha)) problemas.add('SIN_FECHA');

  const vivas = filasConContenido(filas);
  if (vivas.length < 2) problemas.add('POCAS_LINEAS');

  const cuentasVistas = new Set<string>();
  for (const f of vivas) {
    const d = monto(f.debitoCop);
    const c = monto(f.creditoCop);
    if (!f.cuentaId) problemas.add('SIN_CUENTA');
    if (d === 0 && c === 0) problemas.add('SIN_MONTO');
    if (d > 0 && c > 0) problemas.add('AMBIGUA');
    if (d > MAX_COP_POR_MOVIMIENTO || c > MAX_COP_POR_MOVIMIENTO) problemas.add('FUERA_DE_RANGO');
    if (f.cuentaId) {
      if (cuentasVistas.has(f.cuentaId)) problemas.add('CUENTA_REPETIDA');
      cuentasVistas.add(f.cuentaId);
    }
  }

  if (totalesDeApertura(filas).diferencia !== 0) problemas.add('DESCUADRADO');
  return [...problemas];
}

/** 🔴 La única puerta del botón «Registrar el asiento». */
export function puedeEnviarApertura(filas: readonly FilaDeApertura[], fecha: string): boolean {
  return problemasDeApertura(filas, fecha).length === 0;
}

/** Los movimientos tal como los espera `CrearAsientoDto`: sólo la pata que aplica. */
export function movimientosDeApertura(filas: readonly FilaDeApertura[]): MovimientoNuevo[] {
  return filasConContenido(filas).map((f) => {
    const m: MovimientoNuevo = { cuentaId: f.cuentaId ?? '' };
    const d = monto(f.debitoCop);
    const c = monto(f.creditoCop);
    if (d > 0) m.debitoCop = d;
    if (c > 0) m.creditoCop = c;
    return m;
  });
}

export function descripcionSugerida(fecha: string): string {
  return esFechaContable(fecha) ? `Saldos iniciales al ${fecha}` : 'Saldos iniciales';
}

/** Hoy en `AAAA-MM-DD` local, el valor por defecto del campo de fecha. */
export function hoyContable(ahora = new Date()): string {
  const a = ahora.getFullYear();
  const m = String(ahora.getMonth() + 1).padStart(2, '0');
  const d = String(ahora.getDate()).padStart(2, '0');
  return `${a}-${m}-${d}`;
}
