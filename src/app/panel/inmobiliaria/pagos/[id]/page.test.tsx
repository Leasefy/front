/**
 * ARREGLOS-7 (MOV-A1, 03-10-2026) · `/pagos/[id]` con el micro respondiendo
 * un 500 decía «No pudimos cargar este caso.» y debajo «500», crudo. El hook
 * guarda ahora el error ENTERO (`errorCrudo`) y la página lo dice con el
 * traductor: «de nuestro lado», sin culpar a nadie.
 */
import * as React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

void React
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

vi.mock('next/navigation', () => ({
  useParams: () => ({ id: 'vb-1' }),
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}))
vi.mock('@/lib/i18n', async () => await import('@/lib/i18n/i18n-test-stub'))
vi.mock('@/components/auth/PageGuard', () => ({
  PageGuard: ({ children }: { children?: React.ReactNode }) => children,
}))
vi.mock('@/lib/auth', () => ({ useAuth: () => ({ agency: { id: 'agencia-1' } }) }))

import PagosCasoPage from './page'
import { reiniciarEstadoDeConexion } from '@/lib/conexion/estado-de-conexion'

let host: HTMLDivElement
let root: Root

beforeEach(() => {
  vi.stubEnv('NEXT_PUBLIC_AGENT_URL', 'http://micro.test')
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
})

afterEach(() => {
  act(() => root.unmount())
  host.remove()
  vi.restoreAllMocks()
  vi.unstubAllEnvs()
  reiniciarEstadoDeConexion()
})

async function montarConRespuesta(status: number, cuerpo: Record<string, unknown>) {
  vi.spyOn(globalThis, 'fetch').mockImplementation(
    async () =>
      new Response(JSON.stringify(cuerpo), {
        status,
        headers: { 'content-type': 'application/json' },
      }),
  )
  await act(async () => {
    root.render(<PagosCasoPage />)
  })
  await act(async () => {
    await new Promise((r) => setTimeout(r, 50))
  })
}

describe('/pagos/[id] — el caso que no se pudo cargar', () => {
  it('🔴 un 500 del micro no se muestra como «500»: dice «de nuestro lado»', async () => {
    await montarConRespuesta(500, {
      statusCode: 500,
      code: 'ERROR_INTERNO',
      message: 'Internal Server Error',
    })

    const tarjeta = host.querySelector('[data-testid="pago-caso-error"]')
    expect(tarjeta).not.toBeNull()
    const motivo = host.querySelector('[data-testid="pago-caso-error-motivo"]')?.textContent ?? ''
    expect(motivo).not.toMatch(/^\s*500\s*$/)
    expect(motivo).toMatch(/de nuestro lado/)
    // El título y el reintento siguen como estaban.
    expect(tarjeta?.textContent).toContain('No pudimos cargar este caso.')
    expect(tarjeta?.textContent).toContain('Reintentar')
  })

  it('un 404 sigue siendo «no disponible aquí», no un fallo', async () => {
    await montarConRespuesta(404, { statusCode: 404, code: 'NO_EXISTE', message: 'No existe' })
    expect(host.querySelector('[data-testid="pago-caso-no-disponible"]')).not.toBeNull()
    expect(host.querySelector('[data-testid="pago-caso-error"]')).toBeNull()
  })
})
