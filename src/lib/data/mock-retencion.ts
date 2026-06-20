/**
 * Mock data del agente de Retención ("Laura") — usado cuando el backend no está
 * configurado (sin NEXT_PUBLIC_AGENT_URL) o responde 404/flag-OFF. Mock-first:
 * la UI siempre renderiza una demo coherente.
 */
import type {
  BandejaResult,
  CaseBundle,
  OwnerMessageDraft,
  OwnerProfile,
  RetencionDashboard,
  RetencionPlanDTO,
  RetentionCase,
  RetentionGuard,
} from '@/lib/types/retencion'

const CASES: RetentionCase[] = [
  {
    caseId: 'owner:ana-restrepo',
    ownerId: 'ana-restrepo',
    ownerName: 'Ana María Restrepo',
    ownerType: 'multipropietario',
    city: 'Medellín',
    propertyCount: 3,
    drivingProperty: { id: 'pr-101', address: 'Cra 43A #5-15, El Poblado' },
    score: 84,
    state: 'critico',
    rootCause: { key: 'financiera', label: 'Pago al propietario retrasado', pct: 41 },
    lastSignal: { label: 'Preguntó por cláusula de terminación', at: '2026-06-17T15:20:00Z' },
    monthlyIncomeAtRisk: 7200000,
    expectedCommissionLoss: 980000,
    responsible: { role: 'gerente_escalamiento', name: 'Gerencia' },
    dueDate: { at: '2026-06-22', reason: 'sla_critico' },
    nextAction: { code: 'llamada_prioritaria', label: 'Llamada prioritaria + reporte financiero' },
    confidence: 'alta',
  },
  {
    caseId: 'owner:jorge-pelaez',
    ownerId: 'jorge-pelaez',
    ownerName: 'Jorge Peláez',
    ownerType: 'inversionista',
    city: 'Bogotá',
    propertyCount: 2,
    drivingProperty: { id: 'pr-220', address: 'Calle 100 #15-30' },
    score: 71,
    state: 'alto_riesgo',
    rootCause: { key: 'comunicacion', label: 'Sin contacto > 30 días', pct: 38 },
    lastSignal: { label: 'No abre los reportes mensuales', at: '2026-06-10T12:00:00Z' },
    monthlyIncomeAtRisk: 4100000,
    expectedCommissionLoss: 540000,
    responsible: { role: 'ejecutivo_propietario', name: 'Laura G.' },
    dueDate: { at: '2026-06-25', reason: 'contractual' },
    nextAction: { code: 'agendar_contacto', label: 'Agendar contacto + enviar resumen de gestión' },
    confidence: 'media',
  },
  {
    caseId: 'owner:claudia-ome',
    ownerId: 'claudia-ome',
    ownerName: 'Claudia Ome',
    ownerType: 'individual',
    city: 'Medellín',
    propertyCount: 1,
    drivingProperty: { id: 'pr-330', address: 'Cra 70 #C2-10, Laureles' },
    score: 63,
    state: 'alto_riesgo',
    rootCause: { key: 'vacancia', label: 'Inmueble vacío 46 días', pct: 52 },
    lastSignal: { label: 'Preguntó si el canon está alto', at: '2026-06-14T09:30:00Z' },
    monthlyIncomeAtRisk: 1850000,
    expectedCommissionLoss: 240000,
    responsible: { role: 'ejecutivo_propietario', name: 'Laura G.' },
    dueDate: { at: '2026-06-28', reason: 'sla_alto' },
    nextAction: { code: 'diagnostico_mercado', label: 'Enviar diagnóstico de mercado + plan de ocupación' },
    confidence: 'alta',
  },
  {
    caseId: 'owner:hector-rios',
    ownerId: 'hector-rios',
    ownerName: 'Héctor Ríos',
    ownerType: 'individual',
    city: 'Cali',
    propertyCount: 1,
    drivingProperty: { id: 'pr-440', address: 'Av 6N #28-12' },
    score: 48,
    state: 'riesgo_medio',
    rootCause: { key: 'mantenimiento', label: '3 mantenimientos en 60 días', pct: 44 },
    lastSignal: { label: 'Molesto por costo de reparación', at: '2026-06-12T18:00:00Z' },
    monthlyIncomeAtRisk: 1500000,
    expectedCommissionLoss: 165000,
    responsible: { role: 'mantenimiento', name: 'Coord. Mantenimiento' },
    dueDate: { at: '2026-07-02', reason: 'sla_medio' },
    nextAction: { code: 'cerrar_ticket', label: 'Cerrar ticket + explicar costos al propietario' },
    confidence: 'media',
  },
  {
    caseId: 'owner:marcela-vega',
    ownerId: 'marcela-vega',
    ownerName: 'Marcela Vega',
    ownerType: 'individual',
    city: 'Bogotá',
    propertyCount: 1,
    drivingProperty: { id: 'pr-550', address: 'Calle 53 #24-09' },
    score: 22,
    state: 'recuperado',
    rootCause: { key: 'comunicacion', label: 'Riesgo reducido tras contacto', pct: 30 },
    lastSignal: { label: 'Agradeció el reporte de gestión', at: '2026-06-09T10:00:00Z' },
    monthlyIncomeAtRisk: 0,
    expectedCommissionLoss: 0,
    responsible: { role: 'ejecutivo_propietario', name: 'Laura G.' },
    dueDate: { at: '2026-07-09', reason: 'seguimiento_30d' },
    nextAction: { code: 'seguimiento', label: 'Seguimiento a 30 días' },
    confidence: 'alta',
  },
]

