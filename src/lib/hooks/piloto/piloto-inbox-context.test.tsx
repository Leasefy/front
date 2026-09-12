import * as React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

void React

/**
 * T-0082 WU-3b: `usePilotoBadge` y `usePilotoInbox` pedían GET
 * /ai-hub/inbox cada 60s cada uno por su cuenta. Montados juntos (sidebar +
 * /panel/inmobiliaria/piloto) eso es DOS requests idénticas al montar y dos
 * cada minuto. Este test prueba el fetcher/timer compartido: dos
 * consumidores del contexto, UNA petición al montar y UNA más por intervalo
 * — case (c) del brief §4.4.
 */

vi.mock('@/lib/auth', () => ({
  useAuth: () => ({
    agency: { id: 'AGY-TEST' },
    user: null,
    isAuthenticated: true,
    isLoading: false,
  }),
}))

import { PilotoInboxProvider, usePilotoInboxCompartido } from './piloto-inbox-context'

const AGENT_URL = 'http://localhost:4000'

function makeOkResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
}

const INBOX_BODY = { items: [], total: 3, porPrioridad: { alta: 1, media: 1, baja: 1 } }

let container: HTMLDivElement
let root: Root

function ConsumerA() {
  const shared = usePilotoInboxCompartido()
  return React.createElement('div', { 'data-testid': 'a-total' }, String(shared.data?.total ?? ''))
}

function ConsumerB() {
  const shared = usePilotoInboxCompartido()
  return React.createElement('div', { 'data-testid': 'b-total' }, String(shared.data?.total ?? ''))
}

beforeEach(() => {
  container = document.createElement('div')
  document.body.appendChild(container)
  vi.stubEnv('NEXT_PUBLIC_AGENT_URL', AGENT_URL)
  vi.useFakeTimers()
})

afterEach(() => {
  vi.runOnlyPendingTimers()
  vi.useRealTimers()
  vi.restoreAllMocks()
  vi.unstubAllEnvs()
  act(() => {
    root?.unmount()
  })
  container.remove()
})

async function mountBoth() {
  const fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation(async () => makeOkResponse(INBOX_BODY))
  await act(async () => {
    root = createRoot(container)
    root.render(
      React.createElement(
        PilotoInboxProvider,
        null,
        React.createElement(ConsumerA),
        React.createElement(ConsumerB),
      ),
    )
    // let the effect's fetch promise resolve
    await Promise.resolve()
    await Promise.resolve()
  })
  return fetchSpy
}

describe('piloto-inbox-context — un fetch, un timer compartido (T-0082 WU-3b)', () => {
  it('dos consumidores montados juntos disparan UNA sola petición al montar', async () => {
    const fetchSpy = await mountBoth()

    expect(fetchSpy).toHaveBeenCalledTimes(1)
    expect(container.querySelector('[data-testid="a-total"]')!.textContent).toBe('3')
    expect(container.querySelector('[data-testid="b-total"]')!.textContent).toBe('3')
  })

  it('un solo timer: pasado el intervalo, UNA petición más (no dos)', async () => {
    const fetchSpy = await mountBoth()
    expect(fetchSpy).toHaveBeenCalledTimes(1)

    await act(async () => {
      vi.advanceTimersByTime(60_000)
      await Promise.resolve()
      await Promise.resolve()
    })

    expect(fetchSpy).toHaveBeenCalledTimes(2)
  })
})
