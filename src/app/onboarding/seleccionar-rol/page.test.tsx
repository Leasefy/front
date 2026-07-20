/**
 * seleccionar-rol — defense-in-depth: an invited user must NEVER see the
 * personal role picker. A pending invitation token on mount → redirect to
 * /registro (the invite name/phone form + atomic join).
 */
import * as React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

void React

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const { replaceMock, authState } = vi.hoisted(() => ({
  replaceMock: vi.fn(),
  authState: { user: null as Record<string, unknown> | null },
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: replaceMock, push: vi.fn() }),
}))

vi.mock('@/lib/auth/use-auth', () => ({
  useAuth: () => ({ user: authState.user }),
}))

import SeleccionarRolPage from './page'

let container: HTMLDivElement
let root: Root

beforeEach(() => {
  localStorage.clear()
  replaceMock.mockClear()
  authState.user = null
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
})

afterEach(async () => {
  await act(async () => root.unmount())
  container.remove()
})

async function render() {
  await act(async () => {
    root.render(<SeleccionarRolPage />)
  })
}

describe('SeleccionarRolPage — invitation guard', () => {
  it('redirects to /registro when a pending invitation token is present (picker never shown)', async () => {
    localStorage.setItem('pending-invitation-token', 'tok-123')

    await render()

    expect(replaceMock).toHaveBeenCalledWith('/registro')
    // The role picker must not render.
    expect(container.textContent).not.toContain('Inquilino')
    expect(container.textContent).not.toContain('Propietario')
  })

  it('renders the picker normally when there is no pending token', async () => {
    await render()

    expect(replaceMock).not.toHaveBeenCalledWith('/registro')
    expect(container.textContent).toContain('Inquilino')
  })
})
