/**
 * StepTenantWelcome — document (rut/CC) immutability.
 *
 * Product rule: the document number cannot be edited once set on the backend
 * profile — changes go through Leasefy support. When the authenticated
 * backend user already has a rut, the field renders disabled (prefilled via
 * the context's backend seeding) with the support helper text; a user
 * without one keeps it editable.
 */

import * as React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

void React // jsx-preserve

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const { authState } = vi.hoisted(() => ({
  authState: { user: undefined as Record<string, unknown> | undefined },
}))

vi.mock('@/lib/auth/use-auth', () => ({
  useAuth: () => ({
    refreshUser: vi.fn().mockResolvedValue(undefined),
    user: authState.user,
  }),
}))

vi.mock('@/lib/api/client', () => ({
  apiClient: { post: vi.fn() },
}))

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
}))

import { TenantOnboardingProvider } from '@/lib/context/TenantOnboardingContext'
import { StepTenantWelcome } from './StepTenantWelcome'
import { IntentoDeAvanzarContext } from './intento-de-avanzar'

const SUPPORT_TEXT =
  'Para modificar tu número de documento, contacta al soporte de Leasefy.'

let container: HTMLDivElement
let root: Root

beforeEach(() => {
  localStorage.clear()
  authState.user = undefined
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
})

afterEach(async () => {
  await act(async () => root.unmount())
  container.remove()
  vi.clearAllMocks()
})

async function render(intentos = 0) {
  await act(async () => {
    root.render(
      <TenantOnboardingProvider>
        <IntentoDeAvanzarContext.Provider value={intentos}>
          <StepTenantWelcome />
        </IntentoDeAvanzarContext.Provider>
      </TenantOnboardingProvider>,
    )
  })
}

function rutInput(): HTMLInputElement {
  return container.querySelector('#rut') as HTMLInputElement
}

describe('StepTenantWelcome — rut lock', () => {
  it('locks and prefills the document field when the backend user already has one', async () => {
    authState.user = {
      id: 'me',
      profileSource: 'backend',
      firstName: 'Ana',
      lastName: 'Pérez',
      rut: '1090525663',
    }
    await render()

    expect(rutInput().disabled).toBe(true)
    // Prefilled by the context's backend seeding.
    expect(rutInput().value).toBe('1090525663')
    expect(container.textContent).toContain(SUPPORT_TEXT)
  })

  it('stays editable (no helper) for a user without a document', async () => {
    authState.user = {
      id: 'me',
      profileSource: 'backend',
      firstName: 'Ana',
      lastName: 'Pérez',
    }
    await render()

    expect(rutInput().disabled).toBe(false)
    expect(container.textContent).not.toContain(SUPPORT_TEXT)
  })

  it('never locks based on a degraded session profile', async () => {
    authState.user = { id: 'me', profileSource: 'session', rut: '1090525663' }
    await render()

    expect(rutInput().disabled).toBe(false)
    expect(container.textContent).not.toContain(SUPPORT_TEXT)
  })
})

describe('StepTenantWelcome — el aviso del nombre sale sólo cuando corresponde', () => {
  const AVISO = 'Ingresa tu nombre para continuar'
  const nombre = () => container.querySelector('#displayName') as HTMLInputElement

  it('al abrir el paso, sin nombre, no hay ningún aviso (antes era un bloque amarillo fijo)', async () => {
    await render()
    expect(container.textContent).not.toContain(AVISO)
    expect(nombre().getAttribute('aria-invalid')).toBeNull()
  })

  it('al intentar continuar sin nombre, el error sale en el campo y el foco va ahí', async () => {
    await render(0)
    await render(1)
    const error = container.querySelector('[role="alert"]')
    expect(error?.textContent).toBe(AVISO)
    expect(nombre().getAttribute('aria-invalid')).toBe('true')
    expect(document.activeElement).toBe(nombre())
  })
})

// Nico, 01-10-2026: «¿el número de documento por qué no tiene tipo de
// documento y número? ¿y el número por qué no tiene indicador y todas las
// validaciones que tenemos en los números de celular en otros lados?»
describe('StepTenantWelcome — documento con su tipo y celular con indicativo', () => {
  function escribir(input: HTMLInputElement, valor: string) {
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!
    act(() => {
      setter.call(input, valor)
      input.dispatchEvent(new Event('input', { bubbles: true }))
    })
  }
  const telefono = () => container.querySelector('#phone') as HTMLInputElement
  const alertas = () => Array.from(container.querySelectorAll('[role="alert"]')).map((a) => a.textContent)

  it('el documento trae su tipo (cédula por defecto) y el celular su indicativo +57', async () => {
    await render()
    const tipo = container.querySelector('[data-testid="tipo-de-documento-inquilino"]')
    expect(tipo?.textContent).toContain('Cédula de ciudadanía')
    expect(container.textContent).toContain('+57')
    expect(telefono().getAttribute('placeholder')).toMatch(/^Ej: 3/)
  })

  it('el celular no acepta símbolos ni letras (el «!@#$%^&*» de la captura)', async () => {
    await render()
    escribir(telefono(), '!@#$.   %^&*')
    expect(telefono().value).toBe('')
    escribir(telefono(), '300 123 4567 99')
    expect(telefono().value).toBe('3001234567')
  })

  it('al intentar continuar sin documento ni celular, cada campo dice qué falta', async () => {
    await render(0)
    await render(1)
    expect(alertas()).toEqual(
      expect.arrayContaining(['Escribe tu número de documento.', 'Ingresa tu celular.']),
    )
  })

  it('una cédula corta o un celular que no empieza por 3 se dicen con las reglas de la plataforma', async () => {
    await render(0)
    escribir(rutInput(), '123')
    escribir(telefono(), '2001234567')
    await render(1)
    expect(alertas()).toEqual(
      expect.arrayContaining([
        'Debe tener entre 6 y 10 dígitos.',
        'Un celular en Colombia empieza por 3.',
      ]),
    )
  })
})
