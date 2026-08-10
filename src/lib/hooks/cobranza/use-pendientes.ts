'use client'

/**
 * use-pendientes.ts — "Qué necesita tu atención" (visión #5).
 *
 * Compone 6 fuentes EXISTENTES en UNA lista priorizada (sin endpoints nuevos):
 *
 *   1. useEscalations            → escalaciones abiertas/asignadas
 *                                   (live/high → alta, medium → media, low → baja)
 *   2. useLegalArtifacts         → cartas prejurídicas pending_human_review (alta)
 *   3. useInsuranceClaims        → siniestros pending_human_review (alta)
 *   4. usePaymentsFunnel         → pagos `pending` ligados a un acuerdo de pago
 *                                   (paymentPlanId != null) — lo más cercano que
 *                                   existe a "planes por revisar"; NO hay endpoint
 *                                   que liste planes `offered` agency-wide (media)
 *   5. useDailyReport            → promesas de pago de HOY
 *                                   (payment_promises_today, status open/parcial) (media)
 *   6. useCobranzaInbox          → hilos de WhatsApp que el agente NO contestó
 *                                   solo (`requiresAction`) — alta
 *
 * ⚠️ La 6.ª entró tarde y por una razón concreta: al ocultar la pestaña «Inbox
 * de conversaciones» quedaron cinco hilos marcados «requiere humano» sin
 * ninguna superficie donde verlos. El agente se plantó y pidió una persona, y
 * la persona no tenía dónde enterarse. Un trabajo que nadie puede ver no está
 * pendiente: está perdido.
 *
 * El hook devuelve DATOS puros (sin copy): la página compone los textos i18n.
 * Fail-soft: si una fuente falla, las demás siguen rindiendo ítems.
 */

import { useCallback, useMemo } from 'react'

import { useEscalations } from '@/lib/hooks/cobranza/use-escalations'
import { useLegalArtifacts } from '@/lib/hooks/cobranza/use-legal-artifacts'
import { useInsuranceClaims } from '@/lib/hooks/cobranza/use-insurance-claims'
import {
  usePaymentsFunnel,
  type UsePaymentsFunnelFilters,
} from '@/lib/hooks/cobranza/use-payments-funnel'
import {
  useDailyReport,
  type DailyReportResponse,
} from '@/lib/hooks/cobranza/use-daily-report'
import { useCobranzaInbox } from '@/lib/hooks/cobranza/use-inbox'
import { escalationReasonLabel } from '@/lib/cobranza/call-vocab'

// ── Tipos ────────────────────────────────────────────────────────────────────

export type PendientePrioridad = 'alta' | 'media' | 'baja'

export type PendienteGrupo =
  | 'escalaciones'
  | 'cartas'
  | 'siniestros'
  | 'planes'
  | 'promesas'
  | 'conversaciones'

/** Verbo del CTA — mapea 1:1 a las keys del contrato i18n `pendientes.*`. */
export type PendienteCta =
  | 'resolver'
  | 'aprobar'
  | 'revisar'
  | 'seguimiento'
  | 'responder'

export interface PendienteItem {
  /** Key única para React (`esc-…`, `carta-…`, …). */
  key: string
  grupo: PendienteGrupo
  prioridad: PendientePrioridad
  /** Quién/qué — nombre del deudor (masked cuando aplica) o referencia. */
  titulo: string
  /**
   * Motivo dinámico que viene del dato (escalaciones: reason del agente).
   * Null → la página compone el motivo desde keys i18n existentes.
   */
  reason: string | null
  /** Cartas: kind del artefacto (pre_judicial_letter | pre_bureau_notification). */
  kind: string | null
  /** Planes: monto del pago pendiente · Promesas: monto prometido. */
  montoCop: number | null
  /** Promesas: cuándo prometió pagar (YYYY-MM-DD). */
  dueDate: string | null
  /** Fecha del evento (ISO) — ordena DESC dentro de cada prioridad. */
  fecha: string
  /** Destino del CTA (ruta interna). */
  href: string
  cta: PendienteCta
}

export interface UsePendientesResult {
  /** Lista ya ordenada: alta → media → baja; dentro, fecha DESC. */
  items: PendienteItem[]
  /** Conteo por grupo (sobre la lista completa, sin filtros de UI). */
  counts: Record<PendienteGrupo, number>
  /** True mientras CUALQUIER fuente sigue cargando su primer fetch. */
  isLoading: boolean
  /** Primer error encontrado (las demás fuentes siguen rindiendo datos). */
  error: string | null
  refetch: () => Promise<void>
}

// ── Constantes ───────────────────────────────────────────────────────────────

const BASE = '/panel/inmobiliaria/ai/cobranza'

const PRIORIDAD_RANK: Record<PendientePrioridad, number> = {
  alta: 0,
  media: 1,
  baja: 2,
}

