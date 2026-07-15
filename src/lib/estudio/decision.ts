/**
 * Estudio de inquilino — derivación de la DECISIÓN explicada (capa UX-only).
 *
 * Toma el `result` JSON que produce el motor funcional existente
 * (`GET /tenant-scoring/:runId` → `{ status, data: result }`) y deriva EN EL FRONT
 * los 4 tipos de resultado de la visión (§7 decision card / §9 tipos / §10 racional):
 *
 *   Viable · Viable con condiciones · Requiere análisis humano · No recomendado
 *
 * …más la tabla de indicadores, las condiciones, los motivos y la "siguiente mejor
 * acción". NO hay motor nuevo en backend: esto es una capa de presentación
 * determinista sobre score / level / score_breakdown / integrity_flags /
 * financialAnalysis. Espejo conceptual de `lib/cotizador/verdict-derive.ts`.
 */

// ─────────────────────────────────────────────────────────────────────────────
// Shape funcional de entrada (lo que escribe tenant-scoring-pipeline.ts)
// ─────────────────────────────────────────────────────────────────────────────

export interface ScoreFactor {
  weight: number
  value: number
  weighted: number
  source: string
}

export interface TenantScoringIntegrityFlag {
  doc_type: string
  code: string
  severity: 'low' | 'medium' | 'high'
  source: string
  detail: string
}

export interface TenantScoringObservation {
  doc_type: string
  code: string
  severity: 'info' | 'warning'
  emission_date?: string
  message: string
}

export interface TenantScoringFinancialAnalysis {
  monthlyIncomeDetected: number
  monthlyRent: number
  incomeToRentRatio: number | null
  financialStability: number
}

export interface TenantScoringDocumentsSummary {
  total_sent: number
  processed: number
  skipped: number
  types_present: string[]
}

/** El `result` JSON tal como lo persiste el pipeline (keys reales verificadas). */
export interface TenantScoringResult {
  score: number
  level: 'A' | 'B' | 'C' | 'D'
  requires_manual_review: boolean
  escalate: boolean
  escalateReason?: string
  explanation?: string | null
  score_breakdown: {
    solvencia: ScoreFactor
    credito: ScoreFactor
    estabilidad_laboral: ScoreFactor
    consistencia_cruzada: ScoreFactor
    identidad: ScoreFactor
  }
  observations?: TenantScoringObservation[]
  integrity_flags?: TenantScoringIntegrityFlag[]
  documents_summary?: TenantScoringDocumentsSummary
  financialAnalysis?: TenantScoringFinancialAnalysis
  consistencyChecks?: Array<{
    name: string
    passed: boolean
    partial?: boolean
    skipped?: boolean
    points?: number
  }>
  creditScoreRaw?: number | null
  creditScoreSource?: string
}

// ─────────────────────────────────────────────────────────────────────────────
// Shape de salida (lo que consume la decision card)
// ─────────────────────────────────────────────────────────────────────────────

export type EstudioResultType =
  | 'viable'
  | 'viable_con_condiciones'
  | 'requiere_analisis_humano'
  | 'no_recomendado'

export type IndicatorStatus = 'ok' | 'warn' | 'bad' | 'neutral'

export type IndicatorKey =
  | 'identidad'
  | 'documentos'
  | 'ingresos'
  | 'capacidad_pago'
  | 'riesgo_documental'
  | 'credito'
  | 'codeudor'

export interface EstudioIndicator {
  key: IndicatorKey
  /** etiqueta por defecto (es) — el componente puede i18n-izar por `key`. */
  label: string
  /** valor legible por defecto (es). */
  resultado: string
  estado: IndicatorStatus
}

export type EstudioConditionTipo =
  | 'agregar_codeudor'
  | 'cargar_documento'
  | 'mejorar_soporte_ingresos'
  | 'confirmar_laboral'
  | 'revisar_inconsistencia'

export interface EstudioCondition {
  tipo: EstudioConditionTipo
  detalle: string
  resuelta?: boolean
}

export type EstudioActionCode =
  | 'enviar_a_asegurabilidad'
  | 'crear_contrato'
  | 'compartir_propietario'
  | 'descargar'
  | 'solicitar_codeudor'
  | 'pedir_documentos'
  | 'enviar_revision_humana'
  | 'buscar_otro_candidato'
  | 'sugerir_inmueble_menor'

