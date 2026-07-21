/**
 * ConfigUsuarios — must render without crashing when a member has incomplete
 * data (undefined role/status/name), e.g. an invited member who hasn't
 * onboarded. The role/status color+label helpers must always return valid
 * fallbacks so `roleColor.split(' ')` never throws.
 */
import * as React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

void React

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

vi.mock('@/lib/i18n', () => ({
  useI18n: () => ({ t: (k: string) => k, locale: 'es' }),
}))

// Keep the (closed) invite modal out of the render — not under test.
vi.mock('./AgenteFormModal', () => ({
  AgenteFormModal: () => null,
}))

import { ConfigUsuarios } from './ConfigUsuarios'
import type { AgencyUser } from '@/lib/types/inmobiliaria'

let container: HTMLDivElement
let root: Root

beforeEach(() => {
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
})

afterEach(async () => {
  await act(async () => root.unmount())
  container.remove()
})

async function render(users: AgencyUser[]) {
  await act(async () => {
    root.render(<ConfigUsuarios users={users} />)
  })
}

describe('ConfigUsuarios — incomplete member data', () => {
  it('renders without crashing for a member with undefined role/status/name (fallbacks shown)', async () => {
    const incomplete = {
      id: 'm1',
      email: 'invitado@agencia.com',
      // name / role / status intentionally undefined (invited, not yet onboarded)
    } as unknown as AgencyUser

    await render([incomplete])

    // Did not throw; the row rendered with the email and the '—' fallbacks for
    // the unknown role + status labels.
    expect(container.textContent).toContain('invitado@agencia.com')
    expect(container.textContent).toContain('—')
    // Avatar initials fall back to the email (no name).
    expect(container.querySelector('img')).toBeNull()
  })

  it('renders a well-formed member normally (behavior unchanged)', async () => {
    const complete: AgencyUser = {
      id: 'm2',
      email: 'ana@agencia.com',
      name: 'Ana Pérez',
      role: 'agente',
      status: 'active',
      createdAt: '2026-01-01T00:00:00Z',
    }

    await render([complete])

    expect(container.textContent).toContain('Ana Pérez')
    // Friendly role label from getRoleLabel('agente').
    expect(container.textContent).toContain('Agente')
  })
})
