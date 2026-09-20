/**
 * Qué entra en la base de la comisión de administración (regla del 17-09).
 *
 * La comisión se cobra sobre el canon y sobre los conceptos del contrato que la
 * inmobiliaria marque «comisionables». **Nunca** sobre la administración de la
 * copropiedad ni sobre reembolsos: esa plata es de un tercero o es una
 * devolución, y comisionarla sería cobrarle al propietario por mover plata
 * ajena.
 *
 * Es el MISMO criterio del back (`mandato/comisionable.ts::porQueNoEsComisionable`):
 * acá sólo se usa para no ofrecer un interruptor que el back va a rechazar y
 * para decir por qué.
 */

export interface ConceptoParaComisionar {
  nombre: string;
  conceptoId?: string;
  base: 'ARRENDAMIENTO' | 'COMISION' | 'SERVICIO_GRAVADO' | 'NO_GRAVADO';
  paga: string;
  recibe: string;
}

/** `null` = sí se puede marcar comisionable. Si no, la razón en palabras. */
export function porQueNoEsComisionable(c: ConceptoParaComisionar): string | null {
  if (c.paga !== 'INQUILINO' || c.recibe !== 'PROPIETARIO') {
    return 'Sólo se comisiona lo que el inquilino le paga al propietario.';
  }
  if (/administraci[oó]n/i.test(`${c.nombre} ${c.conceptoId ?? ''}`)) {
    return 'La administración de la copropiedad no es del propietario: no se comisiona.';
  }
  if (c.base === 'NO_GRAVADO') {
    return 'Los reembolsos y lo no gravado no entran en la base de la comisión.';
  }
  return null;
}
