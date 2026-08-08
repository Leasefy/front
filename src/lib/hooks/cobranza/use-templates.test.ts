/**
 * Contrato del catálogo de playbooks.
 *
 * Estos tests existen porque los de la pantalla mockeaban el hook con la forma
 * que la UI deseaba, así que pasaban en verde mientras Playbooks reventaba
 * contra el error boundary con una respuesta 200 perfectamente válida.
 *
 * Acá se ejercita la traducción desde lo que el agente manda de verdad.
 */

import { describe, it, expect } from 'vitest'

import {
  normalizeTemplate,
  normalizeTemplates,
  type TemplateApiItem,
} from './use-templates'

function agentItem(over: Partial<TemplateApiItem> = {}): TemplateApiItem {
  return {
    id: 'tpl-1',
    name: 'S1_voice_cordial',
    category: 'stage',
    channel: 'voice',
    stage: 'S1',
    language: 'es',
    tone_variant: 'cordial',
    body: 'texto vivo',
    body_draft: null,
    body_published: null,
    wa_submission_status: null,
    token_count: 42,
    updated_at: '2026-08-08T10:00:00Z',
    ...over,
  }
}

describe('normalizeTemplates', () => {
  it('acepta el array pelado que manda el agente', () => {
    expect(normalizeTemplates([agentItem(), agentItem({ id: 'tpl-2' })])).toHaveLength(2)
  })

  it('devuelve lista vacía —no revienta— si la respuesta no es un array', () => {
    // La regresión original: el hook asumía `{ templates: [...] }`, y la página
    // hacía `.length` sobre el `undefined` resultante.
    for (const bad of [{ templates: [agentItem()] }, null, undefined, 'nope', 7]) {
      expect(normalizeTemplates(bad)).toEqual([])
    }
  })
})

describe('normalizeTemplate — estado deducido', () => {
  it('sin publicar y sin borrador: es borrador y lo vivo es `body`', () => {
    const row = normalizeTemplate(agentItem())
    expect(row.status).toBe('draft')
    expect(row.liveBody).toBe('texto vivo')
    // El editor abre sobre el texto vivo, no en blanco.
    expect(row.editableBody).toBe('texto vivo')
  })

  it('publicado y al día: es publicado', () => {
    const row = normalizeTemplate(
      agentItem({ body_draft: 'igual', body_published: 'igual' }),
    )
    expect(row.status).toBe('published')
    expect(row.liveBody).toBe('igual')
  })

  it('publicado pero con cambios sin publicar: vuelve a borrador', () => {
    const row = normalizeTemplate(
      agentItem({ body_draft: 'nuevo', body_published: 'viejo' }),
    )
    expect(row.status).toBe('draft')
    // La tarjeta sigue mostrando lo que HOY le llega al deudor.
    expect(row.liveBody).toBe('viejo')
    expect(row.editableBody).toBe('nuevo')
  })

  it('publicado sin borrador: sigue publicado', () => {
    const row = normalizeTemplate(agentItem({ body_published: 'vivo' }))
    expect(row.status).toBe('published')
  })
})

describe('normalizeTemplate — campos', () => {
  it('descarta un wa_submission_status que no reconoce', () => {
    // La columna es un string libre en la respuesta; la píldora sólo sabe
    // pintar tres valores.
    expect(normalizeTemplate(agentItem({ wa_submission_status: 'raro' })).waSubmissionStatus)
      .toBeNull()
    expect(
      normalizeTemplate(agentItem({ wa_submission_status: 'approved' })).waSubmissionStatus,
    ).toBe('approved')
  })

  it('traduce snake_case a lo que consume la UI', () => {
    const row = normalizeTemplate(agentItem({ token_count: 1700 }))
    expect(row.tokenCount).toBe(1700)
    expect(row.updatedAt).toBe('2026-08-08T10:00:00Z')
    // `new Date(undefined)` daba «Invalid Date» en la tarjeta.
    expect(Number.isNaN(new Date(row.updatedAt).getTime())).toBe(false)
  })
})
