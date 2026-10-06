/**
 * El registro del propietario y sus errores (02-10-2026).
 *
 * 🔴 Antes, si `POST /users/me/onboarding` fallaba, el `catch` sólo hacía
 * `console.error`: el botón se volvía a prender y nadie decía nada. Ahora:
 *  · el cliente ataja lo que el back rechazaría (las mismas reglas y frases);
 *  · un 400 con `campos` va a SU campo, con foco;
 *  · un 5xx dice que fue nuestro, con la referencia; «conexión» sólo sin respuesta.
 */
import * as React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

void React
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const { postMock, toastErrorMock, pushMock } = vi.hoisted(() => ({
  postMock: vi.fn(),
  toastErrorMock: vi.fn(),
  pushMock: vi.fn(),
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock, replace: vi.fn() }),
  // Viene de publicar: un solo paso, y «Comenzar» envía de una.
  useSearchParams: () => new URLSearchParams('returnUrl=/panel/propiedades'),
}))
vi.mock('@/lib/auth/use-auth', () => ({
  useAuth: () => ({ refreshUser: vi.fn().mockResolvedValue(undefined), isAuthenticated: true }),
}))
vi.mock('@/lib/i18n', () => ({ useI18n: () => ({ locale: 'es', t: (k: string) => k }) }))
vi.mock('@/lib/api/client', async (original) => ({
  ...(await original<typeof import('@/lib/api/client')>()),
  apiClient: { post: postMock },
}))
vi.mock('sonner', () => ({ toast: { error: toastErrorMock, success: vi.fn() } }))

import OnboardingPropietarioPage from './page'
import { ApiError } from '@/lib/api/client'

let container: HTMLDivElement
let root: Root

beforeEach(() => {
  localStorage.clear()
  postMock.mockReset()
  toastErrorMock.mockReset()
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
})

afterEach(() => {
  act(() => root.unmount())
  container.remove()
  vi.restoreAllMocks()
})

const porId = (id: string) => container.querySelector(`[id="${id}"]`) as HTMLInputElement

async function pintar() {
  await act(async () => {
    root.render(<OnboardingPropietarioPage />)
  })
}

function escribir(id: string, valor: string) {
  const input = porId(id)
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!
  act(() => {
    setter.call(input, valor)
    input.dispatchEvent(new Event('input', { bubbles: true }))
  })
}

function salirDe(id: string) {
  act(() => {
    porId(id).dispatchEvent(new FocusEvent('focusout', { bubbles: true }))
  })
}

/** La ayuda y el error se cruzan; `setTimeout` del foco: un par de cuadros. */
async function esperar() {
  for (let i = 0; i < 10; i++) {
    await act(async () => {
      await new Promise((r) => setTimeout(r, 20))
    })
  }
}

async function enviar() {
  const form = container.querySelector('form') as HTMLFormElement
  await act(async () => {
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
    await new Promise((r) => setTimeout(r, 0))
  })
}

function errorDelBack(status: number, cuerpo: Record<string, unknown>) {
  const message = Array.isArray(cuerpo.message) ? cuerpo.message : String(cuerpo.message ?? '')
  return new ApiError(status, message as string | string[], cuerpo.code as string | undefined, cuerpo)
}

describe('/onboarding/propietario — los errores con la regla de oro', () => {
  it('🔴 un 400 en el celular: el error va bajo el celular, con foco y sin toast', async () => {
    const MENSAJE = 'Numero de telefono invalido. Formato: +573XXXXXXXXX o 3XXXXXXXXX'
    postMock.mockRejectedValue(
      errorDelBack(400, {
        statusCode: 400,
        code: 'DATOS_INVALIDOS',
        message: [MENSAJE],
        campos: [{ campo: 'phone', regla: 'formato', mensaje: MENSAJE }],
      }),
    )
    await pintar()
    escribir('displayName', 'Ana Pérez')
    escribir('ownerPhone', '3001234567')
    await enviar()
    await esperar()

    expect(postMock).toHaveBeenCalledTimes(1)
    expect(container.querySelector('[id="ownerPhone-error"]')?.textContent).toBe(MENSAJE)
    expect(porId('ownerPhone').getAttribute('aria-invalid')).toBe('true')
    expect(document.activeElement).toBe(porId('ownerPhone'))
    expect(toastErrorMock).not.toHaveBeenCalled()

    // Al corregirlo, el error del servidor se va.
    escribir('ownerPhone', '3109876543')
    await esperar()
    expect(container.querySelector('[id="ownerPhone-error"]')).toBeNull()
  })

  it('🔴 un 5xx dice que fue nuestro, con la referencia, y no culpa a la conexión', async () => {
    postMock.mockRejectedValue(
      errorDelBack(500, { statusCode: 500, code: 'ERROR_INTERNO', message: 'Error interno del servidor.', referencia: 'ab12cd34' }),
    )
    await pintar()
    escribir('displayName', 'Ana Pérez')
    await enviar()

    const texto = String(toastErrorMock.mock.calls[0]?.[0])
    expect(texto).toMatch(/^No pudimos guardar tu perfil: algo falló de nuestro lado/)
    expect(texto).toContain('ab12cd34')
    expect(texto).not.toMatch(/conexi[oó]n/)
    // Se queda en el paso, con lo escrito.
    expect(porId('displayName').value).toBe('Ana Pérez')
  })

  it('sin respuesta (la red): ahí sí se habla de la conexión', async () => {
    postMock.mockRejectedValue(new ApiError(0, 'Failed to fetch'))
    await pintar()
    escribir('displayName', 'Ana Pérez')
    await enviar()
    expect(String(toastErrorMock.mock.calls[0]?.[0])).toMatch(/conexión/)
  })

  it('el cliente ataja lo que el back rechazaría: un celular que no empieza por 3 no se envía', async () => {
    await pintar()
    escribir('displayName', 'Ana Pérez')
    escribir('ownerPhone', '2001234567')
    salirDe('ownerPhone')
    await enviar()
    await esperar()

    expect(postMock).not.toHaveBeenCalled()
    expect(container.querySelector('[id="ownerPhone-error"]')?.textContent).toBe('Un celular en Colombia empieza por 3.')
  })

  it('un nombre de más de 100 letras no se envía y lo dice con la frase del back', async () => {
    await pintar()
    escribir('displayName', 'A'.repeat(101))
    await enviar()
    await esperar()

    expect(postMock).not.toHaveBeenCalled()
    expect(container.querySelector('[id="displayName-error"]')?.textContent).toBe(
      'El nombre puede tener hasta 100 caracteres.',
    )
  })

  it('con datos buenos manda el celular en E.164', async () => {
    postMock.mockResolvedValue({})
    await pintar()
    escribir('displayName', 'Ana María Pérez')
    escribir('ownerPhone', '3001234567')
    await enviar()
    expect(postMock).toHaveBeenCalledWith('/users/me/onboarding', {
      firstName: 'Ana',
      lastName: 'María Pérez',
      phone: '+573001234567',
      userType: 'LANDLORD',
    })
  })
})
