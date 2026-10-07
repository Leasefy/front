import { describe, expect, it } from 'vitest'

import { errorDelArchivoDelContrato } from './archivo-del-contrato'

const MB = 1024 * 1024

describe('QA-CONT-95 C-09: el archivo del contrato', () => {
  it('un PDF de hasta 10 MB sirve', () => {
    expect(errorDelArchivoDelContrato({ name: 'contrato.pdf', type: 'application/pdf', size: 10 * MB })).toBeNull()
  })

  it('un .docx lo dice con su nombre, en palabras', () => {
    expect(
      errorDelArchivoDelContrato({
        name: 'contrato.docx',
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        size: 30_000,
      }),
    ).toBe('«contrato.docx» no es un PDF. Sube el contrato en PDF (si lo tienes en Word, guárdalo como PDF primero).')
  })

  it('un PDF de 12 MB dice cuánto pesa y el tope, con coma decimal', () => {
    expect(errorDelArchivoDelContrato({ name: 'escaneado.pdf', type: 'application/pdf', size: 12.3 * MB })).toBe(
      '«escaneado.pdf» pesa 12,3 MB y el máximo es 10 MB. Comprímelo o escanéalo con menos resolución.',
    )
  })

  it('un PDF arrastrado sin tipo se reconoce por la extensión', () => {
    expect(errorDelArchivoDelContrato({ name: 'CONTRATO.PDF', type: '', size: 1000 })).toBeNull()
  })
})
