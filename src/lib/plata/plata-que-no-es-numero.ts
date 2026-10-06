/**
 * 🔴 La plata que llega a un formato y NO es un `number` («centavos en todo»,
 * C1-C, 03-10-2026).
 *
 * La plata viaja del back y del micro como `number` en pesos: un
 * `Prisma.Decimal` sale `number` por su `toJSON` global (back
 * `common/plata/decimal-a-json.ts`, micro igual). Si a `formatCurrency` le llega
 * TEXTO (`"1500000"`) u otra cosa, algo se escapó sin convertir, y hasta hoy se
 * pintaba «$ 0» callado: un monto real convertido en cero sin que nadie se
 * entere (riesgo 2 del diseño, `memory/archivos/centavos/diseno.md` §7).
 *
 *   · En las PRUEBAS (vitest, `NODE_ENV === 'test'`) LANZA: la prueba falla.
 *   · En desarrollo lo dice en la consola.
 *   · En el navegador de la gente no cambia nada: la pantalla pinta lo de
 *     siempre (no se rompe una pantalla en vivo por esto).
 *
 * `null`/`undefined` no cuentan: los formatos ya los tratan (campo opcional).
 *
 * Este archivo es SÓLO del front (no está en el back ni en el micro).
 */
export function plataQueNoEsNumero(quien: string, valor: unknown): void {
  if (valor === null || valor === undefined || typeof valor === 'number') return;
  const mensaje =
    `${quien} recibió ${typeof valor} («${String(valor)}») y no un number: ` +
    'la plata viaja como number en pesos (centavos en todo).';
  if (process.env.NODE_ENV === 'test') throw new TypeError(mensaje);
  if (process.env.NODE_ENV === 'development') console.error(mensaje);
}
