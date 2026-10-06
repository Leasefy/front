/**
 * Verificar al volver de Wompi (Nico, 02-10-2026, «seguimiento 4»): el portal
 * le pide al back verificar la transacción con que volvió (`?id=`), por el
 * mismo camino que el webhook, y dice lo que el back respondió.
 *
 * Ninguna llamada real: `fetch` es un doble (y el back, el que verifica contra
 * Wompi, ni existe acá).
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { setAccessToken } from '@/lib/api/client'
import {
  ID_DEL_AVISO,
  avisarDelPagoAlVolver,
  mensajeEnIngles,
  tonoDelAviso,
  transaccionDelRetorno,
  verificarPagoAlVolver,
  type PagoVerificadoAlVolver,
} from './verificar-pago-al-volver'

const PAGO: PagoVerificadoAlVolver = {
  transaccionId: '1234-1610641025-49201',
  estado: 'APROBADO',
  leaseId: 'lease-1',
  periodo: { mes: 10, anio: 2026 },
  mensaje: 'Tu pago del arriendo de octubre de 2026 quedó confirmado.',
}

const realFetch = globalThis.fetch

beforeEach(() => {
  // La sesión resuelta: el apiClient no espera el tope de la sesión por petición.
  setAccessToken(null)
})

afterEach(() => {
  globalThis.fetch = realFetch
  vi.restoreAllMocks()
})

function respuesta(status: number, cuerpo: unknown) {
  return vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    text: async () => JSON.stringify(cuerpo),
    json: async () => cuerpo,
  } as unknown as Response)
}

function aviso() {
  return { success: vi.fn(), error: vi.fn(), info: vi.fn() }
}

describe('transaccionDelRetorno — el `id` que pone Wompi en la URL', () => {
  it('lo toma tal cual si es un id de Wompi', () => {
    expect(transaccionDelRetorno(new URLSearchParams('id=1234-1610641025-49201&env=test'))).toBe(
      '1234-1610641025-49201',
    )
  })

  it('sin `id`, o con algo que cambiaría la URL del back: null (no se verifica nada)', () => {
    for (const q of ['', 'status=APPROVED', 'id=', 'id=../../x', 'id=a%20b', `id=${'x'.repeat(80)}`]) {
      expect(transaccionDelRetorno(new URLSearchParams(q))).toBeNull()
    }
  })
})

describe('verificarPagoAlVolver', () => {
  it('POST /leases/pagos-en-linea/:transaccion/verificar y devuelve lo del back', async () => {
    const f = respuesta(200, PAGO)
    globalThis.fetch = f
    expect(await verificarPagoAlVolver('1234-1610641025-49201')).toEqual(PAGO)
    const [url, init] = f.mock.calls[0] as [string, RequestInit]
    expect(String(url)).toContain('/leases/pagos-en-linea/1234-1610641025-49201/verificar')
    expect(init.method).toBe('POST')
  })
})

describe('avisarDelPagoAlVolver — un aviso que se actualiza con lo que dijo el back', () => {
  it('APROBADO: «verificando…» y después el éxito con la frase del back; recarga', async () => {
    const a = aviso()
    const recargar = vi.fn()
    const r = await avisarDelPagoAlVolver({
      transaccion: PAGO.transaccionId,
      locale: 'es',
      aviso: a,
      recargar,
      verificar: async () => PAGO,
    })
    expect(r).toEqual(PAGO)
    expect(a.info).toHaveBeenCalledWith('Estamos verificando tu pago con Wompi…', { id: ID_DEL_AVISO })
    expect(a.success).toHaveBeenCalledWith(PAGO.mensaje, { id: ID_DEL_AVISO, duration: 8000 })
    expect(recargar).toHaveBeenCalledTimes(1)
  })

  it('EN_VERIFICACION: información (el período queda «en verificación»)', async () => {
    const a = aviso()
    await avisarDelPagoAlVolver({
      transaccion: 'tx-1',
      locale: 'es',
      aviso: a,
      recargar: vi.fn(),
      verificar: async () => ({ ...PAGO, estado: 'EN_VERIFICACION', mensaje: 'Tu pago está en verificación.' }),
    })
    expect(a.info).toHaveBeenLastCalledWith('Tu pago está en verificación.', { id: ID_DEL_AVISO, duration: 8000 })
    expect(a.success).not.toHaveBeenCalled()
  })

  it('RECHAZADO: error; en inglés, la frase en inglés', async () => {
    const a = aviso()
    await avisarDelPagoAlVolver({
      transaccion: 'tx-1',
      locale: 'en',
      aviso: a,
      recargar: vi.fn(),
      verificar: async () => ({ ...PAGO, estado: 'RECHAZADO', mensaje: 'Wompi no aprobó el pago.' }),
    })
    expect(a.error).toHaveBeenCalledWith(mensajeEnIngles('RECHAZADO'), { id: ID_DEL_AVISO, duration: 8000 })
  })

  it('un 404 del back: dice SU frase (no «conexión») y recarga igual', async () => {
    globalThis.fetch = respuesta(404, {
      statusCode: 404,
      code: 'PAGO_NO_ENCONTRADO',
      message: 'No encontramos ese pago a tu nombre.',
    })
    const a = aviso()
    const recargar = vi.fn()
    expect(
      await avisarDelPagoAlVolver({ transaccion: 'tx-1', locale: 'es', aviso: a, recargar }),
    ).toBeNull()
    expect(a.error).toHaveBeenCalledWith('No encontramos ese pago a tu nombre.', { id: ID_DEL_AVISO, duration: 8000 })
    expect(recargar).toHaveBeenCalledTimes(1)
  })

  it('sin respuesta (red caída): el aviso de conexión, nunca un «aprobado»', async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'))
    const a = aviso()
    await avisarDelPagoAlVolver({ transaccion: 'tx-1', locale: 'es', aviso: a, recargar: vi.fn() })
    expect(a.success).not.toHaveBeenCalled()
    expect(a.error).toHaveBeenCalledTimes(1)
  })
})

describe('tonoDelAviso', () => {
  it('aprobado = éxito; rechazado y anulado = error; en verificación = información', () => {
    expect(tonoDelAviso('APROBADO')).toBe('success')
    expect(tonoDelAviso('RECHAZADO')).toBe('error')
    expect(tonoDelAviso('ANULADO')).toBe('error')
    expect(tonoDelAviso('EN_VERIFICACION')).toBe('info')
  })
})