export function getMockBandeja(): BandejaResult {
  const byState: Record<string, number> = {}
  const byCause: Record<string, number> = {}
  const byCity: Record<string, number> = {}
  const byExecutive: Record<string, number> = {}
  for (const c of CASES) {
    byState[c.state] = (byState[c.state] ?? 0) + 1
    byCause[c.rootCause.key] = (byCause[c.rootCause.key] ?? 0) + 1
    if (c.city) byCity[c.city] = (byCity[c.city] ?? 0) + 1
    const ex = c.responsible.name ?? c.responsible.role
    byExecutive[ex] = (byExecutive[ex] ?? 0) + 1
  }
  return { cases: CASES, facets: { byState, byCause, byCity, byExecutive }, total: CASES.length }
}

export function getMockDashboard(): RetencionDashboard {
  const activos = CASES.filter((c) => c.state !== 'recuperado' && c.state !== 'perdido')
  const enRiesgo = activos.length
  const inmueblesRiesgo = activos.reduce((s, c) => s + c.propertyCount, 0)
  const ingresoRiesgo = activos.reduce((s, c) => s + c.monthlyIncomeAtRisk, 0)
  const saludProm = Math.round(100 - CASES.reduce((s, c) => s + c.score, 0) / CASES.length)
  return {
    state: 'alert',
    generatedAt: '2026-06-20T08:00:00Z',
    cards: [
      { key: 'propietarios_riesgo', label: 'Propietarios en riesgo', value: enRiesgo, tone: 'warning' },
      { key: 'inmuebles_riesgo', label: 'Inmuebles en riesgo', value: inmueblesRiesgo, tone: 'warning' },
      { key: 'ingreso_riesgo', label: 'Ingreso mensual en riesgo', value: formatCop(ingresoRiesgo), tone: 'danger' },
      { key: 'salud_portafolio', label: 'Salud promedio del portafolio', value: `${saludProm}/100`, tone: 'default' },
      { key: 'recuperados_mes', label: 'Recuperados este mes', value: CASES.filter((c) => c.state === 'recuperado').length, tone: 'success' },
      { key: 'renovaciones_criticas', label: 'Renovaciones críticas (30d)', value: 2, tone: 'warning' },
    ],
    urgent: activos
      .slice()
      .sort((a, b) => b.expectedCommissionLoss - a.expectedCommissionLoss)
      .slice(0, 4)
      .map((c) => ({
        caseId: c.caseId,
        ownerName: c.ownerName,
        score: c.score,
        state: c.state,
        rootCauseLabel: c.rootCause.label,
        expectedCommissionLoss: c.expectedCommissionLoss,
        nextActionLabel: c.nextAction.label,
      })),
  }
}

