'use client'

/**
 * use-arco-requests — bandeja de solicitudes ARCO (Habeas Data, Ley 1581/2012).
 *
 * ⚠️ Contrato real del agente. `GET /api/agency/:agencyId/arco/requests` NO
 * devuelve `{ requests, kpis }`: devuelve las solicitudes **agrupadas por tipo**
 *
 *     { acceso: [...], rectificacion: [...], cancelacion: [...], oposicion: [...] }
 *
 * y cada fila trae `sla_remaining_days` (número de días hábiles restantes, ya
 * calculado en el back) en vez de una fecha límite. Tampoco devuelve
 * `requesterEmail` ni `resolvedAt` — el correo se omite a propósito por
 * privacidad, y sólo aparece en el detalle de cada solicitud.
 *
 * Este hook aplana los cuatro grupos en una sola lista y deriva los KPIs de esa
 * lista. Los KPIs se calculan acá y no en el back porque el endpoint no los
 * expone; el día que los exponga, esto se reemplaza por lo que mande el back.
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import { useAuth } from '@/lib/auth'
import { agentFetch } from '@/lib/api/agent-fetch'
import { useVisibilityPolling } from '@/lib/hooks/useVisibilityPolling'

/** Cada minuto: los plazos ARCO se miden en días, no hace falta más. */
const POLL_INTERVAL_MS = 60_000

/** Días hábiles restantes a partir de los cuales una solicitud se considera urgente. */
export const ARCO_URGENT_THRESHOLD_DAYS = 2

export type ArcoRequestType = 'acceso' | 'rectificacion' | 'cancelacion' | 'oposicion'

/**
 * Los cinco estados del CHECK de `agent.arco_requests`. `pending_counsel_review`
 * estaba acá y no es un estado: es un flag del 503 del gate de asesor. Ver
 * `ArcoStatusBadge`.
 */
export type ArcoRequestStatus =
  | 'pending_email_verification'
  | 'pending_admin_triage'
  | 'in_progress'
  | 'resolved'
  | 'rejected'

export const ARCO_TYPES: ArcoRequestType[] = [
  'acceso',
  'rectificacion',
  'cancelacion',
  'oposicion',
]

/** Estados en los que la solicitud ya está cerrada y el reloj dejó de correr. */
const CLOSED_STATUSES: ArcoRequestStatus[] = ['resolved', 'rejected']

/** Fila tal cual la devuelve el agente, dentro de su grupo por tipo. */
interface ArcoApiRow {
  id: string
  agencyId: string
  type: ArcoRequestType
  status: ArcoRequestStatus
  requesterName: string
  requesterCedulaHash: string
  submittedAt: string
  auditLogIds?: string[]
  sla_remaining_days: number
  /**
   * Término legal aplicable, en días hábiles. Lo manda el agente desde
   * 2026-08-07; antes había que despejarlo. Opcional para no romper contra un
   * agente viejo — ver `deriveSlaTerms`.
   */
  sla_business_days?: number
}

/** Respuesta del agente: un arreglo por cada tipo de solicitud. */
type ArcoApiResponse = Partial<Record<ArcoRequestType, ArcoApiRow[]>>

/** Fila normalizada para la UI. */
export interface ArcoRequestRow {
  id: string
  agencyId: string
  type: ArcoRequestType
  status: ArcoRequestStatus
  requesterName: string
  requesterCedulaHash: string
  /**
   * Referencia corta y estable derivada del hash de la cédula.
   *
   * El agente NUNCA guarda la cédula en claro: sólo su SHA-256 (así lo exige el
   * propio flujo — se hashea al recibirla y el valor crudo no se vuelve a usar).
   * Pintar los 64 caracteres del hash en una tabla no le sirve a nadie, y
   * enmascararlo como si fuera una cédula sería mentir sobre qué es. Se muestra
   * un prefijo corto, que alcanza para casar una fila con su detalle o con la
   * auditoría.
   */
  cedulaRef: string
  submittedAt: string
  auditLogIds: string[]
  /** Días hábiles restantes. Cero o negativo = plazo vencido. */
  slaRemainingDays: number
  /** Término legal aplicable en días hábiles, tal cual lo manda el agente. */
  slaBusinessDays: number | null
  /** La solicitud ya se resolvió o rechazó: el reloj no corre. */
  isClosed: boolean
  /** Plazo vencido y todavía sin cerrar. */
  isOverdue: boolean
  /** Quedan pocos días hábiles y todavía sin cerrar. */
  isUrgent: boolean
}

export interface ArcoRequestsKpis {
  /** Esperando que la persona confirme por correo — el reloj aún no arranca. */
  pendingVerification: number
  /** Abiertas y dentro del plazo. */
  onTime: number
  /** Abiertas con el plazo vencido. */
  overdue: number
  /** Cerradas (resueltas o rechazadas). */
  closed: number
}

