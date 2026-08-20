/**
 * page.test.tsx — /avaluo/estado/[submissionId], la pantalla de espera.
 *
 * Foco (T-0007): el auto-redirect al informe apenas `status` expone un
 * `slug` (predicado frozen en `reporte-href.ts`, `shouldRedirectToReport`).
 * `useAvaluoStatus` y `AvaluoEstadoCard` se mockean: acá sólo se prueba que
 * la página los conecta con `router.replace`.
 */

import * as React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

void React // jsx-preserve

const replaceMock = vi.fn()
const statusHook = {
  statusData: null as { status: string; slug?: string; certId?: string; paid: boolean } | null,
  isLoading: false,
  isError: false,
}

vi.mock('next/navigation', () => ({
  useParams: () => ({ submissionId: 'sub-1' }),
  useSearchParams: () => new URLSearchParams(),
  useRouter: () => ({ replace: replaceMock, push: vi.fn() }),
}))

vi.mock('@/lib/hooks/use-avaluo-status', () => ({
  useAvaluoStatus: () => statusHook,
}))

vi.mock('@/components/avaluo/AvaluoEstadoCard', () => ({
  AvaluoEstadoCard: () => <div data-testid="estado-card" />,
}))

vi.mock('@/lib/api/avaluo.service', () => ({
  readCapToken: vi.fn(() => 'cap-token'),
}))

import AvaluoEstadoPage from './page'
import { readCapToken } from '@/lib/api/avaluo.service'

let container: HTMLDivElement
let root: Root

beforeEach(() => {
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
  replaceMock.mockClear()
  vi.mocked(readCapToken).mockReturnValue('cap-token')
  statusHook.statusData = null
  statusHook.isLoading = false
  statusHook.isError = false
})

afterEach(() => {
  act(() => {
    root.unmount()
  })
  container.remove()
  vi.restoreAllMocks()
})

function render() {
  act(() => {
    root.render(<AvaluoEstadoPage />)
  })
}

describe('/avaluo/estado/[submissionId] — auto-redirect (T-0007)', () => {
  it('slug presente + status !== rechazado + capToken presente ⇒ router.replace al informe', () => {
    statusHook.statusData = { status: 'en_revisión', slug: 'slug-1', paid: false }
    render()
    expect(replaceMock).toHaveBeenCalledWith('/avaluo/reporte/slug-1?token=cap-token')
  })

  it('sin slug todavía ⇒ no redirige', () => {
    statusHook.statusData = { status: 'en_revisión', paid: false }
    render()
    expect(replaceMock).not.toHaveBeenCalled()
  })

  it('rechazado con slug ⇒ NO redirige (reembolsado, no se manda al informe)', () => {
    statusHook.statusData = { status: 'rechazado', slug: 'slug-1', paid: false }
    render()
    expect(replaceMock).not.toHaveBeenCalled()
  })

  it('sin capToken en localStorage ⇒ no redirige', () => {
    vi.mocked(readCapToken).mockReturnValue(null)
    statusHook.statusData = { status: 'en_revisión', slug: 'slug-1', paid: false }
    render()
    expect(replaceMock).not.toHaveBeenCalled()
  })

  it('entregado con slug ⇒ redirige', () => {
    statusHook.statusData = { status: 'entregado', slug: 'slug-1', certId: 'c1', paid: true }
    render()
    expect(replaceMock).toHaveBeenCalledWith('/avaluo/reporte/slug-1?token=cap-token')
  })
})
