/**
 * mantenimiento.test.ts — Phase 7 plan 07-01 (Task 1 TDD)
 *
 * Asserts the maintenance domain model is the single source of truth:
 *  - the three const tuples have the exact length/ordered members (16/5/13)
 *  - ScoreBucket / ProbableResponsible cover their members
 *  - a sample MaintenanceTicketDetail type-checks at compile time
 *  - the shared CTA-gating constants (C7-04) export the canonical map
 */

import { describe, it, expect } from 'vitest'
import {
  MAINTENANCE_STATES,
  SEVERITIES,
  CATEGORIES,
  MAINTENANCE_TERMINAL_STATES,
  CTA_ALLOWED_FROM,
  type MaintenanceTicketState,
  type Severity,
  type Category,
  type ScoreBucket,
  type ProbableResponsible,
  type VisionAnalysis,
  type MaintenanceTicketCard,
  type MaintenanceTicketDetail,
  type MaintenanceKpis,
  type InboxFilters,
} from './mantenimiento'

describe('mantenimiento — const tuples', () => {
  it('MAINTENANCE_STATES has exactly the 16 states in order', () => {
    expect(MAINTENANCE_STATES.length).toBe(16)
    expect([...MAINTENANCE_STATES]).toEqual([
      'recibido',
      'en_triage',
      'informacion_incompleta',
      'clasificado',
      'requiere_aprobacion',
      'proveedor_sugerido',
      'proveedor_asignado',
      'visita_programada',
      'en_ejecucion',
      'pendiente_cotizacion',
      'pendiente_pago',
      'resuelto',
      'validado',
      'cerrado',
      'reabierto',
      'escalado',
    ])
  })

  it('SEVERITIES has exactly the 5 severities in order', () => {
    expect(SEVERITIES.length).toBe(5)
    expect([...SEVERITIES]).toEqual([
      'emergencia',
      'alta',
      'media',
      'baja',
      'informativa',
    ])
  })

  it('CATEGORIES has exactly the 13 categories in order', () => {
    expect(CATEGORIES.length).toBe(13)
    expect([...CATEGORIES]).toEqual([
      'plomeria',
      'electricidad',
      'gas',
      'humedad_filtracion',
      'carpinteria',
      'cerrajeria',
      'electrodomesticos',
      'pintura_acabados',
      'pisos',
      'vidrios_ventanas',
      'estructural',
      'zonas_comunes',
      'preventivo',
    ])
  })
})

describe('mantenimiento — derived unions cover their members', () => {
  it('ScoreBucket covers all 5 buckets', () => {
    const buckets: ScoreBucket[] = ['bajo', 'medio', 'alto', 'critico', 'emergencia']
    expect(new Set(buckets).size).toBe(5)
  })

  it('ProbableResponsible covers all 7 responsibles', () => {
    const responsibles: ProbableResponsible[] = [
      'propietario',
      'inquilino',
      'copropiedad',
      'constructor',
      'proveedor_anterior',
      'aseguradora',
      'no_determinado',
    ]
    expect(new Set(responsibles).size).toBe(7)
  })
})

describe('mantenimiento — C7-04 CTA gating constants', () => {
  it('MAINTENANCE_TERMINAL_STATES is exactly [cerrado]', () => {
    expect([...MAINTENANCE_TERMINAL_STATES]).toEqual(['cerrado'])
  })

  it('CTA_ALLOWED_FROM declares the 5 CTAs with state-machine-aligned origins', () => {
    expect(Object.keys(CTA_ALLOWED_FROM).sort()).toEqual(
      ['asignar', 'cerrar', 'escalarEmergencia', 'pedirInfo', 'solicitarAprobacion'].sort(),
    )
    expect([...CTA_ALLOWED_FROM.asignar]).toEqual(['proveedor_sugerido'])
    expect([...CTA_ALLOWED_FROM.solicitarAprobacion]).toEqual(['clasificado'])
    expect([...CTA_ALLOWED_FROM.cerrar]).toEqual(['resuelto'])
    // every declared origin is a member of MAINTENANCE_STATES
    for (const origins of Object.values(CTA_ALLOWED_FROM)) {
      for (const s of origins) {
        expect(MAINTENANCE_STATES).toContain(s)
      }
    }
  })
})

describe('mantenimiento — sample objects type-check', () => {
  it('a MaintenanceTicketDetail type-checks against all required fields', () => {
    const vision: VisionAnalysis = {
      safety_hold: true,
      requires_human_inspection: true,
      signals: ['posible fuga de gas'],
      photo_quality_score: 72,
      cannot_determine: ['origen exacto de la fuga'],
    }
    const card: MaintenanceTicketCard = {
      id: 'mant-001',
      titulo: 'Fuga en cocina',
      inmueble: { address: 'Cra 7 #45-12', unit: 'Apto 302' },
      score: 91,
      bucket: 'emergencia',
      categoria: 'gas',
      severidad: 'emergencia',
      estado: 'clasificado',
      createdAt: '2026-06-20T10:00:00.000Z',
      slaDeadlineAt: '2026-06-20T12:00:00.000Z',
      proveedorSugerido: 'GasExpress SAS',
      requiereAprobacion: false,
      hasPhotos: true,
      reabierto: false,
      retencionRiesgo: true,
      costoEstimadoCop: 850000,
      responsableProbable: 'propietario',
    }
    const detail: MaintenanceTicketDetail = {
      ...card,
      descripcion: 'Olor a gas en la cocina desde anoche.',
      queEntendi: 'El inquilino reporta olor a gas persistente en la cocina.',
      clasificacion: {
        categoria: 'gas',
        severidad: 'emergencia',
        score: 91,
        bucket: 'emergencia',
        rationale: 'Olor a gas = riesgo de seguridad inmediato.',
      },
      vision: [vision],
      proveedorRecomendado: {
        principal: { nombre: 'GasExpress SAS', rating: 4.7, etaHoras: 2, motivo: 'Especialista en gas' },
        backup: null,
      },
      aprobacion: { capCop: 1000000, estimatedMaxCop: 850000, requiresApproval: false },
      eventos: [
        { id: 'ev-1', at: '2026-06-20T10:01:00.000Z', tipo: 'recibido', descripcion: 'Ticket recibido', actor: 'agent' },
      ],
    }
    expect(detail.estado satisfies MaintenanceTicketState).toBe('clasificado')
    expect(detail.severidad satisfies Severity).toBe('emergencia')
    expect(detail.categoria satisfies Category).toBe('gas')
    expect(detail.vision[0].safety_hold).toBe(true)
  })

  it('a MaintenanceKpis includes the 2 anti-gaming metrics', () => {
    const kpis: MaintenanceKpis = {
      ticketsAbiertos: 7,
      emergenciasActivas: 1,
      vencidos: 2,
      tiempoPrimeraRespuestaMin: 12,
      slaCumplidoPct: 88,
      reaperturas30dPct: 8,
      tiempoResolucionRealDias: 4,
      costoEstimadoAbiertoCop: 4200000,
      propietariosEnRiesgo: 2,
    }
    expect(kpis.reaperturas30dPct).toBeGreaterThanOrEqual(0)
    expect(kpis.tiempoResolucionRealDias).toBeGreaterThan(0)
  })

  it('InboxFilters fields are all optional', () => {
    const empty: InboxFilters = {}
    const some: InboxFilters = { severidad: ['emergencia'], hasPhotos: true, costoMinCop: 100000 }
    expect(empty).toBeTruthy()
    expect(some.severidad?.[0]).toBe('emergencia')
  })
})
