/**
 * Tests del DebtorPicker — el control que reemplazó al campo «UUID del deudor».
 *
 * Lo que se protege:
 *   1. la cédula NUNCA viaja en claro: un número se manda hasheado (`HEX:`),
 *   2. un nombre viaja tal cual,
 *   3. menos de 4 dígitos no dispara búsqueda (mismo umbral que Deudores),
 *   4. elegir un deudor entrega su id — que es justamente lo que antes se le
 *      pedía escribir a una persona.
 *
 * Se mockea `useDebtorList` y se afirma sobre el FILTRO que recibe, no sobre
 * URLs de fetch. Antes el test salía a la red y fallaba sólo dentro de la suite
 * completa: `NEXT_PUBLIC_AGENT_URL` se inlinea en compilación, así que el valor
 * que dejó otro archivo (`agent.test`) le ganaba a `vi.stubEnv`. Afirmar sobre
 * el filtro es además más preciso: la invariante es qué payload se manda.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import * as React from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

void React
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true

/** Cada llamada a `useDebtorList` deja acá el filtro con el que se la invocó. */
const filtrosVistos: Array<{ search?: string }> = []
let paginas: Array<{ id: string; fullName: string; cedulaMasked: string }> = []

vi.mock('@/lib/hooks/cobranza/use-debtor-list', () => ({
  useDebtorList: (filters: { search?: string }) => {
    filtrosVistos.push(filters)
    return {
      pages: paginas,
      isLoading: false,
      isLoadingMore: false,
      error: null,
      hasMore: false,
      loadMore: async () => {},
      refetch: async () => {},
      generatedAt: null,
    }
  },
}))

import { DebtorPicker, type PickedDebtor } from './DebtorPicker'

let root: Root | null = null
let container: HTMLDivElement | null = null

function montar(onChange: (d: PickedDebtor | null) => void) {
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
  act(() => {
    root!.render(<DebtorPicker value={null} onChange={onChange} />)
  })
  return container
}

function escribir(el: HTMLDivElement, texto: string) {
  const input = el.querySelector('input') as HTMLInputElement
  const setter = Object.getOwnPropertyDescriptor(
    globalThis.HTMLInputElement.prototype,
    'value',
  )!.set!
  act(() => {
    setter.call(input, texto)
    input.dispatchEvent(new Event('input', { bubbles: true }))
  })
}

/** Corre el debounce y deja que resuelva el hash (que es asíncrono). */
async function asentar() {
  await act(async () => {
    vi.advanceTimersByTime(300)
  })
  await act(async () => {
    for (let i = 0; i < 6; i++) await Promise.resolve()
  })
}

/** Todos los `search` distintos de undefined que llegaron al hook. */
function busquedas(): string[] {
  return filtrosVistos
    .map((f) => f.search)
    .filter((s): s is string => s !== undefined)
}

beforeEach(() => {
  filtrosVistos.length = 0
  paginas = [
    { id: 'D-0', fullName: 'Adriana María Vásquez', cedulaMasked: '12•••678' },
  ]
  vi.useFakeTimers()
})

afterEach(() => {
  act(() => root?.unmount())
  container?.remove()
  root = null
  container = null
  vi.useRealTimers()
  vi.restoreAllMocks()
})

describe('DebtorPicker', () => {
  it('manda la cédula HASHEADA, nunca los dígitos en claro', async () => {
    const el = montar(() => {})
    escribir(el, '1037896541')
    await asentar()

    const enviadas = busquedas()
    expect(enviadas.length).toBeGreaterThan(0)
    // La invariante: los dígitos no aparecen en NINGÚN payload.
    expect(enviadas.some((s) => s.includes('1037896541'))).toBe(false)
    expect(enviadas.some((s) => s.startsWith('HEX:'))).toBe(true)
  })

  it('un nombre viaja tal cual', async () => {
    const el = montar(() => {})
    escribir(el, 'Adriana')
    await asentar()

    expect(busquedas()).toContain('Adriana')
  })

  it('menos de 4 dígitos no dispara búsqueda', async () => {
    const el = montar(() => {})
    escribir(el, '103')
    await asentar()

    expect(busquedas()).toHaveLength(0)
    expect(el.textContent).toContain('al menos 4 dígitos')
  })

  it('elegir un deudor entrega su id — lo que antes se escribía a mano', async () => {
    const elegido: (PickedDebtor | null)[] = []
    const el = montar((d) => elegido.push(d))
    await asentar()

    const opcion = el.querySelector('ul button') as HTMLButtonElement
    expect(opcion).not.toBeNull()
    expect(opcion.textContent).toContain('Adriana María Vásquez')
    act(() => {
      opcion.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })

    expect(elegido).toHaveLength(1)
    expect(elegido[0]).toEqual({
      id: 'D-0',
      fullName: 'Adriana María Vásquez',
      cedulaMasked: '12•••678',
    })
  })
})
