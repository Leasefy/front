import * as React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

void React

/**
 * 20-10-2026: la inmobiliaria del registro rápido del marketplace (modo
 * comercial) ve el Piloto en demo y el micro todavía no la conoce: cada
 * pregunta del número del menú y de la bandeja era un 401, cada minuto.
 * En modo comercial no se pregunta; fuera de él, como siempre.
 */

const auth = vi.hoisted(() => ({ agency: { id: 'AGY-TEST', modoComercial: true } as { id: string; modoComercial?: boolean } }))

vi.mock('@/lib/auth', () => ({
  useAuth: () => ({ agency: auth.agency, user: null, isAuthenticated: true, isLoading: false }),
}))

import { usePilotoBadge } from './use-piloto-badge'
import { PilotoInboxProvider, usePilotoInboxCompartido } from './piloto-inbox-context'

let container: HTMLDivElement
let root: Root

function Badge() {
  const { total } = usePilotoBadge()
  return React.createElement('span', null, String(total ?? ''))
}

function Bandeja() {
  const shared = usePilotoInboxCompartido()
  return React.createElement('span', null, String(shared.data?.total ?? ''))
}

beforeEach(() => {
  container = document.createElement('div')
  document.body.appendChild(container)
  vi.stubEnv('NEXT_PUBLIC_AGENT_URL', 'http://localhost:4000')
  vi.useFakeTimers()
})

afterEach(() => {
  act(() => root?.unmount())
  container.remove()
  vi.useRealTimers()
  vi.unstubAllEnvs()
  vi.restoreAllMocks()
})

async function montar() {
  root = createRoot(container)
  await act(async () => {
    root.render(
      React.createElement(PilotoInboxProvider, null, React.createElement(Badge), React.createElement(Bandeja)),
    )
  })
  await act(async () => {
    await vi.advanceTimersByTimeAsync(61_000)
  })
}

describe('el Piloto en modo comercial', () => {
  it('🔴 no le pregunta nada al micro (ni el número del menú ni la bandeja)', async () => {
    auth.agency = { id: 'AGY-TEST', modoComercial: true }
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('{}', { status: 401 }))
    await montar()
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('fuera del modo comercial pregunta como siempre', async () => {
    auth.agency = { id: 'AGY-TEST' }
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockImplementation(async () => new Response(JSON.stringify({ items: [], total: 0 }), { status: 200, headers: { 'Content-Type': 'application/json' } }))
    await montar()
    const urls = fetchSpy.mock.calls.map((c) => String(c[0]))
    expect(urls.some((u) => u.includes('/api/agency/AGY-TEST/ai-hub/inbox/conteo'))).toBe(true)
    expect(urls.some((u) => /\/api\/agency\/AGY-TEST\/ai-hub\/inbox(\?|$)/.test(u))).toBe(true)
  })
})
