/**
 * recaudo-en-linea.test.ts (admin) — las rutas, los métodos y los cuerpos que
 * arma el cliente del recaudo en línea.
 *
 * 🔴 El back corre con `forbidNonWhitelisted`: una clave de más (o una vacía
 * que no debía ir) es un 400 del pedido entero. Por eso se prueba que cada
 * cuerpo lleve SÓLO lo que tiene valor. `adminApi` va mockeado.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('./api', () => ({ adminApi: vi.fn() }))

import { adminApi } from './api'
import {
  cuadreDelRecaudo,
  desmarcarGirada,
  generarLiquidaciones,
  importarElReporte,
  listarLiquidaciones,
  marcarGirada,
  verLiquidacion,
  vistaPreviaDeLiquidaciones,
  vistaPreviaDelReporte,
} from './recaudo-en-linea'

const adminApiMock = vi.mocked(adminApi)
const A = '0a1b2c3d-0000-4000-8000-000000000001'

beforeEach(() => {
  adminApiMock.mockReset().mockResolvedValue({})
})

describe('cliente del recaudo en línea', () => {
  it('el reporte va como texto, a la vista previa o a importar', async () => {
    await vistaPreviaDelReporte({ archivo: 'w.csv', contenido: 'id,estado,monto' })
    await importarElReporte({ archivo: 'w.csv', contenido: 'id,estado,monto' })
    expect(adminApiMock.mock.calls).toEqual([
      ['/recaudo-en-linea/reporte-de-wompi/vista-previa', { method: 'POST', body: { archivo: 'w.csv', contenido: 'id,estado,monto' } }],
      ['/recaudo-en-linea/reporte-de-wompi/importar', { method: 'POST', body: { archivo: 'w.csv', contenido: 'id,estado,monto' } }],
    ])
  })

  it('la lista manda los filtros por la cadena de consulta; el detalle escapa el id', async () => {
    await listarLiquidaciones({ agencyId: A, estado: 'girada', pagina: 1, porPagina: 25 })
    expect(adminApiMock).toHaveBeenCalledWith('/recaudo-en-linea/liquidaciones', {
      signal: undefined,
      query: { agencyId: A, desde: undefined, hasta: undefined, estado: 'girada', pagina: 1, porPagina: 25 },
    })
    await verLiquidacion('a/b')
    expect(adminApiMock).toHaveBeenLastCalledWith('/recaudo-en-linea/liquidaciones/a%2Fb', { signal: undefined })
  })

  it('girada: el comprobante va sólo si se escribió (recortado)', async () => {
    await marcarGirada('L1', { fecha: '2026-10-01', referenciaBancaria: '   ' })
    expect(adminApiMock).toHaveBeenLastCalledWith('/recaudo-en-linea/liquidaciones/L1/girada', {
      method: 'POST',
      body: { fecha: '2026-10-01' },
    })
    await marcarGirada('L1', { fecha: '2026-10-01', referenciaBancaria: ' TRF-1 ' })
    expect(adminApiMock).toHaveBeenLastCalledWith('/recaudo-en-linea/liquidaciones/L1/girada', {
      method: 'POST',
      body: { fecha: '2026-10-01', referenciaBancaria: 'TRF-1' },
    })
  })

  it('🔴 desmarcar girada (ola E): sólo el motivo, recortado, y el id escapado', async () => {
    await desmarcarGirada('a/b', '  La transferencia la rechazó el banco.  ')
    expect(adminApiMock).toHaveBeenLastCalledWith('/recaudo-en-linea/liquidaciones/a%2Fb/desmarcar-girada', {
      method: 'POST',
      body: { motivo: 'La transferencia la rechazó el banco.' },
    })
  })

  it('generar: sin inmobiliaria ni descuentos no van esas claves; los descuentos a medias no viajan', async () => {
    await vistaPreviaDeLiquidaciones({ desde: '2026-10-01', hasta: '2026-10-15', soloDesembolsadas: true })
    expect(adminApiMock).toHaveBeenLastCalledWith('/recaudo-en-linea/liquidaciones/vista-previa', {
      method: 'POST',
      body: { desde: '2026-10-01', hasta: '2026-10-15', soloDesembolsadas: true },
    })
    await generarLiquidaciones({
      desde: '2026-10-01',
      hasta: '2026-10-15',
      agencyId: A,
      fechaDelGiro: '2026-10-16',
      descuentosDeLeasefy: [
        { agencyId: A, concepto: ' Servicio de recaudo ', valorCop: 12_000 },
        { agencyId: A, concepto: '', valorCop: 5 },
        { agencyId: A, concepto: 'Cero', valorCop: 0 },
      ],
    })
    expect(adminApiMock).toHaveBeenLastCalledWith('/recaudo-en-linea/liquidaciones/generar', {
      method: 'POST',
      body: {
        desde: '2026-10-01',
        hasta: '2026-10-15',
        agencyId: A,
        fechaDelGiro: '2026-10-16',
        descuentosDeLeasefy: [{ agencyId: A, concepto: 'Servicio de recaudo', valorCop: 12_000 }],
      },
    })
  })

  it('el cuadre pide las dos fechas', async () => {
    await cuadreDelRecaudo('2026-10-01', '2026-10-31')
    expect(adminApiMock).toHaveBeenLastCalledWith('/recaudo-en-linea/cuadre', {
      signal: undefined,
      query: { desde: '2026-10-01', hasta: '2026-10-31' },
    })
  })
})
