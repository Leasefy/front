/**
 * 02-10-2026 · «Aseguradoras»: lo que dice el toast cuando el micro no guarda
 * el ajuste de una aseguradora.
 *
 * Antes el hook tiraba `new Error(String(res.status))` y la página pintaba
 * `err.message`: «403», «500». El respaldo de i18n decía «Verifica tu
 * conexión» ante cualquier cosa. Ahora el hook deja pasar el `ApiError`
 * entero y la página lo dice con el traductor (regla de oro).
 */
import * as React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

void React
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const { saveOverride, resetOverride, toastError, refetch, DATOS } = vi.hoisted(() => ({
  saveOverride: vi.fn(),
  resetOverride: vi.fn(),
  toastError: vi.fn(),
  refetch: vi.fn(),
  // El MISMO objeto en cada render: la página siembra su estado optimista con
  // `data.overrides` en un efecto, y un arreglo nuevo por render no para nunca.
  DATOS: {
    global: [
      {
        name: 'sura',
        route: 'sura_seguros',
        mode: 'direct' as const,
        enabled: true,
        priority: 1,
        maxCanonCop: null,
        breachStatus: 'healthy' as const,
      },
    ],
    overrides: [],
  },
}))

vi.mock('@/lib/i18n', () => ({
  useI18n: () => ({ t: (k: string) => k, locale: 'es' }),
}))

vi.mock('@/lib/context/PermissionsContext', () => ({
  usePermissionsContext: () => ({ canAccess: () => true }),
}))

vi.mock('@/lib/hooks/cotizador/use-carrier-registry', () => ({
  useCarrierRegistry: () => ({
    data: DATOS,
    isLoading: false,
    error: null,
    refetch,
    saveOverride,
    resetOverride,
  }),
}))

vi.mock('@/components/inmobiliaria/cotizador/CarrierRegistryTable', () => ({
  CarrierRegistryTable: ({
    onSaveOverride,
    onResetOverride,
  }: {
    onSaveOverride: (n: string, r: string, f: Record<string, unknown>) => Promise<void>
    onResetOverride: (n: string, r: string) => Promise<void>
  }) => (
    <div>
      <button data-testid="guardar" type="button" onClick={() => void onSaveOverride('sura', 'sura_seguros', { priority: 99 })}>
        guardar
      </button>
      <button data-testid="restablecer" type="button" onClick={() => void onResetOverride('sura', 'sura_seguros')}>
        restablecer
      </button>
    </div>
  ),
}))

vi.mock('@/components/ui/toast', () => ({
  toast: { error: toastError, success: vi.fn() },
}))

import { ApiError } from '@/lib/api/client'
import AseguradorasPage from './page'

let container: HTMLDivElement
let root: Root

beforeEach(() => {
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
  act(() => root.render(<AseguradorasPage />))
})

afterEach(() => {
  act(() => root.unmount())
  container.remove()
  vi.clearAllMocks()
})

async function tocar(testid: string) {
  await act(async () => {
    ;(container.querySelector(`[data-testid="${testid}"]`) as HTMLButtonElement).click()
    await new Promise((r) => setTimeout(r, 0))
  })
}

const loQueDijo = () => String(toastError.mock.calls.at(-1)?.[0] ?? '')

describe('Aseguradoras — el toast cuando el micro no guarda', () => {
  it('🔴 un 400 con `campos` dice qué dato está mal, en español', async () => {
    saveOverride.mockRejectedValueOnce(
      new ApiError(400, ['La prioridad no puede ser mayor que 10.'], 'DATOS_INVALIDOS', {
        statusCode: 400,
        code: 'DATOS_INVALIDOS',
        message: ['La prioridad no puede ser mayor que 10.'],
        campos: [{ campo: 'priority', regla: 'maximo', mensaje: 'La prioridad no puede ser mayor que 10.' }],
      }),
    )
    await tocar('guardar')
    expect(loQueDijo()).toBe('La prioridad no puede ser mayor que 10.')
  })

  it('🔴 un 5xx dice «de nuestro lado» con la referencia, nunca «500» ni la conexión', async () => {
    saveOverride.mockRejectedValueOnce(
      new ApiError(500, '', 'ERROR_INTERNO', {
        statusCode: 500,
        code: 'ERROR_INTERNO',
        requestId: 'c0ffee12-0000-4000-8000-000000000000',
      }),
    )
    await tocar('guardar')
    const texto = loQueDijo()
    expect(texto).toContain('No pudimos guardar el ajuste de la aseguradora')
    expect(texto).toContain('de nuestro lado')
    expect(texto).toContain('c0ffee12')
    expect(texto).not.toMatch(/conexi[oó]n/i)
    expect(texto).not.toBe('500')
  })

  it('🔴 sin respuesta (el `fetch` no salió) habla de la conexión', async () => {
    resetOverride.mockRejectedValueOnce(new TypeError('Failed to fetch'))
    await tocar('restablecer')
    expect(loQueDijo()).toMatch(/conexi[oó]n/i)
  })

  it('un 403 del micro (sin `message`) dice que no tienes permiso, no «403»', async () => {
    resetOverride.mockRejectedValueOnce(new ApiError(403, '', undefined, { error: 'Forbidden — no membership row' }))
    await tocar('restablecer')
    const texto = loQueDijo()
    expect(texto).toContain('No tienes permiso para cambiar las aseguradoras')
    expect(texto).not.toContain('Forbidden')
  })
})
