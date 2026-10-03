/**
 * /admin/recaudo-en-linea — el reporte de Wompi, las liquidaciones de Leasefy y
 * el cuadre (Nico, C2-AGREGADOR Q3/Q4, ola E).
 *
 * Lo que este archivo protege:
 *
 * 🔴 1. «Frecuencia del giro: por definir» se ve en la pantalla (no se inventa una).
 * 🔴 2. Marcar «girada» pide confirmación propia, no acepta una fecha futura y
 *       manda el día y el comprobante.
 * 🔴 3. Generar a mano: vista previa por inmobiliaria con lo que queda FUERA y su
 *       frase; confirmación; un descuento de Leasefy obliga a actualizar la vista
 *       previa antes de generar, y viaja tal como se escribió.
 * 🔴 4. El reporte: las filas frenadas se listan con su frase y se importa sólo lo
 *       legible; un archivo de más de 10 MB se frena aquí.
 *    5. El cuadre marca las diferencias.
 */

import * as React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

import type {
  CuadreDelRecaudo,
  DetalleDeLaLiquidacion,
  LecturaDelReporte,
  ListaDeLiquidaciones,
  LiquidacionDelRecaudo,
  ResumenDelRecaudo,
  VistaPreviaDeLiquidaciones,
} from '@/lib/admin/recaudo-en-linea'

void React
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const resumenDelRecaudo = vi.fn()
const listarLiquidaciones = vi.fn()
const verLiquidacion = vi.fn()
const marcarGirada = vi.fn()
const vistaPreviaDeLiquidaciones = vi.fn()
const generarLiquidaciones = vi.fn()
const vistaPreviaDelReporte = vi.fn()
const importarElReporte = vi.fn()
const cuadreDelRecaudo = vi.fn()
const exportarLiquidacionAExcel = vi.fn()
const exportarLiquidacionAPdf = vi.fn()

vi.mock('@/lib/admin/recaudo-en-linea', async (original) => ({
  ...(await original<typeof import('@/lib/admin/recaudo-en-linea')>()),
  resumenDelRecaudo: (...a: unknown[]) => resumenDelRecaudo(...a),
  listarLiquidaciones: (...a: unknown[]) => listarLiquidaciones(...a),
  verLiquidacion: (...a: unknown[]) => verLiquidacion(...a),
  marcarGirada: (...a: unknown[]) => marcarGirada(...a),
  vistaPreviaDeLiquidaciones: (...a: unknown[]) => vistaPreviaDeLiquidaciones(...a),
  generarLiquidaciones: (...a: unknown[]) => generarLiquidaciones(...a),
  vistaPreviaDelReporte: (...a: unknown[]) => vistaPreviaDelReporte(...a),
  importarElReporte: (...a: unknown[]) => importarElReporte(...a),
  cuadreDelRecaudo: (...a: unknown[]) => cuadreDelRecaudo(...a),
}))
vi.mock('@/lib/admin/documento-de-la-liquidacion', async (original) => ({
  ...(await original<typeof import('@/lib/admin/documento-de-la-liquidacion')>()),
  exportarLiquidacionAExcel: (...a: unknown[]) => exportarLiquidacionAExcel(...a),
  exportarLiquidacionAPdf: (...a: unknown[]) => exportarLiquidacionAPdf(...a),
}))

import RecaudoEnLineaAdminPage from './page'

const A = '0a1b2c3d-0000-4000-8000-000000000001'
const ID = '6c1f0a0e-2f1e-4b3a-9d8c-0f1e2d3c4b5a'

const resumen = (extra: Partial<ResumenDelRecaudo> = {}): ResumenDelRecaudo => ({
  disponible: true,
  giroDisponible: true,
  frecuenciaDelGiro: { definida: false, texto: 'Por definir' },
  migraciones: {
    agregador: '20261003100000_liquidaciones_del_recaudo',
    giro: '20261003160500_giro_de_la_liquidacion_del_recaudo',
  },
  inmobiliarias: [{ id: A, nombre: 'Inmobiliaria Andina' }],
  ultimoReporte: null,
  ...extra,
})

