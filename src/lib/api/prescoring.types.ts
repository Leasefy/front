/**
 * prescoring.types.ts — el pre-scoring de afianzamiento, Slice 2.
 *
 * Contrato FIRME del back principal: `GET /pre-scoring/current` (por cuenta
 * del usuario logueado). Se consume con `apiClient` (JWT de Supabase), no con
 * `agentAuthHeaders` — esto vive en el back principal, no en el agente.
 *
 * El shape que manda el back es una mezcla deliberada: `carriers` viene en
 * snake_case (tal cual el micro de afianzamiento), pero `fianly`/`bureau`
 * vienen en camelCase. Este archivo no lo "arregla": lo parsea tal cual llega
 * y expone un shape limpio y consistente (todo camelCase) para el resto del
 * front. Ver `parsePreScoringCurrent`.
 *
 * ⚠️ Regla dura de `docs/scoring-domain`: nunca se inventa un número. Cualquier
 * campo ausente o mal tipado se convierte en `null`, nunca en `0` ni en un
 * valor por defecto que se pueda confundir con un dato real — un tope falso
 * manda a alguien a postularse a algo que no puede pagar.
 *
 * Vocabulario (`docs/VOCABULARIO.md`): al inquilino esto se le llama
 * **aprobación** / **tope aprobado**, nunca "asegurabilidad" ni "estudio".
 * Los identificadores de este archivo sí dicen "pre-scoring" porque así lo
 * llama el contrato del backend — la traducción a la palabra del inquilino
 * pasa en la UI, no acá.
 */

// ─────────────────────────────────────────────────────────────────────────────
// Shape limpio (lo que consume el resto del front)
// ─────────────────────────────────────────────────────────────────────────────

export interface PreScoringOrder {
  /** `PENDING_PAYMENT | PAID | STUDY_STARTED | COMPLETED | EXPIRED | ERROR`, tal cual el back. */
  status: string
  paymentStatus: string | null
  /** ISO-8601. Ventana para completar el estudio (hoy, 48h desde el pago). */
  expiresAt: string | null
}

export interface PreScoringCarrier {
  name: string
  productType: string | null
  viable: boolean
  /** COP enteros. `null` cuando no viable o cuando el back todavía no lo manda. */
  primaMensualCop: number | null
  /** true = resultado de demo (no es una cotización real); ver `stub_mode` del back. */
  stubMode: boolean
  /** Por qué no es viable. `null` cuando sí lo es o cuando el back no lo mandó. */
  motivoRechazo: string | null
  /**
   * Canon máximo (COP) que ESTA aseguradora respalda para la persona —
   * independiente de si aprobó el canon del estudio. Es la pieza con la que se
   * arma el tope aprobado real (el máximo entre todas las aseguradoras, no solo
   * Fianly). `null` cuando no respalda nada, o cuando el back todavía no lo
   * manda (build viejo del micro). Ver `max_asegurable_cop` del back.
   *
   * Opcional en el type (aunque `parseCarrier` siempre lo setea) para no
   * obligar a cada fixture de test preexistente a declararlo; producción
   * siempre lo trae porque pasa por el parser.
   */
  maxAsegurableCop?: number | null
}

export interface PreScoringResult {
  carriers: PreScoringCarrier[]
  fianly: {
    /** El dato estrella: el tope/canon máximo afianzado. `null` = todavía no lo tenemos. */
    maxEntrenchmentValue: number | null
  }
  bureau: {
    minimumScore: number | null
    monthlyCapacity: number | null
  }
}

export interface PreScoringEvaluation {
  /** `started | awaiting_authorization | completed`, tal cual el back. */
  status: string
  result: PreScoringResult | null
}

export interface PreScoringCurrent {
  order: PreScoringOrder | null
  evaluation: PreScoringEvaluation | null
}

/**
 * Los seis estados de la pantalla de aprobación. `expirado` y `error` son
 * nuevos en el Slice 2 — antes el mapeo viejo (`aprobacion.service.ts`) no
 * los distinguía.
 */
export type EstadoPreScoring =
  | 'sin_estudio'
  | 'en_proceso'
  | 'aprobado'
  | 'rechazado'
  | 'expirado'
  | 'error'

// ─────────────────────────────────────────────────────────────────────────────
// Parseo defensivo — nunca confía en que el back mande todo
// ─────────────────────────────────────────────────────────────────────────────

function comoTexto(v: unknown): string | null {
  return typeof v === 'string' && v.length > 0 ? v : null
}

function comoNumero(v: unknown): number | null {
  return typeof v === 'number' && Number.isFinite(v) ? v : null
}

function comoBooleano(v: unknown): boolean {
  return v === true
}

function comoObjeto(v: unknown): Record<string, unknown> {
  return v && typeof v === 'object' ? (v as Record<string, unknown>) : {}
}

