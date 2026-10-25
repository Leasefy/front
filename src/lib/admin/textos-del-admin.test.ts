/**
 * Ronda 26 (23-10-2026, revisora T4): ningún código del back llega crudo ni
 * «convertido en frase» a una pantalla del admin («contact_attempt_tercero» →
 * «Contact attempt tercero» salía en inglés en Auditoría, Salud, Tareas…).
 */
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  accionDelAdmin,
  chequeoDeSalud,
  detalleDelChequeo,
  eventoDeCumplimiento,
  estadoDelProceso,
  nombreDelModelo,
  resumenDeLosDatos,
  sobreQue,
  tareaProgramada,
  tipoDeDecision,
} from './textos-del-admin'

const RAIZ = join(__dirname, '..', '..')

function archivos(dir: string): string[] {
  return readdirSync(dir).flatMap((n) => {
    const p = join(dir, n)
    if (statSync(p).isDirectory()) return archivos(p)
    return /\.tsx?$/.test(n) && !/\.test\.tsx?$/.test(n) ? [p] : []
  })
}

describe('textos del admin', () => {
  it('🔴 guardián: ninguna pantalla del admin convierte códigos a mano (`legible(`)', () => {
    const conRed = [join(RAIZ, 'app', 'admin'), join(RAIZ, 'components', 'admin'), join(RAIZ, 'lib', 'admin')]
      .flatMap(archivos)
      .filter((f) => /\blegible\(/.test(readFileSync(f, 'utf8')))
    expect(conRed).toEqual([])
  })

  it('los códigos que la revisora vio en inglés tienen nombre en español', () => {
    expect(eventoDeCumplimiento('contact_attempt_tercero')).toBe('Intento de contacto a un tercero')
    expect(accionDelAdmin('onboarding_completed')).toBe('Terminó la puesta en marcha')
    expect(accionDelAdmin('cartera.mora_sync.cierre')).toBe('Cerró la revisión de la mora')
    expect(chequeoDeSalud('agent_micro')).toBe('Servicio de los agentes')
    expect(tareaProgramada('cadence_contacts')).toBe('Contactos del día de la cobranza')
    expect(estadoDelProceso('PENDING_RECEIPT')).toBe('Esperando el acuse de recibo')
    expect(estadoDelProceso('failed')).toBe('Falló')
    expect(tipoDeDecision('pagos_cobro_retenido')).toBe('Cobro retenido')
    expect(nombreDelModelo('claude-sonnet-5-5')).toBe('Claude Sonnet 5.5')
    expect(nombreDelModelo('none')).toBe('Sin modelo')
    expect(detalleDelChequeo('205 tables in agent schema (min 30)')).toBe('205 tablas (mínimo 30)')
    expect(detalleDelChequeo('fetch failed')).toBe('No hubo respuesta')
  })

  it('🔴 un código sin nombre dice la palabra de su clase, nunca el código', () => {
    expect(eventoDeCumplimiento('algo_nuevo_del_micro')).toBe('Otro evento')
    expect(accionDelAdmin('cartera.payment_plan.algo_nuevo')).toBe('Movimiento de un acuerdo de pago')
    expect(accionDelAdmin('cosa_rara')).toBe('Otra acción')
    expect(sobreQue('tabla_rara')).toBe('Otro registro')
    expect(detalleDelChequeo('some english detail')).not.toContain('english')
  })

  it('el resumen de los datos no muestra ids, códigos ni claves sin nombre', () => {
    const r = resumenDeLosDatos({ tenantId: 'ed5c1234-aaaa-bbbb', status: 'pending_admin', channel: 'whatsapp', reason: 'pago_total' })
    expect(r).toBe('Canal: WhatsApp')
    expect(resumenDeLosDatos({ tenantId: 'x' })).toBe('')
  })
})
