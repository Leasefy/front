/**
 * AuthForm — mientras entra con el correo (Nico, 07-10: «muestra que está
 * cargando y los inputs siguen activos»): los campos quedan apagados, el botón
 * de Google no dice «Conectando…» porque no fue el que se tocó, y si el ingreso
 * falla todo vuelve a quedar activo sin perder lo escrito.
 */

import * as React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

void React // jsx-preserve

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const { pushMock, replaceMock, signInWithEmailMock } = vi.hoisted(() => ({
  pushMock: vi.fn(),
  replaceMock: vi.fn(),
  signInWithEmailMock: vi.fn(),
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock, replace: replaceMock }),
  useSearchParams: () => ({ get: () => null }),
}))

vi.mock('@/lib/auth/use-auth', () => ({
  useAuth: () => ({
    signInWithGoogle: vi.fn(),
    signInWithEmail: signInWithEmailMock,
    signUpWithEmail: vi.fn(),
    sendPasswordReset: vi.fn(),
    user: null,
    isAuthenticated: false,
    isLoading: false,
    needsOnboarding: false,
    mfaRequired: false,
  }),
}))

// Keep the auth-context import (for AUTH_BOOTSTRAP_ERROR_KEY) side-effect
// light: it transitively imports supabase + firebase modules.
vi.mock('@/lib/supabase/client', () => ({ getSupabase: () => null }))
vi.mock('@/lib/firebase/messaging', () => ({
  requestNotificationPermission: vi.fn().mockResolvedValue(undefined),
  removeFcmToken: vi.fn().mockResolvedValue(undefined),
}))

import { AuthForm } from './AuthForm'

let container: HTMLDivElement
let root: Root

beforeEach(() => {
  sessionStorage.clear()
  pushMock.mockClear()
  replaceMock.mockClear()
  signInWithEmailMock.mockReset()
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
})

afterEach(async () => {
  await act(async () => root.unmount())
  container.remove()
  vi.clearAllMocks()
})

function setInputValue(input: HTMLInputElement, value: string) {
  const setter = Object.getOwnPropertyDescriptor(
    window.HTMLInputElement.prototype,
    'value',
  )!.set!
  setter.call(input, value)
  input.dispatchEvent(new Event('input', { bubbles: true }))
}

async function renderAndSubmitLogin() {
  await act(async () => {
    root.render(<AuthForm />)
  })
  const email = container.querySelector('input[type="email"]') as HTMLInputElement
  const password = container.querySelector('input[type="password"]') as HTMLInputElement
  expect(email).not.toBeNull()
  expect(password).not.toBeNull()
  await act(async () => {
    setInputValue(email, 'ana@example.com')
    setInputValue(password, 'secreta123')
  })
  const form = container.querySelector('form')!
  await act(async () => {
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
  })
}

function submitButton(): HTMLButtonElement {
  return container.querySelector('button[type="submit"]') as HTMLButtonElement
}

function campos() {
  return {
    email: container.querySelector('input[type="email"]') as HTMLInputElement,
    password: container.querySelector('input[type="password"]') as HTMLInputElement,
  }
}

function botonDeGoogle(): HTMLButtonElement {
  return Array.from(container.querySelectorAll('button')).find((b) =>
    /Google|Conectando/.test(b.textContent ?? ''),
  ) as HTMLButtonElement
}

describe('AuthForm — mientras entra con el correo', () => {
  it('apaga los campos y Google no dice «Conectando…»', async () => {
    signInWithEmailMock.mockImplementation(() => new Promise(() => {}))

    await renderAndSubmitLogin()

    const { email, password } = campos()
    expect(submitButton().textContent).toMatch(/Ingresando/)
    expect(email.closest('fieldset')?.disabled).toBe(true)
    expect(password.closest('fieldset')?.disabled).toBe(true)
    expect(botonDeGoogle().disabled).toBe(true)
    expect(botonDeGoogle().textContent).toContain('Continuar con Google')
    expect(botonDeGoogle().textContent).not.toContain('Conectando')
  })

  it('si falla, todo vuelve a quedar activo con lo escrito', async () => {
    signInWithEmailMock.mockRejectedValue(new Error('Invalid login credentials'))

    await renderAndSubmitLogin()

    const { email } = campos()
    expect(submitButton().disabled).toBe(false)
    expect(email.closest('fieldset')?.disabled).toBe(false)
    expect(email.value).toBe('ana@example.com')
    expect(botonDeGoogle().disabled).toBe(false)
  })
})
