/**
 * @vitest-environment happy-dom
 *
 * Capa 2 de las caídas (01-10-2026): se cayó UNA parte de Leasefy. Se fija el
 * clasificador, los textos y la regla de oro: «nuestro equipo ya está avisado»
 * sólo si el back lo confirma para ESE servicio.
 */
import * as React from 'react'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '@/lib/api/client'
import { mensajeDelFallo } from '@/lib/contratos/fallo-de-accion'
import { errorEnCristiano } from '@/lib/errores/en-cristiano'
import { descripcionDelError, motivosDelError } from '@/lib/errores/descripcion-del-error'
import { clasificarFallo } from '@/lib/errores/clasificar'
import { CODIGO_LEASEFY_NO_RESPONDE, MENSAJE_LEASEFY_NO_RESPONDE } from './estado-de-conexion'
import {
  consultarEstadoDeLosServicios,
  esCaidaDeLaBase,
  esServicioNoDisponible,
  mensajeDeCaida,
  olvidarEstadoDeLosServicios,
  servicioDelError,
  textoDeServicioNoDisponible,
  textoParaUnAviso,
  useEstadoDelServicio,
  type ServicioId,
} from './servicio-no-disponible'

/** Un 503 de servicio tal como lo arma `apiClient`. */
function caido(servicio?: string) {
  const cuerpo = {
    statusCode: 503,
    code: 'SERVICIO_NO_DISPONIBLE',
    ...(servicio ? { servicio } : {}),
    message: 'El micro no responde',
  }
  return new ApiError(503, cuerpo.message, 'SERVICIO_NO_DISPONIBLE', cuerpo)
}

describe('el clasificador', () => {
  it('reconoce el 503 SERVICIO_NO_DISPONIBLE', () => {
    expect(esServicioNoDisponible(caido('asistente'))).toBe(true)
  })

  it('un 503 con otro code NO es una caída', () => {
    expect(
      esServicioNoDisponible(
        new ApiError(503, 'falta', 'CENTRO_DE_PROCESOS_SIN_MIGRACION', { statusCode: 503 }),
      ),
    ).toBe(false)
    expect(esServicioNoDisponible(new ApiError(503, 'falta', 'FALTA_UNA_MIGRACION'))).toBe(false)
    expect(esServicioNoDisponible(new ApiError(503, 'Error 503'))).toBe(false)
  })

  it('el code con otro status tampoco', () => {
    expect(esServicioNoDisponible(new ApiError(500, 'x', 'SERVICIO_NO_DISPONIBLE'))).toBe(false)
  })

  it('reconoce el 502 de los proxies de avalúos y cotizador, que traen el contrato', () => {
    expect(esServicioNoDisponible(new ApiError(502, 'x', 'SERVICIO_NO_DISPONIBLE', { servicio: 'avaluos' }))).toBe(true)
  })

  it('un 5xx con `servicio` es una caída aunque el code sea otro (WOMPI_NO_RESPONDIO)', () => {
    const wompi = new ApiError(502, 'fetch failed', 'WOMPI_NO_RESPONDIO', {
      statusCode: 502,
      code: 'WOMPI_NO_RESPONDIO',
      servicio: 'pagos',
    })
    expect(esServicioNoDisponible(wompi)).toBe(true)
    expect(servicioDelError(wompi)).toBe('pagos')
  })

  it('el mismo 502 de Wompi SIN `servicio` es un «no» de Wompi, no una caída', () => {
    const noDeWompi = new ApiError(502, 'Cuenta inválida', 'WOMPI_NO_RESPONDIO', {
      statusCode: 502,
      code: 'WOMPI_NO_RESPONDIO',
    })
    expect(esServicioNoDisponible(noDeWompi)).toBe(false)
  })

  it('la base caída se reconoce aparte: va por la capa 1', () => {
    const base = new ApiError(503, 'x', 'SERVICIO_NO_DISPONIBLE', {
      statusCode: 503,
      code: 'SERVICIO_NO_DISPONIBLE',
      servicio: 'base',
    })
    expect(esCaidaDeLaBase(base)).toBe(true)
    expect(esCaidaDeLaBase(caido('pagos'))).toBe(false)
    expect(mensajeDeCaida(base)).toBe(MENSAJE_LEASEFY_NO_RESPONDE)
    expect(clasificarFallo(base).tipo).toBe('leasefyNoResponde')
  })

  it('lo reconoce aunque el error haya perdido la clase (re-envuelto o plano)', () => {
    expect(
      esServicioNoDisponible({ status: 503, body: { code: 'SERVICIO_NO_DISPONIBLE', servicio: 'pagos' } }),
    ).toBe(true)
    expect(esServicioNoDisponible({ statusCode: 503, code: 'SERVICIO_NO_DISPONIBLE' })).toBe(true)
  })

  it('dice qué servicio, y null si no lo dijo o no lo conocemos', () => {
    expect(servicioDelError(caido('pagos'))).toBe('pagos')
    expect(servicioDelError(caido())).toBeNull()
    expect(servicioDelError(caido('teletransportador'))).toBeNull()
    expect(servicioDelError(new ApiError(500, 'x'))).toBeNull()
  })
})

