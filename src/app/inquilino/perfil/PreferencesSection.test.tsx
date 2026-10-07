/**
 * PreferencesSection — housing preferences card on /inquilino/perfil.
 *
 * - Loads GET /users/me/preferences on mount and displays the row.
 * - Falls back to the tenantOnboardingData snapshot when no row exists.
 * - Save sends the COMPLETE full-replacement payload: a save with untouched
 *   bedrooms/property types must still include their prior values.
 * - CRITICAL guard: a transient GET failure is NOT a no-row state — editing
 *   stays disabled (a save with unknown `current` would wipe the non-edited
 *   fields under full-replacement) until a retry succeeds.
 */

import * as React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

void React // jsx-preserve

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const { getPrefsMock, updatePrefsMock, authState } = vi.hoisted(() => ({
  getPrefsMock: vi.fn(),
  updatePrefsMock: vi.fn(),
  authState: { user: undefined as Record<string, unknown> | undefined },
}))

vi.mock('@/lib/api/tenant-preferences.service', async (importOriginal) => {
  const actual = await importOriginal<
    typeof import('@/lib/api/tenant-preferences.service')
  >()
  return {
    ...actual,
    getTenantPreferences: (...args: unknown[]) => getPrefsMock(...args),
    updateTenantPreferences: (...args: unknown[]) => updatePrefsMock(...args),
  }
})

vi.mock('@/lib/auth', () => ({
  useAuth: () => ({ user: authState.user }),
}))

vi.mock('@/lib/i18n', () => ({
  useI18n: () => ({
    t: (key: string) => key,
    locale: 'es',
    formatCurrency: (n: number) => `$${n}`,
  }),
}))

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
}))

import { PreferencesSection } from './PreferencesSection'
import type { TenantPreferences } from '@/lib/api/tenant-preferences.service'
import { toast } from 'sonner'

const ROW: TenantPreferences = {
  preferredCities: ['Chapinero'],
  preferredBedrooms: 3,
  preferredPropertyTypes: ['APARTMENT', 'HOUSE'],
  minBudget: 800000,
  maxBudget: 1500000,
  petFriendly: false,
  moveInDate: '2026-08-01T00:00:00.000Z',
  preferredAmenities: ['parqueadero'],
  petDetails: null,
  preferredContact: 'whatsapp',
}

let container: HTMLDivElement
let root: Root

beforeEach(() => {
  authState.user = undefined
  getPrefsMock.mockReset()
  updatePrefsMock.mockReset()
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
})

afterEach(async () => {
  await act(async () => root.unmount())
  container.remove()
  vi.clearAllMocks()
})

async function render() {
  await act(async () => {
    root.render(<PreferencesSection />)
  })
}

function buttonByText(text: string): HTMLButtonElement {
  const button = Array.from(container.querySelectorAll('button')).find((b) =>
    (b.textContent || '').includes(text),
  )
  expect(button, `button "${text}"`).toBeTruthy()
  return button as HTMLButtonElement
}

describe('PreferencesSection', () => {
  it('loads and displays the authoritative row on mount', async () => {
    getPrefsMock.mockResolvedValue(ROW)
    await render()

    expect(getPrefsMock).toHaveBeenCalledTimes(1)
    expect(container.textContent).toContain('Chapinero')
    expect(container.textContent).toContain('$800000')
    expect(container.textContent).toContain('parqueadero')
    // Non-edited fields (bedrooms/types) are surfaced read-only.
    expect(container.textContent).toContain('3 habitaciones')
  })

  it('falls back to the tenantOnboardingData snapshot when no row exists', async () => {
    getPrefsMock.mockResolvedValue(null)
    authState.user = {
      profileSource: 'backend',
      tenantOnboardingData: {
        budgetMin: 500000,
        budgetMax: 900000,
        preferredZones: ['Suba'],
        preferredAmenities: ['piscina'],
        hasPets: true,
        petDetails: 'Perro pequeño',
      },
    }
    await render()

    expect(container.textContent).toContain('Suba')
    expect(container.textContent).toContain('$500000')
    expect(container.textContent).toContain('Perro pequeño')
    // A genuine no-row state IS editable (real empty state, save creates the row).
    expect(buttonByText('Editar').disabled).toBe(false)
  })

  it('keeps editing disabled with a retry action when the GET fails transiently', async () => {
    getPrefsMock.mockRejectedValue(new Error('500 Internal Server Error'))
    await render()

    // Load failed ≠ no row: editing must stay off so a save can never wipe
    // bedrooms/property types via the full-replacement PATCH.
    expect(buttonByText('Editar').disabled).toBe(true)
    expect(container.textContent).toContain('Reintentar')

    // A disabled Edit means no save path exists at all.
    buttonByText('Editar').click()
    await act(async () => {})
    expect(updatePrefsMock).not.toHaveBeenCalled()
  })

  it('retry refetches and enables editing with the fetched row', async () => {
    getPrefsMock
      .mockRejectedValueOnce(new Error('500 Internal Server Error'))
      .mockResolvedValueOnce(ROW)
    await render()
    expect(buttonByText('Editar').disabled).toBe(true)

    await act(async () => {
      buttonByText('Reintentar').click()
    })

    expect(getPrefsMock).toHaveBeenCalledTimes(2)
    expect(buttonByText('Editar').disabled).toBe(false)
    expect(container.textContent).toContain('Chapinero')
    expect(container.textContent).not.toContain('Reintentar')

    // And the save path now round-trips the fetched row's non-edited fields.
    updatePrefsMock.mockResolvedValue(ROW)
    await act(async () => {
      buttonByText('Editar').click()
    })
    await act(async () => {
      buttonByText('common.save').click()
    })
    expect(updatePrefsMock).toHaveBeenCalledWith(
      expect.objectContaining({
        preferredBedrooms: 3,
        preferredPropertyTypes: ['APARTMENT', 'HOUSE'],
      }),
    )
  })

  it('saves the FULL payload — untouched bedrooms/property types round-trip', async () => {
    getPrefsMock.mockResolvedValue(ROW)
    updatePrefsMock.mockResolvedValue(ROW)
    await render()

    await act(async () => {
      buttonByText('Editar').click()
    })
    await act(async () => {
      buttonByText('common.save').click()
    })

    expect(updatePrefsMock).toHaveBeenCalledTimes(1)
    expect(updatePrefsMock).toHaveBeenCalledWith({
      preferredCities: ['Chapinero'],
      preferredAmenities: ['parqueadero'],
      petFriendly: false,
      minBudget: 800000,
      maxBudget: 1500000,
      moveInDate: '2026-08-01',
      preferredContact: 'whatsapp',
      // Untouched — must survive the full-replacement PATCH.
      preferredBedrooms: 3,
      preferredPropertyTypes: ['APARTMENT', 'HOUSE'],
    })
  })
})

