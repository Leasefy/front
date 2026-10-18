import { describe, expect, it } from 'vitest'

import { escalationReasonLabel } from './call-vocab'

/**
 * MORI-29 (QA-AGENTES 16-10): Escalamientos pintaba «Otro (dispute)» y
 * «Otro (whatsapp_inbound_free_text)» con los motivos que escribe el micro.
 */
describe('escalationReasonLabel — los motivos del micro en palabras', () => {
  it('la disputa y los de WhatsApp tienen su frase', () => {
    expect(escalationReasonLabel('dispute')).toBe('Se abrió una disputa: revisa el saldo antes de seguir cobrando')
    expect(escalationReasonLabel('whatsapp_inbound_free_text')).toBe(
      'Escribió por WhatsApp algo que Mori no supo responder',
    )
    expect(escalationReasonLabel('whatsapp_pide_enlace_de_pago')).toBe('Pidió el link de pago por WhatsApp')
    expect(escalationReasonLabel('voz_exclusion_sin_titular_revisar_numero')).toMatch(/no es el titular/)
  })

  it('el caso de la llamada se lee por su efecto', () => {
    expect(escalationReasonLabel('playbook_108_suppress_channel')).toBe(
      'En la llamada: no quiere que lo contacten por ese número',
    )
    expect(escalationReasonLabel('playbook_029_halt_case')).toBe('En la llamada: se detuvo toda la cobranza del caso')
  })

  it('la acción que Mori prometió y no quedó programada', () => {
    expect(escalationReasonLabel('accion_enviar_estado_de_cuenta_sin_encolar')).toBe(
      'Mori prometió mandarle el estado de cuenta y hay que hacerlo a mano',
    )
  })

  it('lo que no conoce sigue marcado y la frase escrita va tal cual', () => {
    expect(escalationReasonLabel('playbook_108_algo_nuevo')).toBe('Otro (playbook_108_algo_nuevo)')
    expect(escalationReasonLabel('accion_otra_cosa_sin_encolar')).toBe('Otro (accion_otra_cosa_sin_encolar)')
    expect(escalationReasonLabel('Pidió hablar con el gerente')).toBe('Pidió hablar con el gerente')
    expect(escalationReasonLabel('  ')).toBeNull()
  })
})