describe('los textos', () => {
  it('nombra lo que se cayó, con su número', () => {
    expect(textoDeServicioNoDisponible('pagos').titulo).toBe(
      'Los pagos con Wompi no están disponibles en este momento',
    )
    expect(textoDeServicioNoDisponible('asistente').titulo).toBe(
      'El asistente de Leasefy no está disponible en este momento',
    )
  })

  it('un servicio desconocido o ausente da el genérico', () => {
    expect(textoDeServicioNoDisponible(null).titulo).toBe('Esta parte de Leasefy no está respondiendo')
    expect(
      textoDeServicioNoDisponible('nave' as unknown as ServicioId).titulo,
    ).toBe('Esta parte de Leasefy no está respondiendo')
  })

  it('dice que lo demás sigue y que no es culpa de la persona, sin código ni jerga', () => {
    const { titulo, detalle } = textoDeServicioNoDisponible('correo')
    expect(detalle).toBe(
      'Lo demás de Leasefy sigue funcionando. No es nada que hayas hecho; vuelve a intentar en unos minutos.',
    )
    expect(`${titulo} ${detalle}`).not.toMatch(/503|c[óo]digo|error/i)
  })

  it('con la base caída NO dice que lo demás funciona: no sería cierto', () => {
    expect(textoDeServicioNoDisponible('base').detalle).toMatch(/^Lo que ya guardaste está a salvo\./)
  })

  it('«nuestro equipo ya está avisado» sólo si se lo piden', () => {
    expect(textoDeServicioNoDisponible('ia').detalle).not.toContain('equipo')
    expect(textoDeServicioNoDisponible('ia', { equipoAvisado: true }).detalle).toMatch(
      /Nuestro equipo ya está avisado\.$/,
    )
  })

  it('cada servicio del contrato tiene nombre propio', () => {
    const todos: ServicioId[] = [
      'asistente', 'avaluos', 'pagos', 'correo', 'whatsapp', 'archivos',
      'base', 'colas', 'ia', 'facturacion-electronica', 'firma',
    ]
    for (const s of todos) {
      expect(textoDeServicioNoDisponible(s).titulo).not.toContain('Esta parte')
    }
  })
})

describe('los ayudantes de mensajes de error dicen la caída, no el crudo', () => {
  const error = caido('pagos')
  const esperado = textoParaUnAviso('pagos')

  it('mensajeDelFallo', () => {
    expect(mensajeDelFallo(error, 'No se pudo')).toBe(esperado)
  })
  it('errorEnCristiano', () => {
    expect(errorEnCristiano(error, 'No se pudo')).toBe(esperado)
  })
  it('descripcionDelError: la caída con su texto; un 5xx normal dice que fue nuestro (02-10-2026)', () => {
    expect(descripcionDelError(error)).toBe(esperado)
    expect(descripcionDelError(new ApiError(500, 'Internal server error'))).toMatch(/de nuestro lado/)
  })
  it('motivosDelError', () => {
    expect(motivosDelError(error)).toEqual([esperado])
  })
  it('clasificarFallo: tipo propio, se puede reintentar y la descripción se basta sola', () => {
    const fallo = clasificarFallo(error)
    expect(fallo.tipo).toBe('servicioNoDisponible')
    expect(fallo.sePuedeReintentar).toBe(true)
    expect(fallo.descripcion).toBe(esperado)
  })
  it('Leasefy entero sin responder también tiene su texto', () => {
    const general = new ApiError(503, MENSAJE_LEASEFY_NO_RESPONDE, CODIGO_LEASEFY_NO_RESPONDE, {})
    expect(mensajeDeCaida(general)).toBe(MENSAJE_LEASEFY_NO_RESPONDE)
    expect(clasificarFallo(general).tipo).toBe('leasefyNoResponde')
  })
  it('lo que no es caída sigue como siempre', () => {
    expect(mensajeDeCaida(new ApiError(400, 'El NIT es requerido'))).toBeNull()
    expect(mensajeDelFallo(new ApiError(400, 'El NIT es requerido'), 'x')).toBe('El NIT es requerido')
  })
})

