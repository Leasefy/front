/**
 * Cliente de Vinci (retención). Llama al micro
 * `${NEXT_PUBLIC_AGENT_URL}/api/agency/:agencyId/retencion/*` con `agentFetch`
 * (el bearer y el reintento cuando el token se renueva).
 *
 * 🔴 26-09-2026 — SIN DATOS DE EJEMPLO. Este cliente caía a un mock
 * (`mock-retencion.ts`) ante cualquier error, 404 o flag apagado, y la
 * pantalla decía «las rutas no están montadas» aunque sí lo estaban. Ahora
 * un error es un error (con su código y su frase) y la pantalla lo dice.
 *
 * 🔴 Con las reglas de bugs-nico-1 (QA 04-10, IA-C-01; tanda 2 de errores):
 *  · el 404 «no está habilitado» del micro (o sin micro configurado) es
 *    `RetencionApagadaError`: la pantalla pinta `RetencionApagada` («no está
 *    activada todavía»), nunca el texto del micro, que nombra su variable;
 *  · cualquier otro fallo es un `ErrorDeVinci`, que es un `ApiError`: lo lee
 *    `EstadoDeDatos` (con reintentar) y el traductor de errores.
 */
import { ApiError } from '@/lib/api/client'
import { agentFetch } from '@/lib/api/agent-fetch'
import type {
  ColaDeVinci,
  DecisionDeVinci,
  DetalleDeLaOferta,
  MetricasDeVinci,
  OfertaDeVinci,
  PlanConTareas,
  ResultadoDelClic,
  ReviewOutcome,
  RiesgoDeVinci,
  TipoDeOferta,
  UmbralDeVinci,
} from '@/lib/types/retencion'

/** Un fallo de Vinci con el código HTTP, el `code` y la frase que devolvió el micro. */
export class ErrorDeVinci extends ApiError {
  constructor(status: number, mensaje: string, code: string | null = null, cuerpo?: Record<string, unknown>) {
    super(status, mensaje, code ?? undefined, cuerpo)
    this.name = 'ErrorDeVinci'
  }
}

/** Vinci (Retención) no está activado para esta inmobiliaria: lo prende Leasefy. */
export class RetencionApagadaError extends ErrorDeVinci {
  constructor() {
    super(404, 'Retención no está activada todavía para tu inmobiliaria.', 'RETENCION_NO_HABILITADA')
    this.name = 'RetencionApagadaError'
  }
}

export function esRetencionApagada(err: unknown): err is RetencionApagadaError {
  return err instanceof RetencionApagadaError
}

/** El micro apaga todas las rutas de Vinci con un 404 «… no está habilitado …». */
export function esCuerpoDeRetencionApagada(status: number, cuerpo: unknown): boolean {
  if (status !== 404 || !cuerpo || typeof cuerpo !== 'object') return false
  const c = cuerpo as Record<string, unknown>
  if (c.code === 'RETENCION_NO_HABILITADA') return true
  const texto = [c.error, c.message].filter((x): x is string => typeof x === 'string').join(' ')
  return /no est[aá] habilitad/i.test(texto)
}

function base(agencyId: string): string {
  const url = process.env.NEXT_PUBLIC_AGENT_URL
  // Sin micro configurado no hay Vinci: es lo mismo que apagado.
  if (!url) throw new RetencionApagadaError()
  return `${url}/api/agency/${encodeURIComponent(agencyId)}/retencion`
}

/** La frase para una persona: el `message` del sobre, o el `error` del cuerpo viejo si es una frase. */
function fraseDelCuerpo(cuerpo: Record<string, unknown> | null, status: number): string {
  const m = cuerpo?.message
  if (Array.isArray(m) && m.length) return m.map(String).join(' ')
  if (typeof m === 'string' && m.trim()) return m
  const e = cuerpo?.error
  if (typeof e === 'string' && /\s/.test(e.trim())) return e
  return `El agente respondió ${status}.`
}

async function pedir<T>(url: string, init: RequestInit = {}): Promise<T> {
  const res = await agentFetch(url, {
    ...init,
    headers: init.body ? { 'content-type': 'application/json' } : undefined,
  })
  if (!res.ok) {
    const leido = (await res.json().catch(() => null)) as unknown
    const cuerpo = leido && typeof leido === 'object' && !Array.isArray(leido) ? (leido as Record<string, unknown>) : null
    if (esCuerpoDeRetencionApagada(res.status, cuerpo)) throw new RetencionApagadaError()
    const code = typeof cuerpo?.code === 'string' ? cuerpo.code : null
    throw new ErrorDeVinci(res.status, fraseDelCuerpo(cuerpo, res.status), code, cuerpo ?? undefined)
  }
  return (await res.json()) as T
}

export function fetchRiesgo(agencyId: string, opts: { fresco?: boolean } = {}, signal?: AbortSignal): Promise<RiesgoDeVinci> {
  return pedir<RiesgoDeVinci>(`${base(agencyId)}/riesgo${opts.fresco ? '?fresco=true' : ''}`, { signal })
}

