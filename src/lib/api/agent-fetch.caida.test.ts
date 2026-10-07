/**
 * 🔴 03-10-2026 (pruebas en el navegador) · El micro caído es UNA parte de
 * Leasefy (capa 2, servicio `asistente`), no la red de la persona.
 *
 * Con el micro apagado y el back sano, el Piloto decía «No pudimos
 * conectarnos · Revisa tu conexión». `agentFetch` lo dice ahora como capa 2,
 * y sólo cuando puede afirmarlo: hay red y el back viene respondiendo.
 */
import { describe, it, expect, vi, afterEach } from 'vitest'
import { agentFetch, caidaDelAsistente } from './agent-fetch'
import { ApiError } from './client'
import {
  avisarFallaDeRed,
  reiniciarEstadoDeConexion,
} from '@/lib/conexion/estado-de-conexion'
import { mensajeParaLaPersona } from '@/lib/errores/traductor-de-errores'
import { servicioDelError } from '@/lib/conexion/servicio-no-disponible'

afterEach(() => {
  vi.restoreAllMocks()
  reiniciarEstadoDeConexion()
})

const MICRO = 'http://localhost:4300/api/agency/a/ai-hub/inbox'

describe('agentFetch — el micro que no responde', () => {
  it('🔴 con red y el back respondiendo, es «el asistente de Leasefy no está disponible» (503 SERVICIO_NO_DISPONIBLE, servicio asistente)', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new TypeError('Failed to fetch'))
    const error = await agentFetch(MICRO).then(
      () => null,
      (e: unknown) => e,
    )
    expect(error).toBeInstanceOf(ApiError)
    expect((error as ApiError).status).toBe(503)
    expect((error as ApiError).code).toBe('SERVICIO_NO_DISPONIBLE')
    expect(servicioDelError(error)).toBe('asistente')
    const texto = mensajeParaLaPersona(error)
    expect(texto).toMatch(/El asistente de Leasefy no está disponible/)
    expect(texto).not.toMatch(/conexi[oó]n/i)
  })

  it('sin red en el navegador, el `TypeError` sigue TAL CUAL (lo dice la franja: sin internet)', async () => {
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false)
    const red = new TypeError('Failed to fetch')
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(red)
    await expect(agentFetch(MICRO)).rejects.toBe(red)
  })

  it('con Leasefy entero sin responder (el back tampoco contesta), el `TypeError` sigue TAL CUAL', async () => {
    avisarFallaDeRed()
    const red = new TypeError('Failed to fetch')
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(red)
    await expect(agentFetch(MICRO)).rejects.toBe(red)
  })

  it('un `AbortError` (la pantalla canceló) nunca se vuelve una caída', () => {
    const abortado = new DOMException('The operation was aborted.', 'AbortError')
    expect(caidaDelAsistente(abortado)).toBe(abortado)
  })

  it('un error que no es de red tampoco', () => {
    const otro = new Error('algo distinto')
    expect(caidaDelAsistente(otro)).toBe(otro)
  })

  it('una respuesta del micro (aunque sea 503) llega como `Response`, sin tocarla', async () => {
    const res = new Response(JSON.stringify({ statusCode: 503, code: 'FALTA_UNA_MIGRACION' }), { status: 503 })
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(res)
    await expect(agentFetch(MICRO)).resolves.toBe(res)
  })
})
