/**
 * modulos-pagos.test.ts (admin) — el contrato que estas dos funciones ARMAN.
 *
 * 🔴 La ruta de prender/apagar importa más que de costumbre: si apuntara mal, el
 * dueño de Leasefy creería que le prendió Nómina a una inmobiliaria y esa
 * inmobiliaria seguiría viendo un 402. Una ruta equivocada acá no se ve en
 * ninguna pantalla: se ve en un correo del cliente preguntando por qué no le
 * funciona.
 *
 * `adminApi` va mockeado: esto verifica la ruta, el método y el cuerpo, no el
 * fetch (que tiene su propia cobertura).
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('./api', () => ({
  adminApi: vi.fn(),
}))

import { adminApi } from './api'
import {
  fijarModulo,
  getMatrizDeModulos,
  type MatrizDeModulos,
} from './modulos-pagos'

const adminApiMock = vi.mocked(adminApi)

beforeEach(() => {
  adminApiMock.mockReset()
})

const MATRIZ: MatrizDeModulos = {
  disponible: true,
  motivo: null,
  catalogo: [
    { modulo: 'nomina', nombre: 'Nómina', descripcion: 'Empleados y liquidación.' },
  ],
  agencias: [
    {
      agencyId: 'a1',
      nombre: 'Portofino',
      nit: '900123456-1',
      modulos: {
        nomina: {
          habilitado: true,
          habilitadoPorEmail: 'dueno@leasefy.co',
          habilitadoAt: '2026-09-17T15:00:00.000Z',
          motivo: 'contrato firmado',
        },
      },
    },
  ],
}

describe('getMatrizDeModulos', () => {
  it('GETea /modulos-pagos/matriz y devuelve la matriz tal cual', async () => {
    adminApiMock.mockResolvedValueOnce(MATRIZ)
    const signal = new AbortController().signal

    const r = await getMatrizDeModulos({}, signal)

    expect(adminApiMock).toHaveBeenCalledWith('/modulos-pagos/matriz', {
      query: {},
      signal,
    })
    expect(r).toEqual(MATRIZ)
  })

  it('pasa la búsqueda y el límite cuando vienen', async () => {
    adminApiMock.mockResolvedValueOnce(MATRIZ)
    await getMatrizDeModulos({ q: 'porto', limite: 50 })
    expect(adminApiMock).toHaveBeenCalledWith('/modulos-pagos/matriz', {
      query: { q: 'porto', limite: 50 },
      signal: undefined,
    })
  })

  it('una búsqueda vacía NO viaja: un `q=` vacío es una consulta distinta', async () => {
    adminApiMock.mockResolvedValueOnce(MATRIZ)
    await getMatrizDeModulos({ q: '' })
    expect(adminApiMock.mock.calls[0]![1]).toMatchObject({ query: {} })
  })
})

describe('fijarModulo', () => {
  it('🔴 PUTea /agencias/:id/modulos-pagos/:modulo con habilitado y motivo', async () => {
    adminApiMock.mockResolvedValueOnce({ modulo: 'nomina', habilitado: true })

    const r = await fijarModulo('a1', 'nomina', {
      habilitado: true,
      motivo: 'contrato firmado 2026-09-17',
    })

    expect(adminApiMock).toHaveBeenCalledWith(
      '/agencias/a1/modulos-pagos/nomina',
      {
        method: 'PUT',
        body: { habilitado: true, motivo: 'contrato firmado 2026-09-17' },
      },
    )
    expect(r).toEqual({ modulo: 'nomina', habilitado: true })
  })

  it('apagar manda `habilitado: false`, no omite la clave', async () => {
    adminApiMock.mockResolvedValueOnce({ modulo: 'nomina', habilitado: false })
    await fijarModulo('a1', 'nomina', { habilitado: false, motivo: 'mora' })
    // Omitirla dejaría al back sin saber qué se pidió: la columna no tiene DEFAULT.
    expect(adminApiMock.mock.calls[0]![1]!.body).toEqual({
      habilitado: false,
      motivo: 'mora',
    })
  })

  it('el error del back sube tal cual: sus mensajes están en español', async () => {
    adminApiMock.mockRejectedValueOnce(new Error('Not an authorized admin'))
    await expect(
      fijarModulo('a1', 'nomina', { habilitado: true }),
    ).rejects.toThrow('Not an authorized admin')
  })
})
