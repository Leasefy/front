/**
 * @vitest-environment happy-dom
 *
 * OracionesCausales — una oración causal sin su clase (o una hipótesis sin su banda) no se muestra, y se declara UNA vez
 * (D13-10, FG13-11, C5). Con E13-3 (D13-23) la cita de la señal trae su clase y se ve con su chip.
 */

import * as React from 'react'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/i18n', async () => await import('@/lib/i18n/i18n-test-stub'))
vi.mock('@/components/ui/popover', () => ({
  Popover: ({ children }: { children?: React.ReactNode }) => <span>{children}</span>,
  PopoverTrigger: ({ children }: { children?: React.ReactNode }) => <span>{children}</span>,
  PopoverContent: ({ children }: { children?: React.ReactNode }) => <span data-testid="popover">{children}</span>,
}))

import { EJEMPLOS_DE_NAIRA } from '@/lib/data/mock-naira'
import type { OracionCausal } from '@/lib/naira/afirmaciones'

import { OracionesCausales } from './OracionesCausales'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const HIPOTESIS = {
  banda: 'probable',
  alternativa: { kind: 'sin_driver_alternativo_en_la_descomposicion' },
  discriminador: { metricId: 'cartera.morosidad_rate', direccionEsperada: 'sube' },
} as const satisfies NonNullable<OracionCausal['hipotesis']>

const DECLARACION = 'Hay una explicación investigada'

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

function montar(oraciones: readonly OracionCausal[]): void {
  act(() => {
    root.render(<OracionesCausales oraciones={oraciones} />)
  })
}

const visibles = () => container.querySelectorAll('p[data-claim-class]')
const declaraciones = () => container.querySelectorAll('[data-naira-causa-oculta]')

/** La cita de ejemplo de la señal (13-01, D13-23), con su control: causa citada y citasConClase del mismo largo. */
function causaDeEjemplo(): { citas: string[]; citasConClase: OracionCausal[] } {
  const causa = EJEMPLOS_DE_NAIRA['senal.detalle'].causa
  expect(causa.kind).toBe('citada')
  if (causa.kind !== 'citada') throw new Error('el ejemplo de la señal ya no trae una causa citada')
  expect(causa.citasConClase).toBeDefined()
  expect(causa.citasConClase?.length).toBe(causa.citas.length)
  return { citas: causa.citas, citasConClase: causa.citasConClase ?? [] }
}

describe('<OracionesCausales>', () => {
  it('[N13:control-positivo] tres oraciones con su clase se ven con su chip y la hipótesis con su bloque', () => {
    montar([
      { texto: 'La morosidad es la suma de los vencidos (ejemplo).', claimClass: 'aritmetica', hipotesis: null },
      { texto: 'La morosidad y el recaudo se mueven juntos (ejemplo).', claimClass: 'asociacion', hipotesis: null },
      { texto: 'Los contratos nuevos explicarían la subida (ejemplo).', claimClass: 'hipotesis', hipotesis: HIPOTESIS },
    ])
    expect(visibles()).toHaveLength(3)
    expect(container.textContent).toContain('La morosidad es la suma de los vencidos (ejemplo).')
    expect(container.textContent).toContain('Los contratos nuevos explicarían la subida (ejemplo).')
    expect(container.querySelectorAll('dl')).toHaveLength(1)
    expect(declaraciones()).toHaveLength(0)
  })

  it('[N13:claimclass-del-contrato] la clase sale del campo: sin clase no se ve; con clase aritmética dice ARITMÉTICA', () => {
    montar([{ texto: 'Subió probablemente porque bajó el recaudo (ejemplo)', claimClass: null, hipotesis: null }])
    expect(container.textContent).not.toContain('Subió probablemente porque bajó el recaudo (ejemplo)')
    expect(container.querySelector('[data-claim-class]')).toBeNull()
    expect(declaraciones()).toHaveLength(1)
    expect(declaraciones()[0]?.textContent).toContain(DECLARACION)

    montar([{ texto: 'La morosidad subió porque bajó el recaudo (ejemplo)', claimClass: 'aritmetica', hipotesis: null }])
    expect(visibles()).toHaveLength(1)
    const chip = container.querySelector('button[data-claim-class]')
    expect(chip?.textContent).toBe('ARITMÉTICA')
    expect(container.textContent).not.toContain('HIPÓTESIS')

    montar([{ texto: 'Una hipótesis sin su banda (ejemplo)', claimClass: 'hipotesis', hipotesis: null }])
    expect(container.textContent).not.toContain('Una hipótesis sin su banda (ejemplo)')
    expect(container.querySelector('[data-claim-class]')).toBeNull()
    expect(declaraciones()).toHaveLength(1)
  })

  it('[N13:causa-oculta-una-vez] tres ocultas y una visible dejan UNA declaración y UNA oración', () => {
    montar([
      { texto: 'Oculta uno (ejemplo)', claimClass: null, hipotesis: null },
      { texto: 'Visible (ejemplo)', claimClass: 'asociacion', hipotesis: null },
      { texto: 'Oculta dos (ejemplo)', claimClass: 'hipotesis', hipotesis: null },
      { texto: 'Oculta tres (ejemplo)', claimClass: null, hipotesis: null },
    ])
    expect(declaraciones()).toHaveLength(1)
    expect(visibles()).toHaveLength(1)
    expect(container.textContent).toContain('Visible (ejemplo)')
    expect(container.textContent).not.toContain('Oculta')
  })

  it('[N13:citas-con-clase] las citasConClase del ejemplo de la señal, tal cual, se ven con su chip y su bloque', () => {
    const { citasConClase } = causaDeEjemplo()
    montar(citasConClase)
    const conClase = citasConClase.filter((c) => c.claimClass !== null && (c.claimClass !== 'hipotesis' || c.hipotesis !== null))
    expect(conClase.length).toBeGreaterThan(0)
    expect(visibles()).toHaveLength(conClase.length)
    for (const c of conClase) {
      const p = [...visibles()].find((e) => e.textContent?.startsWith(c.texto))
      expect(p, c.texto).toBeDefined()
      expect(p?.getAttribute('data-claim-class')).toBe(c.claimClass)
      expect(p?.querySelector('button[data-claim-class]')).not.toBeNull()
    }
    expect(container.querySelectorAll('dl')).toHaveLength(conClase.filter((c) => c.claimClass === 'hipotesis').length)

    // Una cita sin clase junto a las del ejemplo no se ve y se declara.
    montar([...citasConClase, { texto: 'Cita sin clase (ejemplo)', claimClass: null, hipotesis: null }])
    expect(container.textContent).not.toContain('Cita sin clase (ejemplo)')
    expect(visibles()).toHaveLength(conClase.length)
    expect(declaraciones()).toHaveLength(1)
  })

  it('[N13:todo-oculto-hoy] sin E13-3 (solo citas) todo se oculta con una declaración; sin oraciones no se pinta nada', () => {
    const { citas } = causaDeEjemplo()
    expect(citas.length).toBeGreaterThan(0)
    montar(citas.map((texto) => ({ texto, claimClass: null, hipotesis: null })))
    for (const texto of citas) expect(container.textContent).not.toContain(texto)
    expect(declaraciones()).toHaveLength(1)
    expect(visibles()).toHaveLength(0)

    montar([])
    expect(container.innerHTML).toBe('')
  })
})
