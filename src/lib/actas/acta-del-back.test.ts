/**
 * 🔴 02-10-2026 · «Crear un acta desde el panel parece roto» (Nico).
 *
 * El formulario mandaba un `ActaEntrega` entero y `CreateActaDto` respondía
 * 400 por cada clave que no conoce. `cuerpoParaCrearElActa` arma EXACTAMENTE
 * su cuerpo: este literal es el MISMO que el back pasa por su `ValidationPipe`
 * real en `actas/crear-un-acta-desde-el-panel.spec.ts`. Si cambia uno, cambia
 * el otro.
 */
import { describe, expect, it } from 'vitest'
import type { Consignacion } from '@/lib/types/inmobiliaria'
import {
  actaDelBack,
  cargoAparteDelCierre,
  elCargoEntro,
  cuandoFueLaEntrega,
  cuerpoParaCrearElActa,
  hoyEnBogota,
  type LoQueSeLevanto,
} from './acta-del-back'

/** 🔁 El MISMO literal que `CUERPO_DEL_PANEL` del back. */
const CUERPO_DEL_PANEL = {
  type: 'DEVOLUCION',
  propietarioId: '6f1c2b8e-1d2a-4c3b-9e4f-5a6b7c8d9e0f',
  consignacionId: '0b5d7c1e-2f3a-4b6c-8d9e-1a2b3c4d5e6f',
  leaseId: '9a8b7c6d-5e4f-4a3b-9c2d-1e0f9a8b7c6d',
  propertyTitle: 'Apto 301 Torre B',
  propertyAddress: 'Cra 7 #45-23, Bogotá',
  tenantName: 'María López',
  generalCondition: 'GOOD',
  generalObservations: 'Entrega con la cocina recién pintada.',
  depositAmount: 1_000_000,
  rooms: ['sala', 'cocina'],
  items: [{ id: 'i-1', room: 'sala', name: 'Sofá', quantity: 1, condition: 'bueno', hasDefects: false }],
  meterReadings: [{ type: 'agua', reading: '00123', unit: 'm3' }],
  keysDelivered: [{ type: 'Llave principal', quantity: 2 }],
  deductions: [
    { concept: 'Pintura de la sala', amount: 1_200_000 },
    { concept: 'Aseo', amount: 300_000, notes: 'Cocina' },
  ],
  depositToReturn: 0,
  // La fecha y la hora del primer paso, en la hora de Colombia (02-10-2026).
  fechaDeEntrega: '2026-10-02T10:00:00-05:00',
}

const MANDATO = {
  id: '0b5d7c1e-2f3a-4b6c-8d9e-1a2b3c4d5e6f',
  propertyId: 'p-1',
  propertyTitle: 'Apto 301 Torre B',
  propertyAddress: 'Cra 7 #45-23, Bogotá',
  propietarioId: '6f1c2b8e-1d2a-4c3b-9e4f-5a6b7c8d9e0f',
  agenteId: 'ag-1',
  currentLeaseId: '9a8b7c6d-5e4f-4a3b-9c2d-1e0f9a8b7c6d',
  currentTenantName: ' María López ',
} as unknown as Consignacion

const LEVANTADO: LoQueSeLevanto = {
  type: 'devolucion',
  rooms: ['sala', 'cocina'],
  items: [{ id: 'i-1', room: 'sala', name: 'Sofá', quantity: 1, condition: 'bueno', hasDefects: false }],
  meterReadings: [{ type: 'agua', reading: '00123', unit: 'm3' }],
  keysDelivered: [{ type: 'Llave principal', quantity: 2 }],
  generalCondition: 'bueno',
  generalObservations: '  Entrega con la cocina recién pintada. ',
  depositAmount: 1_000_000,
  deductions: [
    { concept: 'Pintura de la sala', amount: 1_200_000 },
    // Un renglón agregado y dejado vacío no se manda.
    { concept: '  ', amount: 0 },
    { concept: ' Aseo ', amount: 300_000, notes: ' Cocina ' },
  ],
  deliveryDate: '2026-10-02',
  deliveryTime: '10:00',
}

