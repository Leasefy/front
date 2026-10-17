/**
 * 🔴 N-09 (QA-PAGOS-95, 05-10-2026): la Auditoría de cobranza pintaba la
 * columna DETALLES en JSON crudo. Ahora son renglones «clave: valor» en
 * palabras, en texto plano (nunca HTML: T-34-07-02), sin la cédula (la pinta
 * `Mask`).
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { claveLegible, detallesLegibles, valorDeLaClave, valorLegible } from './detalles-de-la-auditoria'

describe('N-09 · los detalles de la auditoría se leen', () => {
  it('🔴 claves en palabras, fechas en Bogotá, números con punto de miles, sin comillas ni llaves', () => {
    const d = detallesLegibles({
      origen: 'ai-hub-autonomia',
      corte: '2026-10-04T23:26:21.693Z',
      lotes: 0,
      montoCop: 1500000,
      cedula_masked: 'XXXXXXXX50',
      activo: true,
      canales: ['voz', 'whatsapp'],
    })
    const texto = d.map((x) => `${x.clave}: ${x.valor}`).join('\n')
    expect(texto).not.toMatch(/[{}"]/)
    expect(texto).toContain('Origen: Pantalla de autonomía') // MORI-32: antes el código «ai-hub-autonomia»
    expect(texto).toMatch(/Corte: 4 de octubre de 2026/)
    expect(texto).toContain('Lotes: 0')
    // MORI-26 (QA-AGENTES 16-10): la plata con su «$» y sin el sufijo «cop».
    expect(texto).toContain('Monto: $\u00a01.500.000')
    expect(texto).toContain('Activo: Sí')
    expect(texto).toContain('Canales: voz, whatsapp')
    expect(texto).not.toContain('XXXXXXXX50')
  })

  it('objetos anidados en una línea, vacíos con raya', () => {
    expect(valorLegible({ antes: 'SOMBRA', despues: 'COPILOTO' })).toBe('Antes: SOMBRA · Después: COPILOTO')
    expect(valorLegible(null)).toBe('—')
    expect(valorLegible([])).toBe('—')
    expect(claveLegible('ai_hub_autonomia')).toBe('Ai hub autonomia')
    expect(detallesLegibles(null)).toEqual([])
  })

  it('🔴 la página ya no pinta JSON.stringify de los detalles, y sigue sin HTML crudo', () => {
    const p = readFileSync(join(process.cwd(), 'src/app/panel/inmobiliaria/pagos/cobranza/compliance/audit/page.tsx'), 'utf8')
    expect(p).not.toMatch(/JSON\.stringify\(details/)
    expect(p).toMatch(/detallesLegibles\(details\)/)
    expect(p).not.toMatch(/dangerouslySetInnerHTML/)
  })
})

/**
 * MORI-26 (QA-AGENTES 16-10, lab Portofino): la auditoría decía «Actor role:
 * OWNER», «Gate checks passed: zod, prisma, service», «Debtor id: 6dbe43ba-…»,
 * «After: Autonomy level: sugerir» y «Stage: S3».
 */
describe('MORI-26 · los detalles de cobranza en palabras', () => {
  it('lo interno no se muestra y lo demás va en español', () => {
    const filas = detallesLegibles({
      decision: 'approve',
      debtor_id: '6dbe43ba-5122-4b72-a8e8-430c10d8b895',
      actor_role: 'OWNER',
      proposed_values: { initial_amount_cop: 4_200_000, discount_applied_pct: 0 },
      gate_checks_passed: ['zod', 'prisma', 'service'],
    })
    const texto = filas.map((f) => `${f.clave}: ${f.valor}`).join('\n')
    expect(texto).toBe('Decisión: Aprobar\nLo propuesto: Pago inicial: $ 4.200.000 · Descuento (%): 0')
  })

  it('el modo, la autonomía y la etapa con su nombre', () => {
    const texto = detallesLegibles({
      modo: 'sombra',
      before: { autonomyLevel: 'aprobar' },
      after: { autonomyLevel: 'sugerir' },
      changedFields: ['autonomyLevel'],
      stage: 'S3',
    })
      .map((f) => `${f.clave}: ${f.valor}`)
      .join('\n')
    expect(texto).toContain('Modo: Manual')
    expect(texto).toContain('Antes: Autonomía: Pide aprobación')
    expect(texto).toContain('Después: Autonomía: Sugiere y espera')
    expect(texto).toContain('Qué cambió: Autonomía')
    expect(texto).toContain('Etapa: Mora pre-jurídica')
    expect(texto).not.toMatch(/autonomyLevel|sombra|S3/)
  })

  it('la suscripción y los umbrales', () => {
    const texto = detallesLegibles({ email_enabled: false, actor_role: 'OWNER', new_version: 1, previous_max_version: null })
      .map((f) => `${f.clave}: ${f.valor}`)
      .join('\n')
    expect(texto).toBe('Por correo: No\nVersión nueva: 1\nVersión anterior: —')
  })
})

describe('MORI-32 · los detalles que seguían en inglés', () => {
  it('restaurar umbrales, Habeas Data y la cartera en mora', () => {
    expect(detallesLegibles({ to_version: 1, new_version: 3, from_version: 2 })).toEqual([
      { clave: 'Volvió a la versión', valor: '1' },
      { clave: 'Versión nueva', valor: '3' },
      { clave: 'Versión que se deshizo', valor: '2' },
    ])
    expect(detallesLegibles({ type: 'acceso', status: 'pending_email_verification' })).toEqual([
      { clave: 'Tipo', valor: 'Acceso' },
      { clave: 'Estado', valor: 'Sin confirmar' },
    ])
    expect(valorDeLaClave('motivo', 'dejo_de_estar_en_mora_en_la_plataforma')).toBe(
      'Dejó de estar en mora en la plataforma',
    )
    expect(valorDeLaClave('origen', 'ai-hub-autonomia')).toBe('Pantalla de autonomía')
    expect(claveLegible('payment_provider_skipped')).toBe('Sin pasarela de pago')
    // Un motivo escrito por una persona sigue tal cual.
    expect(valorDeLaClave('motivo', 'QA: reanudar')).toBe('QA: reanudar')
  })
})