function mockProfile(c: RetentionCase): OwnerProfile {
  return {
    header: c,
    resumenSalud: {
      state: c.state,
      score: c.score,
      rootCause: c.rootCause,
      diagnosis: `${c.ownerName} está en estado ${c.state.replace('_', ' ')} (score ${c.score}/100). Causa principal: ${c.rootCause.label} (${c.rootCause.pct}%). Recomendación: ${c.nextAction.label.toLowerCase()}.`,
      confidence: c.confidence,
    },
    inmuebles: {
      available: true,
      items: [
        {
          id: c.drivingProperty?.id ?? 'pr-x',
          address: c.drivingProperty?.address ?? null,
          canon: c.monthlyIncomeAtRisk || 1800000,
          estado: c.rootCause.key === 'vacancia' ? 'vacío' : 'ocupado',
          diasVacio: c.rootCause.key === 'vacancia' ? 46 : 0,
          score: c.score,
        },
      ],
    },
    financiero: {
      available: true,
      items: [
        { label: 'Canon facturado (mes)', value: formatCop(c.monthlyIncomeAtRisk || 1800000) },
        { label: 'Comisión de administración', value: formatCop(c.expectedCommissionLoss || 200000) },
        { label: 'Último pago al propietario', value: c.rootCause.key === 'financiera' ? 'Retrasado 8 días' : 'Al día' },
      ],
    },
    interacciones: {
      available: true,
      items: c.lastSignal
        ? [{ at: c.lastSignal.at, kind: 'señal', summary: c.lastSignal.label }]
        : [],
    },
    casos: { available: true, items: [{ id: 'caso-1', label: c.rootCause.label, state: 'abierto' }] },
    mantenimientos: {
      available: c.rootCause.key === 'mantenimiento',
      reason: c.rootCause.key === 'mantenimiento' ? undefined : 'Sin mantenimientos recientes',
      items:
        c.rootCause.key === 'mantenimiento'
          ? [{ at: '2026-06-12', label: 'Reparación plomería', status: 'cerrado' }]
          : [],
    },
    contratos: { available: true, items: [{ id: 'ct-1', label: 'Contrato de administración', vence: '2026-09-30' }] },
    documentos: { available: false, reason: 'Gestión documental no integrada en esta fase', items: [] },
    plan: { available: true, items: [] },
    bitacora: { available: false, reason: 'Bitácora de acciones llega con el envío real (v2)', items: [] },
  }
}

function mockPlan(c: RetentionCase): RetencionPlanDTO {
  return {
    caseId: c.caseId,
    playbookId: `PB_${c.rootCause.key}`,
    rootCauseKey: c.rootCause.key,
    objective: `Retener a ${c.ownerName} resolviendo: ${c.rootCause.label.toLowerCase()}`,
    responsibleRole: c.responsible.role,
    expectedResult: 'Propietario tranquilo, score por debajo de 40',
    actualResult: null,
    status: 'activo',
    nextFollowUpAt: c.dueDate?.at ?? null,
    proposed: true,
    tasks: [
      { code: 'contacto', title: c.nextAction.label, responsibleRole: c.responsible.role, dueDate: c.dueDate?.at ?? null, status: 'pendiente' },
      { code: 'reporte', title: 'Enviar reporte de gestión personalizado', responsibleRole: 'comunicacion', dueDate: c.dueDate?.at ?? null, status: 'pendiente' },
      { code: 'seguimiento', title: 'Seguimiento a la respuesta del propietario', responsibleRole: c.responsible.role, dueDate: null, status: 'pendiente' },
    ],
  }
}

function mockGuard(c: RetentionCase): RetentionGuard {
  const escalate = c.state === 'critico' || c.rootCause.key === 'financiera'
  return {
    canDraftMessage: true,
    retentionRecommended: c.expectedCommissionLoss > 0,
    escalateLegal: escalate,
    financialDataConsistent: true,
    reasons: escalate ? ['Señal fuerte de salida + exposición de comisión'] : [],
  }
}

function mockMessage(c: RetentionCase): OwnerMessageDraft {
  return {
    channel: 'whatsapp',
    tone: 'neutral',
    subject: null,
    source: 'template',
    barrierApplied: false,
    body: `Hola ${c.ownerName.split(' ')[0]}, te saluda tu inmobiliaria. Queremos revisar contigo cómo va ${c.propertyCount > 1 ? 'tu portafolio' : 'tu inmueble'} y resolver cualquier inquietud. ¿Te parece si coordinamos una llamada esta semana? Estamos para ayudarte.`,
  }
}

export function getMockCaseBundle(caseId: string): CaseBundle {
  const c = CASES.find((x) => x.caseId === caseId) ?? CASES[0]
  return {
    caseId: c.caseId,
    profile: mockProfile(c),
    plan: mockPlan(c),
    guard: mockGuard(c),
    message: mockMessage(c),
  }
}

export function formatCop(n: number): string {
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n)
}
