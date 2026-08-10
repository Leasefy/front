import { describe, it, expect } from 'vitest'
import {
  validarRespaldo,
  comoClausula,
  leerRespaldo,
  TITULO_CLAUSULA,
  type Respaldo,
} from './respaldo'

const base: Respaldo = {
  aseguradora: 'Seguros Bolívar',
  identificador: 'POL-2026-004512',
  tipo: 'seguro',
}

describe('validarRespaldo', () => {
  it('una póliza sin número no sirve para reclamar', () => {
    expect(validarRespaldo({ aseguradora: 'Bolívar' }).identificador).toBeTruthy()
  })

  it('exige nombrar la aseguradora', () => {
    expect(validarRespaldo({ identificador: 'POL-1' }).aseguradora).toBeTruthy()
  })

  it('un identificador de dos caracteres está incompleto', () => {
    expect(validarRespaldo({ aseguradora: 'X', identificador: 'ab' }).identificador).toBeTruthy()
  })

  it('no acepta una vigencia que termina antes de empezar', () => {
    const e = validarRespaldo({ ...base, vigenciaDesde: '2026-06-01', vigenciaHasta: '2026-01-01' })
    expect(e.vigencia).toBeTruthy()
  })

  it('con lo mínimo completo no se queja', () => {
    expect(validarRespaldo(base)).toEqual({})
  })
})

describe('comoClausula / leerRespaldo', () => {
  it('lo que se guarda es lo que se lee de vuelta', () => {
    const completo: Respaldo = {
      ...base,
      tipo: 'fianza',
      vigenciaDesde: '2026-08-01',
      vigenciaHasta: '2027-07-31',
    }
    expect(leerRespaldo([comoClausula(completo)])).toEqual(completo)
  })

  it('un contrato sin respaldo devuelve null, no un objeto vacío', () => {
    // Los contratos anteriores a este campo no están rotos: no lo tienen.
    expect(leerRespaldo(undefined)).toBeNull()
    expect(leerRespaldo([])).toBeNull()
    expect(leerRespaldo([{ title: 'Mascotas', content: 'Se permiten perros.' }])).toBeNull()
  })

  it('lo encuentra entre otras cláusulas', () => {
    const clausulas = [
      { title: 'Mascotas', content: 'Se permiten perros.' },
      comoClausula(base),
      { title: 'Subarriendo', content: 'Prohibido.' },
    ]
    expect(leerRespaldo(clausulas)?.identificador).toBe('POL-2026-004512')
  })

  it('una cláusula a medias no se lee a medias: devuelve null', () => {
    // Media verdad sobre a quién reclamarle es peor que ninguna.
    const rota = { title: TITULO_CLAUSULA, content: '[respaldo-v1]\nAseguradora: Bolívar' }
    expect(leerRespaldo([rota])).toBeNull()
  })

  it('respeta los topes del backend', () => {
    const largo = comoClausula({ ...base, aseguradora: 'A'.repeat(3000) })
    expect(largo.title.length).toBeLessThanOrEqual(100)
    expect(largo.content.length).toBeLessThanOrEqual(2000)
  })

  it('tolera espacios de más al escribir', () => {
    const c = comoClausula({ ...base, aseguradora: '  Sura  ', identificador: ' POL-9 ' })
    const leido = leerRespaldo([c])
    expect(leido?.aseguradora).toBe('Sura')
    expect(leido?.identificador).toBe('POL-9')
  })
})
