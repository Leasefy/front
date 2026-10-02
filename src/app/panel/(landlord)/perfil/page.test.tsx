/**
 * page.test.tsx — Mi perfil (propietario): el modal de baja.
 *
 * Era un modal hecho a mano (capa `fixed inset-0`, banda roja con hex, ✕
 * propia sólo en el paso 2, sin Escape ni foco atrapado). Hoy es el `Dialog`
 * destructivo del DS en tres pasos. Y su lista decía «Se eliminará
 * permanentemente» las propiedades publicadas, los candidatos y el historial
 * de contratos y pagos: `DELETE /users/me/account` sólo marca al usuario con
 * `isActive: false` + `deletedAt` (y con un arriendo activo responde 403).
 */

import * as React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

void React // jsx-preserve

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const { useAuthMock, deleteAccountMock, toastError, routerPush } = vi.hoisted(() => ({
  useAuthMock: vi.fn(),
  deleteAccountMock: vi.fn(),
  toastError: vi.fn(),
  routerPush: vi.fn(),
}))

vi.mock('@/lib/auth', () => ({ useAuth: () => useAuthMock() }))

vi.mock('@/lib/i18n', () => ({
  useI18n: () => ({ locale: 'es', t: (k: string) => k }),
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: routerPush, replace: vi.fn(), back: vi.fn() }),
}))

vi.mock('@/lib/supabase/client', () => ({ getSupabase: () => null }))

vi.mock('@/lib/api/settings.service', () => ({
  settingsApi: { uploadAvatar: vi.fn(), deleteAccount: deleteAccountMock },
}))

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: (m: string) => toastError(m) },
}))

vi.mock('next/image', () => ({
  default: ({ src, alt }: { src: string; alt: string }) => React.createElement('img', { src, alt }),
}))

// ── Import page AFTER mocks ───────────────────────────────────────────────
import PropietarioPerfilPage from './page'

let container: HTMLDivElement
let root: Root

beforeEach(() => {
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
  useAuthMock.mockReturnValue({
    user: {
      id: 'u-1',
      email: 'pedro@example.com',
      firstName: 'Pedro',
      lastName: 'Ruiz',
      phone: '3001234567',
      emailConfirmedAt: '2026-01-01T00:00:00Z',
    },
    updateProfile: vi.fn(),
  })
  deleteAccountMock.mockReset()
  toastError.mockReset()
  routerPush.mockReset()
})

afterEach(() => {
  act(() => { root.unmount() })
  container.remove()
})

