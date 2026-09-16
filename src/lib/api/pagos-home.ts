/**
 * pagos-home.ts — client for the Pagos IA "cobro a inquilinos / liquidación a
 * propietarios" home, the CORRECT domain for the /ai/pagos workspace.
 *
 * WHY THIS EXISTS: the generic agent-hub overview (`useAgentOverview('pagos')`)
 * is backed server-side by the AP/proveedores resolver (VendorBill) — the WRONG
 * domain for this UX, so its KPI ids never match the home's KPI_SLOTS and every
 * tile renders "—". The cobro-inquilino backend lives in its own bespoke routes
 * (`/api/agency/{id}/pagos/home/*`, like cobranza's `/cartera/*` family). This
 * module adapts that contract into the SAME `AgentOverviewResponse` shape the
 * home already consumes, so `usePagosHome()` is a DROP-IN for
 * `useAgentOverview('pagos')` (one-line swap, KPI_SLOTS unchanged).
 *
 * CONTRACT PIN: mirrors `PagosHomeMetricsSchema` / `PagosHomeAttentionSchema`
 * from the pagos backend (feat/pagos-phase-43, `src/server/services/
 * pagos-home-metrics.ts`). That backend is flag-gated (`PAGOS_ENABLED`) and
 * returns 503 `{error:'pagos_disabled'}` while off, and the routes are not yet
 * merged/deployed — so this client treats BOTH 404 (not deployed) and 503
 * (flag off) as `notAvailable` (graceful empty state, NOT an error), exactly
 * like the generic agent-workspace fetchers treat 404. If the backend contract
 * shifts before it merges, only the `PagosHomeMetrics` mapping below changes.
 *
 * Follows the NEXT_PUBLIC_AGENT_URL + agentAuthHeaders + 404→notAvailable
 * pattern of `agent-workspace.ts`.
 *
 * ── 🔴 Quién lo usa hoy (2026-09-16) ───────────────────────────────────────
 *
 * `fetchPagosHome` lo consume la pantalla «Agente de pagos» de «Agentes IA»
 * (`/pagos/agente`, vía `useAgenteDePagos`): muestra el tablero del equipo SÓLO
 * cuando esto devuelve datos, y mientras devuelva `notAvailable` dice con
 * palabras que el tablero todavía no está publicado. Así se prende sola el día
 * que el micro publique estas rutas, sin tocar el front.
 *
 * `pagos-home.service.ts`, `pagos-home.types.ts` y los widgets
 * `PagosHomeMetricsStrip` / `PagosHomeAttentionList` siguen sin consumidor. No
 * es olvido: son el PUENTE con un backend que no está desplegado, y tirarlos
 * obligaría a reescribir el contrato cuando llegue.
 *
 * Dónde está ese backend (verificado con `git ls-tree` en el micro,
 * `~/rent/agent`): el equipo —Payu, el conductor, cuya persona pública es
 * Gabriela; y Laura, Nicolás, Valentina, Samuel y Sofía— está en
 * `src/mastra/agents/pagos/` en `cambios-nico-6` (tip `6ddd953b`) y registrado
 * en `src/mastra/index.ts`. Corre por un solo camino: `POST /pagos/dispatch` →
 * `payment-orchestration-workflow`, que sólo se registra con `PAGOS_ENABLED`.
 * Las rutas `/api/agency/{id}/pagos/home/*` que lee este archivo NO existen en
 * esa rama: hoy responden 404.
 *
 * DÓNDE SE ENCHUFA CADA ESPECIALISTA. No en una «Sala de Pagos» en la raíz del
 * módulo: ese renglón se retiró el 2026-09-16 porque contradecía la separación
 * inquilinos/propietarios y porque arranca en «generar el cobro», cuando la
 * deuda ya nació con el contrato (el porqué completo, con el mapeo agente ↔
 * pantalla, está en la NOTA al pie de `src/lib/nav/agentWorkspaceNav.ts`).
 * Cada especialista entra DENTRO de la pantalla cuyo trabajo automatiza:
 *
 *   Valentina → `/pagos/cobranza/fallidos`
 *   Sofía     → `/pagos/cobranza/recordatorios`
 *   Samuel    → `/pagos/liquidaciones`
 *   Laura     → `/pagos/cartera/cobros`, que es donde el CEO puso la decisión
 *               de cobrar («que la persona de finanzas decida cuándo cobrar
 *               basado en la cartera»), leyendo las CUOTAS del contrato.
 */

import { agentAuthHeaders } from './agent-auth'
import type {
  AgentOverviewResponse,
  AgentWorkspaceFetchResult,
  OverviewFeedEntry,
  OverviewKpi,
} from './agent-workspace'

// ── Backend contract (pinned to PagosHomeMetricsSchema, camelCase) ──────────

