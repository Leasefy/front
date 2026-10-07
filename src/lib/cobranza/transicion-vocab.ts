/**
 * transicion-vocab — cómo se lee un movimiento de etapa de la cobranza
 * (QA-IA-B, 04-10-2026).
 *
 * 🔴 «Movimientos recientes» de la portada pintaba el motivo CRUDO de
 * `cartera_stage_transitions.reason` («sin_deuda:dejo_de_estar_en_mora_en_la_plataforma»,
 * «dia_16_sin_pago») y decía «Operador» en TODOS: el micro manda el
 * `actor_type` de la tabla (`SAAS_ORCHESTRATOR` = el sistema, `admin:override`
 * = una persona) y la pantalla comparaba contra `'agent'`, que no existe.
 *
 * Los motivos son los de `TransitionReason` (`cartera/state-machine.ts` del
 * micro), el `inicial` del alta y el de quien se queda sin deuda
 * (`cierre-por-ausencia.ts`). Uno que no está acá NO se pinta crudo: se dice
 * genérico.
 */

const MOTIVOS: Record<string, string> = {
  inicial: 'Entró a la cobranza',
  dia_1_sin_pago: 'Primer día sin pago',
  dia_16_sin_pago: 'Cumplió 16 días sin pagar',
  dia_46_ptp_incumplido: 'Incumplió su promesa de pago (día 46)',
  dia_46_sin_acuerdo: 'Cumplió 46 días sin acuerdo de pago',
  dos_canones_vencidos_con_poliza: 'Dos cánones vencidos con póliza: pasa a siniestro',
  dia_90_sin_poliza: 'Cumplió 90 días sin póliza: pasa a jurídico',
  dia_90_juridico_directo: 'Cumplió 90 días: pasa a jurídico',
  skip_explicito_operador: 'Una persona lo marcó como ilocalizable',
  skip_comportamental: 'No contesta por ningún canal: ilocalizable',
  pago_total: 'Pagó todo lo que debía',
  sin_cambio: 'Sin cambio',
  'sin_deuda:dejo_de_estar_en_mora_en_la_plataforma': 'Ya no tiene deuda en mora',
}

/** El motivo en palabras; nunca el slug. */
export function motivoDeLaTransicion(reason: string | null | undefined): string {
  const r = (reason ?? '').trim()
  if (!r) return 'Cambio de etapa'
  if (MOTIVOS[r]) return MOTIVOS[r]
  // Un texto libre de una persona (forzar etapa con motivo) se respeta; un
  // slug (minúsculas con «_» o «:») no se muestra.
  if (/^[a-z0-9_:.-]+$/.test(r)) return 'Cambio de etapa'
  return r
}

/** `admin:override` = lo hizo una persona; lo demás (`SAAS_ORCHESTRATOR`, `agent`) el sistema. */
export function laHizoUnaPersona(actor: string | null | undefined): boolean {
  return actor === 'admin:override' || actor === 'human' || actor === 'operator'
}
