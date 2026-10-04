/**
 * COBRANZA-MANUAL (04-10-2026): el cuerpo de «Registrar gestión» se arma clave
 * por clave (el back valida con `forbidNonWhitelisted`: una clave de más es un
 * 400) y nunca lleva quién ni cuándo (los pone el servidor).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

const h = vi.hoisted(() => ({ post: vi.fn(), get: vi.fn() }))
vi.mock('@/lib/api/client', () => ({ apiClient: { post: h.post, get: h.get } }))

import {
  aQuien,
  cobranzaManualApi,
  consultaDelHistorial,
  cuerpoDeLaGestion,
} from './cobranza-manual.service'

beforeEach(() => {
  h.post.mockReset().mockResolvedValue({})
  h.get.mockReset().mockResolvedValue({})
})

describe('cobranza manual · servicio', () => {
  it('desde la fila: contrato y cuota; con promesa, fecha y monto; nada más', () => {
    expect(
      cuerpoDeLaGestion(
        { contractId: 'c1', cuotaId: 'q1' },
        {
          tipo: 'LLAMADA',
          resultado: 'PROMETIO_PAGAR',
          comentario: '  paga el viernes ',
          promesa: { fecha: '2026-10-10', montoCop: 1500000 },
        },
      ),
    ).toEqual({
      tipo: 'LLAMADA',
      contractId: 'c1',
      cuotaId: 'q1',
      resultado: 'PROMETIO_PAGAR',
      comentario: 'paga el viernes',
      promesa: { fecha: '2026-10-10', montoCop: 1500000 },
    })
  })

  it('una nota no lleva resultado; un comentario vacío no viaja', () => {
    expect(
      cuerpoDeLaGestion({ documento: '1037111222' }, { tipo: 'NOTA', resultado: 'NO_CONTESTO', comentario: 'Visto' }),
    ).toEqual({ tipo: 'NOTA', documento: '1037111222', comentario: 'Visto' })
    expect(cuerpoDeLaGestion({ deudorId: 'd1' }, { tipo: 'VISITA', resultado: 'NO_CONTESTO', comentario: '  ' })).toEqual({
      tipo: 'VISITA',
      deudorId: 'd1',
      resultado: 'NO_CONTESTO',
    })
  })

  it('el historial se pide por UNA llave', () => {
    expect(consultaDelHistorial({ contractId: 'c 1' })).toBe('contrato=c%201')
    expect(consultaDelHistorial({ documento: '10.37' })).toBe('documento=10.37')
    expect(consultaDelHistorial({ deudorId: 'd1' })).toBe('deudor=d1')
    expect(aQuien({ contractId: 'c1' })).toEqual({ contractId: 'c1' })
  })

  it('las rutas del back', async () => {
    await cobranzaManualApi.registrar({ contractId: 'c1' }, { tipo: 'CORREO', resultado: 'NO_CONTESTO' })
    expect(h.post).toHaveBeenCalledWith('/inmobiliaria/cobranza/gestiones', {
      tipo: 'CORREO',
      contractId: 'c1',
      resultado: 'NO_CONTESTO',
    })
    await cobranzaManualApi.traerLaCartera()
    expect(h.post).toHaveBeenCalledWith('/inmobiliaria/cobranza/traer-la-cartera', {})
    await cobranzaManualApi.promesas('INCUMPLIDA')
    expect(h.get).toHaveBeenCalledWith('/inmobiliaria/cobranza/promesas?estado=INCUMPLIDA')
    await cobranzaManualApi.deDondeSale()
    expect(h.get).toHaveBeenCalledWith('/inmobiliaria/cobranza/de-donde-sale')
  })
})
