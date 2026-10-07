/**
 * Quitar a alguien del equipo del propietario pide confirmación.
 *
 * «Eliminar» sacaba al miembro al primer clic: el back BORRA la membresía
 * (`DELETE /users/me/team/:id`) y esa persona pierde el acceso ya mismo. Un
 * clic de más no puede costar eso. Nico, 02-10: `confirmar({ destructivo })`
 * con un texto que diga qué pasa.
 */

import * as React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

void React
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const { confirmarMock, removeMock, inviteMock, toastMock } = vi.hoisted(() => ({
  confirmarMock: vi.fn(),
  removeMock: vi.fn(),
  inviteMock: vi.fn(),
  toastMock: { success: vi.fn(), error: vi.fn() },
}))

vi.mock('@/components/ui/confirmar', () => ({ confirmar: confirmarMock }))
vi.mock('@/components/ui/toast', () => ({ toast: toastMock }))
vi.mock('@/lib/i18n', () => ({
  useI18n: () => ({
    t: (k: string, vars?: Record<string, unknown>) => (vars ? `${k} ${JSON.stringify(vars)}` : k),
    locale: 'es',
  }),
}))
vi.mock('@/lib/hooks/useSettings', () => ({
  useTeamMembers: () => ({
    members: [
      { id: 'm-1', name: 'Laura Gómez', email: 'laura@ejemplo.com', role: 'viewer' },
      { id: 'm-2', email: 'pendiente@ejemplo.com', role: 'contador' },
    ],
    isLoading: false,
    errorCrudo: null,
    refresh: vi.fn(),
    invite: inviteMock,
    update: vi.fn(),
    remove: removeMock,
  }),
}))

import { TeamManagementSection } from './TeamManagementSection'

let container: HTMLDivElement
let root: Root

beforeEach(() => {
  confirmarMock.mockReset()
  removeMock.mockReset()
  inviteMock.mockReset()
  toastMock.success.mockReset()
  toastMock.error.mockReset()
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
  act(() => root.render(<TeamManagementSection delay={0} />))
})

afterEach(() => {
  act(() => root.unmount())
  container.remove()
})

const botonesQuitar = () =>
  [...container.querySelectorAll<HTMLButtonElement>('button')].filter(
    (b) => b.textContent === 'landlordSettings.team.remove',
  )

describe('quitar a un miembro del equipo', () => {
  it('🔴 pregunta antes, destructiva, nombrando a quién y diciendo qué pasa', async () => {
    confirmarMock.mockResolvedValue(false)
    await act(async () => botonesQuitar()[0].click())

    expect(confirmarMock).toHaveBeenCalledTimes(1)
    const opciones = confirmarMock.mock.calls[0][0]
    expect(opciones.destructivo).toBe(true)
    expect(opciones.titulo).toContain('landlordSettings.modals.removeMember.title')
    expect(opciones.titulo).toContain('Laura Gómez')
    expect(opciones.descripcion).toBe('landlordSettings.modals.removeMember.description')
    expect(opciones.accion).toBe('landlordSettings.modals.removeMember.confirm')
  })

  it('🔴 si dice que no, no saca a nadie', async () => {
    confirmarMock.mockResolvedValue(false)
    await act(async () => botonesQuitar()[0].click())
    expect(removeMock).not.toHaveBeenCalled()
  })

  it('si dice que sí, lo saca y avisa', async () => {
    confirmarMock.mockResolvedValue(true)
    removeMock.mockResolvedValue(undefined)
    await act(async () => botonesQuitar()[0].click())
    expect(removeMock).toHaveBeenCalledWith('m-1')
    expect(toastMock.success).toHaveBeenCalledWith('landlordSettings.toasts.memberRemoved')
  })

  it('a una invitación pendiente (sin nombre) la nombra por su correo', async () => {
    confirmarMock.mockResolvedValue(false)
    await act(async () => botonesQuitar()[1].click())
    expect(confirmarMock.mock.calls[0][0].titulo).toContain('pendiente@ejemplo.com')
  })
})

/**
 * 02-10-2026 · Sistema de errores. El correo mal escrito salía en un toast y
 * el error del back de quitar a alguien, con `err.message` crudo.
 */
describe('equipo — errores (sistema de errores)', () => {
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

  const correo = () => document.body.querySelector<HTMLInputElement>('#equipo-correo')!

  async function invitar(valor: string) {
    const abrir = [...container.querySelectorAll<HTMLButtonElement>('button')].find((b) =>
      b.textContent?.includes('landlordSettings.team.invite'),
    )!
    await act(async () => abrir.click())
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')!.set!
    act(() => {
      setter.call(correo(), valor)
      correo().dispatchEvent(new Event('input', { bubbles: true }))
    })
    const enviar = [...document.body.querySelectorAll<HTMLButtonElement>('button')].find((b) =>
      b.textContent?.includes('landlordSettings.modals.inviteMember.sendInvite'),
    )!
    await act(async () => enviar.click())
  }

  it('🔴 un correo de más de 255 caracteres no sale: la frase del back debajo del campo', async () => {
    await invitar(`${'a'.repeat(250)}@ejemplo.com`)
    expect(inviteMock).not.toHaveBeenCalled()
    expect(document.body.querySelector('#equipo-correo-error')?.textContent).toBe(
      'El correo puede tener hasta 255 caracteres.',
    )
    expect(toastMock.error).not.toHaveBeenCalled()
  })

  it('🔴 un 400 con `campos` en el correo va debajo del campo, con el foco, sin toast', async () => {
    const FRASE = 'Revisa el correo: debe tener la forma nombre@dominio.com.'
    inviteMock.mockRejectedValue(
      errorDelBack(400, { code: 'DATOS_INVALIDOS', message: [FRASE], campos: [{ campo: 'email', regla: 'correo', mensaje: FRASE }] }),
    )
    await invitar('laura@ejemplo.com')
    expect(document.body.querySelector('#equipo-correo-error')?.textContent).toBe(FRASE)
    expect(document.activeElement).toBe(correo())
    expect(toastMock.error).not.toHaveBeenCalled()
  })

  it('🔴 quitar a alguien con un 5xx dice que fue nuestro, con la referencia', async () => {
    confirmarMock.mockResolvedValue(true)
    removeMock.mockRejectedValue(
      errorDelBack(500, { statusCode: 500, code: 'ERROR_INTERNO', message: 'Error interno del servidor.', referencia: 'ab12cd34' }),
    )
    await act(async () => botonesQuitar()[0].click())
    const texto = String(toastMock.error.mock.calls[0][0])
    expect(texto).toMatch(/^No pudimos quitar a este miembro: algo falló de nuestro lado/)
    expect(texto).toContain('ab12cd34')
    expect(texto).not.toMatch(/conexi[oó]n/)
  })

  it('sin respuesta (status 0): ahí sí se habla de la conexión', async () => {
    inviteMock.mockRejectedValue(new TypeError('Failed to fetch'))
    await invitar('laura@ejemplo.com')
    expect(String(toastMock.error.mock.calls[0][0])).toMatch(/conexión/)
  })
})