const liquidacion = (extra: Partial<LiquidacionDelRecaudo> = {}): LiquidacionDelRecaudo => ({
  id: ID,
  numero: 'LQ261015-0A1B2C-9F3A01',
  referenciaDelGiro: 'LEASEFY LQ261015-0A1B2C-9F3A01',
  agencyId: A,
  inmobiliaria: 'Inmobiliaria Andina',
  fechaDelGiro: '2026-10-16',
  desembolsoId: null,
  creadaPor: 'equipo@leasefy.co',
  createdAt: '2026-10-15T20:00:00.000Z',
  cantidadDePagos: 2,
  brutoCop: 2_700_000,
  comisionCop: 70_000,
  ivaCop: 13_300,
  retencionesCop: 15_000,
  otrosDescuentosCop: 0,
  descuentos: [
    { concepto: 'Comisión de Wompi', valorCop: 70_000, fuente: 'reporte-de-wompi' },
    { concepto: 'IVA de la comisión de Wompi', valorCop: 13_300, fuente: 'reporte-de-wompi' },
    { concepto: 'Retenciones practicadas por Wompi', valorCop: 15_000, fuente: 'reporte-de-wompi' },
  ],
  netoCop: 2_601_700,
  estado: 'generada',
  giradaAt: null,
  giradaEl: null,
  giradaPor: null,
  referenciaBancariaDelGiro: null,
  movimientoId: null,
  conciliadaAt: null,
  conciliadaPor: null,
  ...extra,
})

const lista = (extra: Partial<ListaDeLiquidaciones> = {}): ListaDeLiquidaciones => ({
  disponible: true,
  giroDisponible: true,
  data: [liquidacion()],
  total: 1,
  pagina: 0,
  porPagina: 25,
  totales: { liquidaciones: 1, brutoCop: 2_700_000, netoCop: 2_601_700 },
  ...extra,
})

const detalle = (extra: Partial<DetalleDeLaLiquidacion> = {}): DetalleDeLaLiquidacion => ({
  ...liquidacion(),
  nit: '900123456-7',
  giroDisponible: true,
  pagos: [
    {
      transaccionId: 'tx-1',
      referencia: 'rent-1',
      fecha: '2026-10-02',
      medio: 'PSE',
      desembolsoId: 'D-77',
      reciboId: 'r1',
      reciboNumero: 'RC-1',
      brutoCop: 1_200_000,
      comisionCop: 30_000,
      ivaCop: 5_700,
      retencionesCop: 0,
      netoCop: 1_164_300,
    },
  ],
  ...extra,
})

const vistaPrevia = (): VistaPreviaDeLiquidaciones => ({
  desde: '2026-10-01',
  hasta: '2026-10-15',
  soloDesembolsadas: true,
  propuestas: [
    {
      agencyId: A,
      inmobiliaria: 'Inmobiliaria Andina',
      numero: 'LQ261015-0A1B2C-9F3A01',
      cantidadDePagos: 2,
      brutoCop: 2_700_000,
      comisionCop: 70_000,
      ivaCop: 13_300,
      retencionesCop: 15_000,
      otrosDescuentosCop: 0,
      descuentos: [],
      netoCop: 2_601_700,
      bloqueo: null,
      pagos: [],
    },
  ],
  fuera: [
    {
      transaccionId: 'tx-4',
      agencyId: A,
      inmobiliaria: 'Inmobiliaria Andina',
      fecha: '2026-10-04',
      brutoCop: 1_000_000,
      netoCop: 970_250,
      motivo: 'Wompi reporta $1.000.000 y la plataforma registró $980.000.',
    },
  ],
  sinFecha: 0,
  totales: { liquidaciones: 1, brutoCop: 2_700_000, netoCop: 2_601_700, pagosFuera: 1 },
})

