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

// 10-10-2026: las fechas son campos de Cadence (se eligen, no se escriben); en la
// prueba, un <input> con el mismo id y data-testid (`campos-de-fecha.doble-de-prueba`).
vi.mock('@/components/contabilidad/CampoDeDia', () => import('@/components/ui/campos-de-fecha.doble-de-prueba'))
vi.mock('@/components/ui/campo-de-nacimiento', () => import('@/components/ui/campos-de-fecha.doble-de-prueba'))
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

/**
 * 02-10-2026 · Sistema de errores. Antes, un fallo al guardar pintaba
 * `err.message` crudo en un toast (un 5xx, un texto en inglés). Ahora: lo que
 * el back rechaza por campo va debajo de SU campo y con el foco; al toast,
 * sólo lo suelto, con la regla de oro (5xx = nuestro, con la referencia;
 * «conexión», sólo sin respuesta).
 */
describe('Perfil del inquilino — guardar los datos', () => {
  const updateProfileMock = vi.fn()

  function errorDelBack(status: number, cuerpo: Record<string, unknown>) {
    const mensaje = Array.isArray(cuerpo.message) ? cuerpo.message.join(' · ') : String(cuerpo.message ?? '')
    return Object.assign(new Error(mensaje), {
      name: 'ApiError',
      status,
      code: cuerpo.code,
      messages: Array.isArray(cuerpo.message) ? cuerpo.message : undefined,
      detalle: cuerpo,
    })
  }

  function escribir(input: HTMLInputElement, valor: string) {
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')!.set!
    act(() => {
      setter.call(input, valor)
      input.dispatchEvent(new Event('input', { bubbles: true }))
    })
  }

  const campo = (id: string) => container.querySelector<HTMLInputElement>(`#${id}`)!

  beforeEach(() => {
    updateProfileMock.mockReset()
    useAuthMock.mockReturnValue({
      user: {
        id: 'u-1',
        email: 'laura@example.com',
        firstName: 'Laura',
        lastName: 'Gómez',
        phone: '3001234567',
        emailConfirmedAt: '2026-01-01T00:00:00Z',
      },
      updateProfile: updateProfileMock,
      refreshUser: vi.fn(),
      signOut: vi.fn(),
    })
  })

  async function editarYGuardar(cambio: () => void) {
    await renderPage()
    act(() => { boton(container, 'Editar').click() })
    cambio()
    await act(async () => { boton(container, 'common.save').click() })
  }

  it('🔴 un 400 con `campos` pinta el error debajo del celular y le da el foco, sin toast', async () => {
    const FRASE = 'Revisa el teléfono: no es un número de teléfono válido.'
    updateProfileMock.mockRejectedValue(
      errorDelBack(400, {
        code: 'DATOS_INVALIDOS',
        message: [FRASE],
        campos: [{ campo: 'phone', regla: 'telefono', mensaje: FRASE }],
      }),
    )
    // Un celular bien escrito que el back igual rechaza: el cliente lo deja salir.
    await editarYGuardar(() => escribir(campo('perfil-inquilino-phone'), '3109998877'))

    expect(container.querySelector('#perfil-inquilino-phone-error')?.textContent).toBe(FRASE)
    expect(campo('perfil-inquilino-phone').getAttribute('aria-invalid')).toBe('true')
    expect(document.activeElement).toBe(campo('perfil-inquilino-phone'))
    expect(toastError).not.toHaveBeenCalled()
  })

  it('🔴 un celular incompleto no sale: «El celular en Colombia tiene 10 dígitos.», en su campo y sin PATCH', async () => {
    await editarYGuardar(() => escribir(campo('perfil-inquilino-phone'), '300123'))
    expect(updateProfileMock).not.toHaveBeenCalled()
    expect(container.querySelector('#perfil-inquilino-phone-error')?.textContent).toBe(
      'El celular en Colombia tiene 10 dígitos.',
    )
    expect(campo('perfil-inquilino-phone').getAttribute('aria-invalid')).toBe('true')
    expect(document.activeElement).toBe(campo('perfil-inquilino-phone'))
    expect(toastError).not.toHaveBeenCalled()
  })

  it('🔴 una fecha de nacimiento futura no sale: la frase del back, sin PATCH', async () => {
    await editarYGuardar(() => escribir(campo('perfil-inquilino-birthDate'), '2999-01-01'))
    expect(updateProfileMock).not.toHaveBeenCalled()
    expect(container.querySelector('#perfil-inquilino-birthDate-error')?.textContent).toBe(
      'La fecha de nacimiento debe estar entre 1900 y hoy.',
    )
  })

  it('🔴 un 5xx dice que fue nuestro, con la referencia, y no culpa a la conexión', async () => {
    updateProfileMock.mockRejectedValue(
      errorDelBack(500, { statusCode: 500, code: 'ERROR_INTERNO', message: 'Error interno del servidor.', referencia: 'ab12cd34' }),
    )
    await editarYGuardar(() => escribir(campo('perfil-inquilino-firstName'), 'Laura María'))
    const texto = String(toastError.mock.calls[0][0])
    expect(texto).toMatch(/^No pudimos guardar tu perfil: algo falló de nuestro lado/)
    expect(texto).toContain('ab12cd34')
    expect(texto).not.toMatch(/conexi[oó]n/)
  })

  it('sin respuesta (status 0): ahí sí se habla de la conexión', async () => {
    updateProfileMock.mockRejectedValue(new TypeError('Failed to fetch'))
    await editarYGuardar(() => escribir(campo('perfil-inquilino-firstName'), 'Laura María'))
    expect(String(toastError.mock.calls[0][0])).toMatch(/conexión/)
  })
})

/*
 * Nico, 02-10-2026 (pregunta 15): la «Zona de peligro» decía «Estas acciones
 * son irreversibles», y el modal, dos clics después, que se recupera iniciando
 * sesión. Ahora dice la ventana de 30 días, como el perfil de la inmobiliaria.
 */
describe('Perfil del inquilino — la zona de peligro', () => {
  it('cuenta la ventana de 30 días y el soporte, no «irreversible»', async () => {
    await renderPage()
    const texto = container.textContent ?? ''
    expect(texto).not.toContain('irreversibles')
    expect(texto).toContain('Si inicias sesión en los próximos 30 días')
    expect(texto).toContain('sólo el soporte de Leasefy puede recuperarla')
  })
})
