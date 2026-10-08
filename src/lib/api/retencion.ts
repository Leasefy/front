/**
 * Cliente de Vinci (retención). Llama al micro
 * `${NEXT_PUBLIC_AGENT_URL}/api/agency/:agencyId/retencion/*` con el bearer
 * (`agentAuthHeaders`).
 *
 * 🔴 26-09-2026 — SIN DATOS DE EJEMPLO. Este cliente caía a un mock
 * (`mock-retencion.ts`) ante cualquier error, 404 o flag apagado, y la
 * pantalla decía «las rutas no están montadas» aunque sí lo estaban. Ahora
 * un error es un error (con su código y su frase) y la pantalla lo dice; un
 * 404 con Vinci apagado se lee como «Vinci no está encendido», no como datos.
 */
import { agentAuthHeaders } from '@/lib/api/agent-auth'
import type {
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

/** Un fallo de Vinci con el código HTTP y la frase que devolvió el micro. */
export class ErrorDeVinci extends Error {
  constructor(
    readonly status: number,
    mensaje: string,
    readonly code: string | null = null,
  ) {
    super(mensaje)
    this.name = 'ErrorDeVinci'
  }
}

function base(agencyId: string): string {
  const url = process.env.NEXT_PUBLIC_AGENT_URL
  if (!url) throw new ErrorDeVinci(0, 'El panel no tiene configurada la dirección del agente (NEXT_PUBLIC_AGENT_URL).')
  return `${url}/api/agency/${encodeURIComponent(agencyId)}/retencion`
}

async function pedir<T>(url: string, init: RequestInit = {}): Promise<T> {
  const res = await globalThis.fetch(url, {
    ...init,
    headers: agentAuthHeaders(init.body ? { 'content-type': 'application/json' } : undefined),
  })
  if (!res.ok) {
    const cuerpo = (await res.json().catch(() => null)) as { error?: string; code?: string } | null
    throw new ErrorDeVinci(res.status, cuerpo?.error ?? `El agente respondió ${res.status}.`, cuerpo?.code ?? null)
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
  cambio: { umbral?: number; topeDescuentoComisionPct?: number },
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
): Promise<DecisionDeVinci[]> {
  const q = new URLSearchParams()
  if (opts.reviewableOnly) q.set('reviewableOnly', 'true')
  if (opts.caseId) q.set('caseId', opts.caseId)
  if (typeof opts.limit === 'number') q.set('limit', String(opts.limit))
  const qs = q.toString()
  const r = await pedir<{ decisions: DecisionDeVinci[] }>(`${base(agencyId)}/decisions${qs ? `?${qs}` : ''}`, { signal })
  return r.decisions
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
