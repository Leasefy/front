import { describe, it, expect } from 'vitest'
import {
  NOMBRE_DEL_CANDIDATO_SIN_REGISTRAR,
  esUuid,
  faltaIdentificarAlArrendatario,
  nombreDelCandidato,
} from './arrendatario'

describe('nombreDelCandidato', () => {
  it('prefiere el tenantName si el back lo manda', () => {
    expect(nombreDelCandidato({ tenantName: 'Ana Pérez' })).toBe('Ana Pérez')
  })

  it('arma el nombre con el objeto tenant del detalle, con un solo espacio', () => {
    // GET /landlord/applications/:id devuelve `tenant`, no `tenantName`.
    expect(
      nombreDelCandidato({ tenant: { firstName: ' Ana ', lastName: ' Pérez  Gómez ' } }),
    ).toBe('Ana Pérez Gómez')
  })

  it('con solo el nombre o solo el apellido, usa lo que haya', () => {
    expect(nombreDelCandidato({ tenant: { firstName: 'Ana', lastName: '' } })).toBe('Ana')
    expect(nombreDelCandidato({ tenant: { firstName: '', lastName: 'Pérez' } })).toBe('Pérez')
  })

  it('sin nombre devuelve null: nunca una cadena vacía', () => {
    expect(nombreDelCandidato(null)).toBeNull()
    expect(nombreDelCandidato({})).toBeNull()
    expect(nombreDelCandidato({ tenantName: '  ', tenant: { firstName: '', lastName: '' } })).toBeNull()
  })

  it('la etiqueta de respaldo no está vacía', () => {
    expect(NOMBRE_DEL_CANDIDATO_SIN_REGISTRAR.trim().length).toBeGreaterThan(0)
  })
})

describe('faltaIdentificarAlArrendatario', () => {
  const art3a = {
    codigo: 'ARTICULO_3_INCOMPLETO',
    donde: 'art. 3 literal a',
    mensaje: 'Falta el contenido mínimo del literal a) del artículo 3.º: arrendatarioDocumento.',
    norma: 'Ley 820 de 2003, artículo 3.º',
  }

  it('detecta el literal a) del artículo 3', () => {
    expect(faltaIdentificarAlArrendatario([art3a])).toBe(true)
  })

  it('no confunde otro literal ni otro motivo', () => {
    expect(faltaIdentificarAlArrendatario([{ ...art3a, donde: 'art. 3 literal g' }])).toBe(false)
    expect(faltaIdentificarAlArrendatario([{ ...art3a, codigo: 'DEPOSITO_EN_DINERO' }])).toBe(false)
    expect(faltaIdentificarAlArrendatario([])).toBe(false)
  })
})

describe('esUuid', () => {
  it('acepta un UUID y rechaza las llaves sintéticas de la lista de inquilinos', () => {
    expect(esUuid('3f2b8c1e-5d4a-4b6e-9a7c-1d2e3f4a5b6c')).toBe(true)
    expect(esUuid('3F2B8C1E-5D4A-4B6E-9A7C-1D2E3F4A5B6C')).toBe(true)
    expect(esUuid('doc:79123456')).toBe(false)
    expect(esUuid('correo:ana@correo.co')).toBe(false)
    expect(esUuid('t-1')).toBe(false)
    expect(esUuid('')).toBe(false)
    expect(esUuid(undefined)).toBe(false)
  })
})
