/**
 * QA-INQ (03-10-2026) · lo puro de Inquilinos: la identidad, el DV del NIT y
 * cómo viajan los ids en la URL.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

const { get, patch } = vi.hoisted(() => ({ get: vi.fn(), patch: vi.fn() }))
vi.mock('@/lib/api/client', async (importar) => {
  const real = await importar<typeof import('@/lib/api/client')>()
  return { ...real, apiClient: { get, patch, post: vi.fn() } }
})

import { ApiError } from '@/lib/api/client'
import {
  cuentaDelPortal,
  hoyEnColombia,
  inquilinosApi,
  pideConfirmarCambioDeCorreo,
} from '@/lib/api/inquilinos.service'
import { documentoParaMostrar, errorDelDigitoDeVerificacion } from './documento-con-dv'
import { totalesDelPortafolio, esElPortafolio } from './lista'

beforeEach(() => {
  get.mockReset()
  patch.mockReset()
})

describe('I-12 · el id de la persona en la URL', () => {
  it('🔴 la identidad sintética `doc:…` viaja codificada al detalle', async () => {
    get.mockResolvedValue({})
    await inquilinosApi.obtener('doc:1020304050')
    expect(get).toHaveBeenCalledWith('/inmobiliaria/inquilinos/doc%3A1020304050')
  })

  it('E-16: editar va por la misma identidad, codificada, con SÓLO los cambios', async () => {
    patch.mockResolvedValue({})
    await inquilinosApi.actualizar('correo:ana@x.co', { telefono: '300' })
    expect(patch).toHaveBeenCalledWith('/inmobiliaria/inquilinos/correo%3Aana%40x.co', { telefono: '300' })
  })
})

describe('I-12 / I-22 · cuentaDelPortal', () => {
  const UUID = '5b0c8a64-1d1e-4c39-9d0f-3f2b9a1c7e21'
  it('una identidad sintética no es una cuenta', () => {
    expect(cuentaDelPortal({ tenantId: 'doc:1' })).toBeNull()
    expect(cuentaDelPortal({ tenantId: 'correo:a@b.co' })).toBeNull()
    expect(cuentaDelPortal({ tenantId: `contrato:${UUID}` })).toBeNull()
  })
  it('un uuid sí, salvo que el back diga que no tiene cuenta', () => {
    expect(cuentaDelPortal({ tenantId: UUID })).toBe(UUID)
    expect(cuentaDelPortal({ tenantId: UUID, tieneCuentaDelPortal: false })).toBeNull()
    expect(cuentaDelPortal({ tenantId: UUID, tieneCuentaDelPortal: true })).toBe(UUID)
  })
})

describe('E-16 · el 409 que pide confirmar el correo', () => {
  it('se reconoce por el código o por la marca del sobre', () => {
    expect(pideConfirmarCambioDeCorreo(new ApiError(409, 'x', 'CONFIRMA_EL_CAMBIO_DE_CORREO'))).toBe(true)
    expect(pideConfirmarCambioDeCorreo(new ApiError(409, 'x', 'CONFIRMAR_CAMBIO_DE_CORREO'))).toBe(true)
    expect(pideConfirmarCambioDeCorreo(new ApiError(409, 'x', 'CAMBIO_DE_CORREO_SIN_CONFIRMAR'))).toBe(true)
    expect(pideConfirmarCambioDeCorreo(new ApiError(409, 'x', 'OTRO', { confirmarCambioDeCorreo: false }))).toBe(true)
  })
  it('otro 409 no', () => {
    expect(pideConfirmarCambioDeCorreo(new ApiError(409, 'x', 'INQUILINO_YA_EXISTE'))).toBe(false)
    expect(pideConfirmarCambioDeCorreo(new ApiError(409, 'x', 'CORREO_DE_OTRA_CUENTA'))).toBe(false)
    expect(pideConfirmarCambioDeCorreo(new ApiError(400, 'x', 'CONFIRMAR_CAMBIO_DE_CORREO'))).toBe(false)
  })
})

describe('I-14 · el NIT con su dígito de verificación', () => {
  it('🔴 un NIT se muestra con su DV (algoritmo DIAN)', () => {
    expect(documentoParaMostrar('900777888', 'NIT')).toBe('900777888-2')
    expect(documentoParaMostrar('890903938', 'NIT')).toBe('890903938-8')
  })
  it('sin tipo, sólo la forma inequívoca de una empresa (9 dígitos, empieza por 8 o 9)', () => {
    expect(documentoParaMostrar('900777888')).toBe('900777888-2')
    expect(documentoParaMostrar('1020304050')).toBe('1020304050')
    expect(documentoParaMostrar('71234567')).toBe('71234567')
  })
  it('con un tipo que no es NIT, nunca le pone DV', () => {
    expect(documentoParaMostrar('900777888', 'CC')).toBe('900777888')
  })
  it('🔴 el DV escrito que no corresponde se dice con el bueno', () => {
    expect(errorDelDigitoDeVerificacion('900777888-9', 'NIT')).toBe(
      'El dígito de verificación de este NIT es 2, no 9.',
    )
    expect(errorDelDigitoDeVerificacion('900.777.888-2', 'NIT')).toBeNull()
    expect(errorDelDigitoDeVerificacion('900777888', 'NIT')).toBeNull()
    expect(errorDelDigitoDeVerificacion('1020304050-9', 'CC')).toBeNull()
  })
})

describe('I-07 / I-04 · los totales del portafolio', () => {
  it('🔴 lo que todavía no empieza no suma en vigentes ni en canon', () => {
    const hoy = hoyEnColombia()
    const t = totalesDelPortafolio([
      {
        tenantId: 'a',
        nombre: 'A',
        email: null,
        telefono: null,
        documento: null,
        arriendos: [
          { leaseId: null, contractId: '1', estado: 'ACTIVE', desde: '2025-01-01', hasta: null, canonCop: 1_000_000, inmueble: null },
          { leaseId: null, contractId: '2', estado: 'ACTIVE', desde: '2999-01-01', hasta: null, canonCop: 3_300_000, inmueble: null },
          { leaseId: null, contractId: '3', estado: 'EN_FIRMA', desde: hoy, hasta: null, canonCop: 2_000_000, inmueble: null },
        ],
      },
    ])
    expect(t).toEqual({ personas: 1, vigentes: 1, canon: 1_000_000 })
  })
  it('el portafolio es «activos» sin búsqueda', () => {
    expect(esElPortafolio({ buscar: '', estado: 'activos' })).toBe(true)
    expect(esElPortafolio({ buscar: ' ', estado: 'activos' })).toBe(true)
    expect(esElPortafolio({ buscar: 'ana', estado: 'activos' })).toBe(false)
    expect(esElPortafolio({ buscar: '', estado: 'todos' })).toBe(false)
  })
})
