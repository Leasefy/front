import { describe, it, expect } from 'vitest'
import { describirEstadoDeSello } from '../estado-del-sello'
import type { DocumentoFirmado } from '@/lib/types/contract'

function doc(overrides: Partial<DocumentoFirmado>): DocumentoFirmado {
  return {
    version: 1,
    kind: 'CONTRACT_FINAL',
    sealStatus: 'PENDING',
    sealedAt: null,
    createdAt: '2026-09-27T00:00:00.000Z',
    ...overrides,
  }
}

describe('describirEstadoDeSello — contract.md §3.2', () => {
  it('undefined (back anterior a T-0109) → null: se oculta toda la sección', () => {
    expect(describirEstadoDeSello(undefined)).toBeNull()
  })

  it('null (contrato legacy sin fila de versión) → null: se oculta toda la sección', () => {
    expect(describirEstadoDeSello(null)).toBeNull()
  })

  it('CONTRACT_PARTIAL (sealStatus siempre null) → null: un parcial nunca se sella', () => {
    expect(describirEstadoDeSello(doc({ kind: 'CONTRACT_PARTIAL', sealStatus: null }))).toBeNull()
  })

  it('CONTRACT_FINAL SEALED → badge de éxito, sin botón de reintentar', () => {
    const d = describirEstadoDeSello(doc({ sealStatus: 'SEALED', sealedAt: '2026-09-27T01:00:00.000Z' }))
    expect(d).toMatchObject({ etiqueta: 'Sellado', tono: 'success', puedeReintentar: false })
  })

  it('CONTRACT_FINAL PENDING → "Sello en proceso", sin botón de reintentar', () => {
    const d = describirEstadoDeSello(doc({ sealStatus: 'PENDING' }))
    expect(d).toMatchObject({ etiqueta: 'Sello en proceso', tono: 'warning', puedeReintentar: false })
  })

  it('CONTRACT_FINAL FAILED → puede reintentar (B3, gateado por contratos:edit en el caller)', () => {
    const d = describirEstadoDeSello(doc({ sealStatus: 'FAILED' }))
    expect(d).toMatchObject({ etiqueta: 'Sello fallido', tono: 'danger', puedeReintentar: true })
  })

  it('un valor de sealStatus desconocido (enum futuro) se trata como PENDING — nunca revienta', () => {
    const d = describirEstadoDeSello(doc({ sealStatus: 'ALGO_NUEVO' as never }))
    expect(d).toMatchObject({ etiqueta: 'Sello en proceso', tono: 'warning', puedeReintentar: false })
  })
})