function parseCarrier(raw: unknown): PreScoringCarrier | null {
  const r = comoObjeto(raw)
  // Sin nombre no hay con qué identificar la aseguradora en pantalla: se
  // descarta en vez de mostrar una tarjeta anónima.
  const name = comoTexto(r.name)
  if (!name) return null
  return {
    name,
    productType: comoTexto(r.product_type),
    viable: comoBooleano(r.viable),
    primaMensualCop: comoNumero(r.prima_mensual_cop),
    stubMode: comoBooleano(r.stub_mode),
    motivoRechazo: comoTexto(r.motivo_rechazo),
    maxAsegurableCop: comoNumero(r.max_asegurable_cop),
  }
}

function parseResult(raw: unknown): PreScoringResult | null {
  if (!raw || typeof raw !== 'object') return null
  const r = comoObjeto(raw)
  const carriers = Array.isArray(r.carriers)
    ? r.carriers.map(parseCarrier).filter((c): c is PreScoringCarrier => c !== null)
    : []
  const fianly = comoObjeto(r.fianly)
  const bureau = comoObjeto(r.bureau)
  return {
    carriers,
    fianly: { maxEntrenchmentValue: comoNumero(fianly.maxEntrenchmentValue) },
    bureau: {
      minimumScore: comoNumero(bureau.minimumScore),
      monthlyCapacity: comoNumero(bureau.monthlyCapacity),
    },
  }
}

function parseEvaluation(raw: unknown): PreScoringEvaluation | null {
  if (!raw || typeof raw !== 'object') return null
  const r = comoObjeto(raw)
  const status = comoTexto(r.status)
  if (!status) return null
  return { status, result: parseResult(r.result) }
}

function parseOrder(raw: unknown): PreScoringOrder | null {
  if (!raw || typeof raw !== 'object') return null
  const r = comoObjeto(raw)
  const status = comoTexto(r.status)
  if (!status) return null
  return {
    status,
    paymentStatus: comoTexto(r.paymentStatus),
    expiresAt: comoTexto(r.expiresAt),
  }
}

/** Normaliza la respuesta cruda de `GET /pre-scoring/current`. */
export function parsePreScoringCurrent(data: unknown): PreScoringCurrent {
  if (!data || typeof data !== 'object') return { order: null, evaluation: null }
  const d = comoObjeto(data)
  return {
    order: parseOrder(d.order),
    evaluation: parseEvaluation(d.evaluation),
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Mapeo de estados — la tabla que dio el backend
// ─────────────────────────────────────────────────────────────────────────────

/**
 * `order.status` → `EstadoPreScoring`, con la evaluación desempatando cuando
 * hace falta. Sigue el mapeo acordado con el back. El contrato definitivo
 * lista `order.status ∈ PENDING_PAYMENT | PAID | STUDY_STARTED | COMPLETED |
 * EXPIRED | ERROR`:
 *
 *  · PENDING_PAYMENT, o sin `order`               → sin_estudio
 *  · PAID / STUDY_STARTED, o evaluation started/
 *    awaiting_authorization                       → en_proceso
 *  · order COMPLETED, o evaluation completed,
 *    + ≥1 carrier viable                          → aprobado
 *  · order COMPLETED, o evaluation completed,
 *    + ningún carrier viable (o sin evidencia)    → rechazado
 *  · EXPIRED                                       → expirado
 *  · ERROR                                         → error
 *
 * `EXPIRED`/`ERROR` de la orden mandan siempre, incluso sobre una evaluación
 * completada o un `order.status === 'COMPLETED'`: si la ventana ya cerró, no
 * se muestra un resultado sobre ella.
 *
 * El estado terminal es `order.status === 'COMPLETED'` — no
 * `evaluation.status === 'completed'`, que es un detalle interno que puede
 * no venir. Sin `result` (evaluation ausente, o presente pero sin `result`,
 * anómalo) se trata como "ningún carrier viable": rechazado. Es la lectura
 * conservadora — nunca se afirma un tope aprobado sin evidencia.
 */
export function mapEstadoPreScoring(
  current: PreScoringCurrent | null | undefined,
): EstadoPreScoring {
  if (!current?.order) return 'sin_estudio'

  const { order, evaluation } = current

  if (order.status === 'EXPIRED') return 'expirado'
  if (order.status === 'ERROR') return 'error'

  if (order.status === 'COMPLETED' || evaluation?.status === 'completed') {
    const hayViable = (evaluation?.result?.carriers ?? []).some((c) => c.viable === true)
    return hayViable ? 'aprobado' : 'rechazado'
  }

  if (order.status === 'PAID' || order.status === 'STUDY_STARTED') return 'en_proceso'
  if (evaluation?.status === 'started' || evaluation?.status === 'awaiting_authorization') {
    return 'en_proceso'
  }

  // PENDING_PAYMENT y cualquier estado que no reconocemos: todavía no hay
  // nada que mostrar. Es el estado que enseña el camino, nunca uno inventado.
  return 'sin_estudio'
}
