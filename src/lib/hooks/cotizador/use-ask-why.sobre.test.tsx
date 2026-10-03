/**
 * useAskWhy — el sobre de error del micro, en español (02-10-2026).
 *
 * El modal del «¿y si…?» del cotizador mostraba «Error de validación:
 * invalid_variable» (el `error` del cuerpo viejo, en inglés) y cualquier otro
 * fallo como un «error genérico». Ahora el micro responde el sobre
 * `{ statusCode, code, message, campos?, referencia? }` (conservando `error`)
 * y el hook lo pasa por el traductor: «conexión» sólo sin respuesta; un 4xx
 * dice qué está mal; un 5xx, «de nuestro lado» con la referencia.
 */

import * as React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

vi.mock('@/lib/auth', () => ({
  useAuth: () => ({ agency: { id: 'agency-test' } }),
}))

import { useAskWhy, type AskWhyError } from './use-ask-why'

void React
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

let container: HTMLDivElement
let root: Root
const ORIGINAL_AGENT_URL = process.env.NEXT_PUBLIC_AGENT_URL

beforeEach(() => {
  process.env.NEXT_PUBLIC_AGENT_URL = 'http://agent.test'
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
})

afterEach(() => {
  act(() => root.unmount())
  container.remove()
  vi.restoreAllMocks()
  process.env.NEXT_PUBLIC_AGENT_URL = ORIGINAL_AGENT_URL
})

/** Monta el hook, pregunta y devuelve el error con que quedó. */
async function preguntarCon(respuesta: () => Promise<Response>, agencyId: string | null = 'agency-test') {
  vi.spyOn(globalThis, 'fetch').mockImplementation(respuesta)
  const actual: { error: AskWhyError | null; mutate: ReturnType<typeof useAskWhy>['mutate'] | null } = {
    error: null,
    mutate: null,
  }
  function Wrapper() {
    const hook = useAskWhy(agencyId)
    actual.error = hook.error
    actual.mutate = hook.mutate
    return null
  }
  act(() => root.render(<Wrapper />))
  let lanzado: unknown
  await act(async () => {
    try {
      await actual.mutate!({ quote_id: 'q1', variable: 'canon', new_value: 1 })
    } catch (e) {
      lanzado = e
    }
  })
  return { error: actual.error, lanzado }
}

const json = (status: number, cuerpo: unknown) => async () =>
  new Response(JSON.stringify(cuerpo), { status, headers: { 'content-type': 'application/json' } })

/** Lo que nunca debe leer la persona. */
function sinJerga(texto: string) {
  expect(texto).not.toMatch(/invalid|error_|HTTP|\b[45]\d\d\b|Forbidden|Internal/i)
}

