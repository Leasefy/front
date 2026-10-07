/** MP-05 (QA-MIGRACION-95): «Así quedarían las primera fila» con un solo contrato. */
import { describe, it, expect } from 'vitest'
import { tituloDeLaVistaPrevia } from './titulo-de-la-vista-previa'

describe('MP-05 · el título de la vista previa de contratos', () => {
  it('con una fila, en singular', () => {
    expect(tituloDeLaVistaPrevia(1)).toBe('Así quedaría la primera fila')
  })
  it('con varias, cuántas', () => {
    expect(tituloDeLaVistaPrevia(5)).toBe('Así quedarían las primeras 5 filas')
  })
})
