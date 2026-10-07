import { describe, it, expect } from 'vitest'
import { motivoCorto, rutaDelMandante, estadoDeLaFila, frenaPorElDocumentoDelMandante } from './por-facturar'

// 🔴 QA-FACT-CONTA-95 · B-08: «CC» con forma de NIT frena la factura por mandato.
describe('QA-FACT-CONTA-95 · B-08 · tipo de documento por revisar', () => {
  it('lo dice corto (no «falta»: el tipo está, pero parece equivocado) y lleva a la ficha', () => {
    const f = {
      emitible: false,
      estado: 'POR_EMITIR',
      codigoNoEmitible: 'MANDANTE_TIPO_DE_DOCUMENTO_POR_REVISAR',
      mandato: { porMandato: true, mandanteId: 'p-9', mandanteNombre: 'X S.A.S.' },
    } as never
    expect(estadoDeLaFila(f)).toBe('todavia-no')
    expect(motivoCorto(f)).toBe('Revisa el tipo de documento del propietario')
    expect(rutaDelMandante(f)).toBe('/panel/inmobiliaria/propietarios/p-9')
  })

  it('🔴 sin ningún documento: «Falta el documento del propietario», el mismo enlace', () => {
    const f = {
      emitible: false,
      estado: 'POR_EMITIR',
      codigoNoEmitible: 'MANDANTE_SIN_DOCUMENTO',
      mandato: { porMandato: true, mandanteId: 'p-7', mandanteNombre: 'Sin Doc' },
    } as never
    expect(motivoCorto(f)).toBe('Falta el documento del propietario')
    expect(rutaDelMandante(f)).toBe('/panel/inmobiliaria/propietarios/p-7')
    expect(frenaPorElDocumentoDelMandante('MANDANTE_SIN_DOCUMENTO')).toBe(true)
    expect(frenaPorElDocumentoDelMandante('MANDANTE_SIN_TIPO_DE_DOCUMENTO')).toBe(true)
    expect(frenaPorElDocumentoDelMandante('MANDANTE_TIPO_DE_DOCUMENTO_POR_REVISAR')).toBe(true)
    expect(frenaPorElDocumentoDelMandante('GIRO_SIN_PAGAR')).toBe(false)
  })
})
