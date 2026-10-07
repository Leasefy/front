/**
 * 🔴 CB-R09 (QA-CONTA, 04-10): la cuenta de la inmobiliaria desde la que sale
 * la plata del lote de egresos. El back la exige para armar el archivo del
 * banco (`GET …/egresos/lotes/:id/archivo?cuentaId=<medio de pago>`) y sólo le
 * sirve una cuenta bancaria activa con banco, tipo y número; si no, 400
 * `CUENTA_DE_ORIGEN_NO_SIRVE`. Acá se eligen, PURO, las que se ofrecen.
 */

/** Lo que hace falta de una cuenta de `GET …/conciliacion-bancaria/cuentas`. */
export interface CuentaDeOrigen {
  id: string;
  nombre: string;
  banco: string | null;
  tipoDeCuenta: string | null;
  numeroEnmascarado: string | null;
  activa: boolean;
}

export const SIN_CUENTA_DE_ORIGEN =
  'Elige la cuenta de la inmobiliaria desde la que sale la plata: el archivo del banco la necesita.';

/** Las activas que tienen banco y número (las que el back acepta). */
export function cuentasQueSirvenDeOrigen(
  cuentas: ReadonlyArray<Partial<CuentaDeOrigen> & { id: string }>,
): CuentaDeOrigen[] {
  return cuentas
    .filter((c) => c.activa !== false && Boolean(c.banco?.trim()) && Boolean(c.numeroEnmascarado))
    .map((c) => ({
      id: c.id,
      nombre: c.nombre ?? '',
      banco: c.banco ?? null,
      tipoDeCuenta: c.tipoDeCuenta ?? null,
      numeroEnmascarado: c.numeroEnmascarado ?? null,
      activa: true,
    }));
}

/** «Bancolombia ahorros recaudo · •••• 5678». */
export function nombreDeLaCuentaDeOrigen(c: CuentaDeOrigen): string {
  const nombre = c.nombre.trim() || [c.banco, c.tipoDeCuenta?.toLowerCase()].filter(Boolean).join(' ');
  return c.numeroEnmascarado ? `${nombre} · ${c.numeroEnmascarado}` : nombre;
}
