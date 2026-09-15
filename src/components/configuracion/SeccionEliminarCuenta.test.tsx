import * as React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

void React
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }))
vi.mock('@/lib/auth', () => ({ useAuth: () => ({ signOut: vi.fn() }) }))
vi.mock('@/lib/i18n', () => ({ useI18n: () => ({ t: (k: string) => k, locale: 'es' }) }))
vi.mock('@/components/ui/toast', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))
vi.mock('@/lib/api/settings.service', () => ({ settingsApi: { deleteAccount: vi.fn() } }))
vi.mock('@/components/settings/SettingsModal', () => ({
  SettingsModal: ({ open, children }: { open: boolean; children: React.ReactNode }) =>
    open ? <div data-testid="modal">{children}</div> : null,
}))

import { SeccionEliminarCuenta } from './SeccionEliminarCuenta'

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

const boton = () => container.querySelector<HTMLButtonElement>('[data-testid="abrir-eliminar-cuenta"]')!

describe('SeccionEliminarCuenta', () => {
  it('con un bloqueo dice por qué y no deja abrir el borrado', async () => {
    await act(async () => root.render(<SeccionEliminarCuenta bloqueo="Tienes 2 arriendo(s) activo(s)." />))
    expect(boton().disabled).toBe(true)
    expect(container.querySelector('[data-testid="bloqueo-eliminar-cuenta"]')?.textContent).toContain('2 arriendo')
  })

  it('sin bloqueo abre la confirmación, que pide escribir ELIMINAR', async () => {
    await act(async () => root.render(<SeccionEliminarCuenta />))
    expect(boton().disabled).toBe(false)
    await act(async () => boton().click())
    const modal = container.querySelector('[data-testid="modal"]')
    expect(modal?.textContent).toContain('ELIMINAR')
    const confirmar = [...modal!.querySelectorAll('button')].find((b) => b.textContent?.includes('Eliminar'))
    expect(confirmar?.disabled).toBe(true)
  })
})
