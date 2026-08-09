/**
 * Tests del DebtorPicker — el control que reemplazó al campo «UUID del deudor».
 *
 * Lo que se protege:
 *   1. la cédula NUNCA viaja en claro: un número se manda hasheado (`HEX:`),
 *   2. un nombre viaja tal cual,
 *   3. menos de 4 dígitos no dispara búsqueda (mismo umbral que Deudores),
 *   4. elegir un deudor entrega su id — que es justamente lo que antes se le
 *      pedía escribir a una persona.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import * as React from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

import { DebtorPicker, type PickedDebtor } from './DebtorPicker'

void React
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true

vi.mock('@/lib/auth', () => ({
  useAuth: () => ({
    agency: { id: 'AGY-TEST' },
    user: null,
    isAuthenticated: true,
    isLoading: false,
  }),
}))

const AGENT_URL = 'http://localhost:4000'

function makePage(names: string[]) {
  return {
    items: names.map((fullName, i) => ({
      id: `D-${i}`,
      fullName,
      currentStage: 'S1' as const,
      daysInStage: 3,
      lastActivityAt: '2026-08-01T00:00:00Z',
      cedulaMasked: '12•••678',
      phoneMasked: '300•••5678',
      emailMasked: null,
      channel: 'voice' as const,
      isPaused: false as const,
      carteraPausedUntil: null,
      attempts: { total: 0, lastAttemptAt: null },
    })),
    nextCursor: null,
    generatedAt: '2026-08-01T00:00:00Z',
  }
}

let root: Root | null = null
let container: HTMLDivElement | null = null

function mount(onChange: (d: PickedDebtor | null) => void) {
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
  act(() => {
    root!.render(<DebtorPicker value={null} onChange={onChange} />)
  })
  return container
}

function typeSearch(el: HTMLDivElement, text: string) {
  const input = el.querySelector('input') as HTMLInputElement
  const setter = Object.getOwnPropertyDescriptor(
    globalThis.HTMLInputElement.prototype,
    'value',
  )!.set!
  act(() => {
    setter.call(input, text)
    input.dispatchEvent(new Event('input', { bubbles: true }))
  })
}

/** Corre el debounce y deja que resuelvan el hash y el fetch. */
async function settle() {
  await act(async () => {
    vi.advanceTimersByTime(300)
  })
  await act(async () => {
    await Promise.resolve()
    await Promise.resolve()
    await Promise.resolve()
    await Promise.resolve()
  })
}

/** Todas las URLs que se pidieron al agente. */
function urlsPedidas(fetchMock: ReturnType<typeof vi.fn>): string[] {
  return fetchMock.mock.calls.map((c) => String(c[0]))
}

beforeEach(() => {
  process.env.NEXT_PUBLIC_AGENT_URL = AGENT_URL
  vi.useFakeTimers()
})

afterEach(() => {
  act(() => root?.unmount())
  container?.remove()
  root = null
  container = null
  vi.useRealTimers()
  vi.restoreAllMocks()
  delete process.env.NEXT_PUBLIC_AGENT_URL
})

describe('DebtorPicker', () => {
  it('manda la cédula HASHEADA, nunca los dígitos en claro', async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => makePage(['Adriana María Vásquez']),
    }))
    vi.stubGlobal('fetch', fetchMock)

    const el = mount(() => {})
    await settle()
    typeSearch(el, '1037896541')
    await settle()

    const urls = urlsPedidas(fetchMock)
    const conBusqueda = urls.filter((u) => u.includes('search='))
    expect(conBusqueda.length).toBeGreaterThan(0)
    // La invariante: los dígitos no aparecen en NINGUNA petición.
    expect(urls.some((u) => u.includes('1037896541'))).toBe(false)
    expect(conBusqueda.some((u) => u.includes('HEX%3A'))).toBe(true)
  })

  it('un nombre viaja tal cual', async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => makePage(['Adriana María Vásquez']),
    }))
    vi.stubGlobal('fetch', fetchMock)

    const el = mount(() => {})
    await settle()
    typeSearch(el, 'Adriana')
    await settle()

    expect(
      urlsPedidas(fetchMock).some((u) => u.includes('search=Adriana')),
    ).toBe(true)
  })

  it('menos de 4 dígitos no dispara búsqueda', async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => makePage([]),
    }))
    vi.stubGlobal('fetch', fetchMock)

    const el = mount(() => {})
    await settle()
    const antes = fetchMock.mock.calls.length
    typeSearch(el, '103')
    await settle()

    expect(fetchMock.mock.calls.length).toBe(antes)
    expect(el.textContent).toContain('al menos 4 dígitos')
  })

  it('elegir un deudor entrega su id — lo que antes se escribía a mano', async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => makePage(['Adriana María Vásquez']),
    }))
    vi.stubGlobal('fetch', fetchMock)

    const elegido: (PickedDebtor | null)[] = []
    const el = mount((d) => elegido.push(d))
    await settle()

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