/**
 * Estable entre renders — usePaymentsFunnel serializa filtros para sus deps.
 *
 * `en_proceso`, no `pending`: bajo `pending` viajan también las obligaciones
 * importadas de la cartera, que acá se descartan igual (no tienen
 * `paymentPlanId`). El endpoint devuelve 50 filas por página y esto sólo lee
 * la primera, así que con una cartera grande las obligaciones podían llenarla
 * entera y dejar los planes por revisar fuera de Pendientes —sin error, sin
 * vacío, simplemente ausentes.
 */
const PLANES_FILTERS: UsePaymentsFunnelFilters = { status: 'en_proceso' }

/** Estados de promesa que aún requieren seguimiento. */
const PTP_OPEN_STATUSES = new Set(['open', 'partially_kept'])

// El tipo generado del daily report no declara payment_promises_today, pero el
// endpoint /cobranza/daily-report/today SÍ lo devuelve (Phase 17.8-12 —
// build-daily-report.ts en el agente). Extensión local, sin tocar el hook base.
interface DailyReportPtpEntry {
  debtor_id: string
  debtor_first_name: string
  amount_cop: number
  due_date: string
  status: string
  created_at: string
}

type DailyReportWithPtps = DailyReportResponse & {
  payment_promises_today?: DailyReportPtpEntry[]
}

function escalationUrgencyToPrioridad(
  urgency: 'live' | 'high' | 'medium' | 'low',
): PendientePrioridad {
  if (urgency === 'live' || urgency === 'high') return 'alta'
  if (urgency === 'medium') return 'media'
  return 'baja'
}

// ── Hook ─────────────────────────────────────────────────────────────────────

