import { describe, expect, it } from 'vitest'
import {
  accionConNombre,
  accionLegible,
  actorLegible,
  cuandoPaso,
  enlaceDeLaEntidad,
  entidadLegible,
} from './vocabulario-de-la-auditoria'

/**
 * MORI-26 (QA-AGENTES 16-10, lab Portofino): la Auditoría pintaba
 * «subscription_update», «cobranza.autonomy.updated», «agency_policy»,
 * «piloto-gerente», «6dbe43ba…» y «16/10/2026, 11:26:40».
 */
describe('la Auditoría en palabras', () => {
  it('las acciones que se ven en la cobranza tienen nombre', () => {
    for (const codigo of [
      'pause',
      'force_stage',
      'manual_wa_send',
      'manual_call_trigger',
      'subscription_update',
      'threshold_edit',
      'payment_plan_approve',
      'cartera.payment_plan.offered',
      'cartera.payment_plan.accepted',
      'cobranza.carta.a_mano',
      'cobranza.memo.manual_create',
      'cobranza.autonomy.updated',
      'cobranza.ajustes.updated',
      'piloto_autonomia_cambiada',
      'piloto_decision_resuelta',
      'cartera.mora_sync.cierre',
      'onboarding_completed',
    ]) {
      expect(accionConNombre(codigo), codigo).toBe(true)
      expect(accionLegible(codigo)).not.toMatch(/[_.]/)
    }
    expect(accionLegible('cobranza.autonomy.updated')).toBe('Cambió la autonomía de Mori')
  })

  it('una acción nueva sin nombre se muestra con su código (nada inventado)', () => {
    expect(accionConNombre('algo.nuevo')).toBe(false)
    expect(accionLegible('algo.nuevo')).toBe('algo.nuevo')
  })

  it('sobre qué, quién y adónde lleva', () => {
    expect(entidadLegible('agency_daily_report_thresholds')).toBe('Umbrales del reporte')
    expect(entidadLegible('debtor')).toBe('Caso')
    expect(entidadLegible(null)).toBe('—')
    expect(actorLegible('piloto-gerente')).toBe('El Piloto')
    expect(actorLegible('ana@portofino.test')).toBe('ana@portofino.test')
    expect(enlaceDeLaEntidad('debtor', '6dbe43ba')).toBe('/panel/inmobiliaria/pagos/cobranza/deudores/6dbe43ba')
    expect(enlaceDeLaEntidad('payment_plan', 'p1')).toBe('/panel/inmobiliaria/pagos/cobranza/pagos/planes/p1')
    expect(enlaceDeLaEntidad('agency_policy', 'x')).toBeNull()
  })

  it('cuándo, en palabras y en la hora de Colombia', () => {
    const texto = cuandoPaso('2026-10-16T16:26:40.176Z')
    expect(texto).toMatch(/^16 de octubre de 2026/)
    expect(texto).toMatch(/11:26/)
  })
})

describe('MORI-32 · lo que quedaba en inglés o en código', () => {
  it('Habeas Data: la acción, la entidad, el actor y el enlace', () => {
    expect(accionLegible('arco-request-created')).toBe('Llegó una solicitud de Habeas Data')
    expect(accionLegible('arco-email-verified')).toBe('El titular confirmó su correo')
    expect(entidadLegible('arco_requests')).toBe('Solicitud de Habeas Data')
    expect(actorLegible('external')).toBe('El titular de los datos')
    expect(enlaceDeLaEntidad('arco_requests', 'caffd833')).toBe('/panel/inmobiliaria/pagos/cobranza/arco/caffd833')
  })

  it('un id de usuario suelto no se muestra', () => {
    expect(actorLegible('1a000000-0000-4000-8000-000000000001')).toBe('Alguien del equipo')
    expect(actorLegible('admin@demo.co')).toBe('admin@demo.co')
  })
})
