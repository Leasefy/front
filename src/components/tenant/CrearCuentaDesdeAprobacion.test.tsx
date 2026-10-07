/**
 * CrearCuentaDesdeAprobacion — los errores (02-10-2026).
 *
 * Antes: «ya existe» se sacaba del texto en inglés de Supabase y todo lo demás
 * decía «No pudimos crear tu cuenta. Intenta de nuevo.», hubiera red o no. El
 * error de cada campo era un `<p>` suelto, sin `aria-describedby` ni foco.
 */
import * as React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

void React

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const { signUpMock, pushMock } = vi.hoisted(() => ({ signUpMock: vi.fn(), pushMock: vi.fn() }))

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: pushMock }) }))
vi.mock('@/lib/auth/use-auth', () => ({ useAuth: () => ({ signUpWithEmail: signUpMock }) }))
vi.mock('@/lib/hooks/use-hidratado', () => ({ useHidratado: () => true }))

import { CrearCuentaDesdeAprobacion } from './CrearCuentaDesdeAprobacion'

const errorDeSupabase = (nombre: string, mensaje: string, status: number, code?: string, extra: object = {}) =>
  Object.assign(new Error(mensaje), { name: nombre, status, code, ...extra })

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
  vi.clearAllMocks()
})

function escribir(id: string, valor: string) {
  const input = container.querySelector<HTMLInputElement>(`#${id}`)!
  Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')!.set!.call(input, valor)
  input.dispatchEvent(new Event('input', { bubbles: true }))
}

async function pintar() {
  await act(async () => {
    root.render(
      <CrearCuentaDesdeAprobacion datos={{ telefono: '3001234567', cedula: '1020304050', ciudad: 'Medellín' }} onCancelar={vi.fn()} />,
    )
  })
}

async function enviar() {
  await act(async () => {
    container.querySelector('form')!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
  })
}

async function crearCon(error: unknown) {
  signUpMock.mockRejectedValue(error)
  await pintar()
  await act(async () => {
    escribir('nombre', 'María Restrepo')
    escribir('email', 'maria@correo.com')
    escribir('password', 'Secreta#2026-larga')
  })
  await enviar()
}

const errorDe = (id: string) => {
  const input = container.querySelector<HTMLInputElement>(`#${id}`)!
  const describe = input.getAttribute('aria-describedby')
  return { invalido: input.getAttribute('aria-invalid') === 'true', texto: describe ? document.getElementById(describe)?.textContent : null }
}

describe('CrearCuentaDesdeAprobacion — errores', () => {
  it('los campos que faltan se dicen debajo de cada uno, enlazados, con el foco en el primero', async () => {
    await pintar()
    await enviar()
    expect(errorDe('nombre')).toEqual({ invalido: true, texto: 'Escribe tu nombre.' })
    expect(errorDe('email').invalido).toBe(true)
    expect(document.activeElement).toBe(container.querySelector('#nombre'))
    expect(signUpMock).not.toHaveBeenCalled()
  })

  it('al corregir un campo, su error se va', async () => {
    await pintar()
    await enviar()
    await act(async () => escribir('nombre', 'María'))
    expect(errorDe('nombre').invalido).toBe(false)
  })

  it('🔴 el correo que ya tiene cuenta se reconoce por su código, no por el texto', async () => {
    await crearCon(errorDeSupabase('AuthApiError', 'Some other wording', 422, 'user_already_exists'))
    expect(container.textContent).toContain('Ya existe una cuenta con este correo')
  })

  it('🔴 la contraseña débil va a SU campo, con el foco', async () => {
    await crearCon(errorDeSupabase('AuthWeakPasswordError', 'Password is known to be weak', 422, 'weak_password', { reasons: ['pwned'] }))
    expect(errorDe('password').invalido).toBe(true)
    expect(errorDe('password').texto).toMatch(/filtraciones/)
    expect(document.activeElement).toBe(container.querySelector('#password'))
  })

  it('🔴 un 5xx dice que falló de nuestro lado, sin culpar a la conexión', async () => {
    await crearCon(errorDeSupabase('AuthApiError', 'Database error saving new user', 500, 'unexpected_failure'))
    expect(container.textContent).toMatch(/No pudimos crear tu cuenta: algo falló de nuestro lado/)
    expect(container.textContent).not.toMatch(/conexi[oó]n|Database/)
  })

  it('🔴 sin respuesta: ahí sí la conexión', async () => {
    await crearCon(errorDeSupabase('AuthRetryableFetchError', 'Failed to fetch', 0))
    expect(container.textContent).toMatch(/conexión/)
  })
})
