/**
 * El cliente de `/inmobiliaria/contratos/plantilla`.
 *
 * Lo que se fija acá:
 *   · el juego EXACTO de claves de cada cuerpo — el backend valida con
 *     `forbidNonWhitelisted: true`, así que una clave de más es un 400 en
 *     producción con la suite en verde;
 *   · que los `motivos[]` del validador sobrevivan al cliente HTTP. Son la
 *     parte más valiosa de la respuesta y hasta ahora se perdían: `ApiError`
 *     sólo guardaba `message` y `code`.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

const { post } = vi.hoisted(() => ({ post: vi.fn() }))

vi.mock('@/lib/api/client', async () => {
  const real = await vi.importActual<typeof import('@/lib/api/client')>('@/lib/api/client')
  return { ...real, apiClient: { post } }
})

import { ApiError } from '@/lib/api/client'
import {
  contratosPlantillaApi,
  esIaCaida,
  esUsoIndeterminado,
  etiquetasFaltantes,
  motivosDelRechazo,
} from '../contratos-plantilla.service'

beforeEach(() => {
  post.mockReset()
  post.mockResolvedValue({})
})

function cuerpoEnviado(): Record<string, unknown> {
  return post.mock.calls[0][1] as Record<string, unknown>
}

describe('preparar', () => {
  it('manda sólo las claves que el DTO declara, y omite las vacías', async () => {
    await contratosPlantillaApi.preparar({
      borrador: {
        propertyId: 'p-1',
        uso: 'VIVIENDA',
        canonMensual: 2_500_000,
        diaDePago: 5,
        fechaInicio: '2026-10-01',
        arrendatarioNombre: '',
        arrendatarioDocumento: undefined,
      },
      valores: { lugarDePago: 'Oficina', vacio: '   ' },
      clausulas: ['PARQUEADERO'],
    })

    expect(post).toHaveBeenCalledWith('/inmobiliaria/contratos/plantilla/preparar', {
      propertyId: 'p-1',
      uso: 'VIVIENDA',
      canonMensual: 2_500_000,
      diaDePago: 5,
      fechaInicio: '2026-10-01',
      valores: { lugarDePago: 'Oficina' },
      clausulas: ['PARQUEADERO'],
    })
  })

  it('sin valores ni cláusulas no manda esas claves', async () => {
    await contratosPlantillaApi.preparar({ borrador: { propertyId: 'p-1' } })
    expect(cuerpoEnviado()).toEqual({ propertyId: 'p-1' })
  })

  it('el 0 sí viaja: un adminFee en cero es un dato, no un campo vacío', async () => {
    await contratosPlantillaApi.preparar({ borrador: { adminFee: 0 } })
    expect(cuerpoEnviado()).toEqual({ adminFee: 0 })
  })

  it('los conceptos van con las claves del DTO anidado', async () => {
    await contratosPlantillaApi.preparar({
      borrador: {
        conceptos: [{ nombre: 'Administración', valorCop: 250_000, paga: 'INQUILINO' }],
      },
    })
    expect(cuerpoEnviado()).toEqual({
      conceptos: [{ nombre: 'Administración', valorCop: 250_000, paga: 'INQUILINO' }],
    })
  })
})

describe('generar', () => {
  it('agrega valores, cláusulas y estipulaciones ya recortadas', async () => {
    await contratosPlantillaApi.generar({
      borrador: { uso: 'COMERCIAL' },
      valores: { lugarDePago: 'Oficina' },
      clausulas: ['CODEUDOR'],
      estipulacionesEspeciales: '  Se revisa el jardín cada seis meses.  ',
    })
    expect(cuerpoEnviado()).toEqual({
      uso: 'COMERCIAL',
      valores: { lugarDePago: 'Oficina' },
      clausulas: ['CODEUDOR'],
      estipulacionesEspeciales: 'Se revisa el jardín cada seis meses.',
    })
  })

  it('unas estipulaciones en blanco no viajan', async () => {
    await contratosPlantillaApi.generar({
      borrador: { uso: 'VIVIENDA' },
      estipulacionesEspeciales: '   ',
    })
    expect(cuerpoEnviado()).toEqual({ uso: 'VIVIENDA' })
  })
})

describe('redactarConIa', () => {
  it('manda el borrador más las instrucciones', async () => {
    await contratosPlantillaApi.redactarConIa({
      borrador: { propertyId: 'p-1', canonMensual: 1_800_000 },
      instrucciones: '  Tiene un perro pequeño y el parqueadero 42.  ',
    })
    expect(post).toHaveBeenCalledWith('/inmobiliaria/contratos/plantilla/ia/redactar', {
      propertyId: 'p-1',
      canonMensual: 1_800_000,
      instrucciones: 'Tiene un perro pequeño y el parqueadero 42.',
    })
  })
})

describe('leer los errores del validador', () => {
  const rechazo = new ApiError(
    400,
    'El contrato no se puede emitir así: …',
    'CONTRATO_NO_VALIDO',
    {
      code: 'CONTRATO_NO_VALIDO',
      motivos: [
        {
          codigo: 'DEPOSITO_EN_DINERO',
          donde: 'estipulacionesEspeciales',
          mensaje: 'No se puede exigir depósito en dinero para garantizar el arrendamiento de vivienda urbana.',
          norma: 'Ley 820 de 2003, artículo 16',
        },
      ],
    },
  )

  it('devuelve los motivos completos, con su norma', () => {
    const motivos = motivosDelRechazo(rechazo)
    expect(motivos).toHaveLength(1)
    expect(motivos[0].norma).toBe('Ley 820 de 2003, artículo 16')
    expect(motivos[0].mensaje).toContain('depósito en dinero')
  })

  it('un error sin motivos —o que no es del cliente— da lista vacía', () => {
    expect(motivosDelRechazo(new ApiError(500, 'boom'))).toEqual([])
    expect(motivosDelRechazo(new Error('otro'))).toEqual([])
    expect(motivosDelRechazo(new ApiError(400, 'x', 'X', { motivos: 'no es lista' }))).toEqual([])
  })

  it('lee las etiquetas de un VARIABLES_FALTANTES', () => {
    const err = new ApiError(400, 'Faltan datos', 'VARIABLES_FALTANTES', {
      etiquetasFaltantes: ['Lugar de pago', 'Destinación'],
      variablesFaltantes: ['lugarDePago', 'destinacion'],
    })
    expect(etiquetasFaltantes(err)).toEqual(['Lugar de pago', 'Destinación'])
  })

  it('reconoce el uso indeterminado y la IA caída', () => {
    expect(esUsoIndeterminado(new ApiError(400, 'x', 'USO_INDETERMINADO'))).toBe(true)
    expect(esUsoIndeterminado(new ApiError(400, 'x', 'OTRA_COSA'))).toBe(false)
    // Los cinco 503 del backend significan lo mismo para la pantalla.
    expect(esIaCaida(new ApiError(503, 'x', 'IA_NO_CONFIGURADA'))).toBe(true)
    expect(esIaCaida(new ApiError(503, 'x', 'IA_INALCANZABLE'))).toBe(true)
    expect(esIaCaida(new ApiError(400, 'x', 'CONTRATO_NO_VALIDO'))).toBe(false)
  })
})
