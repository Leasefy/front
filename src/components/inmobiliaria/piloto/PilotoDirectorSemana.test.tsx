/**
 * El informe de la semana a la gerencia (#59, 04-10-2026), con dobles de la API.
 *
 *  1. Las cifras de la semana (solo, con clic, esperan) y el gasto EN PESOS.
 *  2. Las frases del micro, en orden; las de las metas con su marca (va bien /
 *     va peor).
 *  3. Cargando, falló, 404 y `encendido:false`, cada uno a su manera.
 */
import * as React from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

void React
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

vi.mock('@/lib/i18n', () => ({
  useI18n: () => ({
    t: (k: string, vars?: Record<string, string>) => (vars ? `${k}(${Object.values(vars).join(',')})` : k),
    locale: 'es',
  }),
}))

import { PilotoDirectorSemana } from './PilotoDirectorSemana'
import { normalizarSemana, type DirectorSemana } from '@/lib/api/piloto-director'
import type { LecturaDelDirector } from '@/lib/hooks/piloto/use-piloto-director'

const INFORME = normalizarSemana({
  encendido: true,
  desde: '2026-09-29',
  hasta: '2026-10-05',
  piloto: { detectadas: 9, hechasSolas: 4, hechasConClic: 2, esperanClic: 3, fallidas: 0 },
  director: { planes: 5, conLaIa: 4, conReglas: 1, fallidos: 0, ordenes: 12, aprobadas: 6, hechas: 3, descartadas: 1, enBandeja: 2, costoCop: 4200 },
  metas: [
    { metrica: 'dias_de_vacancia', nombre: 'Días de vacancia', vaBien: true, frase: 'Días de vacancia: va mejorando.' },
    { metrica: 'mora_30', nombre: 'Mora', vaBien: false, frase: 'Mora: va peor que su línea base.' },
  ],
  gasto: { mes: '2026-10', gastadoCop: 25704, topeCop: 84000 },
  resumen: ['En los últimos 7 días el Piloto hizo solo 4 cosas.', 'Días de vacancia: va mejorando.', 'Mora: va peor que su línea base.', 'Gasto de IA del mes: $ 25.704 de $ 84.000.'],
})

function lectura(extra: Partial<LecturaDelDirector<DirectorSemana>> = {}): LecturaDelDirector<DirectorSemana> {
  return { data: INFORME, isLoading: false, error: null, notAvailable: false, refetch: vi.fn(async () => {}), ...extra }
}

let container: HTMLDivElement
let root: Root
beforeEach(() => {
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
})
afterEach(() => {
  act(() => root.unmount())
  container.remove()
})
const render = (l: LecturaDelDirector<DirectorSemana>) => act(() => root.render(<PilotoDirectorSemana lectura={l} />))
const q = (testid: string) => container.querySelector(`[data-testid="${testid}"]`)

describe('PilotoDirectorSemana', () => {
  it('🔴 las cifras de la semana y el gasto en PESOS (nunca dólares)', () => {
    render(lectura())
    expect(q('piloto-director-semana-solas')?.textContent).toContain('4')
    expect(q('piloto-director-semana-con-clic')?.textContent).toContain('2')
    expect(q('piloto-director-semana-esperan')?.textContent).toContain('3')
    expect(q('piloto-director-semana-gasto')?.textContent).toMatch(/\$ 25\.704/)
    expect(q('piloto-director-semana-gasto')?.textContent).toMatch(/\$ 84\.000/)
    expect(container.textContent).not.toMatch(/US\$|USD/)
  })

  it('las frases en orden; las de las metas con su marca', () => {
    render(lectura())
    const items = [...(q('piloto-director-semana-resumen')?.querySelectorAll('li') ?? [])]
    expect(items.map((li) => li.textContent)).toEqual(INFORME.resumen)
    expect(items[1].querySelector('[aria-label="inmobiliaria.piloto.director.semana.vaBien"]')).not.toBeNull()
    expect(items[2].querySelector('[aria-label="inmobiliaria.piloto.director.semana.vaMal"]')).not.toBeNull()
    expect(items[0].querySelector('[aria-label]')).toBeNull()
  })

  it('cargando, falló, 404 y apagado se dicen cada uno a su manera', () => {
    render(lectura({ data: null, isLoading: true }))
    expect(q('piloto-director-semana-cargando')).not.toBeNull()
    render(lectura({ data: null, error: new Error('503') }))
    expect(q('fallo-de-carga')).not.toBeNull()
    render(lectura({ data: null, notAvailable: true }))
    expect(container.innerHTML).toBe('')
    render(lectura({ data: { ...INFORME, encendido: false } }))
    expect(q('piloto-director-semana-apagado')?.textContent).toBe('inmobiliaria.piloto.director.apagado')
  })

  it('normalizarSemana: un micro que no manda el informe no rompe (todo vacío)', () => {
    expect(normalizarSemana({})).toEqual({ encendido: false, desde: null, hasta: null, piloto: null, director: null, metas: [], gasto: null, resumen: [] })
  })
})