describe('cuerpoParaCrearElActa', () => {
  it('🔴 arma EXACTAMENTE el cuerpo de CreateActaDto (el literal que el back valida)', () => {
    expect(cuerpoParaCrearElActa(LEVANTADO, MANDATO)).toEqual(CUERPO_DEL_PANEL)
  })

  it('🔴 no manda nada que el DTO no conozca ni datos inventados del inquilino', () => {
    const cuerpo = cuerpoParaCrearElActa(LEVANTADO, MANDATO) as unknown as Record<string, unknown>
    for (const clave of [
      'id',
      'status',
      'createdAt',
      'updatedAt',
      'tenantCedula',
      'tenantPhone',
      'tenantEmail',
      'tenantId',
      'propietarioName',
      'agenteName',
      'deliveryDate',
      'deliveryTime',
      'signatures',
      'propertyId',
    ]) {
      expect(cuerpo).not.toHaveProperty(clave)
    }
  })

  it('una entrega sin depósito ni contrato no manda ni depósito, ni devolución, ni arriendo', () => {
    const cuerpo = cuerpoParaCrearElActa(
      { ...LEVANTADO, type: 'entrega', depositAmount: undefined, deductions: undefined, generalObservations: '' },
      { ...MANDATO, currentLeaseId: '', currentTenantName: undefined } as Consignacion,
    )
    expect(cuerpo.type).toBe('ENTREGA')
    for (const clave of ['depositAmount', 'depositToReturn', 'deductions', 'leaseId', 'tenantName', 'generalObservations']) {
      expect(cuerpo).not.toHaveProperty(clave)
    }
  })

  it('el estado general va en el vocabulario del back; «no aplica» no se manda', () => {
    const condicion = (c: LoQueSeLevanto['generalCondition']) =>
      cuerpoParaCrearElActa({ ...LEVANTADO, generalCondition: c }, MANDATO).generalCondition
    expect(condicion('excelente')).toBe('EXCELLENT')
    expect(condicion('regular')).toBe('FAIR')
    expect(condicion('malo')).toBe('POOR')
    expect(condicion('no_aplica')).toBeUndefined()
  })

  it('🔴 lo que se devuelve nunca es negativo (Nico, 02-10-2026)', () => {
    const cuerpo = cuerpoParaCrearElActa(
      { ...LEVANTADO, depositAmount: 2_000_000, deductions: [{ concept: 'Aseo', amount: 300_000 }] },
      MANDATO,
    )
    expect(cuerpo.depositToReturn).toBe(1_700_000)
    expect(CUERPO_DEL_PANEL.depositToReturn).toBe(0)
  })
})

describe('🔴 la fecha y la hora de la entrega (Nico, 02-10-2026)', () => {
  it('sin una hora válida no se manda la fecha (el asistente no deja seguir sin ella)', () => {
    for (const deliveryTime of ['', '25:00', '9:5', undefined]) {
      expect(cuerpoParaCrearElActa({ ...LEVANTADO, deliveryTime }, MANDATO)).not.toHaveProperty('fechaDeEntrega')
    }
  })

  it('la que guardó el back se lee en la hora de Colombia: día y hora', () => {
    // 2:30 a. m. UTC del 3 = 9:30 p. m. del 2 en Colombia.
    const acta = actaDelBack({ fechaDeEntrega: '2026-10-03T02:30:00.000Z', createdAt: '2026-09-30T15:00:00.000Z' })
    expect(acta.deliveryDate).toBe('2026-10-02')
    expect(acta.deliveryTime).toBe('21:30')
  })

  it('🔴 sin ella, la de creación, también en Colombia (antes, después de las 7 p. m. salía el día siguiente)', () => {
    const acta = actaDelBack({ fechaDeEntrega: null, createdAt: '2026-10-03T01:00:00.000Z' })
    expect(acta.deliveryDate).toBe('2026-10-02')
    expect(acta.deliveryTime).toBeUndefined()
  })

  it('la lista dice el día y la hora; sin hora, sólo el día; y nunca corre el día por la zona', () => {
    expect(cuandoFueLaEntrega({ deliveryDate: '2026-10-02', deliveryTime: '21:30' }, 'es')).toMatch(
      /^02\s(de\s)?oct\.?\s(de\s)?2026 · 9:30\sp\.\s?m\.$/,
    )
    expect(cuandoFueLaEntrega({ deliveryDate: '2026-10-01' }, 'es')).toMatch(/^01\s(de\s)?oct\.?\s(de\s)?2026$/)
    expect(cuandoFueLaEntrega({ deliveryDate: '' }, 'es')).toBe('—')
  })

  it('hoy en Colombia, no en UTC', () => {
    expect(hoyEnBogota(new Date('2026-10-03T01:00:00.000Z'))).toBe('2026-10-02')
    expect(hoyEnBogota(new Date('2026-10-02T15:00:00.000Z'))).toBe('2026-10-02')
  })
})

