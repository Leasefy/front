/**
 * @vitest-environment happy-dom
 *
 * BloqueDeHipotesis — banda + alternativa + discriminador, las tres filas siempre (CLM-03, UI-SPEC §6.4-§6.5).
 */

import * as React from 'react'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/i18n', async () => await import('@/lib/i18n/i18n-test-stub'))

import { IDS_DE_BANDA } from '@/lib/api/naira/contrato'
import { renderizarBanda, type HipotesisDeLaCita } from '@/lib/naira/afirmaciones'

import { BloqueDeHipotesis } from './BloqueDeHipotesis'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const HIPOTESIS: HipotesisDeLaCita = {
  banda: 'probable',
  alternativa: { kind: 'driver', entidad: { kind: 'city', id: 'Ciudad (ejemplo)' } },
  discriminador: { metricId: 'cartera.morosidad_rate', direccionEsperada: 'sube' },
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

function montar(hipotesis: HipotesisDeLaCita): void {
  act(() => {
    root.render(<BloqueDeHipotesis hipotesis={hipotesis} />)
  })
}

const dts = () => [...container.querySelectorAll('dl dt')].map((e) => e.textContent ?? '')
const dds = () => [...container.querySelectorAll('dl dd')].map((e) => e.textContent ?? '')

describe('<BloqueDeHipotesis>', () => {
  it('[N13:control-positivo] las tres filas con la banda renderizada, la entidad y el dato que la confirmaría', () => {
    montar(HIPOTESIS)
    expect(container.querySelectorAll('dl')).toHaveLength(1)
    expect(dts()).toEqual(['Probabilidad', 'Alternativa considerada', 'Qué la confirmaría'])
    expect(dds()[0]).toBe('probable (55-80 %)')
    expect(dds()[1]).toContain('Ciudad (ejemplo)')
    expect(dds()[2]).toBe('Ver que cartera.morosidad_rate sube')
  })

  it('[N13:banda-renderizada] para las 7 bandas la fila de probabilidad es su render exacto, nunca el id', () => {
    expect(IDS_DE_BANDA.length).toBe(7)
    for (const banda of IDS_DE_BANDA) {
      montar({ ...HIPOTESIS, banda })
      const probabilidad = dds()[0] ?? ''
      expect(probabilidad, banda).toBe(renderizarBanda(banda))
      expect(probabilidad, banda).toContain('(')
      expect(probabilidad, banda).toContain('%)')
      if (banda.includes('_')) expect(probabilidad, banda).not.toContain(banda)
    }
  })

  it('[N13:hipotesis-completa] sin alternativa en la descomposición se dice; baja se dice; las tres filas siempre', () => {
    montar({
      banda: 'poco_probable',
      alternativa: { kind: 'sin_driver_alternativo_en_la_descomposicion' },
      discriminador: { metricId: 'portafolio.vacancy_rate', direccionEsperada: 'baja' },
    })
    expect(dts()).toHaveLength(3)
    expect(dds()).toHaveLength(3)
    expect(dds()[1]).toBe('No había otra explicación en los datos descompuestos')
    expect(dds()[2]).toBe('Ver que portafolio.vacancy_rate baja')
  })

  it('[N13:sin-confianza] el bloque nunca dice confianza', () => {
    for (const banda of IDS_DE_BANDA) {
      montar({ ...HIPOTESIS, banda })
      expect((container.textContent ?? '').toLowerCase(), banda).not.toContain('confianza')
    }
  })
})
