'use client'

/**
 * use-pendientes.ts — "Qué necesita tu atención" (visión #5).
 *
 * Compone 5 fuentes EXISTENTES en UNA lista priorizada (sin endpoints nuevos):
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

// ── Tipos ────────────────────────────────────────────────────────────────────

export type PendientePrioridad = 'alta' | 'media' | 'baja'

export type PendienteGrupo =
  | 'escalaciones'
  | 'cartas'
  | 'siniestros'
  | 'planes'
  | 'promesas'

/** Verbo del CTA — mapea 1:1 a las keys del contrato i18n `pendientes.*`. */
export type PendienteCta = 'resolver' | 'aprobar' | 'revisar' | 'seguimiento'

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
        titulo: esc.debtor_id_masked ?? esc.debtor_id,
        reason: esc.reason,
        kind: null,
        montoCop: null,
        dueDate: null,
        fecha: esc.created_at,
        href: `${BASE}/escalaciones/${esc.id}`,
        cta: 'resolver',
      })
    }

    // 2. Cartas prejurídicas esperando revisión humana
    for (const carta of cartas.data?.artifacts ?? []) {
      out.push({
        key: `carta-${carta.id}`,
        grupo: 'cartas',
        prioridad: 'alta',
        titulo: '',
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
        titulo: claim.aseguradora
          ? claim.aseguradora.charAt(0).toUpperCase() + claim.aseguradora.slice(1)
          : '',
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

    // Orden: alta → media → baja; dentro de cada prioridad, fecha DESC.
    return out.sort((a, b) => {
      const rankDelta = PRIORIDAD_RANK[a.prioridad] - PRIORIDAD_RANK[b.prioridad]
      if (rankDelta !== 0) return rankDelta
      return new Date(b.fecha).getTime() - new Date(a.fecha).getTime()
    })
  }, [escalaciones.data, cartas.data, siniestros.data, planes.rows, reporte.data])

  const counts = useMemo<Record<PendienteGrupo, number>>(() => {
    const c: Record<PendienteGrupo, number> = {
      escalaciones: 0,
      cartas: 0,
      siniestros: 0,
      planes: 0,
      promesas: 0,
    }
    for (const item of items) c[item.grupo] += 1
    return c
  }, [items])

  const isLoading =
    escalaciones.isLoading ||
    cartas.isLoading ||
    siniestros.isLoading ||
    planes.isLoading ||
    reporte.isLoading

  const error =
    escalaciones.error ??
    cartas.error ??
    siniestros.error ??
    planes.error ??
    reporte.error ??
    null

  const refetch = useCallback(async () => {
    await Promise.allSettled([
      escalaciones.mutate(),
      cartas.refetch(),
      siniestros.refetch(),
      planes.refetch(),
      reporte.refetch(),
    ])
  }, [escalaciones.mutate, cartas.refetch, siniestros.refetch, planes.refetch, reporte.refetch])

  return { items, counts, isLoading, error, refetch }
}