const lectura = (): LecturaDelReporte => ({
  archivo: 'wompi.csv',
  huella: 'abc',
  yaSubido: null,
  resumen: { renglones: 3, nuevas: 2, actualizan: 0, iguales: 0, repetidas: 0, frenadas: 1 },
  porCuadre: { cuadra: 2 },
  filas: [
    {
      fila: 1, transaccionId: 'tx-1', accion: 'nueva', motivo: null, referencia: 'rent-1', fecha: '2026-10-02',
      estado: 'APPROVED', medio: 'PSE', brutoCop: 1_200_000, comisionCop: 30_000, ivaCop: 5_700, retencionesCop: 0,
      netoCop: 1_164_300, desembolsoId: 'D-77', cuadre: 'cuadra', detalleDelCuadre: null, agencyId: A,
      inmobiliaria: 'Inmobiliaria Andina',
    },
    {
      fila: 2, transaccionId: 'tx-7', accion: 'frenada',
      motivo: 'En el renglón 2, «mil» no es un valor válido para el monto (sin negativos). Corrígelo en el archivo y vuelve a subirlo.',
      referencia: null, fecha: null, estado: null, medio: null, brutoCop: null, comisionCop: null, ivaCop: null,
      retencionesCop: null, netoCop: null, desembolsoId: null, cuadre: null, detalleDelCuadre: null, agencyId: null,
      inmobiliaria: null,
    },
  ],
  filasOmitidas: 0,
  desembolsos: [],
})

const cuadre = (): CuadreDelRecaudo => ({
  disponible: true,
  desde: '2026-10-01',
  hasta: '2026-10-31',
  cuadre: {
    totales: {
      transacciones: 6, aprobadas: 5, reportadoBrutoCop: 5_300_000, reportadoDescuentosCop: 100_000,
      reportadoNetoCop: 5_200_000, liquidadoNetoCop: 3_477_900, porLiquidar: 1, porLiquidarNetoCop: 679_175,
      sinCuadrar: 1, sinCuadrarNetoCop: 970_250, registradasSinReporte: 1, registradasSinReporteCop: 650_000,
      diferenciaCop: 0, diferencias: 2,
    },
    desembolsos: [
      {
        desembolsoId: 'D-77', fecha: '2026-10-04', transacciones: 4, brutoCop: 4_600_000, descuentosCop: 90_000,
        netoCop: 4_448_150, liquidadoNetoCop: 3_477_900, porLiquidarNetoCop: 0, sinCuadrarNetoCop: 970_250,
        diferenciaCop: 0, diferencias: 1, estado: 'con-diferencias',
      },
    ],
    diferencias: [
      {
        tipo: 'no-cuadra', transaccionId: 'tx-4', agencyId: A, inmobiliaria: 'Inmobiliaria Andina',
        desembolsoId: 'D-77', fecha: '2026-10-04', reportadoCop: 970_250, otroCop: null,
        detalle: 'Wompi reporta $1.000.000 y la plataforma registró $980.000.',
      },
      {
        tipo: 'registrada-sin-reporte', transaccionId: 'tx-9', agencyId: A, inmobiliaria: 'Inmobiliaria Andina',
        desembolsoId: null, fecha: '2026-10-06', reportadoCop: null, otroCop: 650_000,
        detalle: 'La plataforma la registró aprobada el 2026-10-06 por $650.000 y ningún reporte de Wompi subido la trae.',
      },
    ],
  },
  diferenciasOmitidas: 0,
  sinFecha: 0,
})

let container: HTMLDivElement
let root: Root | null = null
const q = (t: string) => container.querySelector(`[data-testid="${t}"]`) as HTMLElement | null

async function esperar() {
  for (let i = 0; i < 4; i++) {
    await act(async () => {
      await Promise.resolve()
    })
  }
}