/** The 8 HOME-01 operational metrics (cobro-inquilino + liquidación). */
export interface PagosHomeMetrics {
  cobrosProgramados: number
  cobrosEnviados: number
  pagosRecibidos: number
  linksPendientes: number
  pagosFallidos: number
  valorRecaudadoCop: number
  propietariosListos: number
  valorPendienteLiquidarCop: number
}

/** One HOME-02 prioritized attention item (feeds the home PrioridadInbox). */
export interface PagosHomeAttentionItem {
  id: string
  kind: 'cobro_fallido' | 'link_vencido' | 'proximo_a_vencer' | 'pago_en_proceso'
  priority: 'alta' | 'media' | 'baja'
  title: string
  detail: string
  totalCop: number
  suggestedAction: string
}

export interface PagosHomeAttention {
  items: PagosHomeAttentionItem[]
}

// ── Mappers (pure) ──────────────────────────────────────────────────────────

/**
 * Map the 8 backend metrics onto OverviewKpi rows. The `id`s are the FIRST
 * candidate of each home KPI_SLOT, so the existing slots resolve unchanged
 * (no front KPI_SLOTS edit needed).
 */
export function metricsToKpis(m: PagosHomeMetrics): OverviewKpi[] {
  return [
    { id: 'cobros_programados', label: 'Cobros programados', value: m.cobrosProgramados, format: 'number' },
    { id: 'cobros_enviados', label: 'Cobros enviados', value: m.cobrosEnviados, format: 'number' },
    { id: 'pagos_recibidos', label: 'Pagos recibidos', value: m.pagosRecibidos, format: 'number' },
    { id: 'links_pendientes', label: 'Links pendientes', value: m.linksPendientes, format: 'number' },
    { id: 'pagos_fallidos', label: 'Pagos fallidos', value: m.pagosFallidos, format: 'number' },
    { id: 'valor_recaudado', label: 'Valor recaudado', value: m.valorRecaudadoCop, format: 'cop' },
    { id: 'pagos_propietarios_listos', label: 'Pagos a propietarios listos', value: m.propietariosListos, format: 'number' },
    { id: 'valor_pendiente_liquidar', label: 'Valor pendiente por liquidar', value: m.valorPendienteLiquidarCop, format: 'cop' },
  ]
}

/**
 * Map the prioritized attention list onto OverviewFeedEntry rows (alta→media→baja
 * order is preserved from the backend). The backend exposes no event timestamp
 * for these (they are a live to-do list, not an event log), so `occurredAt` is
 * left empty — the feed renders the item itself, not a time.
 */
export function attentionToFeed(items: PagosHomeAttentionItem[]): OverviewFeedEntry[] {
  return items.map((it) => ({
    id: it.id,
    titulo: it.title,
    detalle: it.detail,
    actorType: 'system',
    occurredAt: '',
  }))
}

// ── Fetch ───────────────────────────────────────────────────────────────────

const NOT_AVAILABLE_STATUSES = new Set([404, 503]) // 404 not deployed · 503 PAGOS_ENABLED off

async function getJson<T>(path: string, signal?: AbortSignal): Promise<{ data: T | null; notAvailable: boolean }> {
  const agentUrl = process.env.NEXT_PUBLIC_AGENT_URL
  if (!agentUrl) throw new Error('not_configured')
  const res = await globalThis.fetch(`${agentUrl}${path}`, { headers: agentAuthHeaders(), signal })
  // 404 (not deployed) OR 503 (flag off) → graceful empty, NOT an error.
  if (NOT_AVAILABLE_STATUSES.has(res.status)) return { data: null, notAvailable: true }
  if (!res.ok) throw new Error(`${res.status}`)
  return { data: (await res.json()) as T, notAvailable: false }
}

/**
 * Fetch the Pagos home and adapt it into an `AgentOverviewResponse` so the hook
 * is a drop-in for `useAgentOverview('pagos')`. Metrics are the gate: if they
 * are `notAvailable` (not deployed / flag off) the whole home is `notAvailable`.
 * The attention list is best-effort — a failure there degrades to an empty feed
 * rather than failing the KPIs (the headline value is the 8 metrics).
 */
export async function fetchPagosHome(
  agencyId: string,
  signal?: AbortSignal,
): Promise<AgentWorkspaceFetchResult<AgentOverviewResponse>> {
  const base = `/api/agency/${agencyId}/pagos/home`

  const metrics = await getJson<PagosHomeMetrics>(`${base}/metrics`, signal)
  if (metrics.notAvailable || metrics.data === null) {
    return { data: null, notAvailable: true }
  }

  // Best-effort attention — never let it sink the KPIs.
  let feed: OverviewFeedEntry[] = []
  try {
    const attention = await getJson<PagosHomeAttention>(`${base}/attention`, signal)
    if (attention.data) feed = attentionToFeed(attention.data.items)
  } catch {
    feed = []
  }

  const data: AgentOverviewResponse = {
    agente: 'pagos',
    kpis: metricsToKpis(metrics.data),
    pipeline: [],
    feed,
    generatedAt: new Date().toISOString(),
  }
  return { data, notAvailable: false }
}