export interface UseArcoRequestsResult {
  requests: ArcoRequestRow[]
  kpis: ArcoRequestsKpis
  /** Términos legales despejados de los datos; `null` donde no hay de dónde. */
  slaTerms: ArcoSlaTerms
  countsByType: Record<ArcoRequestType, number>
  /** Solicitudes vencidas o por vencer, más urgente primero. */
  needsAttention: ArcoRequestRow[]
  isLoading: boolean
  /** Hay un refetch en curso sobre datos ya cargados (no bloquea la vista). */
  isRefreshing: boolean
  error: string | null
  /** Momento del último fetch exitoso — para el «actualizado hace…». */
  lastUpdatedAt: Date | null
  refetch: () => Promise<void>
}

const EMPTY_KPIS: ArcoRequestsKpis = {
  pendingVerification: 0,
  onTime: 0,
  overdue: 0,
  closed: 0,
}

const EMPTY_COUNTS: Record<ArcoRequestType, number> = {
  acceso: 0,
  rectificacion: 0,
  cancelacion: 0,
  oposicion: 0,
}

/**
 * Días hábiles (lun–vie) transcurridos desde `submittedAt` hasta ahora.
 *
 * ⚠️ SÓLO FALLBACK, para un agente anterior al 2026-08-07 que no manda
 * `sla_business_days`. Replicar el algoritmo del agente acá era frágil por
 * definición: cuando allá se corrigió el arranque del conteo (el Art. 14 cuenta
 * desde la fecha de recibo, el Art. 15 desde el día siguiente), esta copia
 * quedó desactualizada en el acto. Por eso el término ahora viaja en el
 * contrato y esto sólo cubre el caso viejo.
 */
function businessDaysElapsed(submittedAt: string): number {
  const now = new Date()
  const cursor = new Date(submittedAt)
  if (Number.isNaN(cursor.getTime())) return 0

  let elapsed = 0
  while (cursor < now) {
    cursor.setDate(cursor.getDate() + 1)
    const dow = cursor.getDay()
    if (dow !== 0 && dow !== 6) elapsed++
  }
  return elapsed
}

/** Términos legales vigentes, en días hábiles, despejados de los datos. */
export interface ArcoSlaTerms {
  /** Término para solicitudes de acceso (consultas). */
  acceso: number | null
  /** Término para rectificación, cancelación y oposición (reclamos). */
  reclamo: number | null
}

/** Los tres tipos que la ley trata como «reclamo». */
const RECLAMO_TYPES: ArcoRequestType[] = ['rectificacion', 'cancelacion', 'oposicion']

/** Valor más frecuente de una lista; `null` si está vacía. */
function mode(values: number[]): number | null {
  if (values.length === 0) return null
  const counts = new Map<number, number>()
  for (const v of values) counts.set(v, (counts.get(v) ?? 0) + 1)
  let best = values[0]
  let bestCount = 0
  for (const [value, count] of counts) {
    if (count > bestCount) {
      best = value
      bestCount = count
    }
  }
  return best
}

/**
 * Términos legales que el agente está aplicando, leídos del contrato.
 *
 * El término es una regla de negocio que vive en el agente; una constante acá
 * se desincroniza en silencio y encima presentaría como hecho legal un número
 * que nadie verificó. Antes se despejaba (`restantes + hábiles transcurridos`),
 * lo que obligaba a replicar el algoritmo del agente de este lado — y esa
 * réplica se rompió apenas allá se corrigió el arranque del conteo. Ahora el
 * agente manda `sla_business_days` y acá sólo se lee.
 *
 * Se toma la moda del grupo por si alguna fila viniera con otro valor, y queda
 * el despeje viejo como último recurso contra un agente anterior al cambio.
 *
 * Devuelve `null` cuando no hay ninguna solicitud del grupo: sin dato, no hay
 * número que mostrar.
 */
export function deriveSlaTerms(rows: ArcoRequestRow[]): ArcoSlaTerms {
  const term = (row: ArcoRequestRow) =>
    row.slaBusinessDays ?? row.slaRemainingDays + businessDaysElapsed(row.submittedAt)

  return {
    acceso: mode(rows.filter((r) => r.type === 'acceso').map(term)),
    reclamo: mode(rows.filter((r) => RECLAMO_TYPES.includes(r.type)).map(term)),
  }
}

/** SHA-256 en hex: 64 caracteres. Sirve para no truncar un valor ya enmascarado. */
const SHA256_HEX = /^[0-9a-f]{64}$/i

