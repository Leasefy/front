import { describe, it, expect } from 'vitest'

import type {
  ContratoDelEstadoDeCuenta,
  FilaDelEstadoDeCuenta,
} from '@/lib/types/estado-de-cuenta'
import { deudaDelContrato, NOMBRE_DEL_ESTADO } from './deuda-del-contrato'

function fila(p: Partial<FilaDelEstadoDeCuenta> & Pick<FilaDelEstadoDeCuenta, 'fechaVencimiento'>): FilaDelEstadoDeCuenta {
  return {
    concepto: `Arriendo ${p.fechaVencimiento}`,
    estado: 'PENDIENTE',
    fechaDePago: null,
    valorBruto: 1_650_000,
    iva: 0,
    retencion: 0,
    reteIva: 0,
    reteIca: 0,
    valorNeto: 1_650_000,
    documentoDePago: null,
    parcial: false,
    cuotaId: `cuota-${p.fechaVencimiento}`,
    ...p,
  }
}

function contrato(
  arriendos: FilaDelEstadoDeCuenta[],
  extra: Partial<ContratoDelEstadoDeCuenta> = {},
): ContratoDelEstadoDeCuenta {
  return {
    id: 'c-1',
    numero: '1686',
    rol: 'INQUILINO',
    inmueble: { direccion: 'Cra 76 # 32-11' },
    vigente: true,
    secciones: { arriendos, otrosConceptos: [] },
    totales: { cancelado: 3_300_000, pendiente: 0, restaPorPagar: 19_214_516 },
    cortes: [],
    ...extra,
  }
}

const pagada = (fecha: string) =>
  fila({ fechaVencimiento: fecha, estado: 'CANCELADA', fechaDePago: fecha })

describe('deudaDelContrato — los tres estados de la deuda', () => {
  const base = [
    pagada('2026-07-21'),
    pagada('2026-08-21'),
    fila({ fechaVencimiento: '2026-09-21' }),
    fila({ fechaVencimiento: '2026-10-21' }),
  ]

  it('AL DÍA: debe cuotas futuras y nada vencido', () => {
    const d = deudaDelContrato({ contrato: contrato(base), hoy: '2026-09-16', diasDePlazo: 2 })
    expect(d.estado).toBe('AL_DIA')
    expect(NOMBRE_DEL_ESTADO[d.estado]).toBe('Al día')
    expect(d.vencido).toBe(0)
    expect(d.proxima).toEqual({ fecha: '2026-09-21', monto: 1_650_000, enDias: 5 })
    // Lo que resta sale de los totales del back, no se recalcula.
    expect(d.restaPorPagar).toBe(19_214_516)
    expect(d.cancelado).toBe(3_300_000)
  })

  it('la cuota que vence HOY es la próxima, no una vencida', () => {
    const d = deudaDelContrato({ contrato: contrato(base), hoy: '2026-09-21', diasDePlazo: 0 })
    expect(d.estado).toBe('AL_DIA')
    expect(d.proxima).toMatchObject({ fecha: '2026-09-21', enDias: 0 })
  })

  it('VENCIDO, EN PLAZO: pasó su día pero no los días de plazo', () => {
    const d = deudaDelContrato({ contrato: contrato(base), hoy: '2026-09-22', diasDePlazo: 2 })
    expect(d.estado).toBe('VENCIDO_EN_PLAZO')
    expect(NOMBRE_DEL_ESTADO[d.estado]).toBe('Vencido, en plazo')
    expect(d.vencido).toBe(1_650_000)
    expect(d.enCartera).toBe(0)
    expect(d.diasDeMora).toBe(0)
    expect(d.diasDePlazoQueQuedan).toBe(1)
    expect(d.proxima).toMatchObject({ fecha: '2026-10-21', enDias: 29 })
  })

  it('el último día de plazo todavía no es cartera (misma frontera que el back)', () => {
    const d = deudaDelContrato({ contrato: contrato(base), hoy: '2026-09-23', diasDePlazo: 2 })
    expect(d.estado).toBe('VENCIDO_EN_PLAZO')
    expect(d.diasDePlazoQueQuedan).toBe(0)
  })

  it('EN CARTERA: al día siguiente del plazo, con sus días de mora', () => {
    const d = deudaDelContrato({ contrato: contrato(base), hoy: '2026-09-24', diasDePlazo: 2 })
    expect(d.estado).toBe('EN_CARTERA')
    expect(NOMBRE_DEL_ESTADO[d.estado]).toBe('En cartera')
    expect(d.enCartera).toBe(1_650_000)
    expect(d.diasDeMora).toBe(1)
    expect(d.diasDePlazoQueQuedan).toBeNull()
  })

  it('sin plazo, lo vencido ayer ya es cartera', () => {
    const d = deudaDelContrato({ contrato: contrato(base), hoy: '2026-09-22', diasDePlazo: 0 })
    expect(d.estado).toBe('EN_CARTERA')
    expect(d.diasDeMora).toBe(1)
  })

  it('cartera y en plazo a la vez: manda la cartera, y cuenta las dos cosas', () => {
    const filas = [fila({ fechaVencimiento: '2026-08-21' }), fila({ fechaVencimiento: '2026-09-21' })]
    const d = deudaDelContrato({ contrato: contrato(filas), hoy: '2026-09-22', diasDePlazo: 2 })
    expect(d.estado).toBe('EN_CARTERA')
    expect(d.vencido).toBe(3_300_000)
    expect(d.enCartera).toBe(1_650_000)
    // 22-sep menos (21-ago + 2) = 30 días.
    expect(d.diasDeMora).toBe(30)
    expect(d.diasDePlazoQueQuedan).toBe(1)
    expect(d.proxima).toBeNull()
  })

  it('si el plazo no se conoce, dice «vencido» sin afirmar plazo ni cartera', () => {
    const d = deudaDelContrato({ contrato: contrato(base), hoy: '2026-10-05', diasDePlazo: null })
    expect(d.estado).toBe('VENCIDO_SIN_PLAZO')
    expect(d.vencido).toBe(1_650_000)
    expect(d.enCartera).toBe(0)
  })
})

