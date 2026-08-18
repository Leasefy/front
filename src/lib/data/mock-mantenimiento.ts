/**
 * mock-mantenimiento.ts — Phase 7 plan 07-01 (DASH-01/02/03)
 *
 * Deterministic mock fixtures for the maintenance-triage dashboard (mock-first v1).
 * The agent backend has NO dashboard-read endpoints yet, so the UI consumes this
 * typed seam (CONTEXT §MOCK-FIRST). Pure module — NO 'use client', no network.
 *
 * DETERMINISM (CONTEXT §07-01): every factory takes a `now: Date` and derives all
 * ISO timestamps as offsets from it. There is NO `Date.now()` and NO `Math.random()`
 * in this module — calling a factory twice with the same `now` produces deep-equal
 * output; shifting `now` shifts every date by the same delta while ids/scores stay
 * identical.
 *
 * Synthetic es-CO data only — no real PII (threat T-07-01). COP values are integers.
 */

import type {
  Category,
  MaintenanceKpis,
  MaintenanceTicketCard,
  MaintenanceTicketDetail,
  ProbableResponsible,
  ScoreBucket,
  Severity,
  TicketEvent,
  VisionAnalysis,
  MaintenanceTicketState,
} from '@/lib/types/mantenimiento'

const MINUTE = 60 * 1000
const HOUR = 60 * MINUTE
const DAY = 24 * HOUR

/** open = not in a terminal/closed-ish state. Used by KPI derivation. */
const OPEN_EXCLUDED: ReadonlySet<MaintenanceTicketState> = new Set(['cerrado', 'validado'])

/** Map a 0–100 score to its priority bucket. */
function bucketForScore(score: number): ScoreBucket {
  if (score >= 90) return 'emergencia'
  if (score >= 75) return 'critico'
  if (score >= 55) return 'alto'
  if (score >= 35) return 'medio'
  return 'bajo'
}

/**
 * Canonical seed: a card description independent of `now`, plus the per-card
 * createdAt/SLA offsets (in ms) applied relative to `now`. Keeping the offsets in
 * the seed (not absolute dates) is what makes the fixtures deterministic + shiftable.
 */
interface CardSeed {
  id: string
  titulo: string
  address: string
  unit?: string
  score: number
  categoria: Category
  severidad: Severity
  estado: MaintenanceTicketState
  /** how long ago the ticket was created, in ms before `now` */
  createdAgoMs: number
  /** SLA window from createdAt, in ms (emergencia tighter than baja) */
  slaWindowMs: number
  proveedorSugerido?: string
  requiereAprobacion: boolean
  hasPhotos: boolean
  reabierto: boolean
  retencionRiesgo?: boolean
  costoEstimadoCop?: number
  responsableProbable: ProbableResponsible
  descripcion: string
  queEntendi: string
  rationale: string
}

