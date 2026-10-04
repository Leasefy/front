/**
 * Las reglas puras con que el front pinta al director (fase 1).
 */

import { describe, expect, it } from 'vitest'

import {
  fechaDeHoyEnBogota,
  elPlanReemplazaLaLectura,
  horaConArticulo,
  mesLargo,
  humanizarClave,
  nombreDelModelo,
  objetivoDesdeElCampo,
  objetivoEnElCampo,
  ordenarBandeja,
  valorDeMeta,
} from './director'

describe('la Bandeja sigue el orden del director', () => {
  const item = (id: string, desde: string, prioridad?: number) => ({
    id,
    desde,
    ...(prioridad !== undefined ? { director: { prioridad } } : {}),
  })

  it('primero lo del director, de mayor a menor prioridad; después el orden de siempre (quien más espera)', () => {
    const items = [
      item('viejo', '2026-09-01T10:00:00Z'),
      item('dir-40', '2026-09-28T10:00:00Z', 40),
      item('nuevo', '2026-09-27T10:00:00Z'),
      item('dir-80', '2026-09-28T11:00:00Z', 80),
    ]
    expect(ordenarBandeja(items).map((i) => i.id)).toEqual(['dir-80', 'dir-40', 'viejo', 'nuevo'])
  })

  it('un `director: null` cuenta como sin director', () => {
    const items = [
      { id: 'a', desde: '2026-09-02T10:00:00Z', director: null },
      { id: 'b', desde: '2026-09-01T10:00:00Z', director: null },
    ]
    expect(ordenarBandeja(items).map((i) => i.id)).toEqual(['b', 'a'])
  })

  it('no toca la lista que recibe', () => {
    const items = [item('b', '2026-09-02T10:00:00Z'), item('a', '2026-09-01T10:00:00Z')]
    ordenarBandeja(items)
    expect(items.map((i) => i.id)).toEqual(['b', 'a'])
  })
})

describe('valores de una meta', () => {
  it('porcentaje, días y horas, en español de Colombia', () => {
    expect(valorDeMeta(0.84, 'porcentaje')).toMatch(/^84\s?%$/)
    expect(valorDeMeta(0.885, 'porcentaje')).toMatch(/^88,5\s?%$/)
    expect(valorDeMeta(12, 'dias')).toBe('12 días')
    expect(valorDeMeta(1, 'dias')).toBe('1 día')
    expect(valorDeMeta(36.5, 'horas')).toBe('36,5 h')
    expect(valorDeMeta(null, 'horas')).toBe('—')
  })

  it('el campo de «ajustar» se escribe en la unidad que se lee (88 %, no 0,88)', () => {
    expect(objetivoEnElCampo(0.88, 'porcentaje')).toBe('88')
    expect(objetivoEnElCampo(12.5, 'dias')).toBe('12,5')
    expect(objetivoDesdeElCampo('88', 'porcentaje')).toBeCloseTo(0.88)
    expect(objetivoDesdeElCampo('88,5', 'porcentaje')).toBeCloseTo(0.885)
    expect(objetivoDesdeElCampo(' 12.5 ', 'dias')).toBe(12.5)
    expect(objetivoDesdeElCampo('', 'dias')).toBeNull()
    expect(objetivoDesdeElCampo('mucho', 'horas')).toBeNull()
  })
})

describe('lo demás', () => {
  it('el modelo con su nombre de producto, no con su id', () => {
    expect(nombreDelModelo('claude-fable-5-1')).toBe('Claude Fable 5.1')
    expect(nombreDelModelo('claude-opus-5-5')).toBe('Claude Opus 5.5')
    expect(nombreDelModelo('otro-modelo')).toBe('otro-modelo')
    expect(nombreDelModelo(null)).toBeNull()
  })

  it('hoy en Bogotá, no en UTC (a las 9 p. m. de Bogotá ya es mañana en UTC)', () => {
    expect(fechaDeHoyEnBogota(new Date('2026-09-30T02:00:00.000Z'))).toBe('2026-09-29')
    expect(fechaDeHoyEnBogota(new Date('2026-09-29T15:00:00.000Z'))).toBe('2026-09-29')
  })

  it('la hora de Bogotá con su artículo: «las 5:02», pero «la 1:15»', () => {
    expect(horaConArticulo('2026-09-29T10:02:11.000Z')).toMatch(/^las 5:02\s?a/)
    expect(horaConArticulo('2026-09-29T18:15:00.000Z')).toMatch(/^la 1:15\s?p/)
    expect(horaConArticulo(null)).toBeNull()
  })

  it('el mes del gasto, en palabras', () => {
    expect(mesLargo('2026-09')).toBe('septiembre de 2026')
    expect(mesLargo('sep')).toBeNull()
  })

  it('una clave desconocida se lee como palabra, no como código', () => {
    expect(humanizarClave('niti')).toBe('Niti')
    expect(humanizarClave('director.plan_extra')).toBe('Director plan extra')
  })
})

describe('el plan del director reemplaza la lectura del Gerente (ARQUITECTURA §7: una sola voz del día)', () => {
  const HOY = '2026-09-29'
  const base = {
    encendido: true,
    fecha: HOY,
    ciclo: { estado: 'listo' },
    resumen: 'Hoy el foco es el recaudo.',
  }

  it('con un plan de HOY listo (o hecho sin modelo) y con resumen, la lectura vieja se calla', () => {
    expect(elPlanReemplazaLaLectura(base, HOY)).toBe(true)
    expect(elPlanReemplazaLaLectura({ ...base, ciclo: { estado: 'sin_modelo' } }, HOY)).toBe(true)
  })

  it('sin director, apagado, sin plan de hoy, en curso, fallido o sin resumen, la lectura del Gerente sigue', () => {
    expect(elPlanReemplazaLaLectura(null, HOY)).toBe(false)
    expect(elPlanReemplazaLaLectura({ ...base, encendido: false }, HOY)).toBe(false)
    expect(elPlanReemplazaLaLectura({ ...base, fecha: '2026-09-28' }, HOY)).toBe(false)
    expect(elPlanReemplazaLaLectura({ ...base, ciclo: null }, HOY)).toBe(false)
    expect(elPlanReemplazaLaLectura({ ...base, ciclo: { estado: 'en_curso' } }, HOY)).toBe(false)
    expect(elPlanReemplazaLaLectura({ ...base, ciclo: { estado: 'fallido' } }, HOY)).toBe(false)
    expect(elPlanReemplazaLaLectura({ ...base, resumen: '  ' }, HOY)).toBe(false)
  })
})
