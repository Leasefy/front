/**
 * QA-IA-95 (05-10-2026, IA95-06): con Fixi apagado, la Bandeja priorizada de mantenimientos decía
 * «Revisa tu conexión y vuelve a intentar»: el hook lanzaba la respuesta 404 `feature_not_enabled`
 * dentro del `try` y el `catch` la pisaba con el texto de la red caída.
 */
import { describe, it, expect } from 'vitest'
import { AGENTE_APAGADO, RespuestaDelAgente, mensajeDeErrorDeRed } from './traer-del-agente'

describe('una respuesta que llegó no se culpa a la red (QA-IA-95)', () => {
  it('el 404 del agente apagado dice que está apagado, no «revisa tu conexión»', () => {
    const err = new RespuestaDelAgente(new Response(null, { status: 404 }), 'la bandeja de mantenimiento')
    const texto = mensajeDeErrorDeRed(err, 'la bandeja de mantenimiento')
    expect(texto).toBe(AGENTE_APAGADO)
    expect(texto).not.toMatch(/conexión/)
  })
  it('sin respuesta (la red de verdad), sí habla de la conexión', () => {
    expect(mensajeDeErrorDeRed(new TypeError('Failed to fetch'), 'la bandeja')).toMatch(/Revisa tu conexión/)
  })
})