/**
 * 🔴 02-10-2026 (Nico, pregunta 2) · El onboarding ya atajaba el presupuesto
 * de once cifras; esta tarjeta no, y el fallo salía con `err.message` crudo.
 * Ahora: el mismo tope y la misma frase ANTES de mandar, y el error del back
 * por el traductor (por campo, regla de oro).
 */
describe('PreferencesSection — errores (sistema de errores)', () => {
  const TOPE = 'El presupuesto no puede pasar de $100.000.000 al mes. Revisa que no sobren ceros.'

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

  async function editarYGuardar(cambio?: () => void) {
    getPrefsMock.mockResolvedValue(ROW)
    await render()
    await act(async () => {
      buttonByText('Editar').click()
    })
    cambio?.()
    await act(async () => {
      buttonByText('common.save').click()
    })
  }

  it('🔴 un presupuesto de once cifras no sale: la frase del back debajo del campo y sin PATCH', async () => {
    await editarYGuardar(() => escribir(campo('preferencias-maxBudget'), '30000000000'))

    expect(updatePrefsMock).not.toHaveBeenCalled()
    expect(container.querySelector('#preferencias-maxBudget-error')?.textContent).toBe(TOPE)
    expect(campo('preferencias-maxBudget').getAttribute('aria-invalid')).toBe('true')
    expect(document.activeElement).toBe(campo('preferencias-maxBudget'))
    expect(toast.error).not.toHaveBeenCalled()

    // Al corregirlo, el error se va (el `FormError` sale con su animación
    // diciendo lo último que dijo: lo que cambia de una es el campo).
    escribir(campo('preferencias-maxBudget'), '100000000')
    expect(campo('preferencias-maxBudget').getAttribute('aria-invalid')).toBeNull()
  })

  it('un negativo o un decimal ya no se pierden en silencio', async () => {
    await editarYGuardar(() => escribir(campo('preferencias-minBudget'), '-5'))
    expect(updatePrefsMock).not.toHaveBeenCalled()
    expect(container.querySelector('#preferencias-minBudget-error')?.textContent).toBe(
      'El presupuesto no puede ser negativo.',
    )
  })

  it('🔴 un 400 DATOS_INVALIDOS con campos: el error va a SU campo, con el foco, sin toast', async () => {
    updatePrefsMock.mockRejectedValue(
      errorDelBack(400, {
        statusCode: 400,
        code: 'DATOS_INVALIDOS',
        message: [TOPE],
        campos: [{ campo: 'maxBudget', regla: 'maximo', mensaje: TOPE }],
      }),
    )
    await editarYGuardar()

    expect(container.querySelector('#preferencias-maxBudget-error')?.textContent).toBe(TOPE)
    expect(document.activeElement).toBe(campo('preferencias-maxBudget'))
    expect(toast.error).not.toHaveBeenCalled()
  })

  it('🔴 un 5xx dice que fue nuestro, con la referencia, y no culpa a la conexión', async () => {
    updatePrefsMock.mockRejectedValue(
      errorDelBack(500, { statusCode: 500, code: 'ERROR_INTERNO', message: 'Error interno del servidor.', referencia: 'ab12cd34' }),
    )
    await editarYGuardar()

    const texto = String(vi.mocked(toast.error).mock.calls[0][0])
    expect(texto).toMatch(/^No pudimos guardar tus preferencias: algo falló de nuestro lado/)
    expect(texto).toContain('ab12cd34')
    expect(texto).not.toMatch(/conexi[oó]n/)
  })

  it('sin respuesta (status 0): ahí sí se habla de la conexión', async () => {
    updatePrefsMock.mockRejectedValue(new TypeError('Failed to fetch'))
    await editarYGuardar()
    expect(String(vi.mocked(toast.error).mock.calls[0][0])).toMatch(/conexión/)
  })
})