export function usePendientes(): UsePendientesResult {
  const escalaciones = useEscalations()
  const cartas = useLegalArtifacts({ status: 'pending_human_review' })
  const siniestros = useInsuranceClaims({ status: 'pending_human_review' })
  const planes = usePaymentsFunnel(PLANES_FILTERS)
  const reporte = useDailyReport()
  const conversaciones = useCobranzaInbox()

  const items = useMemo<PendienteItem[]>(() => {
    const out: PendienteItem[] = []

    // 1. Escalaciones abiertas + asignadas (las resueltas ya no piden atención)
    const escalationRows = [
      ...(escalaciones.data?.open ?? []),
      ...(escalaciones.data?.assigned ?? []),
    ]
    for (const esc of escalationRows) {
      out.push({
        key: `esc-${esc.id}`,
        grupo: 'escalaciones',
        prioridad: escalationUrgencyToPrioridad(esc.urgency),
        // NO cae al `debtor_id`: un UUID en el renglón del nombre no le dice
        // nada al operador y se lee como un dato roto. `GET /cobranza/escalations`
        // (y su detalle) devuelven SÓLO el id — son las únicas dos de las seis
        // fuentes de esta pantalla sin nombre. Mientras el agente no lo mande,
        // el motivo traducido es la información real que sí tenemos.
        titulo: esc.debtor_id_masked ?? escalationReasonLabel(esc.reason) ?? '',
        // Sin duplicar: si el título ya es el motivo, el renglón de abajo sobra.
        reason: esc.debtor_id_masked ? escalationReasonLabel(esc.reason) : null,
        kind: null,
        montoCop: null,
        dueDate: null,
        fecha: esc.created_at,
        href: `${BASE}/escalaciones/${esc.id}`,
        cta: 'resolver',
      })
    }

    // 2. Cartas prejurídicas esperando revisión humana
    //
    // El título es el deudor. Iba vacío por creer que el resumen del endpoint
    // no lo traía: cuatro filas decían «Carta prejurídica» y nada más, sin
    // forma de saber a quién ibas a mandarle una carta prejurídica. `debtorName`
    // estaba en la respuesta desde siempre.
    for (const carta of cartas.data?.artifacts ?? []) {
      out.push({
        key: `carta-${carta.id}`,
        grupo: 'cartas',
        prioridad: 'alta',
        titulo: carta.debtorName?.trim() ?? '',
        reason: null,
        kind: carta.kind,
        montoCop: null,
        dueDate: null,
        fecha: carta.generatedAt,
        href: `${BASE}/cartas/${carta.id}`,
        cta: 'aprobar',
      })
    }

    // 3. Siniestros esperando revisión humana
    for (const claim of siniestros.data?.claims ?? []) {
      out.push({
        key: `sin-${claim.id}`,
        grupo: 'siniestros',
        prioridad: 'alta',
        // El deudor, no la aseguradora: lo que hay que decidir es sobre el
        // caso de una persona. La aseguradora está en el detalle, y con dos
        // siniestros de la misma compañía el título no distinguía cuál era cuál.
        titulo:
          claim.debtorName?.trim() ||
          (claim.aseguradora
            ? claim.aseguradora.charAt(0).toUpperCase() + claim.aseguradora.slice(1)
            : ''),
        reason: null,
        kind: null,
        montoCop: null,
        dueDate: null,
        fecha: claim.createdAt,
        href: `${BASE}/siniestros/${claim.id}`,
        cta: 'aprobar',
      })
    }

    // 4. Pagos pendientes ligados a un acuerdo de pago — dedup por plan,
    //    conservando el pago más reciente.
    const planRows = new Map<string, PendienteItem>()
    for (const row of planes.rows) {
      if (!row.paymentPlanId || row.status !== 'pending') continue
      const existing = planRows.get(row.paymentPlanId)
      if (existing && existing.fecha >= row.createdAt) continue
      planRows.set(row.paymentPlanId, {
        key: `plan-${row.paymentPlanId}`,
        grupo: 'planes',
        prioridad: 'media',
        titulo: row.debtor.fullName,
        reason: null,
        kind: null,
        montoCop: row.amount,
        dueDate: null,
        fecha: row.createdAt,
        href: `${BASE}/pagos/planes/${row.paymentPlanId}`,
        cta: 'revisar',
      })
    }
    out.push(...planRows.values())

    // 5. Promesas de pago de HOY (aún abiertas) → dar seguimiento al deudor
    const ptps =
      (reporte.data as DailyReportWithPtps | null)?.payment_promises_today ?? []
    for (const ptp of ptps) {
      if (!PTP_OPEN_STATUSES.has(ptp.status)) continue
      out.push({
        key: `ptp-${ptp.debtor_id}-${ptp.created_at}`,
        grupo: 'promesas',
        prioridad: 'media',
        titulo: ptp.debtor_first_name,
        reason: null,
        kind: null,
        montoCop: ptp.amount_cop,
        dueDate: ptp.due_date,
        fecha: ptp.created_at,
        href: `${BASE}/deudores/${ptp.debtor_id}`,
        cta: 'seguimiento',
      })
    }

    // 6. Hilos de WhatsApp que el agente se negó a contestar solo.
    //
    //    `requiresAction` es el agente diciendo «esto no lo resuelvo yo». No
    //    genera escalación —no hay fila en `agent.escalations`— así que sin
    //    esto no aparecía en ningún lado desde que se ocultó el Inbox.
    for (const hilo of conversaciones.threads) {
      if (!hilo.requiresAction) continue
      out.push({
        key: `hilo-${hilo.id}`,
        grupo: 'conversaciones',
        prioridad: 'alta',
        titulo: hilo.debtorName?.trim() ?? '',
        // Lo último que escribió el deudor: es el motivo, textual.
        reason: hilo.lastMessagePreview,
        kind: hilo.label,
        montoCop: null,
        dueDate: null,
        fecha: hilo.lastMessageAt,
        href: `${BASE}/inbox?thread=${hilo.id}`,
        cta: 'responder',
      })
    }

    // Orden: alta → media → baja; dentro de cada prioridad, fecha DESC.
    return out.sort((a, b) => {
      const rankDelta = PRIORIDAD_RANK[a.prioridad] - PRIORIDAD_RANK[b.prioridad]
      if (rankDelta !== 0) return rankDelta
      return new Date(b.fecha).getTime() - new Date(a.fecha).getTime()
    })
  }, [
    escalaciones.data,
    cartas.data,
    siniestros.data,
    planes.rows,
    reporte.data,
    conversaciones.threads,
  ])

  const counts = useMemo<Record<PendienteGrupo, number>>(() => {
    const c: Record<PendienteGrupo, number> = {
      escalaciones: 0,
      cartas: 0,
      siniestros: 0,
      planes: 0,
      promesas: 0,
      conversaciones: 0,
    }
    for (const item of items) c[item.grupo] += 1
    return c
  }, [items])

  const isLoading =
    escalaciones.isLoading ||
    cartas.isLoading ||
    siniestros.isLoading ||
    planes.isLoading ||
    reporte.isLoading ||
    conversaciones.isLoading

  const error =
    escalaciones.error ??
    cartas.error ??
    siniestros.error ??
    planes.error ??
    reporte.error ??
    conversaciones.error ??
    null

  const refetch = useCallback(async () => {
    await Promise.allSettled([
      escalaciones.mutate(),
      cartas.refetch(),
      siniestros.refetch(),
      planes.refetch(),
      reporte.refetch(),
      conversaciones.refetch(),
    ])
  }, [
    escalaciones.mutate,
    cartas.refetch,
    siniestros.refetch,
    planes.refetch,
    reporte.refetch,
    conversaciones.refetch,
  ])

  return { items, counts, isLoading, error, refetch }
}