export function fetchMetricas(agencyId: string, signal?: AbortSignal): Promise<MetricasDeVinci> {
  return pedir<MetricasDeVinci>(`${base(agencyId)}/metricas`, { signal })
}

/** Sólo el administrador: a otros roles el micro les responde 403. */
export function fetchUmbral(agencyId: string, signal?: AbortSignal): Promise<UmbralDeVinci> {
  return pedir<UmbralDeVinci>(`${base(agencyId)}/umbral`, { signal })
}

export function guardarUmbral(
  agencyId: string,
  cambio: {
    umbral?: number
    topeDescuentoComisionPct?: number
    diasEntreMensajesInquilino?: number
    diasEntreMensajesPropietario?: number
  },
): Promise<UmbralDeVinci> {
  return pedir<UmbralDeVinci>(`${base(agencyId)}/umbral`, { method: 'PUT', body: JSON.stringify(cambio) })
}

export async function fetchOfertas(agencyId: string, caseId: string, signal?: AbortSignal): Promise<OfertaDeVinci[]> {
  const r = await pedir<{ ofertas: OfertaDeVinci[] }>(`${base(agencyId)}/casos/${encodeURIComponent(caseId)}/ofertas`, { signal })
  return r.ofertas
}

export function proponerOferta(
  agencyId: string,
  caseId: string,
  oferta: { tipo: TipoDeOferta; detalle: DetalleDeLaOferta },
): Promise<OfertaDeVinci> {
  return pedir<OfertaDeVinci>(`${base(agencyId)}/casos/${encodeURIComponent(caseId)}/ofertas`, {
    method: 'POST',
    body: JSON.stringify(oferta),
  })
}

export function resolverOferta(
  agencyId: string,
  ofertaId: string,
  accion: 'aprobar' | 'rechazar',
  body: { aceptadaPorElPropietario?: boolean } = {},
): Promise<OfertaDeVinci> {
  return pedir<OfertaDeVinci>(`${base(agencyId)}/ofertas/${encodeURIComponent(ofertaId)}/${accion}`, {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

export async function fetchDecisiones(
  agencyId: string,
  opts: { reviewableOnly?: boolean; caseId?: string; limit?: number } = {},
  signal?: AbortSignal,
): Promise<ColaDeVinci> {
  const q = new URLSearchParams()
  if (opts.reviewableOnly) q.set('reviewableOnly', 'true')
  if (opts.caseId) q.set('caseId', opts.caseId)
  if (typeof opts.limit === 'number') q.set('limit', String(opts.limit))
  const qs = q.toString()
  const r = await pedir<{ decisions: DecisionDeVinci[]; envioHabilitado?: boolean }>(`${base(agencyId)}/decisions${qs ? `?${qs}` : ''}`, { signal })
  return { decisiones: r.decisions, envioHabilitado: typeof r.envioHabilitado === 'boolean' ? r.envioHabilitado : null }
}

export function revisarDecision(agencyId: string, decisionId: string, reviewOutcome: ReviewOutcome): Promise<unknown> {
  return pedir(`${base(agencyId)}/decisions/${encodeURIComponent(decisionId)}`, {
    method: 'PATCH',
    body: JSON.stringify({ reviewOutcome }),
  })
}

/** El clic de «Hacerlo» / «Enviar»: abre el plan propuesto y/o programa el mensaje (deshacible). */
export function hacerlo(agencyId: string, decisionId: string): Promise<ResultadoDelClic> {
  return pedir<ResultadoDelClic>(`${base(agencyId)}/decisions/${encodeURIComponent(decisionId)}/hacerlo`, { method: 'POST' })
}

export function fetchPlan(agencyId: string, planId: string, signal?: AbortSignal): Promise<PlanConTareas> {
  return pedir<PlanConTareas>(`${base(agencyId)}/planes/${encodeURIComponent(planId)}`, { signal })
}

/** Cerrar el plan a mano: «se quedó» (logrado) o «se fue» (perdido), con el resultado. */
export function cerrarPlan(
  agencyId: string,
  planId: string,
  cierre: { status: 'logrado' | 'perdido' | 'activo'; actualResult?: string },
): Promise<PlanConTareas> {
  return pedir<PlanConTareas>(`${base(agencyId)}/planes/${encodeURIComponent(planId)}`, {
    method: 'PATCH',
    body: JSON.stringify(cierre),
  })
}

export function actualizarTarea(
  agencyId: string,
  planId: string,
  taskId: string,
  cambio: { status: 'pendiente' | 'en_progreso' | 'completada' | 'cancelada'; result?: string },
): Promise<unknown> {
  return pedir(`${base(agencyId)}/planes/${encodeURIComponent(planId)}/tareas/${encodeURIComponent(taskId)}`, {
    method: 'PATCH',
    body: JSON.stringify(cambio),
  })
}
