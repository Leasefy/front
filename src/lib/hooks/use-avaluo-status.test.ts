/**
 * use-avaluo-status.test.ts — el polling del estado del avalúo.
 *
 * Foco (T-0007): `shouldStopPolling` debe parar también cuando se cumple el
 * predicado de auto-redirect (`shouldRedirectToReport`, `reporte-href.ts`) —
 * si no, el hook sigue pollendo detrás de una página que ya navegó. Se
 * prueba como función pura (exportada sólo para tests) más una integración
 * liviana que confirma que el hook realmente consulta el capToken.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import * as React from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'
import { shouldStopPolling, useAvaluoStatus } from './use-avaluo-status'
import type { AvaluoStatusResponse } from '@/lib/types/avaluo'

void React

function statusOf(overrides: Partial<AvaluoStatusResponse> = {}): AvaluoStatusResponse {
  return { status: 'en_revisión', paid: false, ...overrides }
}

describe('shouldStopPolling (T-0007, auto-redirect)', () => {
  it('null ⇒ sigue pollendo (todavía no hay nada)', () => {
    expect(shouldStopPolling(null, null)).toBe(false)
  })

  it('estado terminal (entregado/rechazado) ⇒ para, como antes', () => {
    expect(shouldStopPolling(statusOf({ status: 'entregado' }), null)).toBe(true)
    expect(shouldStopPolling(statusOf({ status: 'rechazado' }), null)).toBe(true)
  })

  it('firmado + certId ⇒ para, como antes (listo para pago)', () => {
    expect(shouldStopPolling(statusOf({ status: 'firmado', certId: 'c1' }), null)).toBe(true)
  })

  it('T-0007: slug presente + status !== rechazado + capToken presente ⇒ para (se va a redirigir)', () => {
    expect(shouldStopPolling(statusOf({ status: 'en_revisión', slug: 's1' }), 'tok')).toBe(true)
  })

  it('T-0007: slug presente pero SIN capToken ⇒ sigue pollendo (nunca va a poder redirigir)', () => {
    expect(shouldStopPolling(statusOf({ status: 'en_revisión', slug: 's1' }), null)).toBe(false)
  })

  it('T-0007: slug ausente ⇒ sigue pollendo (pipeline corriendo, sin cert row todavía)', () => {
    expect(shouldStopPolling(statusOf({ status: 'en_revisión' }), 'tok')).toBe(false)
  })

  it('rechazado con slug y capToken igual para — por el criterio terminal, no por el de redirect', () => {
    expect(shouldStopPolling(statusOf({ status: 'rechazado', slug: 's1' }), 'tok')).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// Integración liviana: el hook consulta el capToken para decidir
// ---------------------------------------------------------------------------

vi.mock('@/lib/api/avaluo.service', () => ({
  getAvaluoStatus: vi.fn(),
  readCapToken: vi.fn(),
}))

import { getAvaluoStatus, readCapToken } from '@/lib/api/avaluo.service'

type HookResult = ReturnType<typeof useAvaluoStatus>

let container: HTMLDivElement
let root: Root
let result: HookResult | undefined

function TestWrapper({ submissionId }: { submissionId: string | null }) {
  result = useAvaluoStatus(submissionId)
  return null
}

beforeEach(() => {
  container = document.createElement('div')
  document.body.appendChild(container)
  result = undefined
  vi.mocked(readCapToken).mockReturnValue('cap-token')
})

afterEach(() => {
  vi.restoreAllMocks()
  root?.unmount()
  container.remove()
})

async function mount(submissionId: string | null) {
  await act(async () => {
    root = createRoot(container)
    root.render(React.createElement(TestWrapper, { submissionId }))
  })
}

describe('useAvaluoStatus — integración', () => {
  it('consulta el capToken del submissionId al decidir si sigue pollendo', async () => {
    vi.mocked(getAvaluoStatus).mockResolvedValue(statusOf({ status: 'en_revisión', slug: 's1' }))
    await mount('sub-1')
    expect(readCapToken).toHaveBeenCalledWith('sub-1')
    expect(result?.statusData?.slug).toBe('s1')
  })
})
