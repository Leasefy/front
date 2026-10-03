/**
 * La ficha del asesor mientras carga (ARREGLOS-8, bug visto por MOV-A6,
 * 03-10-2026).
 *
 * 🔴 La página sólo leía `agente` de `useAgente`: mientras el dato venía en
 * camino era `null` y la ficha decía «Agente no encontrado — El agente que
 * buscas no existe o ha sido eliminado», y un instante después aparecía el
 * asesor. Con un 500 o la red caída lo afirmaba para siempre. Ahora: esqueleto
 * mientras carga, `FalloDeCarga` (con reintento) si falló, y el «no
 * encontrado» sólo con un 404 de verdad.
 */
import * as React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

void React
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const { lectura } = vi.hoisted(() => ({
  lectura: {
    agente: null as unknown,
    isLoading: true,
    error: null as string | null,
    errorCrudo: null as unknown,
    refetch: vi.fn(async () => null),
  },
}))

vi.mock('next/navigation', () => ({
  useParams: () => ({ id: 'miembro-1' }),
  useRouter: () => ({ push: vi.fn(), back: vi.fn() }),
}))
vi.mock('@/lib/i18n', async () => await import('@/lib/i18n/i18n-test-stub'))
vi.mock('@/components/auth/PageGuard', () => ({
  PageGuard: ({ children }: { children?: React.ReactNode }) => children,
}))
vi.mock('@/lib/hooks/useInmobiliaria', () => ({
  useAgente: () => lectura,
  useAgenteConsignaciones: () => ({ consignaciones: [], refetch: vi.fn() }),
  useAgentePipeline: () => ({ pipelineItems: [] }),
}))

import AgenteDetailPage from './page'
import { ApiError } from '@/lib/api/client'

let host: HTMLDivElement
let root: Root

beforeEach(() => {
  lectura.agente = null
  lectura.isLoading = true
  lectura.error = null
  lectura.errorCrudo = null
  lectura.refetch.mockClear()
  // `FalloDeCarga` puede preguntar al back por el estado de un servicio: sin red acá.
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

async function montar() {
  await act(async () => {
    root.render(<AgenteDetailPage />)
  })
  await act(async () => {
    await new Promise((r) => setTimeout(r, 0))
  })
}

describe('/configuracion/equipo/[id] — la ficha del asesor', () => {
  it('🔴 mientras carga pinta el esqueleto, no «Agente no encontrado»', async () => {
    await montar()
    expect(host.querySelector('[data-testid="agente-cargando"]')).not.toBeNull()
    expect(host.querySelectorAll('[data-slot="skeleton"]').length).toBeGreaterThan(0)
    expect(host.textContent).not.toContain('Agente no encontrado')
  })

  it('🔴 un 500 no dice que el asesor no existe: dice que falló y deja reintentar', async () => {
    lectura.isLoading = false
    lectura.error = 'Internal Server Error'
    lectura.errorCrudo = new ApiError(500, 'Internal Server Error', 'ERROR_INTERNO', {
      statusCode: 500,
      code: 'ERROR_INTERNO',
      message: 'Internal Server Error',
      referencia: 'ref-asesor-1',
    })
    await montar()
    expect(host.textContent).not.toContain('Agente no encontrado')
    expect(host.querySelector('[data-testid="agente-fallo"]')).not.toBeNull()
    const reintentar = host.querySelector<HTMLButtonElement>('[data-testid="reintentar"]')
    expect(reintentar).not.toBeNull()
    await act(async () => {
      reintentar!.click()
    })
    expect(lectura.refetch).toHaveBeenCalledTimes(1)
    // Y la salida a la lista sigue a la mano.
    expect(host.querySelector('a[href="/panel/inmobiliaria/configuracion/equipo"]')).not.toBeNull()
  })

  it('un 404 de verdad sigue diciendo «Agente no encontrado», con la vuelta a la lista', async () => {
    lectura.isLoading = false
    lectura.error = 'Not Found'
    lectura.errorCrudo = new ApiError(404, 'Not Found', 'NO_EXISTE')
    await montar()
    expect(host.textContent).toContain('Agente no encontrado')
    expect(host.querySelector('a[href="/panel/inmobiliaria/configuracion/equipo"]')).not.toBeNull()
  })
})
