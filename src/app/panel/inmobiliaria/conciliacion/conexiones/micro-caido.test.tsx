/**
 * Conexiones con el micro caído (ARREGLOS-8, ARREGLOS-4 Q1 A, 03-10-2026).
 *
 * La lista le pasaba a `EstadoDeDatos` sólo el TEXTO del error («Failed to
 * fetch») y la tarjeta decía «Fue un problema nuestro». El hook ya guardaba el
 * error entero (`errorCrudo`, ARREGLOS-7); ahora la página se lo pasa y dice
 * qué se cayó.
 */
import * as React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

void React
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const { lectura } = vi.hoisted(() => ({
  lectura: { error: null as string | null, errorCrudo: null as unknown, notAvailable: false },
}))

vi.mock('@/lib/i18n', async () => await import('@/lib/i18n/i18n-test-stub'))
vi.mock('@/components/auth/PageGuard', () => ({
  PageGuard: ({ children }: { children?: React.ReactNode }) => children,
}))
vi.mock('@/lib/hooks/use-auto-refresh', () => ({ useAutoRefresh: () => {} }))
vi.mock('@/lib/hooks/conciliacion/use-conciliacion-connections', async () => {
  const real = await vi.importActual<typeof import('@/lib/hooks/conciliacion/use-conciliacion-connections')>(
    '@/lib/hooks/conciliacion/use-conciliacion-connections',
  )
  return {
    ...real,
    useConciliacionConnections: () => ({
      items: [],
      isLoading: false,
      error: lectura.error,
      errorCrudo: lectura.errorCrudo,
      notAvailable: lectura.notAvailable,
      refetch: async () => {},
      createConnection: async () => ({ ok: true }),
      patchConnection: async () => ({ ok: true }),
    }),
  }
})
vi.mock('sonner', () => ({ toast: { success: () => {}, error: () => {} } }))

import ConciliacionConexionesPage from './page'
import { caidaDelAsistente } from '@/lib/api/agent-fetch'

let host: HTMLDivElement
let root: Root

beforeEach(() => {
  lectura.error = null
  lectura.errorCrudo = null
  lectura.notAvailable = false
  // `FalloDeCarga` pregunta al back por el estado del servicio: sin red en la prueba.
  vi.spyOn(globalThis, 'fetch').mockRejectedValue(new TypeError('Failed to fetch'))
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
})

afterEach(async () => {
  await act(async () => root.unmount())
  host.remove()
  vi.restoreAllMocks()
})

describe('Conexiones — con el micro caído', () => {
  it('🔴 la lista que no llegó dice que se cayó el asistente', async () => {
    lectura.error = 'Failed to fetch'
    lectura.errorCrudo = caidaDelAsistente(new TypeError('Failed to fetch'))
    await act(async () => {
      root.render(<ConciliacionConexionesPage />)
    })
    await act(async () => {
      await new Promise((r) => setTimeout(r, 0))
    })
    const texto = host.querySelector('[data-testid="fallo-de-carga"]')?.textContent ?? ''
    expect(texto).toMatch(/El asistente de Leasefy no está disponible/)
    expect(texto).not.toMatch(/problema nuestro/i)
  })

  it('🔴 con el micro caído no dice «no están disponibles en tu cuenta todavía»', async () => {
    lectura.error = 'Failed to fetch'
    lectura.errorCrudo = caidaDelAsistente(new TypeError('Failed to fetch'))
    await act(async () => {
      root.render(<ConciliacionConexionesPage />)
    })
    expect(host.querySelector('[data-testid="conexiones-backend-warning"]')).toBeNull()
    expect(host.textContent).not.toContain('en tu cuenta todavía')
    // La pantalla sigue entera: el botón de registrar está (su envío se apaga sin el micro).
    const registrar = host.querySelector<HTMLButtonElement>('[data-testid="conexiones-abrir-registro"]')
    expect(registrar).not.toBeNull()
  })

  it('cuando la ruta todavía no existe en el micro (404/503), el aviso sigue', async () => {
    lectura.notAvailable = true
    await act(async () => {
      root.render(<ConciliacionConexionesPage />)
    })
    expect(host.querySelector('[data-testid="conexiones-backend-warning"]')?.textContent).toContain(
      'no están disponibles en tu cuenta todavía',
    )
  })
})
