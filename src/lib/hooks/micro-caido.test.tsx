/**
 * 🔴 ARREGLOS-4 (03-10-2026) · Con el micro caído y el back sano, las pantallas
 * dicen «El asistente de Leasefy no está disponible», no «Revisa tu conexión».
 *
 * Nico eligió la A de PRUEBAS-RESTO Q1:
 *  · los hooks que llamaban al micro con `fetch` crudo pasan a `agentFetch`
 *    (ejemplo: el resumen de la conciliación) — su error deja de ser
 *    «Failed to fetch»;
 *  · los hooks del Piloto guardan el error ENTERO, no su texto: con el texto,
 *    la pantalla sólo podía decir «Fue un problema nuestro»; con el error, el
 *    traductor nombra lo caído. Y un 500 llega como el `ApiError` del micro, no
 *    como `Error('500')`.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import * as React from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

void React
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

vi.mock('@/lib/auth', () => ({ useAuth: () => ({ agency: { id: 'agencia-1' } }) }))

import { useConciliacionSummary } from './conciliacion/use-conciliacion-summary'
import { usePilotoActivity } from './piloto/use-piloto-activity'
import { usePilotoPulso } from './piloto/use-piloto-pulso'
import { ApiError } from '@/lib/api/client'
import { mensajeParaLaPersona } from '@/lib/errores/traductor-de-errores'
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

async function montar<T>(usar: () => T): Promise<{ current: T | null }> {
  const r: { current: T | null } = { current: null }
  function Sonda() {
    r.current = usar()
    return null
  }
  await act(async () => {
    root.render(<Sonda />)
  })
  // `conBackoff` reintenta dos veces con espera: se deja correr.
  await act(async () => {
    await new Promise((res) => setTimeout(res, 1800))
  })
  return r
}

describe('🔴 el micro caído, con el back sano', () => {
  it('un hook que antes usaba fetch crudo (resumen de la conciliación) ya no dice «Failed to fetch»', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new TypeError('Failed to fetch'))
    const r = await montar(() => useConciliacionSummary())
    expect(r.current?.error).toMatch(/El asistente de Leasefy no está disponible/)
    expect(r.current?.error).not.toMatch(/Failed to fetch|conexi[oó]n/i)
  })

  it('el Piloto guarda el error ENTERO: el traductor nombra al asistente', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new TypeError('Failed to fetch'))
    const r = await montar(() => usePilotoActivity(10))
    const error = r.current?.error
    expect(error).toBeInstanceOf(ApiError)
    expect(servicioDelError(error)).toBe('asistente')
    expect(mensajeParaLaPersona(error)).toMatch(/El asistente de Leasefy no está disponible/)
  })

  it('un 500 del micro llega al Piloto como su ApiError (status y referencia), no como «500»', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(
      async () =>
        new Response(
          JSON.stringify({ statusCode: 500, code: 'ERROR_INTERNO', message: 'Falló algo de nuestro lado.', referencia: 'abc123' }),
          { status: 500, headers: { 'content-type': 'application/json' } },
        ),
    )
    const r = await montar(() => usePilotoPulso())
    const error = r.current?.error
    expect(error).toBeInstanceOf(ApiError)
    expect((error as ApiError).status).toBe(500)
    expect(mensajeParaLaPersona(error)).toMatch(/abc123/)
  })
})
