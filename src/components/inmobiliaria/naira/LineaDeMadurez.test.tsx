/**
 * @vitest-environment happy-dom
 *
 * LineaDeMadurez — el warm-up dice CUÁNDO (con la fecha escrita como día) o QUÉ falta (el remedio del servidor, tal
 * cual), y nunca la frase infalsificable de NOT-05 (13-03, Tarea 2). Marcador [N13:*] en el TÍTULO.
 */

import * as React from 'react'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/i18n', async () => await import('@/lib/i18n/i18n-test-stub'))

import { formatearDia, type LineaDeMadurezVisible } from '@/lib/naira/briefing-y-senal'

import { LineaDeMadurez } from './LineaDeMadurez'

void React
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const CON_FECHA: LineaDeMadurezVisible = {
  metricId: 'portafolio.vacancy_rate',
  asOf: '2026-10-05T11:00:00.000Z',
  fuente: 'public.consignaciones',
  madurez: { kind: 'fecha_estimada', dia: '2026-10-12' },
}
const REMEDIO = 'la métrica no se está ingiriendo (ejemplo)'
const SIN_FECHA: LineaDeMadurezVisible = {
  metricId: 'prospectos.leads_sin_contacto_count',
  asOf: '2026-10-05T11:00:00.000Z',
  fuente: 'agent.prospect_leads',
  madurez: { kind: 'sin_fecha', remedio: REMEDIO },
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

function montar(linea: LineaDeMadurezVisible): string {
  act(() => {
    root.render(<LineaDeMadurez linea={linea} />)
  })
  return container.textContent ?? ''
}

describe('LineaDeMadurez', () => {
  it('[N13:control-positivo] una métrica con fecha estimada dice la métrica y la fecha', () => {
    montar(CON_FECHA)
    const p = container.querySelector('[data-naira-madurez="fecha_estimada"]')
    expect(p).not.toBeNull()
    expect(p!.textContent).toContain('portafolio.vacancy_rate')
    expect(p!.textContent).toContain(formatearDia('2026-10-12'))
  })

  it('[N13:madurez-con-fecha] la fecha se escribe como día, no como YYYY-MM-DD', () => {
    const texto = montar(CON_FECHA)
    expect(texto).toContain(formatearDia('2026-10-12'))
    expect(texto).not.toContain('2026-10-12')
  })

  it('[N13:madurez-sin-fecha] sin fecha, el remedio del servidor tal cual', () => {
    montar(SIN_FECHA)
    const p = container.querySelector('[data-naira-madurez="sin_fecha"]')
    expect(p).not.toBeNull()
    expect(p!.textContent).toContain(REMEDIO)
    expect(p!.textContent).toContain('prospectos.leads_sin_contacto_count')
  })

  it('[N13:madurez-sin-frase-infalsificable] ninguna línea dice la frase de NOT-05', () => {
    const frase = ['todavía estoy', 'aprendiendo'].join(' ')
    for (const linea of [CON_FECHA, SIN_FECHA]) {
      const texto = montar(linea).toLowerCase()
      expect(texto).not.toContain(frase)
      expect(texto).not.toContain('aprendiendo')
    }
  })
})
