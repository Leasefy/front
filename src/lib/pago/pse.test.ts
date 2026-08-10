import { describe, it, expect } from 'vitest'
import {
  validarPago,
  estaCompleto,
  documentosDe,
  alCambiarTipoDePersona,
  datosVacios,
  soloDigitos,
  type DatosDePagoPSE,
} from './pse'

const bueno: DatosDePagoPSE = {
  tipoDePersona: 'natural',
  tipoDeDocumento: 'CC',
  numeroDeDocumento: '1020304050',
  titular: 'María Restrepo',
  correo: 'maria@example.com',
  banco: 'BANCOLOMBIA',
}

describe('documentosDe', () => {
  it('a una persona natural no le ofrece NIT', () => {
    // Ofrecerle un documento que el banco va a rechazar es ofrecer un camino
    // que no existe.
    expect(documentosDe('natural').map((d) => d.valor)).toEqual(['CC', 'CE', 'PP'])
  })

  it('a una empresa sólo le ofrece NIT', () => {
    expect(documentosDe('juridica').map((d) => d.valor)).toEqual(['NIT'])
  })

  it('las etiquetas caben en el select sin partirse', () => {
    // «Cédula de ciudadanía» se partía en dos líneas dentro de la columna.
    // El tipo de persona de arriba ya dice cuáles aplican.
    for (const d of [...documentosDe('natural'), ...documentosDe('juridica')]) {
      expect(d.etiqueta.length).toBeLessThanOrEqual(12)
    }
  })

})

describe('alCambiarTipoDePersona', () => {
  it('cambiar a jurídica reajusta el documento y limpia el número', () => {
    // Si no, queda un NIT en pantalla con una cédula adentro.
    const r = alCambiarTipoDePersona(bueno, 'juridica')
    expect(r.tipoDeDocumento).toBe('NIT')
    expect(r.numeroDeDocumento).toBe('')
  })

  it('elegir el mismo tipo no borra lo escrito', () => {
    expect(alCambiarTipoDePersona(bueno, 'natural')).toBe(bueno)
  })
})

describe('validarPago', () => {
  it('con todo bien no se queja', () => {
    expect(validarPago(bueno)).toEqual({})
    expect(estaCompleto(bueno)).toBe(true)
  })

  it('pide el banco', () => {
    expect(validarPago({ ...bueno, banco: '' }).banco).toBeTruthy()
  })

  it('rechaza una cédula con puntos, porque al banco viajan sólo dígitos', () => {
    expect(validarPago({ ...bueno, numeroDeDocumento: '1.020.304.050' }).numeroDeDocumento)
      .toContain('Sólo números')
  })

  it('una cédula de 4 dígitos está incompleta', () => {
    expect(validarPago({ ...bueno, numeroDeDocumento: '1234' }).numeroDeDocumento).toBeTruthy()
  })

  it('el NIT tiene 9 o 10 dígitos, no 6', () => {
    const d = { ...bueno, tipoDePersona: 'juridica' as const, tipoDeDocumento: 'NIT' as const }
    expect(validarPago({ ...d, numeroDeDocumento: '123456' }).numeroDeDocumento).toContain('NIT')
    expect(validarPago({ ...d, numeroDeDocumento: '900123456' }).numeroDeDocumento).toBeUndefined()
  })

  it('el pasaporte es alfanumérico: no le exige sólo dígitos', () => {
    const d = { ...bueno, tipoDeDocumento: 'PP' as const, numeroDeDocumento: 'AP123456' }
    expect(validarPago(d).numeroDeDocumento).toBeUndefined()
  })

  it('pide el correo, que es a donde llega el comprobante', () => {
    expect(validarPago({ ...bueno, correo: '' }).correo).toBeTruthy()
    expect(validarPago({ ...bueno, correo: 'maria@example' }).correo).toBeTruthy()
    expect(validarPago({ ...bueno, correo: 'maria @example.com' }).correo).toBeTruthy()
  })

  it('a una empresa le pide razón social, no «tu nombre»', () => {
    const e = validarPago({ ...bueno, tipoDePersona: 'juridica', titular: '' })
    expect(e.titular).toContain('razón social')
    const e2 = validarPago({ ...bueno, titular: '' })
    expect(e2.titular).toContain('nombre completo')
  })
})

describe('datosVacios', () => {
  it('arranca en el caso de casi todos: persona natural con cédula', () => {
    const d = datosVacios()
    expect(d.tipoDePersona).toBe('natural')
    expect(d.tipoDeDocumento).toBe('CC')
    expect(estaCompleto(d)).toBe(false)
  })
})

describe('soloDigitos', () => {
  it('limpia lo que la gente escribe de verdad', () => {
    expect(soloDigitos('1.020.304.050')).toBe('1020304050')
    expect(soloDigitos('1 020 304 050')).toBe('1020304050')
  })
})
