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
  act(() => { boton(container, 'Eliminar cuenta').click() })
  act(() => { boton(dialogo()!, 'Continuar').click() })
  await vi.waitFor(() => expect(textoDelModal()).toContain('Confirmar eliminación'))
}

/*
 * Ronda 30 — decisión de Nico (23-10): «Eliminar la cuenta» vive SÓLO en Configuración. Estas pruebas miraban el
 * diálogo de tres pasos que vivía aquí; se cambiaron A PROPÓSITO por las del camino hacia Configuración. Lo que
 * cuidaban (la palabra exacta, decir por qué cuando el back no deja, no prometer borrar, los 30 días) ahora lo
 * prueba `components/configuracion/SeccionEliminarCuenta.test.tsx`, que es donde vive la baja.
 */
describe('Perfil del propietario — la baja vive en Configuración', () => {
  it('dice dónde eliminar la cuenta y lleva a Configuración', async () => {
    await renderPage()
    const aviso = container.querySelector('[data-testid="perfil-eliminar-cuenta"]')
    expect(aviso?.textContent).toContain('Para eliminar tu cuenta, ve a Configuración')
    const enlace = container.querySelector<HTMLAnchorElement>('[data-testid="perfil-ir-a-eliminar-cuenta"]')
    expect(enlace?.getAttribute('href')).toBe('/panel/configuracion/eliminar-cuenta')
  })

  it('Mi perfil ya no abre la baja: sin el botón ni el diálogo', async () => {
    await renderPage()
    expect(Array.from(container.querySelectorAll('button')).some((b) => b.textContent?.trim() === 'settings.account.deleteAccount')).toBe(false)
    expect(document.body.querySelector('[role="dialog"]')).toBeNull()
  })
})

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
    // Un celular bien escrito que el back igual rechaza: el cliente lo deja salir.
    await editarYGuardar(() => escribir(campo('perfil-propietario-phone'), '3109998877'))

    expect(container.querySelector('#perfil-propietario-phone-error')?.textContent).toBe(FRASE)
    expect(document.activeElement).toBe(campo('perfil-propietario-phone'))
    expect(toastError).not.toHaveBeenCalled()
  })

  it('🔴 un celular incompleto no sale: «El celular en Colombia tiene 10 dígitos.», en su campo y sin PATCH', async () => {
    await editarYGuardar(() => escribir(campo('perfil-propietario-phone'), '300123'))
    expect(updateProfileMock).not.toHaveBeenCalled()
    expect(container.querySelector('#perfil-propietario-phone-error')?.textContent).toBe(
      'El celular en Colombia tiene 10 dígitos.',
    )
    expect(campo('perfil-propietario-phone').getAttribute('aria-invalid')).toBe('true')
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

describe('Perfil del propietario — sólo lo que es verdad', () => {
  it('ronda 28: la foto es un renglón de «Información personal», sin «Cambiar foto o nombre» ni los atajos que repetían el menú', async () => {
    await renderPage()
    expect(container.querySelector('[data-testid="perfil-foto"]')).not.toBeNull()
    expect(container.textContent).not.toContain('Cambiar foto o nombre')
    expect(container.textContent).not.toContain('Mis contratos')
    expect([...container.querySelectorAll('button')].some((b) => b.textContent?.trim() === 'Cambiar foto')).toBe(true)
  })

  it('no hay insignias «Verificado» ni la fecha inventada', async () => {
    await renderPage()
    const texto = container.textContent ?? ''
    expect(texto).not.toContain('Verificado')
    expect(texto).not.toContain('Estado de verificación')
    expect(texto).not.toContain('Propietario desde')
  })

  it('los pasos del perfil salen de lo guardado: sin dirección ni contacto, no está «completo»', async () => {
    useAuthMock.mockReturnValue({
      user: { id: 'u-1', email: 'pedro@example.com', firstName: 'Pedro', lastName: 'Ruiz', phone: '3001234567' },
      updateProfile: vi.fn(),
    })
    await renderPage()
    const texto = container.textContent ?? ''
    // Glow up 22-10: la lista de la casa (mismo dato: 2 de 5 listos, faltan 3).
    // Revisora r25: sólo lo que falta y sin el «2/5»: salen los 3 pasos pendientes, no los 2 hechos.
    expect(texto).toContain('Para completar tu perfil te faltan 3 pasos')
    expect(texto).not.toContain('2/5')
    expect(container.querySelector('[data-testid="perfil-lo-que-falta-basic-info"]')).toBeNull()
    expect(container.querySelector('[data-testid="perfil-lo-que-falta-phone"]')).toBeNull()
    expect(container.querySelector('[data-testid="perfil-lo-que-falta-id-number"]')).not.toBeNull()
    expect(container.querySelector('[data-testid="perfil-lo-que-falta-address"]')).not.toBeNull()
    expect(container.querySelector('[data-testid="perfil-lo-que-falta-emergency-contact"]')).not.toBeNull()
    expect(texto).not.toContain('Perfil completo')
    expect(texto).not.toMatch(/Verificar (teléfono|identidad)/)
  })

  it('🔴 el correo sólo se lee: al editar no hay campo de correo, y «Guardar» no lo manda', async () => {
    const updateProfile = vi.fn().mockResolvedValue(undefined)
    useAuthMock.mockReturnValue({
      user: { id: 'u-1', email: 'pedro@example.com', firstName: 'Pedro', lastName: 'Ruiz' },
      updateProfile,
    })
    await renderPage()
    act(() => { boton(container, 'Editar').click() })
    expect(container.querySelector('input[type="email"]')).toBeNull()
    expect(container.textContent).toContain('pedro@example.com')
    await act(async () => { boton(container, 'Guardar').click() })
    expect(updateProfile).toHaveBeenCalledTimes(1)
    expect(updateProfile.mock.calls[0][0]).not.toHaveProperty('email')
  })
})
