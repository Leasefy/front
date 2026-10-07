/**
 * 🔴 ARREGLOS-7 (ARREGLOS-4 Q1 A, 03-10-2026) · Con el micro caído, la
 * conciliación decía «Fue un problema nuestro»: sus hooks guardaban sólo el
 * TEXTO del error y la pantalla se lo pasaba a `FalloDeCarga`, que con un
 * texto no puede saber qué se cayó. Ahora guardan también el error ENTERO
 * (`errorCrudo`): el `ApiError` del micro (status, `code`, referencia) o el
 * 503 del asistente que arma `agentFetch`. El texto de `error` no cambia (hay
 * pantallas que lo leen).
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import * as React from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

void React
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

vi.mock('@/lib/auth', () => ({ useAuth: () => ({ agency: { id: 'agencia-1' } }) }))

import { useConciliacionSummary } from './use-conciliacion-summary'
import { useConciliacionQueue } from './use-conciliacion-queue'
import { useConciliacionConnections } from './use-conciliacion-connections'
import { useConciliacionSettlements } from './use-conciliacion-settlements'
import { ApiError } from '@/lib/api/client'
import { mensajeParaLaPersona } from '@/lib/errores/traductor-de-errores'
import { clasificarFallo } from '@/lib/errores/clasificar'
import { servicioDelError } from '@/lib/conexion/servicio-no-disponible'
import { reiniciarEstadoDeConexion } from '@/lib/conexion/estado-de-conexion'

let root: Root
let container: HTMLDivElement

beforeEach(() => {
  vi.stubEnv('NEXT_PUBLIC_AGENT_URL', 'http://micro.test')
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
})

afterEach(() => {
  act(() => root.unmount())
  container.remove()
  vi.restoreAllMocks()
  vi.unstubAllEnvs()
  reiniciarEstadoDeConexion()
})

type ConError = { error: string | null; errorCrudo: unknown }

async function montar(usar: () => ConError): Promise<{ current: ConError | null }> {
  const r: { current: ConError | null } = { current: null }
  function Sonda() {
    r.current = usar()
    return null
  }
  await act(async () => {
    root.render(<Sonda />)
  })
  await act(async () => {
    await new Promise((res) => setTimeout(res, 50))
  })
  return r
}

const HOOKS: [string, () => ConError][] = [
  ['el resumen', () => useConciliacionSummary()],
  ['la cola', () => useConciliacionQueue()],
  ['las conexiones', () => useConciliacionConnections()],
  ['las liquidaciones', () => useConciliacionSettlements()],
]

describe.each(HOOKS)('🔴 %s de la conciliación guarda el error entero', (_nombre, usar) => {
  it('un 500 del micro: el ApiError con su referencia; `error` sigue siendo «500»', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(
      async () =>
        new Response(
          JSON.stringify({ statusCode: 500, code: 'ERROR_INTERNO', message: 'Internal Server Error', referencia: 'ref-7a7' }),
          { status: 500, headers: { 'content-type': 'application/json' } },
        ),
    )
    const r = await montar(usar)
    expect(r.current?.error).toBe('500')
    const crudo = r.current?.errorCrudo
    expect(crudo).toBeInstanceOf(ApiError)
    expect((crudo as ApiError).status).toBe(500)
    expect(mensajeParaLaPersona(crudo)).toMatch(/de nuestro lado/)
    expect(mensajeParaLaPersona(crudo)).toMatch(/ref-7a7/)
  })

  it('con el micro caído, lo que va a FalloDeCarga dice que se cayó el asistente', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new TypeError('Failed to fetch'))
    const r = await montar(usar)
    const crudo = r.current?.errorCrudo
    expect(servicioDelError(crudo)).toBe('asistente')
    expect(clasificarFallo(crudo).tipo).toBe('servicioNoDisponible')
    expect(mensajeParaLaPersona(crudo)).toMatch(/El asistente de Leasefy no está disponible/)
  })
})
