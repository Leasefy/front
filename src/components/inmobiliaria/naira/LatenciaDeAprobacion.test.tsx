/**
 * @vitest-environment happy-dom
 *
 * LatenciaDeAprobacion — #32: lo que ve el dueño. La mediana con cuántas decisiones la sostienen; sin número cuando hay
 * muy pocas, cuando se decidió sin abrir o con un solo aprobador posible (B-5); la semana por su lunes; nunca una persona.
 */

import * as React from 'react'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/i18n', async () => await import('@/lib/i18n/i18n-test-stub'))

import { LatenciaDeAprobacion, duracionLegible, lunesDeLaSemana } from './LatenciaDeAprobacion'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

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

describe('#32 — la latencia de aprobación que ve el dueño', () => {
  it('[LAT-F:formatos] duraciones legibles y el lunes de la semana ISO', () => {
    expect(duracionLegible(2750)).toBe('3 s')
    expect(duracionLegible(165_000)).toBe('2 min 45 s')
    expect(duracionLegible(120_000)).toBe('2 min')
    expect(duracionLegible(3_900_000)).toBe('1 h 5 min')
    expect(lunesDeLaSemana('2026-W41', 'en')).toBe('Oct 5')
    expect(lunesDeLaSemana('2026-W01', 'en')).toBe('Dec 29')
    expect(lunesDeLaSemana('41', 'es')).toBeNull()
  })

  it('[LAT-F:filas] mediana con su n; pocas, sin abrir y un aprobador sin número', async () => {
    await act(async () => {
      root.render(
        <LatenciaDeAprobacion
          latencia={{
            semanaReciente: '2026-W41',
            semanaPrevia: '2026-W40',
            porTipo: [
              { tipo: 'crear_tarea', semanaIso: '2026-W41', reporte: { kind: 'medida', n: 12, medianaMs: 165_000, p10Ms: 4_000 } },
              { tipo: 'crear_tarea', semanaIso: '2026-W40', reporte: { kind: 'no_medible', razon: 'n_bajo_minimo' } },
              { tipo: 'aviso_interno', semanaIso: '2026-W41', reporte: { kind: 'no_medible', razon: 'sin_presentacion' } },
              { tipo: 'aviso_al_propietario', semanaIso: '2026-W41', reporte: { kind: 'no_reportable_a_la_agencia', razon: 'un_aprobador' } },
            ],
          }}
        />,
      )
    })
    const texto = container.textContent ?? ''
    expect(texto).toContain('Cuánto tarda el equipo en decidir')
    expect(texto).toContain('Mediana: 2 min 45 s (12 decisiones)')
    expect(texto).toContain('Muy pocas decisiones para medir')
    expect(texto).toContain('Se decidió sin abrir el detalle')
    expect(texto).toContain('No se muestra: una sola persona puede aprobar este tipo')
    expect(container.querySelectorAll('li')).toHaveLength(4)
  })

  it('[LAT-F:vacia] sin decisiones en la ventana, lo dice', async () => {
    await act(async () => {
      root.render(<LatenciaDeAprobacion latencia={{ semanaReciente: '2026-W41', semanaPrevia: '2026-W40', porTipo: [] }} />)
    })
    expect(container.textContent).toContain('Todavía no hay decisiones en estas dos semanas.')
  })
})