export interface EstudioDecision {
  resultType: EstudioResultType
  /** título por defecto (es). */
  titulo: string
  /** resumen humano: usa `explanation` del motor si existe, si no se deriva. */
  resumen: string
  scoreBand: 'A' | 'B' | 'C' | 'D'
  score: number
  requiereCodeudor: boolean
  indicadores: EstudioIndicator[]
  motivos: string[]
  condiciones: EstudioCondition[]
  siguienteMejorAccion: { code: EstudioActionCode; label: string } | null
  ctas: EstudioActionCode[]
}

/** Umbral ingreso/canon por defecto (visión §18: configurable por agencia luego). */
export const DEFAULT_INCOME_RATIO_MIN = 3

export interface DeriveOptions {
  incomeRatioMin?: number
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

type FlagSeverity = 'none' | 'low' | 'medium' | 'high'

const SEVERITY_RANK: Record<'low' | 'medium' | 'high', number> = { low: 1, medium: 2, high: 3 }

function maxFlagSeverity(flags: TenantScoringIntegrityFlag[] | undefined): FlagSeverity {
  if (!flags || flags.length === 0) return 'none'
  let rank = 0
  for (const f of flags) rank = Math.max(rank, SEVERITY_RANK[f.severity] ?? 0)
  return rank >= 3 ? 'high' : rank === 2 ? 'medium' : rank === 1 ? 'low' : 'none'
}

function hasFlagCode(flags: TenantScoringIntegrityFlag[] | undefined, code: string): boolean {
  return !!flags?.some((f) => f.code === code)
}

const RESULT_TITLES: Record<EstudioResultType, string> = {
  viable: 'Viable',
  viable_con_condiciones: 'Viable con condiciones',
  requiere_analisis_humano: 'Requiere análisis humano',
  no_recomendado: 'No recomendado',
}

// ─────────────────────────────────────────────────────────────────────────────
// Tabla de indicadores (visión §7)
// ─────────────────────────────────────────────────────────────────────────────

function buildIndicadores(
  result: TenantScoringResult,
  min: number,
  requiereCodeudor: boolean,
): EstudioIndicator[] {
  const flags = result.integrity_flags
  const docs = result.documents_summary
  const fin = result.financialAnalysis
  const ratio = fin?.incomeToRentRatio ?? null

  // Identidad
  const idValue = result.score_breakdown?.identidad?.value ?? 0
  const nameMismatch = hasFlagCode(flags, 'name_mismatch')
  const identidad: EstudioIndicator = {
    key: 'identidad',
    label: 'Identidad',
    resultado: nameMismatch ? 'No coincide' : idValue >= 80 ? 'Validada' : idValue >= 50 ? 'Por revisar' : 'No validada',
    estado: nameMismatch ? 'bad' : idValue >= 80 ? 'ok' : idValue >= 50 ? 'warn' : 'bad',
  }

  // Documentos
  const docFlagHigh = !!flags?.some(
    (f) => f.severity === 'high' && f.source !== 'cross_validation' && f.code !== 'name_mismatch',
  )
  const incomplete = !!docs && (docs.skipped > 0 || docs.processed < docs.total_sent)
  const documentos: EstudioIndicator = {
    key: 'documentos',
    label: 'Documentos',
    resultado: docFlagHigh ? 'Con alertas' : incomplete ? 'Incompletos' : 'Completos',
    estado: docFlagHigh ? 'bad' : incomplete ? 'warn' : 'ok',
  }

  // Ingresos (estabilidad)
  const stability = fin?.financialStability ?? null
  const ingresos: EstudioIndicator = {
    key: 'ingresos',
    label: 'Ingresos',
    resultado:
      stability === null ? 'Sin datos' : stability >= 70 ? 'Consistentes' : stability >= 40 ? 'Variables' : 'Inconsistentes',
    estado: stability === null ? 'neutral' : stability >= 70 ? 'ok' : stability >= 40 ? 'warn' : 'bad',
  }

  // Capacidad de pago (ratio ingreso/canon)
  const capacidad_pago: EstudioIndicator = {
    key: 'capacidad_pago',
    label: 'Capacidad de pago',
    resultado:
      ratio === null ? 'Sin datos' : ratio >= min ? 'Adecuada' : ratio >= min * 0.66 ? 'Ajustada' : 'Insuficiente',
    estado: ratio === null ? 'neutral' : ratio >= min ? 'ok' : ratio >= min * 0.66 ? 'warn' : 'bad',
  }

  // Riesgo documental (severidad máxima de integrity_flags)
  const sev = maxFlagSeverity(flags)
  const riesgo_documental: EstudioIndicator = {
    key: 'riesgo_documental',
    label: 'Riesgo documental',
    resultado: sev === 'high' ? 'Alto' : sev === 'medium' ? 'Medio' : 'Bajo',
    estado: sev === 'high' ? 'bad' : sev === 'medium' ? 'warn' : 'ok',
  }

  // Crédito
  const creditValue = result.score_breakdown?.credito?.value ?? null
  const creditStub = result.creditScoreSource === 'stub' || result.creditScoreSource == null
  const noCredit = result.creditScoreRaw == null && (creditValue == null || creditValue === 0)
  const credito: EstudioIndicator = {
    key: 'credito',
    label: 'Crédito',
    resultado: noCredit ? 'Sin reporte' : creditStub ? 'Estimado' : (creditValue ?? 0) >= 60 ? 'Bueno' : (creditValue ?? 0) >= 40 ? 'Regular' : 'Bajo',
    estado: noCredit ? 'neutral' : creditStub ? 'neutral' : (creditValue ?? 0) >= 60 ? 'ok' : (creditValue ?? 0) >= 40 ? 'warn' : 'bad',
  }

  // Codeudor
  const codeudor: EstudioIndicator = {
    key: 'codeudor',
    label: 'Codeudor',
    resultado: requiereCodeudor ? 'Recomendado' : 'No requerido',
    estado: requiereCodeudor ? 'warn' : 'ok',
  }

  return [identidad, documentos, ingresos, capacidad_pago, riesgo_documental, credito, codeudor]
}

// ─────────────────────────────────────────────────────────────────────────────
// Condiciones + motivos (visión §9 / §10)
// ─────────────────────────────────────────────────────────────────────────────

function buildCondiciones(
  result: TenantScoringResult,
  min: number,
  requiereCodeudor: boolean,
): EstudioCondition[] {
  const out: EstudioCondition[] = []
  const fin = result.financialAnalysis
  const ratio = fin?.incomeToRentRatio ?? null
  const docs = result.documents_summary
  const flags = result.integrity_flags

  if (requiereCodeudor) {
    out.push({ tipo: 'agregar_codeudor', detalle: 'Sumar un codeudor mejoraría significativamente la viabilidad del caso.' })
  }
  if (ratio !== null && ratio < min) {
    out.push({
      tipo: 'mejorar_soporte_ingresos',
      detalle: `La relación ingreso/arriendo (${ratio.toFixed(1)}×) está por debajo del umbral recomendado (${min}×).`,
    })
  }
  if (docs && (docs.skipped > 0 || docs.processed < docs.total_sent)) {
    const faltan = Math.max(docs.skipped, docs.total_sent - docs.processed)
    out.push({ tipo: 'cargar_documento', detalle: `Falta(n) ${faltan} documento(s) o soporte(s) por completar.` })
  }
  if ((fin?.financialStability ?? 100) < 50) {
    out.push({ tipo: 'confirmar_laboral', detalle: 'Conviene confirmar la información laboral / estabilidad de ingresos.' })
  }
  for (const f of flags ?? []) {
    if (f.severity === 'medium') {
      out.push({ tipo: 'revisar_inconsistencia', detalle: f.detail })
    }
  }
  return out
}

function buildMotivos(
  result: TenantScoringResult,
  resultType: EstudioResultType,
  min: number,
): string[] {
  const out: string[] = []
  const fin = result.financialAnalysis
  const ratio = fin?.incomeToRentRatio ?? null
  const docs = result.documents_summary
  const flags = result.integrity_flags

  if (maxFlagSeverity(flags) === 'high' || result.requires_manual_review) {
    out.push('Se detectaron inconsistencias relevantes que conviene revisar manualmente antes de decidir.')
  }
  if (ratio !== null && ratio < min) {
    out.push(
      `El valor mensual representa una carga alta frente a los ingresos soportados (relación ${ratio.toFixed(1)}× vs ${min}× recomendado).`,
    )
  }
  if ((fin?.financialStability ?? 100) < 50) {
    out.push('El candidato presenta ingresos variables o poco estables.')
  }
  if (docs && (docs.skipped > 0 || docs.processed < docs.total_sent)) {
    out.push('No todos los documentos solicitados están completos o legibles.')
  }
  for (const f of flags ?? []) {
    if (f.severity === 'medium') out.push(f.detail)
  }
  if (out.length === 0) {
    if (resultType === 'viable') {
      out.push('Ingresos suficientes, documentos consistentes y una relación ingreso/arriendo saludable.')
    } else if (resultType === 'no_recomendado') {
      out.push('El perfil no alcanza las condiciones mínimas para este inmueble bajo las condiciones actuales.')
    }
  }
  return out
}

// ─────────────────────────────────────────────────────────────────────────────
// Siguiente mejor acción + CTAs (visión §7 / §16)
// ─────────────────────────────────────────────────────────────────────────────

function buildNextAction(
  resultType: EstudioResultType,
  requiereCodeudor: boolean,
): { code: EstudioActionCode; label: string } | null {
  switch (resultType) {
    case 'requiere_analisis_humano':
      return { code: 'enviar_revision_humana', label: 'Enviar a revisión humana' }
    case 'no_recomendado':
      return { code: 'buscar_otro_candidato', label: 'Buscar otro candidato' }
    case 'viable_con_condiciones':
      return requiereCodeudor
        ? { code: 'solicitar_codeudor', label: 'Solicitar codeudor' }
        : { code: 'pedir_documentos', label: 'Pedir documentos adicionales' }
    case 'viable':
      return { code: 'enviar_a_asegurabilidad', label: 'Enviar a asegurabilidad' }
  }
}

function buildCtas(resultType: EstudioResultType, requiereCodeudor: boolean): EstudioActionCode[] {
  switch (resultType) {
    case 'viable':
      return ['enviar_a_asegurabilidad', 'crear_contrato', 'compartir_propietario', 'descargar']
    case 'viable_con_condiciones':
      return [requiereCodeudor ? 'solicitar_codeudor' : 'pedir_documentos', 'compartir_propietario', 'descargar']
    case 'requiere_analisis_humano':
      return ['enviar_revision_humana', 'pedir_documentos', 'descargar']
    case 'no_recomendado':
      return ['buscar_otro_candidato', 'sugerir_inmueble_menor', 'compartir_propietario', 'descargar']
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Entry point
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Deriva la decisión explicada del estudio a partir del `result` del motor.
 * Determinista y sin efectos secundarios → fácil de testear y reusar en SSR.
 */
export function deriveEstudioDecision(
  result: TenantScoringResult,
  opts: DeriveOptions = {},
): EstudioDecision {
  const min = opts.incomeRatioMin ?? DEFAULT_INCOME_RATIO_MIN
  const ratio = result.financialAnalysis?.incomeToRentRatio ?? null
  const highFlag = maxFlagSeverity(result.integrity_flags) === 'high'

  // ── Tipo de resultado (orden importa: análisis humano gana) ──────────────
  let resultType: EstudioResultType
  if (result.requires_manual_review || highFlag) {
    resultType = 'requiere_analisis_humano'
  } else if (result.level === 'D') {
    resultType = 'no_recomendado'
  } else if (
    result.level === 'A' &&
    (ratio === null || ratio >= min) &&
    maxFlagSeverity(result.integrity_flags) === 'none' &&
    (!result.documents_summary || result.documents_summary.skipped === 0)
  ) {
    resultType = 'viable'
  } else {
    resultType = 'viable_con_condiciones'
  }

  const requiereCodeudor = resultType === 'viable_con_condiciones' && ratio !== null && ratio < min

  const indicadores = buildIndicadores(result, min, requiereCodeudor)
  const condiciones = buildCondiciones(result, min, requiereCodeudor)
  const motivos = buildMotivos(result, resultType, min)
  const siguienteMejorAccion = buildNextAction(resultType, requiereCodeudor)
  const ctas = buildCtas(resultType, requiereCodeudor)

  const resumen =
    (result.explanation && result.explanation.trim()) ||
    motivos[0] ||
    `Puntaje ${result.score}/100 (nivel ${result.level}).`

  return {
    resultType,
    titulo: RESULT_TITLES[resultType],
    resumen,
    scoreBand: result.level,
    score: result.score,
    requiereCodeudor,
    indicadores,
    motivos,
    condiciones,
    siguienteMejorAccion,
    ctas,
  }
}
