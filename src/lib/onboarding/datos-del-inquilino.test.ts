import { describe, it, expect } from 'vitest'
import {
  TIPOS_DE_DOCUMENTO_DEL_INQUILINO,
  datosDelInquilinoCompletos,
  documentoYCelularParaElBack,
  revisarDatosDelInquilino,
} from './datos-del-inquilino'

const COMPLETO = { displayName: 'Luciano Huck', documentType: 'CC', rut: '2346789012', phone: '3001234567' }

describe('datos del inquilino', () => {
  it('nombre, documento y celular son obligatorios', () => {
    expect(datosDelInquilinoCompletos(COMPLETO)).toBe(true)
    expect(revisarDatosDelInquilino({ displayName: 'Luciano' })).toEqual({
      documento: 'Escribe tu número de documento.',
      telefono: 'Ingresa tu celular.',
    })
  })

  it('el celular de la captura («!@#$. %^&*») no pasa', () => {
    expect(revisarDatosDelInquilino({ ...COMPLETO, phone: '!@#$.   %^&*' }).telefono).toBe('Ingresa tu celular.')
  })

  it('cada tipo con su regla: la cédula sólo números, el pasaporte letras y números', () => {
    expect(revisarDatosDelInquilino({ ...COMPLETO, rut: '12.345.678' }).documento).toBeUndefined()
    expect(revisarDatosDelInquilino({ ...COMPLETO, rut: 'AB123' }).documento).toMatch(/sólo números/)
    expect(revisarDatosDelInquilino({ ...COMPLETO, documentType: 'PASSPORT', rut: 'AB123456' }).documento).toBeUndefined()
  })

  it('sólo tipos de una persona que arrienda: sin NIT ni tarjeta de identidad', () => {
    const tipos = TIPOS_DE_DOCUMENTO_DEL_INQUILINO.map((t) => t.value)
    expect(tipos).toEqual(['CC', 'CE', 'PPT', 'PASSPORT'])
  })

  it('al back: el número limpio con su tipo y el celular en E.164', () => {
    expect(documentoYCelularParaElBack({ ...COMPLETO, rut: '2.346.789.012', phone: '300 123 4567' })).toEqual({
      rut: '2346789012',
      documentType: 'CC',
      phone: '+573001234567',
    })
  })

  it('con el documento bloqueado no se revisa su formato ni se manda un tipo que nadie eligió', () => {
    const datos = { displayName: 'Ana', rut: '1.090.525.663-X', phone: '3001234567' }
    expect(datosDelInquilinoCompletos(datos, { documentoBloqueado: true })).toBe(true)
    expect(documentoYCelularParaElBack(datos, { documentoBloqueado: true })).toEqual({
      rut: '1.090.525.663-X',
      phone: '+573001234567',
    })
  })
})
