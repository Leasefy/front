/**
 * page.test.tsx — Mi perfil (inquilino): el modal de baja.
 *
 * Era un modal hecho a mano (capa `fixed inset-0`, banda roja, ✕ propia sólo
 * en el paso 2, sin Escape ni foco atrapado). Hoy es el `Dialog` destructivo
 * del DS en tres pasos. Y su lista decía «Se eliminará permanentemente» el
 * historial de pagos, contratos y postulaciones: `DELETE /users/me/account`
 * sólo marca al usuario con `isActive: false` + `deletedAt` (y con un
 * arriendo activo responde 403).
 */

import * as React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

void React // jsx-preserve

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const { useAuthMock, deleteAccountMock, toastError } = vi.hoisted(() => ({
  useAuthMock: vi.fn(),
  deleteAccountMock: vi.fn(),
  toastError: vi.fn(),
}))

vi.mock('@/lib/auth', () => ({ useAuth: () => useAuthMock() }))

vi.mock('@/lib/i18n', () => ({
  useI18n: () => ({ locale: 'es', t: (k: string) => k }),
}))

vi.mock('@/lib/api/settings.service', () => ({
  settingsApi: { uploadAvatar: vi.fn(), deleteAccount: deleteAccountMock },
}))

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: (m: string) => toastError(m) },
}))

vi.mock('./PreferencesSection', () => ({ PreferencesSection: () => null }))

vi.mock('next/image', () => ({
  default: ({ src, alt }: { src: string; alt: string }) => React.createElement('img', { src, alt }),
}))

// ── Import page AFTER mocks ───────────────────────────────────────────────
import PerfilPage from './page'

let container: HTMLDivElement
let root: Root

beforeEach(() => {
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
  useAuthMock.mockReturnValue({
    user: {
      id: 'u-1',
      email: 'laura@example.com',
      firstName: 'Laura',
      lastName: 'Gómez',
      phone: '3001234567',
      emailConfirmedAt: '2026-01-01T00:00:00Z',
    },
    updateProfile: vi.fn(),
    refreshUser: vi.fn(),
    signOut: vi.fn(() => new Promise<void>(() => {})),
  })
  deleteAccountMock.mockReset()
  toastError.mockReset()
})

afterEach(() => {
  act(() => { root.unmount() })
  container.remove()
})

async function renderPage() {
  await act(async () => {
    root.render(React.createElement(PerfilPage))
  })
}

// El modal vive en un portal de Radix en `document.body`.
const dialogo = () => document.body.querySelector<HTMLElement>('[role="dialog"]')
const textoDelModal = () => dialogo()?.textContent ?? ''

function boton(en: ParentNode, texto: string): HTMLButtonElement {
  const b = Array.from(en.querySelectorAll('button')).find((x) => x.textContent?.trim() === texto)
  expect(b, `no encontré el botón «${texto}»`).toBeDefined()
  return b as HTMLButtonElement
}

function escribirLaPalabra(valor: string) {
  const input = dialogo()?.querySelector('input')
  expect(input, 'no encontré el campo de la palabra').toBeTruthy()
  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')!.set!
  act(() => {
    setter.call(input!, valor)
    input!.dispatchEvent(new Event('input', { bubbles: true }))
  })
}

const escape = () =>
  act(() => {
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
  })

async function abrirYPasarAConfirmar() {
  await renderPage()
  act(() => { boton(container, 'settings.account.deleteAccount').click() })
  act(() => { boton(dialogo()!, 'Continuar').click() })
  await vi.waitFor(() => expect(textoDelModal()).toContain('Confirmar eliminación'))
}

describe('Perfil del inquilino — el modal de baja', () => {
  it('es un diálogo con nombre y una sola ✕, la de la primitiva', async () => {
    await renderPage()
    act(() => { boton(container, 'settings.account.deleteAccount').click() })

    const d = dialogo()!
    expect(d).not.toBeNull()
    const titulo = document.getElementById(d.getAttribute('aria-labelledby') ?? '')
    expect(titulo?.textContent).toBe('¿Eliminar tu cuenta?')
    expect(d.querySelectorAll('[aria-label="Cerrar"]')).toHaveLength(1)
  })

  it('no promete borrar lo que el backend no borra: dice qué se pierde y qué no', async () => {
    await renderPage()
    act(() => { boton(container, 'settings.account.deleteAccount').click() })

    const texto = textoDelModal()
    expect(texto).not.toContain('Se eliminará permanentemente')
    expect(texto).toContain('Perderás:')
    expect(texto).toContain('No se elimina:')
    expect(texto).toContain('quedan registrados')
    // El bloqueo real del backend (403 con un arriendo activo).
    expect(texto).toContain('contrato de arriendo activo')
    // La ventana de 30 días de la copia canónica.
    expect(texto).toContain('30 días')
  })

  it('Escape cierra en el aviso', async () => {
    await renderPage()
    act(() => { boton(container, 'settings.account.deleteAccount').click() })
    expect(dialogo()).not.toBeNull()
    escape()
    expect(dialogo()).toBeNull()
  })

  it('el botón rojo sólo se habilita con la palabra exacta', async () => {
    await abrirYPasarAConfirmar()
    expect(boton(dialogo()!, 'Eliminar cuenta').disabled).toBe(true)
    escribirLaPalabra('eliminar')
    expect(boton(dialogo()!, 'Eliminar cuenta').disabled).toBe(false)
  })

  it('mientras borra no se sale; la despedida tampoco se cierra', async () => {
    let terminar: () => void = () => {}
    deleteAccountMock.mockImplementationOnce(
      () => new Promise((r) => { terminar = () => r({ success: true, message: 'ok' }) }),
    )
    await abrirYPasarAConfirmar()
    escribirLaPalabra('ELIMINAR')

    await act(async () => { boton(dialogo()!, 'Eliminar cuenta').click() })
    expect(deleteAccountMock).toHaveBeenCalledTimes(1)
    expect(dialogo()!.querySelector('[aria-label="Cerrar"]')).toBeNull()
    escape()
    expect(dialogo()).not.toBeNull()

    await act(async () => { terminar() })
    await vi.waitFor(() => expect(textoDelModal()).toContain('Cuenta eliminada'))
    expect(dialogo()!.querySelector('[aria-label="Cerrar"]')).toBeNull()
    escape()
    expect(dialogo()).not.toBeNull()
  })

  it('si el backend la bloquea, dice por qué y sigue en el paso de confirmar', async () => {
    deleteAccountMock.mockRejectedValueOnce(
      new Error('No puedes eliminar tu cuenta con contratos de arriendo activos. Primero finaliza tus contratos.'),
    )
    await abrirYPasarAConfirmar()
    escribirLaPalabra('ELIMINAR')

    await act(async () => { boton(dialogo()!, 'Eliminar cuenta').click() })
    expect(toastError).toHaveBeenCalledWith(expect.stringContaining('contratos de arriendo activos'))
    expect(textoDelModal()).toContain('Confirmar eliminación')
    expect(dialogo()!.querySelector('[aria-label="Cerrar"]')).not.toBeNull()
  })
})
