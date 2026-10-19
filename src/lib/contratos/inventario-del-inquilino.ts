/**
 * CONTR-8 (QA de agentes 17-10): ¿se le ofrece al inquilino firmar el
 * inventario en la pantalla de su contrato?
 *
 * Antes sólo salía en la pantalla de éxito justo después de firmar el
 * contrato, que vive en memoria: quien recargaba o volvía otro día no tenía
 * dónde firmarlo. Se ofrece una vez el inquilino firmó el contrato y mientras
 * siga vivo. Si no hay copia del inventario, el componente no pinta nada; si
 * ya lo firmó, dice quién y cuándo.
 */
const ESTADOS: ReadonlySet<string> = new Set(['pending_landlord', 'signed', 'active']);

export function seOfreceFirmarElInventario(estadoDelContrato: string | null | undefined): boolean {
  return estadoDelContrato != null && ESTADOS.has(estadoDelContrato);
}