const SEEDS: readonly CardSeed[] = [
  {
    id: 'mant-001',
    titulo: 'Olor a gas en la cocina',
    address: 'Carrera 7 # 45-12',
    unit: 'Apto 302',
    score: 96,
    categoria: 'gas',
    severidad: 'emergencia',
    estado: 'clasificado',
    createdAgoMs: 2 * HOUR,
    slaWindowMs: 2 * HOUR,
    proveedorSugerido: 'GasExpress SAS',
    requiereAprobacion: false,
    hasPhotos: true,
    reabierto: false,
    retencionRiesgo: true,
    costoEstimadoCop: 850000,
    responsableProbable: 'propietario',
    descripcion: 'El inquilino reporta olor a gas persistente en la cocina desde anoche.',
    queEntendi:
      'El inquilino percibe olor a gas en la cocina de forma continua; posible fuga que requiere atención inmediata.',
    rationale: 'Olor a gas implica riesgo de seguridad inmediato; se prioriza como emergencia.',
  },
  {
    id: 'mant-002',
    titulo: 'Corto eléctrico en tablero principal',
    address: 'Calle 100 # 11-20',
    unit: 'Apto 1504',
    score: 88,
    categoria: 'electricidad',
    severidad: 'alta',
    estado: 'proveedor_sugerido',
    createdAgoMs: 6 * HOUR,
    slaWindowMs: 8 * HOUR,
    proveedorSugerido: 'ElectroAndina',
    requiereAprobacion: false,
    hasPhotos: true,
    reabierto: false,
    retencionRiesgo: false,
    costoEstimadoCop: 1200000,
    responsableProbable: 'propietario',
    descripcion: 'Se dispara el breaker general y hay chispas al reconectar.',
    queEntendi:
      'El tablero principal presenta cortos al reconectar; riesgo eléctrico que necesita revisión profesional.',
    rationale: 'Falla eléctrica con chispas: severidad alta por riesgo de incendio.',
  },
  {
    id: 'mant-003',
    titulo: 'Filtración de agua desde el techo',
    address: 'Avenida 19 # 120-45',
    unit: 'Casa 8',
    score: 79,
    categoria: 'humedad_filtracion',
    severidad: 'alta',
    estado: 'requiere_aprobacion',
    createdAgoMs: 1 * DAY,
    slaWindowMs: 2 * DAY,
    proveedorSugerido: 'ImpermeaBogotá',
    requiereAprobacion: true,
    hasPhotos: true,
    reabierto: false,
    retencionRiesgo: true,
    costoEstimadoCop: 2400000,
    responsableProbable: 'copropiedad',
    descripcion: 'Mancha de humedad creciente en el cielo raso de la sala.',
    queEntendi:
      'Hay una filtración activa desde el techo que está dañando el cielo raso; posible origen en copropiedad.',
    rationale: 'Daño progresivo por humedad; requiere aprobación por monto estimado.',
  },
  {
    id: 'mant-004',
    titulo: 'Fuga en el lavamanos del baño',
    address: 'Calle 53 # 27-30',
    unit: 'Apto 201',
    score: 64,
    categoria: 'plomeria',
    severidad: 'media',
    estado: 'proveedor_asignado',
    createdAgoMs: 18 * HOUR,
    slaWindowMs: 2 * DAY,
    proveedorSugerido: 'Plomería Rápida',
    requiereAprobacion: false,
    hasPhotos: false,
    reabierto: false,
    retencionRiesgo: false,
    costoEstimadoCop: 320000,
    responsableProbable: 'inquilino',
    descripcion: 'Goteo constante en la llave del lavamanos.',
    queEntendi: 'El lavamanos del baño tiene una fuga menor pero constante en la grifería.',
    rationale: 'Fuga contenida sin daño estructural; severidad media.',
  },
  {
    id: 'mant-005',
    titulo: 'Grieta en muro de carga',
    address: 'Transversal 4 # 58-10',
    unit: 'Apto 502',
    score: 82,
    categoria: 'estructural',
    severidad: 'alta',
    estado: 'en_triage',
    createdAgoMs: 4 * HOUR,
    slaWindowMs: 1 * DAY,
    requiereAprobacion: false,
    hasPhotos: true,
    reabierto: false,
    retencionRiesgo: false,
    costoEstimadoCop: 3800000,
    responsableProbable: 'constructor',
    descripcion: 'Apareció una grieta diagonal en el muro principal del salón.',
    queEntendi:
      'Se reporta una grieta en un posible muro de carga; podría ser estructural y requiere inspección humana.',
    rationale: 'Posible afectación estructural; no se puede descartar riesgo sin inspección.',
  },
  {
    id: 'mant-006',
    titulo: 'Nevera no enfría',
    address: 'Carrera 15 # 93-40',
    unit: 'Apto 808',
    score: 48,
    categoria: 'electrodomesticos',
    severidad: 'media',
    estado: 'recibido',
    createdAgoMs: 30 * HOUR,
    slaWindowMs: 3 * DAY,
    requiereAprobacion: false,
    hasPhotos: false,
    reabierto: false,
    retencionRiesgo: false,
    costoEstimadoCop: 540000,
    responsableProbable: 'propietario',
    descripcion: 'La nevera dejó de enfriar y hace ruido intermitente.',
    queEntendi: 'La nevera del inmueble no enfría correctamente; posible falla del compresor.',
    rationale: 'Electrodoméstico inoperante sin riesgo de seguridad; severidad media.',
  },
  {
    id: 'mant-007',
    titulo: 'Cerradura de puerta principal atascada',
    address: 'Calle 72 # 10-34',
    unit: 'Apto 405',
    score: 38,
    categoria: 'cerrajeria',
    severidad: 'baja',
    estado: 'resuelto',
    createdAgoMs: 3 * DAY,
    slaWindowMs: 4 * DAY,
    proveedorSugerido: 'Cerrajería 24h',
    requiereAprobacion: false,
    hasPhotos: false,
    reabierto: true,
    retencionRiesgo: false,
    costoEstimadoCop: 180000,
    responsableProbable: 'inquilino',
    descripcion: 'La cerradura quedó dura y a veces no abre.',
    queEntendi:
      'La cerradura de la puerta principal presenta dificultad para abrir; se atendió y volvió a reportarse.',
    rationale: 'Falla de cerrajería sin riesgo; reabierta tras primera intervención.',
  },
  {
    id: 'mant-008',
    titulo: 'Repintar pasillo de zonas comunes',
    address: 'Diagonal 25 # 40-15',
    score: 22,
    categoria: 'pintura_acabados',
    severidad: 'informativa',
    estado: 'pendiente_cotizacion',
    createdAgoMs: 5 * DAY,
    slaWindowMs: 10 * DAY,
    requiereAprobacion: true,
    hasPhotos: false,
    reabierto: false,
    retencionRiesgo: false,
    costoEstimadoCop: 1500000,
    responsableProbable: 'copropiedad',
    descripcion: 'Las paredes del pasillo común están desgastadas y manchadas.',
    queEntendi: 'Solicitud estética de repintado del pasillo de zonas comunes; sin urgencia operativa.',
    rationale: 'Mantenimiento preventivo/estético; prioridad informativa.',
  },
  {
    id: 'mant-009',
    titulo: 'Revisión preventiva de bomba de agua',
    address: 'Avenida 68 # 22-50',
    score: 14,
    categoria: 'preventivo',
    severidad: 'informativa',
    estado: 'cerrado',
    createdAgoMs: 12 * DAY,
    slaWindowMs: 14 * DAY,
    requiereAprobacion: false,
    hasPhotos: false,
    reabierto: false,
    retencionRiesgo: false,
    costoEstimadoCop: 260000,
    responsableProbable: 'no_determinado',
    descripcion: 'Chequeo programado de la bomba de agua del edificio.',
    queEntendi: 'Mantenimiento preventivo programado de la bomba de agua; sin incidencia reportada.',
    rationale: 'Tarea preventiva planificada; ya completada.',
  },
]