describe('🔴 el cargo aparte al cerrar el acta (Nico, 02-10-2026)', () => {
  it('lee el cargo que trae la respuesta del cierre', () => {
    expect(
      cargoAparteDelCierre({
        id: 'a-1',
        cargoAparte: { estado: 'CREADO', valorCop: 500_000, mensaje: 'Se le cargaron $500.000', cargoId: 'c-1', mes: '2026-10' },
      }),
    ).toEqual({ estado: 'CREADO', valorCop: 500_000, mensaje: 'Se le cargaron $500.000', vence: null })
  })

  it('🔴 la CUOTA DE CIERRE trae cuándo vence, y cuenta como un cargo que entró', () => {
    const cargo = cargoAparteDelCierre({
      cargoAparte: {
        estado: 'CUOTA_DE_CIERRE',
        valorCop: 500_000,
        mensaje: 'Se le cargaron $500.000 en una cuota de cierre que vence el 15 de octubre de 2026.',
        cargoId: 'c-1',
        mes: '2026-11',
        vence: '2026-10-15',
      },
    })
    expect(cargo).toMatchObject({ estado: 'CUOTA_DE_CIERRE', vence: '2026-10-15' })
    expect(elCargoEntro(cargo!)).toBe(true)
  })

  it('sólo CREADO y CUOTA_DE_CIERRE son «entró»; un `vence` raro no se inventa', () => {
    const conEstado = (estado: string, vence: unknown = null) =>
      cargoAparteDelCierre({ cargoAparte: { estado, valorCop: 1, mensaje: 'x', vence } })!
    expect(elCargoEntro(conEstado('CREADO'))).toBe(true)
    for (const estado of ['SIN_MIGRACION', 'SIN_CONTRATO', 'SIN_CUOTA_SIN_PAGAR', 'FUERA_DE_RANGO']) {
      expect(elCargoEntro(conEstado(estado))).toBe(false)
    }
    expect(conEstado('CUOTA_DE_CIERRE', '15/10/2026').vence).toBeNull()
    expect(conEstado('CREADO', '2026-10-15').vence).toBeNull()
  })

  it('sin cargo, o con uno que no se entiende, `null` (nunca se inventa un aviso)', () => {
    expect(cargoAparteDelCierre({ id: 'a-1', cargoAparte: null })).toBeNull()
    expect(cargoAparteDelCierre({ id: 'a-1' })).toBeNull()
    expect(cargoAparteDelCierre({ cargoAparte: { estado: 'OTRO', valorCop: 1, mensaje: 'x' } })).toBeNull()
    expect(cargoAparteDelCierre({ cargoAparte: { estado: 'CREADO', valorCop: 1, mensaje: '  ' } })).toBeNull()
    expect(cargoAparteDelCierre(null)).toBeNull()
  })
})

describe('actaDelBack', () => {
  it('🔴 la fila del back se pinta en el vocabulario del panel (antes toda acta salía «Devolución» y sin estado)', () => {
    const acta = actaDelBack({
      id: 'a-1',
      type: 'ENTREGA',
      status: 'ACTA_DRAFT',
      generalCondition: 'GOOD',
      createdAt: '2026-10-02T15:04:00.000Z',
      rooms: ['sala'],
      items: [],
      meterReadings: [],
      keysDelivered: [],
      signatures: [],
      deductions: [],
      depositAmount: null,
      depositToReturn: null,
    })
    expect(acta.type).toBe('entrega')
    expect(acta.status).toBe('draft')
    expect(acta.generalCondition).toBe('bueno')
    // El acta no guarda la fecha de la entrega: se ve la de creación.
    expect(acta.deliveryDate).toBe('2026-10-02')
    expect(acta.depositAmount).toBeUndefined()
  })

  it('los cuatro estados y la devolución', () => {
    const estado = (s: string) => actaDelBack({ status: s, type: 'DEVOLUCION' })
    expect(estado('ACTA_IN_PROGRESS').status).toBe('in_progress')
    expect(estado('PENDING_SIGNATURES').status).toBe('pending_signatures')
    expect(estado('ACTA_COMPLETED').status).toBe('completed')
    expect(estado('ACTA_COMPLETED').type).toBe('devolucion')
  })

  it('lo que ya viene en el vocabulario del panel pasa tal cual (nunca se inventa)', () => {
    const acta = actaDelBack({ type: 'entrega', status: 'completed', generalCondition: 'regular', deliveryDate: '2026-09-01' })
    expect(acta.type).toBe('entrega')
    expect(acta.status).toBe('completed')
    expect(acta.generalCondition).toBe('regular')
    expect(acta.deliveryDate).toBe('2026-09-01')
  })
})
