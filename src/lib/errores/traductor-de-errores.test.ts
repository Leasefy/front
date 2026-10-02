import { afterEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '@/lib/api/client'
import { CODIGO_LEASEFY_NO_RESPONDE, MENSAJE_LEASEFY_NO_RESPONDE } from '@/lib/conexion/estado-de-conexion'
import {
  FRASES_DE_LOS_CODIGOS,
  LARGO_MAXIMO_DE_UN_MENSAJE,
  MENSAJE_SIN_INTERNET,
  MENSAJE_SIN_RESPUESTA,
  camposDelError,
  fraseDelCodigo,
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
    message: ['El presupuesto no puede pasar de $100.000.000 al mes. Revisa que no sobren ceros.'],
    campos: [
      {
        campo: 'budgetMax',
        regla: 'maximo',
        mensaje: 'El presupuesto no puede pasar de $100.000.000 al mes. Revisa que no sobren ceros.',
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
    expect(m).toContain('$100.000.000')
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

/**
 * 02-10-2026 · El tope de 300 caracteres descartaba los 409 de caja, que
 * explican mes, inmueble, inquilino, cifras y qué hacer. Por eso
 * `RegistrarPagoModal` mostraba el mensaje crudo en vez de usar el traductor.
 * El tope sube; lo que ataja un volcado son las otras reglas.
 */
describe('mensajeParaLaPersona: los mensajes largos de caja pasan; los volcados no', () => {
  // Medido sobre la plantilla del back (`sincronizar-cuota-con-cobro.ts`):
  // el cobro de otro contrato, con un título y un nombre reales.
  const CUOTA_Y_COBRO =
    'Ya existe el cobro de septiembre de 2026 de Apartamento 1203 Torre B Conjunto Residencial Los Almendros del Poblado Medellín ' +
    'a nombre de María Fernanda Restrepo Gutiérrez de la Ossa, y es de otro contrato (normalmente, el del inquilino anterior). ' +
    'Un inmueble tiene un solo cobro por mes, así que el pago de Juan Camilo Rodríguez Echeverri no tiene documento propio para ' +
    'septiembre de 2026. Desde caja no se puede corregir: avísale a soporte.'

  it('🔴 un 409 de caja de más de 300 caracteres llega entero, no el texto por defecto', () => {
    expect(CUOTA_Y_COBRO.length).toBeGreaterThan(300)
    const e = new ApiError(409, CUOTA_Y_COBRO, 'CUOTA_Y_COBRO_NO_CUADRAN', { cobroId: 'c-1' })
    expect(mensajeParaLaPersona(e, { porDefecto: 'No se emitió el recibo.' })).toBe(CUOTA_Y_COBRO)
  })

  it('el tope cubre el peor caso medido de caja (≈690) y no más que eso con holgura', () => {
    expect(LARGO_MAXIMO_DE_UN_MENSAJE).toBeGreaterThanOrEqual(700)
    expect(LARGO_MAXIMO_DE_UN_MENSAJE).toBeLessThanOrEqual(1000)
  })

  it('un texto más largo que el tope sigue sin pasar', () => {
    const e = new ApiError(409, 'a '.repeat(LARGO_MAXIMO_DE_UN_MENSAJE), 'X')
    expect(mensajeParaLaPersona(e, { porDefecto: 'No se pudo.' })).toBe('No se pudo.')
  })

  it.each([
    ['una traza en una sola línea', "TypeError: Cannot read properties of undefined (reading 'id') at ReciboService.crear (/app/dist/recibos.js:120:15)"],
    ['una ruta de node_modules', 'Error en /app/node_modules/@prisma/client/runtime/library.js'],
    ['un archivo con su línea', 'Falló en recibos-de-caja.service.ts:512'],
    ['una consulta de Prisma', 'Error en prisma.reciboDeCaja.create( ... ) con datos inválidos'],
    ['un volcado de Prisma en el medio', 'Fallo: Invalid `this.prisma.cobro.update()` invocation'],
    ['el nombre de un error de Prisma', 'PrismaClientKnownRequestError: Unique constraint failed on the fields: (`nit`)'],
    ['un HTML en el medio', 'El proveedor respondió: <html><body><h1>502 Bad Gateway</h1></body></html>'],
    ['un HTML al principio', '<!DOCTYPE html><html>…'],
    ['un JSON', '{"statusCode":500,"message":"Internal server error"}'],
    ['un retorno de carro', 'uno\rdos'],
  ])('🔴 %s no se le muestra a nadie', (_que, texto) => {
    const e = new ApiError(409, texto, 'X')
    expect(mensajeParaLaPersona(e, { porDefecto: 'No se pudo.' })).toBe('No se pudo.')
  })
})

/**
 * 02-10-2026 · Una frase en español para cada código que el front trata aparte
 * (los 402 del plan, el módulo sin contratar, el recordatorio de firma). El
 * `message` del back gana cuando se puede leer.
 */
describe('fraseDelCodigo y los 402', () => {
  it('🔴 PLAN_REQUERIDO, LIMITE_DEL_PLAN y NOMINA_NO_HABILITADA tienen su frase', () => {
    for (const code of ['PLAN_REQUERIDO', 'LIMITE_DEL_PLAN', 'NOMINA_NO_HABILITADA', 'RECORDATORIO_RECIENTE']) {
      expect(fraseDelCodigo(code)).toBe(FRASES_DE_LOS_CODIGOS[code])
      expect(fraseDelCodigo(code)).toMatch(/^[A-ZÁÉÍÓÚÑ¿¡]/)
    }
    expect(fraseDelCodigo('CODIGO_NUEVO')).toBeUndefined()
    expect(fraseDelCodigo(undefined)).toBeUndefined()
    expect(fraseDelCodigo('toString')).toBeUndefined()
  })

  it('🔴 un 402 con código y sin texto legible dice la frase del código, no el texto por defecto', () => {
    expect(mensajeParaLaPersona(new ApiError(402, '', 'PLAN_REQUERIDO'), { porDefecto: 'No se pudo.' })).toBe(
      FRASES_DE_LOS_CODIGOS.PLAN_REQUERIDO,
    )
    expect(mensajeParaLaPersona(new ApiError(402, '402', 'LIMITE_DEL_PLAN'), { porDefecto: 'No se pudo.' })).toBe(
      FRASES_DE_LOS_CODIGOS.LIMITE_DEL_PLAN,
    )
  })

  it('el mensaje del back gana cuando se lee: dice QUÉ tope fue', () => {
    const e = new ApiError(402, 'Alcanzaste el límite de agentes de tu plan. Sube de plan para agregar más.', 'LIMITE_DEL_PLAN', {
      limite: 'agentes',
    })
    expect(mensajeParaLaPersona(e)).toBe('Alcanzaste el límite de agentes de tu plan. Sube de plan para agregar más.')
  })

  it('un 402 sin código sigue como antes: el texto del back o el por defecto', () => {
    expect(mensajeParaLaPersona(new ApiError(402, ''), { porDefecto: 'No se pudo.' })).toBe('No se pudo.')
  })
})