/** Categories where the UI must surface a safety hold and never assert clearance. */
const DANGEROUS: ReadonlySet<Category> = new Set(['gas', 'electricidad', 'estructural'])

function seedToCard(seed: CardSeed, now: Date): MaintenanceTicketCard {
  const createdAt = new Date(now.getTime() - seed.createdAgoMs).toISOString()
  const slaDeadlineAt = new Date(
    now.getTime() - seed.createdAgoMs + seed.slaWindowMs,
  ).toISOString()
  const card: MaintenanceTicketCard = {
    id: seed.id,
    titulo: seed.titulo,
    inmueble: seed.unit ? { address: seed.address, unit: seed.unit } : { address: seed.address },
    score: seed.score,
    bucket: bucketForScore(seed.score),
    categoria: seed.categoria,
    severidad: seed.severidad,
    estado: seed.estado,
    createdAt,
    slaDeadlineAt,
    requiereAprobacion: seed.requiereAprobacion,
    hasPhotos: seed.hasPhotos,
    reabierto: seed.reabierto,
    responsableProbable: seed.responsableProbable,
  }
  if (seed.proveedorSugerido !== undefined) card.proveedorSugerido = seed.proveedorSugerido
  if (seed.retencionRiesgo !== undefined) card.retencionRiesgo = seed.retencionRiesgo
  if (seed.costoEstimadoCop !== undefined) card.costoEstimadoCop = seed.costoEstimadoCop
  return card
}

/** Build the canonical inbox (fresh array each call) keyed off `now`. */
function buildInbox(now: Date): MaintenanceTicketCard[] {
  return SEEDS.map((seed) => seedToCard(seed, now))
}

// =============================================================================
// Public factories
// =============================================================================

