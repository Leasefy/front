/**
 * Convierte una fecha ISO al formato de `<input type="date">` ("YYYY-MM-DD").
 *
 * Un contrato MIGRADO (T-0031) sin fechas queda en estado `DRAFT` (D3) — el
 * MISMO estado con el que arranca un contrato nativo, así que `canEdit`
 * (`status === 'draft'`) no lo excluye por status solo; el back rechaza el
 * `PATCH` (`rechazarSiEsMigrado`), pero esta pantalla puede llegar a
 * precargar el formulario con `contract.startDate === null` antes de que el
 * usuario intente guardar. `new Date(null).toISOString()` no revienta —
 * cae al epoch UNIX y precargaría "1970-01-01" en el input, silencioso y
 * con total confianza.
 */
export function isoToInputDate(iso: string | null | undefined): string {
  if (!iso) return '';
  try {
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return '';
    return date.toISOString().slice(0, 10);
  } catch {
    return '';
  }
}