describe('useAskWhy — el sobre de error, en español', () => {
  it('🔴 un 400 con el sobre dice su `message` y trae `campos`; nunca el `error` en inglés', async () => {
    const { error, lanzado } = await preguntarCon(
      json(400, {
        statusCode: 400,
        code: 'DATOS_INVALIDOS',
        message: ['El canon debe ser mayor que cero.'],
        campos: [{ campo: 'new_value', regla: 'minimo', mensaje: 'El canon debe ser mayor que cero.' }],
        error: 'invalid_value',
      }),
    )
    expect(error?.code).toBe(400)
    expect(error?.mensaje).toBe('El canon debe ser mayor que cero.')
    if (error?.code === 400) {
      expect(error.message).toBe('El canon debe ser mayor que cero.')
      expect(error.campos).toEqual([
        { campo: 'new_value', regla: 'minimo', mensaje: 'El canon debe ser mayor que cero.' },
      ])
      expect(error.status).toBe(400)
    }
    expect(lanzado).toBe(error)
  })

  it('🔴 un 400 viejo (sólo `error` en inglés) dice una frase en español, sin el código', async () => {
    const { error } = await preguntarCon(json(400, { error: 'invalid_variable' }))
    expect(error?.code).toBe(400)
    expect(error?.mensaje).toBe('No pudimos explicar ese cambio. Revisa el valor e intenta de nuevo.')
    sinJerga(error!.mensaje)
  })

  it('🔴 un 5xx dice «de nuestro lado» con la referencia, sin culpar a la conexión', async () => {
    const { error } = await preguntarCon(
      json(500, { statusCode: 500, code: 'ERROR_INTERNO', message: 'Error interno del servidor.', referencia: 'ab12cd34', error: 'internal_error' }),
    )
    expect(error?.code).toBe(500)
    expect(error?.mensaje).toContain('No pudimos explicar ese cambio: algo falló de nuestro lado')
    expect(error?.mensaje).toContain('ab12cd34')
    expect(error?.mensaje).not.toMatch(/conexi/i)
  })

  it('un 5xx sin cuerpo (el balanceador) tampoco dice «503» ni culpa a la conexión', async () => {
    const { error } = await preguntarCon(async () => new Response('boom', { status: 503 }))
    expect(error?.code).toBe(500)
    expect(error?.mensaje).toMatch(/de nuestro lado/)
    sinJerga(error!.mensaje)
    expect(error?.mensaje).not.toMatch(/conexi/i)
  })

  it('un 403 dice el `message` del sobre (no «conexión», no un error genérico)', async () => {
    const { error } = await preguntarCon(
      json(403, { statusCode: 403, code: 'SIN_PERMISO', message: 'Tu rol no puede usar el cotizador.', error: 'forbidden' }),
    )
    expect(error?.code).toBe(400)
    expect(error?.mensaje).toBe('Tu rol no puede usar el cotizador.')
    if (error?.code === 400) expect(error.status).toBe(403)
  })

  it('el tope del día (429) conserva cap/used/resets_at y dice su frase en español', async () => {
    const { error } = await preguntarCon(
      json(429, { error: 'daily_ask_why_cap_exceeded', cap: 50, used: 50, resets_at: '2026-10-03T05:00:00Z' }),
    )
    expect(error?.code).toBe(429)
    if (error?.code === 429) expect(error.cap).toBe(50)
    expect(error?.mensaje).toBe('Usaste las 50 preguntas de hoy. Vuelve a preguntar mañana.')
  })

  it('el 404 conserva su código y dice que la cotización ya no está', async () => {
    const { error } = await preguntarCon(json(404, { error: 'quote_not_found' }))
    expect(error?.code).toBe(404)
    expect(error?.mensaje).toBe('Esta cotización ya no está disponible.')
  })

  it('🔴 «conexión» SÓLO sin respuesta: el TypeError del fetch (navegador y Node), sin internet', async () => {
    const enLinea = vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false)
    try {
      for (const texto of ['Failed to fetch', 'fetch failed']) {
        const { error } = await preguntarCon(async () => {
          throw new TypeError(texto)
        })
        expect(error?.code).toBe('network')
        expect(error?.mensaje).toMatch(/conexión/)
        expect(error?.mensaje).not.toContain(texto)
      }
    } finally {
      enLinea.mockRestore()
    }
  })

  it('🔴 ARREGLOS-4 · con el micro caído y el back sano: «el asistente no está disponible», no «de nuestro lado» ni la conexión', async () => {
    const { error } = await preguntarCon(async () => {
      throw new TypeError('Failed to fetch')
    })
    expect(error?.code).toBe(500)
    expect(error?.mensaje).toMatch(/El asistente de Leasefy no está disponible/)
    expect(error?.mensaje).not.toMatch(/conexi[oó]n/i)
  })

  it('una respuesta 200 que no se puede leer NO es la conexión, y no se muestra el error de JavaScript', async () => {
    const { error } = await preguntarCon(async () => new Response('{', { status: 200 }))
    expect(error?.code).toBe(500)
    expect(error?.mensaje).toMatch(/de nuestro lado/)
    expect(error?.mensaje).not.toMatch(/conexi|JSON|Unexpected/i)
  })

  it('el corte por tiempo (también el DOMException de abort, que trae `code`) llega como timeout', async () => {
    const { error } = await preguntarCon(async () => {
      throw new DOMException('The operation was aborted.', 'AbortError')
    })
    expect(error?.code).toBe('timeout')
    expect(error?.mensaje).toMatch(/tardó demasiado/)
    expect(error?.mensaje).not.toMatch(/conexi/i)
  })

  it('sin la URL del micro no culpa a la conexión', async () => {
    process.env.NEXT_PUBLIC_AGENT_URL = ''
    const { error } = await preguntarCon(json(200, {}))
    expect(error?.code).toBe(500)
    expect(error?.mensaje).not.toMatch(/conexi/i)
  })
})