async function renderPage() {
  await act(async () => {
    root.render(React.createElement(PropietarioPerfilPage))
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
  act(() => { boton(container, 'Eliminar mi cuenta').click() })
  act(() => { boton(dialogo()!, 'Continuar').click() })
  await vi.waitFor(() => expect(textoDelModal()).toContain('Confirmar eliminación'))
}

describe('Perfil del propietario — el modal de baja', () => {
  it('es un diálogo con nombre y una sola ✕, la de la primitiva', async () => {
    await renderPage()
    act(() => { boton(container, 'Eliminar mi cuenta').click() })

    const d = dialogo()!
    expect(d).not.toBeNull()
    const titulo = document.getElementById(d.getAttribute('aria-labelledby') ?? '')
    expect(titulo?.textContent).toBe('¿Eliminar tu cuenta?')
    expect(d.querySelectorAll('[aria-label="Cerrar"]')).toHaveLength(1)
  })

  it('no promete borrar lo que el backend no borra: dice qué se pierde y qué no', async () => {
    await renderPage()
    act(() => { boton(container, 'Eliminar mi cuenta').click() })

    const texto = textoDelModal()
    expect(texto).not.toContain('Se eliminará permanentemente')
    expect(texto).not.toContain('Propiedades publicadas y candidatos')
    expect(texto).toContain('Perderás:')
    expect(texto).toContain('El acceso a tu panel de propietario')
    expect(texto).toContain('No se elimina:')
    expect(texto).toContain('Tus inmuebles, contratos y pagos')
    // El bloqueo real del backend (403 con un arriendo activo).
    expect(texto).toContain('contratos de arriendo activos')
    expect(texto).toContain('30 días')
  })

  it('Escape cierra en el aviso', async () => {
    await renderPage()
    act(() => { boton(container, 'Eliminar mi cuenta').click() })
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
 * 02-10-2026 · Sistema de errores. Antes, CUALQUIER fallo al guardar decía
 * «Error al guardar los cambios», y la pantalla rellenaba lo que faltaba con
 * datos de muestra que «Guardar» mandaba como propios.
 */
describe('Perfil del propietario — guardar los datos', () => {
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
      user: { id: 'u-1', email: 'pedro@example.com', firstName: 'Pedro', lastName: 'Ruiz' },
      updateProfile: updateProfileMock,
    })
  })

  async function editarYGuardar(cambio?: () => void) {
    await renderPage()
    act(() => { boton(container, 'Editar').click() })
    cambio?.()
    await act(async () => { boton(container, 'Guardar').click() })
  }

  it('🔴 lo que la persona no tiene guardado no se manda inventado', async () => {
    updateProfileMock.mockResolvedValue(undefined)
    await editarYGuardar()
    const enviado = updateProfileMock.mock.calls[0][0] as Record<string, unknown>
    expect(enviado.phone).toBeUndefined()
    expect(enviado.address).toBeUndefined()
    expect(enviado.birthDate).toBeUndefined()
    expect(JSON.stringify(enviado)).not.toMatch(/300 123 4567|Cra\. 7|1980-08-15/)
  })

  it('🔴 un 400 con `campos` pinta el error debajo del campo y le da el foco, sin toast', async () => {
    const FRASE = 'Revisa el teléfono: no es un número de teléfono válido.'
    updateProfileMock.mockRejectedValue(
      errorDelBack(400, {
        code: 'DATOS_INVALIDOS',
        message: [FRASE],
        campos: [{ campo: 'phone', regla: 'telefono', mensaje: FRASE }],
      }),
    )
    await editarYGuardar(() => escribir(campo('perfil-propietario-phone'), '12345'))

    expect(container.querySelector('#perfil-propietario-phone-error')?.textContent).toBe(FRASE)
    expect(document.activeElement).toBe(campo('perfil-propietario-phone'))
    expect(toastError).not.toHaveBeenCalled()
  })

  it('el error del back en `lastName` cae en el único campo del nombre', async () => {
    const FRASE = 'El apellido no puede tener más de 50 caracteres.'
    updateProfileMock.mockRejectedValue(
      errorDelBack(400, { code: 'DATOS_INVALIDOS', message: [FRASE], campos: [{ campo: 'lastName', regla: 'longitud_maxima', mensaje: FRASE }] }),
    )
    await editarYGuardar()
    expect(container.querySelector('#perfil-propietario-nombre-error')?.textContent).toBe(FRASE)
  })

  it('🔴 un 5xx dice que fue nuestro, con la referencia, y no culpa a la conexión', async () => {
    updateProfileMock.mockRejectedValue(
      errorDelBack(500, { statusCode: 500, code: 'ERROR_INTERNO', message: 'Error interno del servidor.', referencia: 'ab12cd34' }),
    )
    await editarYGuardar()
    const texto = String(toastError.mock.calls[0][0])
    expect(texto).toMatch(/^No pudimos guardar tu perfil: algo falló de nuestro lado/)
    expect(texto).toContain('ab12cd34')
    expect(texto).not.toMatch(/conexi[oó]n/)
  })

  it('sin respuesta (status 0): ahí sí se habla de la conexión', async () => {
    updateProfileMock.mockRejectedValue(new TypeError('Failed to fetch'))
    await editarYGuardar()
    expect(String(toastError.mock.calls[0][0])).toMatch(/conexión/)
  })
})

describe('Perfil del propietario — la zona de peligro', () => {
  it('cuenta la ventana de 30 días y el soporte, no «irreversible»', async () => {
    await renderPage()
    const texto = container.textContent ?? ''
    expect(texto).not.toContain('irreversibles')
    expect(texto).toContain('sólo el soporte de Leasefy puede recuperarla')
  })
})
