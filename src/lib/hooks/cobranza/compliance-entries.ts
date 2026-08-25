/**
 * compliance-entries.ts — normaliza lo que devuelven las bitácoras de
 * cumplimiento (Ley 2300 y opt-out) del agente.
 *
 * ⚠️ Las dos pantallas leían `json.items` y `json.next_cursor`; el agente
 * devuelve `entries` y `nextCursor`. `undefined ?? []` da una lista vacía, así
 * que las dos disparaban su estado vacío «celebratorio» —«Sin infracciones a
 * Ley 2300 detectadas»— con 19 registros del otro lado. En una pantalla de
 * cumplimiento eso no es un detalle: le dice al operador que está todo bien
 * justo cuando no lo está.
 *
 * Y no era sólo el envoltorio: cada campo tenía otro nombre (`id` vs
 * `event_id`, `debtor_id` vs `debtor_id_masked`, `timestamp` vs
 * `requested_at`), así que arreglar sólo la lista habría pintado una tabla de
 * `undefined`. Por eso la normalización vive acá, en un lugar, con el contrato
 * real escrito al lado.
 */

/** Forma real de la respuesta del agente (`agency-cobranza-compliance.ts`). */
export interface ComplianceLogResponse<T> {
  entries?: T[]
  nextCursor?: string | null
  generatedAt?: string
}

/** Fila cruda de la bitácora de Ley 2300. */
export interface RawAttempt {
  id: string
  debtor_id: string
  debtor_name?: string | null
  event_type: string
  channel: string | null
  timestamp: string
}

/** Fila cruda del registro de opt-out. */
export interface RawOptOut {
  id: string
  debtor_id: string
  debtor_name?: string | null
  timestamp: string
  source: string | null
  acknowledged_at: string | null
}

export interface Attempt {
  eventId: string
  /** Nombre del deudor; null si el dato viene de un agente anterior al JOIN. */
  debtorName: string | null
  debtorRef: string
  channel: string | null
  timestamp: string
  /** Entrante = llamó el deudor; saliente = la cadencia intentó contactarlo. */
  direction: 'inbound' | 'outbound'
}

export interface OptOutEntry {
  eventId: string
  /** Nombre del deudor; null si el dato viene de un agente anterior al JOIN. */
  debtorName: string | null
  debtorRef: string
  requestedAt: string
  source: string | null
  acknowledgedAt: string | null
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/**
 * Referencia corta y estable del deudor. **Es el respaldo, no la identidad**:
 * cuando el dato trae `debtor_name` la tabla muestra el nombre.
 *
 * Las dos tablas pasaban el UUID crudo a `<Mask field="cedula">`, que espera un
 * valor YA enmascarado: el resultado era un UUID de 36 caracteres presentado
 * como si fuera una cédula. No es una cédula ni está enmascarado — es la llave
 * interna de la fila. Se muestra un prefijo, que es lo único que sirve: casar
 * una fila con su caso o con la auditoría.
 */
export function toDebtorRef(id: string | null | undefined): string {
  if (!id) return '—'
  if (!UUID_RE.test(id)) return id
  return id.slice(0, 8).toUpperCase()
}

export function normalizeAttempts(payload: ComplianceLogResponse<RawAttempt>): Attempt[] {
  return (payload.entries ?? []).map((e) => ({
    eventId: e.id,
    debtorName: e.debtor_name?.trim() || null,
    debtorRef: toDebtorRef(e.debtor_id),
    channel: e.channel,
    timestamp: e.timestamp,
    // El agente no manda «dirección»: la une de dos tipos de evento distintos.
    // `inbound_outside_hours` es el deudor llamando fuera de horario;
    // `cadence_skip` es un intento nuestro que la Ley 2300 bloqueó.
    direction: e.event_type === 'inbound_outside_hours' ? 'inbound' : 'outbound',
  }))
}

export function normalizeOptOuts(payload: ComplianceLogResponse<RawOptOut>): OptOutEntry[] {
  return (payload.entries ?? []).map((e) => ({
    eventId: e.id,
    debtorName: e.debtor_name?.trim() || null,
    debtorRef: toDebtorRef(e.debtor_id),
    requestedAt: e.timestamp,
    source: e.source ?? null,
    acknowledgedAt: e.acknowledged_at ?? null,
  }))
}

export function nextCursorOf(payload: ComplianceLogResponse<unknown>): string | null {
  return payload.nextCursor ?? null
}