async function pintar() {
  await act(async () => {
    root = createRoot(container)
    root.render(React.createElement(RecaudoEnLineaAdminPage))
  })
  await esperar()
}

async function clic(el: HTMLElement) {
  await act(async () => {
    el.click()
  })
  await esperar()
}

async function escribir(testid: string, valor: string) {
  const el = q(testid) as HTMLInputElement | HTMLSelectElement
  const proto = el instanceof HTMLSelectElement ? HTMLSelectElement.prototype : HTMLInputElement.prototype
  await act(async () => {
    Object.getOwnPropertyDescriptor(proto, 'value')!.set!.call(el, valor)
    el.dispatchEvent(new Event(el instanceof HTMLSelectElement ? 'change' : 'input', { bubbles: true }))
  })
  await esperar()
}

async function subir(nombre: string, contenido: string, tamano?: number) {
  const archivo = new File([contenido], nombre, { type: 'text/csv' })
  if (tamano !== undefined) Object.defineProperty(archivo, 'size', { value: tamano })
  const input = q('archivo-del-reporte') as HTMLInputElement
  Object.defineProperty(input, 'files', { value: [archivo], configurable: true })
  await act(async () => {
    input.dispatchEvent(new Event('change', { bubbles: true }))
  })
  await esperar()
}

beforeEach(() => {
  container = document.createElement('div')
  document.body.appendChild(container)
  resumenDelRecaudo.mockReset().mockResolvedValue(resumen())
  listarLiquidaciones.mockReset().mockResolvedValue(lista())
  verLiquidacion.mockReset().mockResolvedValue(detalle())
  marcarGirada.mockReset().mockResolvedValue(detalle({ estado: 'girada', giradaEl: '2026-10-01' }))
  vistaPreviaDeLiquidaciones.mockReset().mockResolvedValue(vistaPrevia())
  generarLiquidaciones.mockReset().mockResolvedValue({
    desde: '2026-10-01',
    hasta: '2026-10-15',
    fechaDelGiro: '2026-10-16',
    resultados: [
      { agencyId: A, inmobiliaria: 'Inmobiliaria Andina', numero: 'LQ261015-0A1B2C-9F3A01', netoCop: 2_601_700, estado: 'creada', liquidacionId: ID, motivo: null },
    ],
    fuera: [],
    sinFecha: 0,
  })
  vistaPreviaDelReporte.mockReset().mockResolvedValue(lectura())
  importarElReporte.mockReset().mockResolvedValue({ ...lectura(), importadas: 2, cuadresActualizados: 0 })
  cuadreDelRecaudo.mockReset().mockResolvedValue(cuadre())
  exportarLiquidacionAExcel.mockReset().mockResolvedValue(undefined)
  exportarLiquidacionAPdf.mockReset().mockResolvedValue(undefined)
})

afterEach(() => {
  if (root) {
    act(() => root?.unmount())
    root = null
  }
  container.remove()
  vi.clearAllMocks()
})

