/**
 * Formateo null-safe de campos de contrato para el panel landlord
 * tradicional.
 *
 * `activeContract.monthlyRent`/`startDate`/`endDate`/`paymentDueDay` pueden
 * ser `null` en un contrato MIGRADO sparse (T-0031, M2) — el landlord
 * tradicional también puede llegar a ver uno de estos si es el mismo
 * usuario que corrió la migración. Antes de este módulo, "Día de pago:
 * ${activeContract.paymentDueDay}" interpolaba literal "null" (VERIFY-batch-2,
 * Finding 1) y las fechas/canon caían a epoch/"$ 0" — un dato ausente
 * mostrado con total confianza como un hecho falso.
 *
 * `null` entra, `null` sale — quien renderiza decide el placeholder.
 */

export function formatCanon(value: number | null | undefined): string {
  if (value == null) return 'Sin definir';
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

/**
 * Preserva la locale `es-CL` ya usada en esta pantalla (pre-existente, no se
 * corrige acá). `iso` puede venir como fecha pura ("2026-06-15") o como
 * datetime ISO completo con hora UTC medianoche ("2026-06-15T00:00:00.000Z"
 * — así serializa Prisma una columna `@db.Date`, que es la forma real en la
 * que viaja `Contract.startDate`/`endDate`). Se toman sólo los primeros 10
 * caracteres y se fuerza mediodía local antes de parsear: sin esto,
 * `new Date('2026-06-15T00:00:00.000Z' + 'T12:00:00')` da `Invalid Date`
 * (dos horarios concatenados), y sin el mediodía, una fecha a medianoche UTC
 * cae al día anterior en cualquier huso horario detrás de UTC.
 */
export function formatFecha(
  iso: string | null | undefined,
  opts: Intl.DateTimeFormatOptions,
): string | null {
  if (!iso) return null;
  const soloFecha = iso.slice(0, 10);
  const date = new Date(`${soloFecha}T12:00:00`);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString('es-CL', opts);
}

export function mesesHastaFin(endDateIso: string | null | undefined): number | null {
  if (!endDateIso) return null;
  const end = new Date(endDateIso);
  if (Number.isNaN(end.getTime())) return null;
  return Math.round((end.getTime() - Date.now()) / (1000 * 60 * 60 * 24 * 30));
}
