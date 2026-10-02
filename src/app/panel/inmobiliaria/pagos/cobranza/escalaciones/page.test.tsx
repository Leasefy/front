/**
 * Escalaciones: tomar y asignar ya no fallan en silencio (02-10-2026, tanda 2
 * de errores, A6).
 *
 * Antes la página ignoraba el resultado de `claim` y `assign`: si el micro
 * decía que no (o la red no estaba), la tarjeta volvía a su sitio sin decir
 * nada, y un `fetch` caído dejaba un rechazo sin atrapar. Ahora avisa con el
 * traductor.
 *
 * Convención del repo: createRoot + act, sin RTL.
 */

import * as React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

import { ApiError } from '@/lib/api/client'

void React

const { claimMock, assignMock, toastError } = vi.hoisted(() => ({
  claimMock: vi.fn(),
  assignMock: vi.fn(),
  toastError: vi.fn(),
}))

const ESCALACION = { id: 'esc-1', assignee_user_id: null }

vi.mock('@/lib/hooks/cobranza/use-escalations', () => ({
  useEscalations: () => ({
    data: { open: [ESCALACION], assigned: [], resolved: [], resolvedNextCursor: null, generatedAt: new Date().toISOString() },
    isLoading: false,
    error: null,
    mutate: vi.fn(),
    claim: claimMock,
    assign: assignMock,
    resolve: vi.fn(),
  }),
}))
vi.mock('@/components/inmobiliaria/cobranza/EscalationCard', () => ({
  EscalationCard: ({ escalation, onClaim }: { escalation: { id: string }; onClaim: (id: string) => void }) => (
    <button data-testid={`tomar-${escalation.id}`} onClick={() => onClaim(escalation.id)}>
      Tomar
    </button>
  ),
}))
vi.mock('@/components/inmobiliaria/cobranza/EscalationAssignDropdown', () => ({
  EscalationAssignDropdown: ({ onAssign }: { onAssign: (id: string, email: string) => Promise<void> }) => (
    <button data-testid="asignar" onClick={() => void onAssign('esc-1', 'ana@ejemplo.co')}>
      Asignar
    </button>
  ),
}))
vi.mock('@/components/inmobiliaria/cobranza/EscalationResolveModal', () => ({
  EscalationResolveModal: () => null,
}))
vi.mock('@/components/auth/PageGuard', () => ({
  PageGuard: ({ children }: { children: React.ReactNode }) => children,
}))
vi.mock('@/lib/hooks/use-auto-refresh', () => ({ useAutoRefresh: () => {} }))
vi.mock('@/lib/auth', () => ({ useAuth: () => ({ user: { email: 'yo@ejemplo.co' } }) }))
vi.mock('@/lib/context/PermissionsContext', () => ({
  usePermissionsContext: () => ({ canAccess: () => true }),
}))
vi.mock('@/lib/api/inmobiliaria.service', () => ({
  inmobiliariaConfigApi: { getUsers: () => Promise.resolve([]) },
}))
vi.mock('@/lib/i18n', () => ({
  useI18n: () => ({ t: (k: string) => k, locale: 'es' }),
}))
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() }),
}))
vi.mock('@/components/ui', async () => {
  const real = await vi.importActual<Record<string, unknown>>('@/components/ui')
  return { ...real, toast: { success: vi.fn(), error: toastError } }
})

import EscalacionesPage from './page'

let contenedor: HTMLDivElement
let root: Root

beforeEach(() => {
  claimMock.mockReset()
  assignMock.mockReset()
  toastError.mockReset()
  contenedor = document.createElement('div')
  document.body.appendChild(contenedor)
  root = createRoot(contenedor)
})

afterEach(() => {
  act(() => root.unmount())
  contenedor.remove()
})

async function montar() {
  await act(async () => {
    root.render(<EscalacionesPage />)
  })
}

async function clic(testid: string) {
  await act(async () => {
    contenedor.querySelector<HTMLButtonElement>(`[data-testid="${testid}"]`)!.click()
  })
}

const ultimoAviso = () => String(toastError.mock.calls.at(-1)?.[0] ?? '')

describe('Escalaciones — tomar y asignar avisan cuando no salen', () => {
  it('tomar: un 409 dice el `message` del micro', async () => {
    claimMock.mockResolvedValue({
      ok: false,
      status: 409,
      fallo: new ApiError(409, 'Otra persona ya tomó esta escalación.', 'YA_TOMADA', {
        code: 'YA_TOMADA',
        message: 'Otra persona ya tomó esta escalación.',
      }),
    })
    await montar()
    await clic('tomar-esc-1')
    expect(toastError).toHaveBeenCalledWith('Otra persona ya tomó esta escalación.')
  })

  it('tomar: un 5xx dice «de nuestro lado» con la referencia', async () => {
    claimMock.mockResolvedValue({
      ok: false,
      status: 500,
      fallo: new ApiError(500, '', undefined, { error: 'Internal Server Error', requestId: 'ab12ab12-0000' }),
    })
    await montar()
    await clic('tomar-esc-1')
    expect(ultimoAviso()).toContain('No pudimos tomar la escalación: algo falló de nuestro lado')
    expect(ultimoAviso()).toContain('ab12ab12')
  })

  it('asignar: un `fetch` que no salió (status 0) habla de la conexión', async () => {
    assignMock.mockResolvedValue({ ok: false, status: 0, fallo: new TypeError('Failed to fetch') })
    await montar()
    await clic('asignar')
    expect(ultimoAviso()).toMatch(/conexi[oó]n/i)
  })

  it('cuando sale, no avisa nada', async () => {
    claimMock.mockResolvedValue({ ok: true, status: 200 })
    await montar()
    await clic('tomar-esc-1')
    expect(toastError).not.toHaveBeenCalled()
  })
})