/** The prioritized inbox — >=8 varied cards, deterministic off `now`. */
export function getMockInbox(now: Date): MaintenanceTicketCard[] {
  return buildInbox(now)
}

/** Operational-health KPIs — counts derived from the inbox + fixed anti-gaming values. */
export function getMockKpis(now: Date): MaintenanceKpis {
  const cards = buildInbox(now)
  const open = cards.filter((c) => !OPEN_EXCLUDED.has(c.estado))
  const ticketsAbiertos = open.length
  const emergenciasActivas = open.filter((c) => c.severidad === 'emergencia').length
  const vencidos = open.filter((c) => new Date(c.slaDeadlineAt).getTime() < now.getTime()).length
  const costoEstimadoAbiertoCop = open.reduce((sum, c) => sum + (c.costoEstimadoCop ?? 0), 0)
  return {
    ticketsAbiertos,
    emergenciasActivas,
    vencidos,
    tiempoPrimeraRespuestaMin: 11,
    slaCumplidoPct: 86,
    // ANTI-GAMING (CONTEXT §compliance): fixed, plausible values
    reaperturas30dPct: 8,
    tiempoResolucionRealDias: 4,
    costoEstimadoAbiertoCop,
    propietariosEnRiesgo: 3,
  }
}

function visionFor(seed: CardSeed): VisionAnalysis[] {
  if (!seed.hasPhotos) return []
  const dangerous = DANGEROUS.has(seed.categoria)
  return [
    {
      safety_hold: dangerous,
      requires_human_inspection: dangerous,
      signals: dangerous
        ? ['indicios visibles consistentes con el reporte', 'zona de riesgo identificada']
        : ['daño visible coincide con la descripción'],
      photo_quality_score: 78,
      cannot_determine: dangerous
        ? ['origen exacto / alcance interno no verificable por foto']
        : [],
    },
  ]
}

function eventosFor(seed: CardSeed, now: Date): TicketEvent[] {
  const at = (agoMs: number) => new Date(now.getTime() - agoMs).toISOString()
  const events: TicketEvent[] = [
    {
      id: `${seed.id}-ev-1`,
      at: at(seed.createdAgoMs),
      tipo: 'recibido',
      descripcion: 'Reporte recibido del inquilino.',
      actor: 'agent',
    },
    {
      id: `${seed.id}-ev-2`,
      at: at(seed.createdAgoMs - 10 * MINUTE),
      tipo: 'clasificado',
      descripcion: `Clasificado como ${seed.categoria} (${seed.severidad}).`,
      actor: 'agent',
    },
  ]
  if (seed.reabierto) {
    events.push({
      id: `${seed.id}-ev-3`,
      at: at(2 * HOUR),
      tipo: 'reabierto',
      descripcion: 'El inquilino reportó que el problema persiste; ticket reabierto.',
      actor: 'human',
    })
  }
  return events
}

/** Full ticket detail for an id (or null if unknown), deterministic off `now`. */
export function getMockTicketDetail(id: string, now: Date): MaintenanceTicketDetail | null {
  const seed = SEEDS.find((s) => s.id === id)
  if (!seed) return null
  const card = seedToCard(seed, now)
  const estimatedMaxCop = seed.costoEstimadoCop ?? 0
  return {
    ...card,
    descripcion: seed.descripcion,
    queEntendi: seed.queEntendi,
    clasificacion: {
      categoria: card.categoria,
      severidad: card.severidad,
      score: card.score,
      bucket: card.bucket,
      rationale: seed.rationale,
    },
    vision: visionFor(seed),
    proveedorRecomendado: {
      principal: seed.proveedorSugerido
        ? {
            nombre: seed.proveedorSugerido,
            rating: 4.6,
            etaHoras: seed.severidad === 'emergencia' ? 2 : 24,
            motivo: 'Mejor calificación y disponibilidad para esta categoría/zona.',
          }
        : null,
      backup: seed.proveedorSugerido
        ? { nombre: 'Proveedor alterno', rating: 4.2, etaHoras: 48, motivo: 'Respaldo si el principal no confirma.' }
        : null,
    },
    aprobacion: {
      capCop: 2000000,
      estimatedMaxCop,
      requiresApproval: seed.requiereAprobacion,
    },
    eventos: eventosFor(seed, now),
  }
}
