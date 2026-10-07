/**
 * 🔴 El enlace público del estado de cuenta (PRUEBAS-PAGOS, 03-10-2026, hallado
 * en el navegador del laboratorio): un enlace vencido (410) o revocado / que no
 * existe (404) se pintaba «No pudimos cargar esto · Fue un problema nuestro» con
 * «Intentar de nuevo» y una referencia inventada, porque el servicio lanzaba un
 * `Error` sin status. Con el status es un «no existe» con la frase del back.
 */
import { afterEach, describe, expect, it, vi } from 'vitest'

import { estadoDeCuentaPublico } from './estado-de-cuenta.service'
import { clasificarFallo } from '@/lib/errores/clasificar'

function respuesta(status: number, cuerpo: unknown) {
  return new Response(JSON.stringify(cuerpo), { status, headers: { 'Content-Type': 'application/json' } })
}

describe('estadoDeCuentaPublico — el fallo lleva su status', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('un enlace vencido (410) es «no existe» con la frase del back, sin reintentar', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        respuesta(410, { statusCode: 410, message: 'El enlace venció. Pídele uno nuevo a la inmobiliaria.' }),
      ),
    )
    const error = await estadoDeCuentaPublico('vencido').catch((e: unknown) => e)
    expect((error as { detalle?: { statusOriginal?: number } }).detalle?.statusOriginal).toBe(410)
    const fallo = clasificarFallo(error, { queEs: 'el estado de cuenta' } as never)
    expect(fallo.tipo).toBe('noExiste')
    expect(fallo.sePuedeReintentar).toBe(false)
    expect(fallo.mensajeOriginal).toContain('El enlace venció')
  })

  it('un enlace revocado o que no existe (404) tampoco es «un problema nuestro»', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(respuesta(404, { statusCode: 404, message: 'El enlace no existe o fue revocado' })),
    )
    const error = await estadoDeCuentaPublico('no-existe').catch((e: unknown) => e)
    const fallo = clasificarFallo(error, { queEs: 'el estado de cuenta' } as never)
    expect(fallo.tipo).toBe('noExiste')
    expect(fallo.tipo).not.toBe('servidor')
  })

  it('un 5xx del back sigue siendo «de nuestro lado»', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        respuesta(500, { statusCode: 500, code: 'ERROR_INTERNO', message: 'Error interno del servidor', referencia: 'ab12cd34' }),
      ),
    )
    const error = await estadoDeCuentaPublico('roto').catch((e: unknown) => e)
    expect((error as { status?: number }).status).toBe(500)
    expect(clasificarFallo(error, { queEs: 'el estado de cuenta' } as never).tipo).toBe('servidor')
  })
})
