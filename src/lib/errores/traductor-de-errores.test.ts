import { afterEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '@/lib/api/client'
import { CODIGO_LEASEFY_NO_RESPONDE, MENSAJE_LEASEFY_NO_RESPONDE } from '@/lib/conexion/estado-de-conexion'
import {
  MENSAJE_SIN_INTERNET,
  MENSAJE_SIN_RESPUESTA,
  camposDelError,
  leerFallo,
  mensajeParaLaPersona,
} from './traductor-de-errores'

/**
 * 🔴 02-10-2026 · La regla de oro: «conexión» SÓLO cuando no hubo respuesta.
 * El caso que lo disparó: un 500 del back (P2020 en el onboarding del
 * inquilino) se leía «Revisa tu conexión».
 */

/** Un 400 como lo manda el back desde el 02-10-2026. */
function cuatrocientosConCampos() {
  const cuerpo = {
    statusCode: 400,
    code: 'DATOS_INVALIDOS',
    message: ['El presupuesto no puede pasar de $2.000.000.000 al mes. Revisa que no sobren ceros.'],
    campos: [
      {
        campo: 'budgetMax',
        regla: 'maximo',
        mensaje: 'El presupuesto no puede pasar de $2.000.000.000 al mes. Revisa que no sobren ceros.',
        valor: 30_000_000_000,
      },
    ],
  }
  return new ApiError(400, cuerpo.message, cuerpo.code, cuerpo)
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('leerFallo: qué pasó, venga como venga', () => {
  it('red caída: el TypeError del navegador y el ApiError(0) del cliente son «sin respuesta»', () => {
    expect(leerFallo(new TypeError('Failed to fetch')).tipo).toBe('sinRespuesta')
    expect(leerFallo(new ApiError(0, 'No pudimos conectarnos al servidor. (Failed to fetch)')).tipo).toBe('sinRespuesta')
  })

  it('un 400 con campos: tipo datos, con los campos del contrato', () => {
    const f = leerFallo(cuatrocientosConCampos())
    expect(f.tipo).toBe('datos')
    expect(f.code).toBe('DATOS_INVALIDOS')
    expect(f.campos).toEqual([
      expect.objectContaining({ campo: 'budgetMax', regla: 'maximo', valor: 30_000_000_000 }),
    ])
  })

  it('un 409, un 404, un 403, un 401 y un 429 tienen su tipo', () => {
    expect(leerFallo(new ApiError(409, 'Ya existe.', 'YA_EXISTE')).tipo).toBe('conflicto')
    expect(leerFallo(new ApiError(404, 'No existe.')).tipo).toBe('noExiste')
    expect(leerFallo(new ApiError(403, 'No.')).tipo).toBe('sinPermiso')
    expect(leerFallo(new ApiError(401, 'No autorizado')).tipo).toBe('sesion')
    expect(leerFallo(new ApiError(429, 'Espera.')).tipo).toBe('limitado')
  })

  it('un 5xx es nuestro y trae la referencia del back', () => {
    const e = new ApiError(500, 'Error interno del servidor.', 'ERROR_INTERNO', { referencia: 'ab12cd34' })
    expect(leerFallo(e)).toMatchObject({ tipo: 'nuestro', referencia: 'ab12cd34' })
  })

  it('el 500 del micro trae requestId: la referencia son sus 8 primeros', () => {
    const cuerpo = { error: 'Internal server error', requestId: 'f00dbabe-1234-4321-aaaa-bbbbccccdddd', status: 500 }
    expect(leerFallo(cuerpo).referencia).toBe('f00dbabe')
  })

  it('un 503 con servicio es una caída (capa 2); Leasefy sin responder, capa 1', () => {
    const caida = new ApiError(503, 'x', 'SERVICIO_NO_DISPONIBLE', { statusCode: 503, code: 'SERVICIO_NO_DISPONIBLE', servicio: 'pagos' })
    expect(leerFallo(caida).tipo).toBe('servicioCaido')
    const general = new ApiError(503, MENSAJE_LEASEFY_NO_RESPONDE, CODIGO_LEASEFY_NO_RESPONDE, {})
    expect(leerFallo(general).tipo).toBe('leasefyNoResponde')
  })

  it('un Error suelto no vino de HTTP', () => {
    expect(leerFallo(new Error('Algo')).tipo).toBe('desconocido')
  })
})

describe('camposDelError: el cuerpo del back, del micro o re-envuelto', () => {
  it('del ApiError (detalle), de un objeto plano (micro) y de un error re-envuelto (body)', () => {
    const campo = { campo: 'legalName', regla: 'longitud_minima', mensaje: 'La razón social debe tener al menos 2 caracteres.' }
    expect(camposDelError(new ApiError(400, ['x'], 'DATOS_INVALIDOS', { campos: [campo] }))).toEqual([campo])
    expect(camposDelError({ statusCode: 400, code: 'DATOS_INVALIDOS', campos: [campo] })).toEqual([campo])
    expect(camposDelError({ status: 400, body: { campos: [campo] } })).toEqual([campo])
  })

  it('un back anterior (sin campos) o una entrada mal formada: nada', () => {
    expect(camposDelError(new ApiError(400, ['budgetMax must not be greater than 2147483647']))).toEqual([])
    expect(camposDelError({ campos: [{ campo: 'x' }, 'basura', null] })).toEqual([])
  })
})

describe('mensajeParaLaPersona: la regla de oro', () => {
  it('🔴 «conexión» sólo cuando no hubo respuesta', () => {
    expect(mensajeParaLaPersona(new TypeError('Failed to fetch'))).toBe(MENSAJE_SIN_RESPUESTA)
    expect(mensajeParaLaPersona(new ApiError(0, 'No pudimos conectarnos al servidor. (Failed to fetch)'))).not.toContain('Failed to fetch')
  })

  it('sin internet en el navegador, lo dice así', () => {
    vi.stubGlobal('navigator', { onLine: false })
    expect(mensajeParaLaPersona(new ApiError(0, 'x'))).toBe(MENSAJE_SIN_INTERNET)
  })

  it('🔴 un 400 con campos dice QUÉ está mal, nunca la conexión', () => {
    const m = mensajeParaLaPersona(cuatrocientosConCampos(), { porDefecto: 'No pudimos guardar tu perfil.' })
    expect(m).toContain('$2.000.000.000')
    expect(m).not.toMatch(/conexi[oó]n/i)
  })

  it('un 409 dice lo que dijo el back', () => {
    expect(mensajeParaLaPersona(new ApiError(409, 'Ya hay un registro con el número de documento que escribiste.', 'YA_EXISTE'))).toBe(
      'Ya hay un registro con el número de documento que escribiste.',
    )
  })

  it('🔴 un 5xx: fue nuestro, sin culpar a nadie, con la referencia y la acción', () => {
    const e = new ApiError(500, 'Error interno del servidor.', 'ERROR_INTERNO', { referencia: 'ab12cd34' })
    const m = mensajeParaLaPersona(e, { accion: 'guardar tu perfil' })
    expect(m).toMatch(/^No pudimos guardar tu perfil: algo falló de nuestro lado/)
    expect(m).toContain('ab12cd34')
    expect(m).not.toMatch(/conexi[oó]n|Error interno/i)
  })

  it('un 5xx que el back escribió a propósito conserva su texto', () => {
    const e = new ApiError(502, 'Wompi no respondió: reintenta en unos minutos.', 'WOMPI_NO_RESPONDIO', { referencia: 'cafe0001' })
    expect(mensajeParaLaPersona(e)).toBe('Wompi no respondió: reintenta en unos minutos. Si sigue pasando, escríbenos con la referencia cafe0001.')
  })

  it('un 503 con servicio dice qué parte se cayó (capa 2 de siempre)', () => {
    const e = new ApiError(503, 'x', 'SERVICIO_NO_DISPONIBLE', { statusCode: 503, code: 'SERVICIO_NO_DISPONIBLE', servicio: 'pagos' })
    expect(mensajeParaLaPersona(e)).toMatch(/pagos con Wompi/)
  })

  it('un 4xx sin texto legible usa porDefecto', () => {
    expect(mensajeParaLaPersona(new ApiError(400, ''), { porDefecto: 'Revisa el formulario.' })).toBe('Revisa el formulario.')
  })

  it('un TypeError de JavaScript no es un texto para nadie', () => {
    expect(mensajeParaLaPersona(new TypeError('x is not a function'), { porDefecto: 'No se pudo.' })).toBe('No se pudo.')
  })
})
