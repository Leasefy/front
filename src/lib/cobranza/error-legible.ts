/**
 * Lo que se le dice a la persona cuando el agente de cobranza no contesta.
 *
 * `fetch` falla con «Failed to fetch» (o «Load failed» en Safari) cuando el
 * micro no está arriba o se está reiniciando: eso no es un mensaje para nadie.
 * Los demás errores vienen ya escritos por el micro y se dejan pasar.
 */
export function errorLegible(error: string | null | undefined): string {
  if (!error) return '';
  if (/failed to fetch|load failed|networkerror|network request failed/i.test(error)) {
    return 'El agente de cobranza no respondió. Reintenta en un momento.';
  }
  return error;
}