describe('GET /health/servicios', () => {
  beforeEach(() => olvidarEstadoDeLosServicios())

  function responde(json: unknown, ok = true) {
    return vi.fn().mockResolvedValue({ ok, json: async () => json }) as unknown as typeof fetch
  }

  it('lee la forma del contrato', async () => {
    const f = responde({
      revisadoEn: '2026-10-01T22:00:00.000Z',
      servicios: [{ servicio: 'asistente', estado: 'caido', desde: '2026-10-01T21:40:00.000Z', equipoAvisado: true }],
    })
    const r = await consultarEstadoDeLosServicios(f)
    expect(r?.servicios[0]).toEqual({
      servicio: 'asistente',
      estado: 'caido',
      desde: '2026-10-01T21:40:00.000Z',
      equipoAvisado: true,
    })
    expect(String((f as unknown as ReturnType<typeof vi.fn>).mock.calls[0][0])).toMatch(/\/health\/servicios$/)
  })

  it('un equipoAvisado que no es `true` explícito no promete nada', async () => {
    const r = await consultarEstadoDeLosServicios(
      responde({ servicios: [{ servicio: 'pagos', estado: 'caido', equipoAvisado: 'si' }] }),
    )
    expect(r?.servicios[0].equipoAvisado).toBe(false)
  })

  it('si el endpoint no existe (back viejo) o falla, null', async () => {
    expect(await consultarEstadoDeLosServicios(responde({ message: 'Not Found' }, false))).toBeNull()
    olvidarEstadoDeLosServicios()
    const rota = vi.fn().mockRejectedValue(new TypeError('Failed to fetch')) as unknown as typeof fetch
    expect(await consultarEstadoDeLosServicios(rota)).toBeNull()
  })

  it('varios carteles a la vez comparten una sola pregunta', async () => {
    const f = responde({ servicios: [] })
    await Promise.all([consultarEstadoDeLosServicios(f), consultarEstadoDeLosServicios(f)])
    expect(f).toHaveBeenCalledTimes(1)
  })
})

describe('useEstadoDelServicio', () => {
  let container: HTMLDivElement
  let root: Root
  const visto: Array<ReturnType<typeof useEstadoDelServicio>> = []

  function Sonda({ servicio }: { servicio: ServicioId | null }) {
    visto.push(useEstadoDelServicio(servicio))
    return null
  }

  beforeEach(() => {
    ;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
    olvidarEstadoDeLosServicios()
    visto.length = 0
    container = document.createElement('div')
    root = createRoot(container)
  })

  afterEach(() => {
    act(() => root.unmount())
    vi.unstubAllGlobals()
  })

  it('sin servicio no pregunta nada', async () => {
    const f = vi.fn()
    vi.stubGlobal('fetch', f)
    await act(async () => root.render(<Sonda servicio={null} />))
    expect(f).not.toHaveBeenCalled()
    expect(visto.at(-1)).toBeNull()
  })

  it('con servicio pregunta y devuelve lo de ESE servicio', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          servicios: [
            { servicio: 'pagos', estado: 'caido', desde: null, equipoAvisado: false },
            { servicio: 'asistente', estado: 'caido', desde: null, equipoAvisado: true },
          ],
        }),
      }),
    )
    await act(async () => root.render(<Sonda servicio="asistente" />))
    expect(visto.at(-1)?.equipoAvisado).toBe(true)
  })
})

void React