/**
 * Referencia legible a partir del hash de la cédula. Si el valor NO es un hash
 * (por ejemplo si algún día el back manda algo ya enmascarado), se devuelve tal
 * cual en vez de recortarlo a ciegas.
 */
export function toCedulaRef(hash: string | null | undefined): string {
  if (!hash) return '—'
  if (!SHA256_HEX.test(hash)) return hash
  return hash.slice(0, 6).toUpperCase()
}

/** Aplana la respuesta agrupada del agente y marca el estado de cada plazo. */
export function normalizeArcoResponse(payload: ArcoApiResponse): ArcoRequestRow[] {
  const rows: ArcoRequestRow[] = []

  for (const type of ARCO_TYPES) {
    for (const raw of payload[type] ?? []) {
      const isClosed = CLOSED_STATUSES.includes(raw.status)
      const remaining = Number.isFinite(raw.sla_remaining_days)
        ? raw.sla_remaining_days
        : 0

      rows.push({
        id: raw.id,
        agencyId: raw.agencyId,
        // El grupo es la fuente de verdad del tipo: si el back mandara una fila
        // en el bucket equivocado, la UI la agruparía igual que el back.
        type: raw.type ?? type,
        status: raw.status,
        requesterName: raw.requesterName,
        requesterCedulaHash: raw.requesterCedulaHash,
        cedulaRef: toCedulaRef(raw.requesterCedulaHash),
        submittedAt: raw.submittedAt,
        auditLogIds: raw.auditLogIds ?? [],
        slaRemainingDays: remaining,
        slaBusinessDays: Number.isFinite(raw.sla_business_days)
          ? (raw.sla_business_days as number)
          : null,
        isClosed,
        isOverdue: !isClosed && remaining <= 0,
        isUrgent: !isClosed && remaining > 0 && remaining <= ARCO_URGENT_THRESHOLD_DAYS,
      })
    }
  }

  // Lo que vence antes va primero: la bandeja se lee de arriba hacia abajo.
  return rows.sort((a, b) => {
    if (a.isClosed !== b.isClosed) return a.isClosed ? 1 : -1
    return a.slaRemainingDays - b.slaRemainingDays
  })
}

export function deriveArcoKpis(rows: ArcoRequestRow[]): ArcoRequestsKpis {
  const kpis = { ...EMPTY_KPIS }
  for (const row of rows) {
    if (row.isClosed) kpis.closed += 1
    else if (row.status === 'pending_email_verification') kpis.pendingVerification += 1
    else if (row.isOverdue) kpis.overdue += 1
    else kpis.onTime += 1
  }
  return kpis
}

export function useArcoRequests(): UseArcoRequestsResult {
  const { agency } = useAuth()
  const agencyId = agency?.id ?? null

  const [requests, setRequests] = useState<ArcoRequestRow[]>([])
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdatedAt, setLastUpdatedAt] = useState<Date | null>(null)

  /** Evita marcar como "primera carga" un refetch de polling. */
  const hasLoadedRef = useRef(false)

  const fetchOnce = useCallback(async () => {
    const agentUrl = process.env.NEXT_PUBLIC_AGENT_URL
    if (!agentUrl) {
      setError('agent_url_missing')
      setIsLoading(false)
      return
    }
    if (!agencyId) {
      setIsLoading(false)
      return
    }

    if (hasLoadedRef.current) setIsRefreshing(true)

    try {
      const res = await agentFetch(`${agentUrl}/api/agency/${agencyId}/arco/requests`)
      if (!res.ok) throw new Error(String(res.status))

      const json = (await res.json()) as ArcoApiResponse
      setRequests(normalizeArcoResponse(json))
      setError(null)
      setLastUpdatedAt(new Date())
      hasLoadedRef.current = true
    } catch (err) {
      setError(err instanceof Error ? err.message : 'fetch_failed')
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }, [agencyId])

  useEffect(() => {
    if (!agencyId) {
      setIsLoading(false)
      return
    }
    void fetchOnce()
  }, [fetchOnce, agencyId])

  useVisibilityPolling(() => void fetchOnce(), POLL_INTERVAL_MS, Boolean(agencyId))

  const refetch = useCallback(async () => {
    await fetchOnce()
  }, [fetchOnce])

  const kpis = deriveArcoKpis(requests)

  const countsByType = { ...EMPTY_COUNTS }
  for (const row of requests) countsByType[row.type] += 1

  const needsAttention = requests.filter((r) => r.isOverdue || r.isUrgent)

  return {
    requests,
    kpis,
    slaTerms: deriveSlaTerms(requests),
    countsByType,
    needsAttention,
    isLoading,
    isRefreshing,
    error,
    lastUpdatedAt,
    refetch,
  }
}
