/**
 * QA de la migración (QA-MIG-A, 04-10-2026): la cédula del dueño en los
 * archivos de inmuebles de otras inmobiliarias.
 */
import { describe, it, expect } from 'vitest'

import { autoMapColumns } from './columnMapping'

const campoDe = (encabezados: string[], columna: string) =>
  autoMapColumns(encabezados).find((m) => m.sourceColumn === columna)?.targetField ?? null

describe('MG-17: «Cédula» a secas es el documento del dueño, nunca su teléfono', () => {
  it('en un .xls con «Propietario» y «Cédula»', () => {
    const enc = ['Código', 'Tipo', 'Dirección', 'Ciudad', 'Canon', 'Propietario', 'Cédula']
    expect(campoDe(enc, 'Cédula')).toBe('ownerDocument')
    expect(campoDe(enc, 'Propietario')).toBe('ownerName')
  })

  it.each(['Identificación', 'Documento', 'NIT'])('«%s» también', (col) => {
    expect(campoDe(['Dirección', 'Propietario', col], col)).toBe('ownerDocument')
  })

  it('«Celular» sigue siendo el teléfono', () => {
    expect(campoDe(['Dirección', 'Propietario', 'Cédula', 'Celular'], 'Celular')).toBe('ownerPhone')
  })

  it('«Tipo de documento» no se lleva la cédula', () => {
    expect(campoDe(['Dirección', 'Tipo de documento', 'Cédula'], 'Tipo de documento')).not.toBe('ownerDocument')
  })
})

describe('MG-16: «C.C. propietario» y «Propietario (C.C.)»', () => {
  it('«C.C. propietario» es el documento, no el nombre', () => {
    const enc = ['Dirección', 'Propietario', 'C.C. propietario']
    expect(campoDe(enc, 'C.C. propietario')).toBe('ownerDocument')
    expect(campoDe(enc, 'Propietario')).toBe('ownerName')
  })

  it('«Propietario (C.C.)» es el documento', () => {
    expect(campoDe(['Código', 'Dirección', 'Propietario (C.C.)'], 'Propietario (C.C.)')).toBe('ownerDocument')
  })
})