describe('RecaudoEnLineaAdminPage', () => {
  it('🔴 dice en pantalla que la frecuencia del giro está POR DEFINIR', async () => {
    await pintar()
    expect(q('frecuencia-del-giro')!.textContent).toContain('Frecuencia del giro: por definir')
    expect(q('frecuencia-del-giro')!.textContent).toContain('a mano, por rango de fechas')
  })

  it('sin la migración del agregador lo dice y nombra la carpeta', async () => {
    resumenDelRecaudo.mockResolvedValue(resumen({ disponible: false, giroDisponible: false }))
    await pintar()
    expect(q('sin-migracion')!.textContent).toContain('20261003100000_liquidaciones_del_recaudo')
    expect(listarLiquidaciones).not.toHaveBeenCalled()
  })

  it('la lista muestra bruto, comisión, IVA, retenciones, neto y estado; filtra por estado; abre los pagos y descarga Excel y PDF', async () => {
    await pintar()
    const fila = q('liquidacion-LQ261015-0A1B2C-9F3A01')!
    for (const t of ['$2.700.000', '$70.000', '$13.300', '$15.000', '$2.601.700', 'generada', 'Inmobiliaria Andina']) {
      expect(fila.textContent).toContain(t)
    }

    await escribir('filtro-estado', 'girada')
    expect(listarLiquidaciones).toHaveBeenLastCalledWith(
      expect.objectContaining({ estado: 'girada', pagina: 0, porPagina: 25 }),
      expect.anything(),
    )

    await clic(q('abrir-LQ261015-0A1B2C-9F3A01')!)
    expect(verLiquidacion).toHaveBeenCalledWith(ID, expect.anything())
    const d = q('detalle-LQ261015-0A1B2C-9F3A01')!
    expect(d.textContent).toContain('900123456-7')
    expect(q('pagos-de-la-liquidacion')!.textContent).toContain('RC-1')
    expect(q('descuentos')!.textContent).toContain('reporte de wompi')

    await clic(q('descargar-excel')!)
    expect(exportarLiquidacionAExcel).toHaveBeenCalledWith(expect.objectContaining({ id: ID, nit: '900123456-7' }))
    await clic(q('descargar-pdf')!)
    expect(exportarLiquidacionAPdf).toHaveBeenCalledTimes(1)
  })

  it('🔴 marcar girada pide confirmación, no deja una fecha futura y manda el día y el comprobante', async () => {
    await pintar()
    await clic(q('abrir-LQ261015-0A1B2C-9F3A01')!)
    await clic(q('marcar-girada')!)
    expect(marcarGirada).not.toHaveBeenCalled()
    expect(q('confirmar-girada')!.textContent).toContain('$2.601.700')

    await escribir('fecha-del-giro', '2999-01-01')
    expect((q('confirmar-girada-si') as HTMLButtonElement).disabled).toBe(true)
    expect(q('confirmar-girada')!.textContent).toContain('no puede ser después de hoy')

    await escribir('fecha-del-giro', '2026-10-01')
    await escribir('referencia-del-giro', 'TRF-123')
    await clic(q('confirmar-girada-si')!)
    expect(marcarGirada).toHaveBeenCalledWith(ID, { fecha: '2026-10-01', referenciaBancaria: 'TRF-123' })
    // Se vuelve a leer la lista y el detalle.
    expect(listarLiquidaciones.mock.calls.length).toBeGreaterThanOrEqual(2)
    expect(verLiquidacion.mock.calls.length).toBeGreaterThanOrEqual(2)
  })

  it('sin la migración del giro no ofrece marcar girada y lo dice', async () => {
    resumenDelRecaudo.mockResolvedValue(resumen({ giroDisponible: false }))
    listarLiquidaciones.mockResolvedValue(lista({ giroDisponible: false }))
    await pintar()
    expect(q('sin-migracion-del-giro')!.textContent).toContain('20261003160500_giro_de_la_liquidacion_del_recaudo')
    await clic(q('abrir-LQ261015-0A1B2C-9F3A01')!)
    expect(q('marcar-girada')).toBeNull()
    expect(q('giro-sin-migracion')).not.toBeNull()
  })

  it('🔴 generar: vista previa con lo que queda fuera y su frase, confirmación, y manda rango, fecha del giro y «sólo desembolsadas»', async () => {
    await pintar()
    await clic(q('abrir-generar')!)
    await escribir('generar-desde', '2026-10-01')
    await escribir('generar-hasta', '2026-10-15')
    await escribir('generar-fecha-del-giro', '2026-10-16')
    await clic(q('ver-vista-previa')!)
    expect(vistaPreviaDeLiquidaciones).toHaveBeenCalledWith({
      desde: '2026-10-01',
      hasta: '2026-10-15',
      agencyId: undefined,
      soloDesembolsadas: true,
      descuentosDeLeasefy: [],
    })
    expect(q('pagos-fuera')!.textContent).toContain('la plataforma registró $980.000')

    await clic(q('generar')!)
    expect(generarLiquidaciones).not.toHaveBeenCalled()
    expect(q('confirmar-generar')!.textContent).toContain('no mueve plata')
    await clic(q('confirmar-generar-si')!)
    expect(generarLiquidaciones).toHaveBeenCalledWith(
      expect.objectContaining({ desde: '2026-10-01', hasta: '2026-10-15', fechaDelGiro: '2026-10-16', soloDesembolsadas: true }),
    )
    expect(q('resultado-de-generar')!.textContent).toContain('generada')
  })

  it('🔴 un descuento de Leasefy obliga a actualizar la vista previa y viaja tal como se escribió', async () => {
    await pintar()
    await clic(q('abrir-generar')!)
    await clic(q('ver-vista-previa')!)

    await escribir(`descuento-concepto-${A}`, 'Servicio de recaudo')
    expect(q('descuento-malo')).not.toBeNull()
    await escribir(`descuento-valor-${A}`, '12.000')
    expect(q('descuento-malo')).toBeNull()
    expect(q('vista-vieja')).not.toBeNull()
    expect((q('generar') as HTMLButtonElement).disabled).toBe(true)

    await clic(q('ver-vista-previa')!)
    expect(vistaPreviaDeLiquidaciones).toHaveBeenLastCalledWith(
      expect.objectContaining({
        descuentosDeLeasefy: [{ agencyId: A, concepto: 'Servicio de recaudo', valorCop: 12_000 }],
      }),
    )
    expect(q('vista-vieja')).toBeNull()
    expect((q('generar') as HTMLButtonElement).disabled).toBe(false)
  })

  it('🔴 el reporte: las frenadas con su frase, y se importa sólo lo legible', async () => {
    await pintar()
    await clic(q('pestana-reporte')!)
    await subir('wompi.csv', 'id,estado,monto\ntx-1,APPROVED,1200000')
    expect(vistaPreviaDelReporte).toHaveBeenCalledWith({
      archivo: 'wompi.csv',
      contenido: 'id,estado,monto\ntx-1,APPROVED,1200000',
    })
    expect(q('frenadas')!.textContent).toContain('«mil» no es un valor válido para el monto')
    expect(q('importar-reporte')!.textContent).toContain('Importar 2 transacciones')

    await clic(q('importar-reporte')!)
    expect(importarElReporte).toHaveBeenCalledWith({ archivo: 'wompi.csv', contenido: 'id,estado,monto\ntx-1,APPROVED,1200000' })
    expect(q('resultado-del-reporte')!.textContent).toContain('importaron 2 transacciones')
    expect(q('resultado-del-reporte')!.textContent).toContain('1 quedaron frenadas')
  })

  it('un reporte de más de 10 MB se frena aquí, sin mandarlo', async () => {
    await pintar()
    await clic(q('pestana-reporte')!)
    await subir('grande.csv', 'x', 10_000_001)
    expect(vistaPreviaDelReporte).not.toHaveBeenCalled()
    expect(q('error-del-reporte')!.textContent).toContain('pasa de 10 MB')
  })

  it('el cuadre: totales, desembolsos y las diferencias marcadas con su frase', async () => {
    await pintar()
    await clic(q('pestana-cuadre')!)
    expect(cuadreDelRecaudo).toHaveBeenCalled()
    expect(q('totales-del-cuadre')!.textContent).toContain('$5.200.000')
    expect(q('desembolsos-del-cuadre')!.textContent).toContain('con diferencias')
    expect(q('diferencia-tx-4')!.textContent).toContain('No cuadra con la plataforma')
    expect(q('diferencia-tx-9')!.textContent).toContain('ningún reporte de Wompi subido la trae')
  })
})
