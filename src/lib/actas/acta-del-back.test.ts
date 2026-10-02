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
import { actaDelBack, cuerpoParaCrearElActa, type LoQueSeLevanto } from './acta-del-back'

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