describe('deudaDelContrato — qué se suma y qué se cuenta', () => {
  it('«Otros conceptos» no se suma: ya está adentro del neto de la cuota', () => {
    const c = contrato([fila({ fechaVencimiento: '2026-09-01', valorNeto: 1_850_000 })])
    c.secciones.otrosConceptos = [
      fila({ fechaVencimiento: '2026-09-01', concepto: 'Administración', valorNeto: 200_000 }),
    ]
    const d = deudaDelContrato({ contrato: c, hoy: '2026-09-16', diasDePlazo: 2 })
    expect(d.vencido).toBe(1_850_000)
  })

  it('un abono parcial: se debe sólo el resto, y es UNA cuota sin pagar', () => {
    const filas = [
      fila({ fechaVencimiento: '2026-09-21', cuotaId: 'q9', estado: 'CANCELADA', valorNeto: 650_000, parcial: true }),
      fila({
        fechaVencimiento: '2026-09-21',
        cuotaId: 'q9',
        concepto: 'Saldo pendiente por Arriendo',
        valorNeto: 1_000_000,
        parcial: true,
      }),
      pagada('2026-08-21'),
    ]
    const d = deudaDelContrato({ contrato: contrato(filas), hoy: '2026-09-30', diasDePlazo: 2 })
    expect(d.enCartera).toBe(1_000_000)
    expect(d.cuotas).toEqual({ pagadas: 1, anteriores: 0, total: 2 })
  })

  it('las anteriores se cuentan aparte y las anuladas no existen', () => {
    const filas = [
      fila({ fechaVencimiento: '2025-01-21', estado: 'ANTERIOR' }),
      fila({ fechaVencimiento: '2025-02-21', estado: 'ANTERIOR' }),
      pagada('2026-08-21'),
      fila({ fechaVencimiento: '2026-10-21' }),
      fila({ fechaVencimiento: '2026-11-21', estado: 'ANULADA' }),
    ]
    const d = deudaDelContrato({ contrato: contrato(filas), hoy: '2026-09-16', diasDePlazo: 2 })
    expect(d.cuotas).toEqual({ pagadas: 1, anteriores: 2, total: 4 })
    // Una ANTERIOR sin pagar no es deuda de acá.
    expect(d.vencido).toBe(0)
    expect(d.estado).toBe('AL_DIA')
  })
})

describe('deudaDelContrato — manda el cajón del back (QA 22-09: 135 vs 136)', () => {
  it('con cajon y diasDeMora del back, la ficha dice lo mismo que el estado de cuenta', () => {
    // El front recontaba `hoy − vencimiento − plazo` = 135; el back, con el día
    // del vencimiento como día 1 del plazo, dice 136.
    const c = contrato([
      fila({ fechaVencimiento: '2026-05-03', cajon: 'CARTERA', diasDeMora: 136 }),
      fila({ fechaVencimiento: '2026-10-03', cajon: 'POR_VENCER' }),
    ])
    const d = deudaDelContrato({ contrato: c, hoy: '2026-09-22', diasDePlazo: 7 })
    expect(d.diasDeMora).toBe(136)
    expect(d.estado).toBe('EN_CARTERA')
    expect(d.proxima?.fecha).toBe('2026-10-03')
  })

  it('en el borde: si el back ya dice CARTERA, la ficha no dice «en plazo»', () => {
    // Recontado por el front, 7 días desde el vencimiento con 7 de plazo = en plazo.
    const c = contrato([fila({ fechaVencimiento: '2026-09-15', cajon: 'CARTERA', diasDeMora: 1 })])
    const d = deudaDelContrato({ contrato: c, hoy: '2026-09-22', diasDePlazo: 7 })
    expect(d.estado).toBe('EN_CARTERA')
    expect(d.enCartera).toBe(1_650_000)
  })
})
