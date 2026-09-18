/**
 * El borde del CRM comercial: qué se considera «todavía no está habilitado» y
 * qué es un fallo de verdad.
 *
 * 🔴 Es la decisión que sostiene las cuatro pantallas nuevas: cada endpoint
 * responde **503 con la migración que falta** mientras Víctor no la aplique, y
 * eso NO es un error que haya que reintentar ni un vacío — es un «próximamente»
 * con motivo. Confundirlos deja al funcionario apretando «Reintentar» contra una
 * migración que no va a aparecer sola.
 */

import { describe, expect, it } from 'vitest'

import { ApiError } from '@/lib/api/client'
import { resultadoDelCrm } from '@/lib/api/crm.service'

function apiError(status: number, mensajes: string[] = []): ApiError {
  // `ApiError(status, message)`: el mensaje puede ser un arreglo, y entonces
  // `.messages` queda poblado (así lo manda el `ValidationPipe` del back).
  return new ApiError(status, mensajes.length ? mensajes : `HTTP ${status}`)
}

describe('resultadoDelCrm', () => {
  it('lo que sale bien viene con sus datos', async () => {
    await expect(resultadoDelCrm(async () => ({ a: 1 }))).resolves.toEqual({
      estado: 'ok',
      datos: { a: 1 },
    })
  })

  it('🔴 un 503 es «no habilitado», y el motivo del back se muestra tal cual', async () => {
    const r = await resultadoDelCrm(async () => {
      throw apiError(503, [
        'Todavía no se puede usar esta parte del CRM en esta base: falta aplicar la migración 20260918160000_leads_contacto_origen_y_asignacion (datos_del_lead).',
      ])
    })
    expect(r.estado).toBe('no-habilitado')
    if (r.estado !== 'no-habilitado') throw new Error('debía ser no-habilitado')
    // El número de la migración es lo que Víctor necesita leer: no se traduce.
    expect(r.motivo).toContain('20260918160000')
  })

  it('un 404 también: el endpoint todavía no está desplegado', async () => {
    const r = await resultadoDelCrm(async () => {
      throw apiError(404)
    })
    expect(r.estado).toBe('no-habilitado')
  })

  it('🔴 un 403 NO es «no habilitado»: es un permiso, y hay que verlo', async () => {
    const r = await resultadoDelCrm(async () => {
      throw apiError(403, ['No tienes permiso'])
    })
    expect(r.estado).toBe('fallo')
    if (r.estado !== 'fallo') throw new Error('debía ser fallo')
    expect(r.status).toBe(403)
  })

  it('un 500 y una caída de red son fallos con reintento', async () => {
    const quinientos = await resultadoDelCrm(async () => {
      throw apiError(500)
    })
    expect(quinientos.estado).toBe('fallo')

    const red = await resultadoDelCrm(async () => {
      throw new TypeError('Failed to fetch')
    })
    expect(red.estado).toBe('fallo')
    if (red.estado !== 'fallo') throw new Error('debía ser fallo')
    expect(red.status).toBeNull()
  })

  it('un 400 es un fallo (el dato está mal), no un «próximamente»', async () => {
    const r = await resultadoDelCrm(async () => {
      throw apiError(400, ['Dinos de dónde vino el lead'])
    })
    expect(r.estado).toBe('fallo')
    if (r.estado !== 'fallo') throw new Error('debía ser fallo')
    expect(r.mensaje).toContain('de dónde vino')
  })
})
