/**
 * 🔴 N-09 (QA-PAGOS-95, 05-10-2026): la Auditoría de cobranza pintaba la
 * columna DETALLES en JSON crudo. Ahora son renglones «clave: valor» en
 * palabras, en texto plano (nunca HTML: T-34-07-02), sin la cédula (la pinta
 * `Mask`).
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { claveLegible, detallesLegibles, valorLegible } from './detalles-de-la-auditoria'

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
    expect(texto).toContain('Origen: ai-hub-autonomia')
    expect(texto).toMatch(/Corte: 4 de octubre de 2026/)
    expect(texto).toContain('Lotes: 0')
    expect(texto).toContain('Monto cop: 1.500.000')
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
