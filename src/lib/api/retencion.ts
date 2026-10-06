/**
 * Cliente del agente de Retención. Llama
 * `${NEXT_PUBLIC_AGENT_URL}/api/agency/:agencyId/retencion/*` con bearer
 * (`agentFetch`).
 *
 * 🔴 Sin datos inventados (QA 04-10, IA-C-01). Antes, ante cualquier fallo
 * —también el 404 «Retención no está habilitada» del micro, que es lo normal
 * mientras `RETENCION_ENABLED` no esté en `true`— caía a `mock-retencion.ts`
 * y la pantalla mostraba propietarios, puntajes y pesos escritos a mano.
 * Ahora:
 *  · 404 «no está habilitada» (o sin micro configurado) → `apagado: true`,
 *    `data: null`: la pantalla dice que Retención no está activada.
 *  · cualquier otro fallo → se lanza el `ApiError` de `falloDelMicro` y la
 *    pantalla lo dice con `EstadoDeDatos` (con reintentar).
 * `mock-retencion.ts` queda sólo para pruebas.
 */
import { agentFetch } from './agent-fetch'
import { falloDelMicro } from './fallo-del-micro'
import type {
  BandejaResult,
  BandejaTab,
  CaseBundle,
  DecisionsResult,
  PatchDecisionResult,
  RetencionDashboard,
  ReviewOutcome,
} from '@/lib/types/retencion'

export interface Fetched<T> {
  /** `null` sólo cuando `apagado`. */
  data: T | null
  /** true = Retención no está activada (el micro responde 404 «no está habilitada»). */
  apagado: boolean
}

/** El micro apaga TODAS las rutas de Retención con 404 `{ error: 'Retención no está habilitada' }`. */
export class RetencionApagadaError extends Error {
  constructor() {
    super('Retención no está activada')
    this.name = 'RetencionApagadaError'
  }
}

export function esRetencionApagada(status: number, cuerpo: unknown): boolean {
  if (status !== 404 || !cuerpo || typeof cuerpo !== 'object') return false
  const c = cuerpo as Record<string, unknown>
  if (c.code === 'RETENCION_NO_HABILITADA') return true
  const texto = [c.error, c.message].filter((x): x is string => typeof x === 'string').join(' ')
  return /no est[aá] habilitad/i.test(texto)
}

function agentBase(agencyId: string): string | null {
  const url = process.env.NEXT_PUBLIC_AGENT_URL
  if (!url) return null
  return `${url}/api/agency/${agencyId}/retencion`
}

/** Lee la respuesta: datos, «apagada» (lanza `RetencionApagadaError`) o el fallo del micro. */
async function leer<T>(res: Response): Promise<T> {
  if (res.ok) return (await res.json()) as T
  if (res.status === 404) {
    const copia = res.clone()
    let cuerpo: unknown = null
    try {
      cuerpo = await copia.json()
    } catch {
      cuerpo = null
    }
    if (esRetencionApagada(res.status, cuerpo)) throw new RetencionApagadaError()
  }
  throw await falloDelMicro(res)
}

async function getJson<T>(path: string, signal?: AbortSignal): Promise<T> {
  return leer<T>(await agentFetch(path, { signal }))
}

async function conApagado<T>(pedir: () => Promise<T>): Promise<Fetched<T>> {
  try {
    return { data: await pedir(), apagado: false }
  } catch (err) {
    if (err instanceof RetencionApagadaError) return { data: null, apagado: true }
    throw err
  }
}

export async function fetchDashboard(
  agencyId: string,
  signal?: AbortSignal,
): Promise<Fetched<RetencionDashboard>> {
  const base = agentBase(agencyId)
  if (!base) return { data: null, apagado: true }
  return conApagado(() => getJson<RetencionDashboard>(`${base}/dashboard`, signal))
}

export async function fetchBandeja(
  agencyId: string,
  tab: BandejaTab | 'todos' = 'todos',
  signal?: AbortSignal,
): Promise<Fetched<BandejaResult>> {
  const base = agentBase(agencyId)
  if (!base) return { data: null, apagado: true }
  const qs = tab && tab !== 'todos' ? `?tab=${encodeURIComponent(tab)}` : ''
  return conApagado(() => getJson<BandejaResult>(`${base}/bandeja${qs}`, signal))
}

/**
 * Bundle de un caso: perfil + plan propuesto + guardrails + borrador de mensaje.
 * El backend expone estos como rutas separadas; aquí se ensamblan en paralelo.
 * Un fallo se lanza (la pantalla lo dice); Retención apagada → `apagado`.
 */
export async function fetchCaseBundle(
  agencyId: string,
  caseId: string,
  signal?: AbortSignal,
): Promise<Fetched<CaseBundle>> {
  const base = agentBase(agencyId)
  if (!base) return { data: null, apagado: true }
  const enc = encodeURIComponent(caseId)
  const ownerId = caseId.startsWith('owner:') ? caseId.slice('owner:'.length) : caseId
  return conApagado(async () => {
    const [profile, plan, guard, message] = await Promise.all([
      getJson<CaseBundle['profile']>(`${base}/propietarios/${encodeURIComponent(ownerId)}/perfil`, signal),
      getJson<CaseBundle['plan']>(`${base}/casos/${enc}/plan-propuesto`, signal).catch((e: unknown) => {
        // Sin plan propuesto el caso se ve igual; apagada, no.
        if (e instanceof RetencionApagadaError) throw e
        return null
      }),
      getJson<CaseBundle['guard']>(`${base}/casos/${enc}/guardrails`, signal),
      getJson<CaseBundle['message']>(`${base}/casos/${enc}/mensaje`, signal),
    ])
    return { caseId, profile, plan, guard, message }
  })
}

export interface FetchDecisionsOpts {
  reviewableOnly?: boolean
  caseId?: string
  limit?: number
}

/**
 * Cola de revisión de decisiones autónomas (T-323). `base` ya incluye
 * `/retencion`, así que la ruta final es `${base}/decisions`.
 */
export async function fetchDecisions(
  agencyId: string,
  opts: FetchDecisionsOpts = {},
  signal?: AbortSignal,
): Promise<Fetched<DecisionsResult>> {
  const base = agentBase(agencyId)
  if (!base) return { data: null, apagado: true }
  const params = new URLSearchParams()
  if (opts.reviewableOnly) params.set('reviewableOnly', 'true')
  if (opts.caseId) params.set('caseId', opts.caseId)
  if (typeof opts.limit === 'number') params.set('limit', String(opts.limit))
  const qs = params.toString()
  return conApagado(() => getJson<DecisionsResult>(`${base}/decisions${qs ? `?${qs}` : ''}`, signal))
}

/**
 * Revisa una decisión autónoma. `PATCH ${base}/decisions/:id`. Un fallo se
 * LANZA (antes «revisaba» una decisión inventada y decía «Revisión registrada»).
 * `agentFetch` agrega el bearer encima de `content-type` (construye `new Headers(extra)`
 * y luego setea Authorization — no se pierde) y reintenta una vez ante un 401.
 */
export async function patchDecisionReview(
  agencyId: string,
  decisionId: string,
  body: { reviewOutcome: ReviewOutcome; reviewedBy?: string },
  signal?: AbortSignal,
): Promise<PatchDecisionResult> {
  const base = agentBase(agencyId)
  if (!base) throw new RetencionApagadaError()
  const res = await agentFetch(`${base}/decisions/${encodeURIComponent(decisionId)}`, {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
    signal,
  })
  return leer<PatchDecisionResult>(res)
}
