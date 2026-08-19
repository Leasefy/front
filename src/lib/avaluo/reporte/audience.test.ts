/**
 * audience.test.ts — el paywall, medido sobre el JSON.
 *
 * El objeto serializado es el gate real: si el titular aparece ahí, aparece en
 * el HTML, en el `__NEXT_DATA__` y en cualquier export. Testear el render no
 * alcanza — el render puede esconder lo que el modelo sigue llevando encima.
 */

import { describe, expect, it } from 'vitest'
import { RESTRICTED_TEXT, toPaidProjection } from './audience'
import { FIXTURE_HEADLINE_COP, FIXTURE_VIEW } from './fixture-muestra'
import type { SectionId } from './report-model'

const HEADLINE_FORMATTED = '519.853.230'
const BAND_LOW_FORMATTED = '467.867.907'

describe('toPaidProjection(view, true)', () => {
  it('deja la vista intacta y con el titular', () => {
    const json = JSON.stringify(toPaidProjection(FIXTURE_VIEW, true))
    expect(json).toContain(String(FIXTURE_HEADLINE_COP))
  })
})

describe('toPaidProjection(view, false)', () => {
  const sinPago = toPaidProjection(FIXTURE_VIEW, false)
  const json = JSON.stringify(sinPago)

  it('no lleva el titular en crudo ni formateado', () => {
    expect(json).not.toContain(String(FIXTURE_HEADLINE_COP))
    expect(json).not.toContain(HEADLINE_FORMATTED)
  })

  it('no lleva los extremos de la banda', () => {
    expect(json).not.toContain('467867907')
    expect(json).not.toContain('571838553')
    expect(json).not.toContain(BAND_LOW_FORMATTED)
  })

  it('no lleva ningún valor observado de los comparables', () => {
    for (const observado of [440640000, 533800000, 490200000, 619200000]) {
      expect(json).not.toContain(String(observado))
    }
  })

  it('conserva posición y título de las secciones bloqueadas', () => {
    const bloqueadas: SectionId[] = ['valor-estimado', 'aspectos-legales', 'anexo-fotografico']

    for (const id of bloqueadas) {
      const node = sinPago.sections[id]
      expect(node.title).toBe(FIXTURE_VIEW.sections[id].title)
      expect(node.state).toBe('degraded')
      expect(node.blocks).toHaveLength(1)
      expect(node.blocks[0]).toMatchObject({
        kind: 'placeholder',
        reason: 'restringido',
        severity: 'restricted',
        text: RESTRICTED_TEXT,
      })
    }

    expect(sinPago.order).toEqual(FIXTURE_VIEW.order)
  })

  it('bloquea también el resumen ejecutivo, que es por donde se filtraba el titular', () => {
    expect(sinPago.sections['resumen-ejecutivo'].state).toBe('degraded')
  })

  it('deja el sello visible pero sin el valor sellado', () => {
    const sello = sinPago.sections['sello-verificacion']
    expect(sello.state).toBe('ok')

    const block = sello.blocks[0]
    expect(block.kind).toBe('seal')
    if (block.kind === 'seal') {
      expect(block.value).toBeNull()
      expect(block.band).toBeNull()
      expect(block.certContentHashCorto).toBe('3f9a41c7d20b')
    }
  })

  it('deja intactas las secciones públicas de prosa, incluido el disclaimer', () => {
    const alcance = sinPago.sections['alcance-limitaciones']
    expect(alcance.state).toBe('ok')
    expect(JSON.stringify(alcance)).toContain('Ley 1673 de 2013')
  })

  it('retira las figuras que dibujan el número y conserva las que no', () => {
    const confianza = sinPago.sections['nivel-confianza']
    expect(confianza.blocks.some((b) => b.kind === 'figure')).toBe(false)

    const exposicion = sinPago.sections['tiempo-exposicion']
    expect(exposicion.blocks.some((b) => b.kind === 'figure')).toBe(true)
  })
})
