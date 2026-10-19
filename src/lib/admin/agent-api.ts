'use client'

/**
 * agent-api — el puñado de lecturas del backoffice que viven en el micro de
 * AGENTES y no en el micro de admin.
 *
 * Casi todo `/admin/*` pega a `adminApi` (`NEXT_PUBLIC_ADMIN_API_URL` →
 * `/api/v1/admin`). El feedback del chat es la excepción: el pulgar de cada
 * respuesta se guarda en el schema `agent`, del que el back NO es dueño. Armar
 * un proxy en el back para una sola lectura sería una capa más que mantener; el
 * micro ya tiene su propia puerta de backoffice, con la MISMA lista de correos
 * (`ADMIN_EMAILS`) y el MISMO token de Supabase.
 *
 * Mismo contrato de errores que `adminApi`: 401 → login, 403 → forbidden.
 */

import { ApiError, getAdminToken } from '@/lib/admin/api'

function agentOrigin(): string {
  const base = process.env.NEXT_PUBLIC_AGENT_URL
  if (!base) {
    throw new ApiError(0, 'NEXT_PUBLIC_AGENT_URL no está configurado')
  }
  return base.replace(/\/$/, '')
}

function redirectTo(path: string): void {
  if (typeof window !== 'undefined') window.location.href = path
}

export async function agentAdminApi<T>(
  path: string,
  opts: {
    query?: Record<string, string | number | undefined>
    signal?: AbortSignal
    /** Por defecto GET. El maestro (19-10-2026) también decide (POST) y ajusta (PUT). */
    method?: 'GET' | 'POST' | 'PUT'
    body?: unknown
  } = {},
): Promise<T> {
  const token = getAdminToken()
  if (!token) {
    redirectTo('/admin/login')
    throw new ApiError(401, 'No session')
  }

  const url = new URL(`${agentOrigin()}${path.startsWith('/') ? path : `/${path}`}`)
  for (const [k, v] of Object.entries(opts.query ?? {})) {
    if (v === undefined || v === '') continue
    url.searchParams.set(k, String(v))
  }

  const conCuerpo = opts.body !== undefined
  const res = await fetch(url.toString(), {
    method: opts.method ?? 'GET',
    headers: { Authorization: `Bearer ${token}`, ...(conCuerpo ? { 'Content-Type': 'application/json' } : {}) },
    ...(conCuerpo ? { body: JSON.stringify(opts.body) } : {}),
    signal: opts.signal,
  })

  if (res.status === 401) {
    redirectTo('/admin/login')
    throw new ApiError(401, 'Sesión expirada')
  }
  if (res.status === 403) {
    redirectTo('/admin/forbidden')
    throw new ApiError(403, 'No autorizado')
  }
  if (!res.ok) {
    const body = (await res.json().catch(() => undefined)) as { error?: string } | undefined
    throw new ApiError(res.status, body?.error ?? `Error ${res.status}`, body)
  }
  return (await res.json()) as T
}

// ── Feedback del chat (micro de agentes) ─────────────────────────────────────

export interface ChatFeedbackRow {
  id: string
  agencyId: string
  turnId: string
  pregunta: string
  respuesta: string
  veredicto: 'up' | 'down'
  comentario: string | null
  cifraMal: boolean
  herramientas: string[]
  usuario: string
  /** Si el comentario se convirtió en una lección que el chat ya usa. */
  leccionId: string | null
  createdAt: string
}

export interface ChatFeedbackWeek {
  /** Lunes de la semana, ISO. */
  semana: string
  total: number
  arriba: number
  /** `null` cuando esa semana no tuvo ninguna valoración (no es un 0 %). */
  porcentajeArriba: number | null
}

export interface ChatFeedbackResponse {
  filas: ChatFeedbackRow[]
  semanas: ChatFeedbackWeek[]
  generadoEn: string
}

export function getChatFeedback(
  opts: { agencyId?: string; veredicto?: 'up' | 'down'; limit?: number; signal?: AbortSignal } = {},
): Promise<ChatFeedbackResponse> {
  return agentAdminApi<ChatFeedbackResponse>('/api/admin/ai-hub/chat/feedback', {
    query: {
      ...(opts.agencyId ? { agencyId: opts.agencyId } : {}),
      ...(opts.veredicto ? { veredicto: opts.veredicto } : {}),
      limit: opts.limit ?? 50,
    },
    ...(opts.signal ? { signal: opts.signal } : {}),
  })
}

// ── Preguntas al chat (micro de agentes) ─────────────────────────────────────
//
// Decisión de Nico (04-10-2026): Leasefy ve las preguntas completas que le hacen
// al chat, con su inmobiliaria, SIN el correo de quién preguntó y con los
// números largos enmascarados, + sugerencias. La pantalla
// (`/admin/chat-preguntas`) NO está en el menú hasta que se apruebe la cláusula.

export type TemaDelChat =
  | 'contratos'
  | 'inquilinos'
  | 'propietarios'
  | 'inmuebles'
  | 'cobros'
  | 'pagos'
  | 'cartera'
  | 'renovaciones'
  | 'mantenimientos'
  | 'facturas'
  | 'giros'
  | 'visitas'
  | 'prospectos'
  | 'pqrs'
  | 'canon'
  | 'otros'

export interface TurnoDelChat {
  turnoId: string
  agencyId: string
  inmobiliaria: string | null
  fecha: string
  /** Ya enmascarada por el micro. */
  pregunta: string
  respuesta: string | null
  sinRespuesta: boolean
  falla: { motivo: 'sin_creditos' | 'error' } | null
  especialistas: string[]
  fuentes: string[]
  reformulada: boolean
  corregida: boolean
  abandonada: boolean
  pulgar: 'arriba' | 'abajo' | null
  comentario: string | null
  cifraContradicha: boolean
  metricasContradichas: string[]
  propusoAccion: boolean
  pideAccion: boolean
  ms: number | null
  modelo: string | null
  camino: string | null
  rol: string | null
  tokensEntrada: number | null
  tokensSalida: number | null
  costoUsd: number | null
  temas: TemaDelChat[]
}

export interface SugerenciaDelChat {
  id: string
  tipo: 'sin_respuesta' | 'reformulacion' | 'abandono' | 'cifra' | 'pulgar_abajo' | 'accion' | 'lento' | 'falla' | 'costo'
  severidad: 'alta' | 'media'
  hallazgo: string
  accion: string
  conteo: number
  total: number
  tema: TemaDelChat | null
  ejemplos: TurnoDelChat[]
}

export interface SemanaDeInmobiliariaDelChat {
  semana: string
  agencyId: string
  inmobiliaria: string | null
  preguntas: number
  sinRespuesta: number
  porcentajeSinRespuesta: number | null
  reformulaciones: number
  abandonos: number
  fallas: number
  pulgarAbajo: number
  costoUsd: number
  temas: Array<{ tema: TemaDelChat; nombre: string; preguntas: number }>
}

export interface ChatPreguntasResponse {
  ventana: { desde: string; hasta: string; truncado: boolean }
  totales: {
    preguntas: number
    inmobiliarias: number
    sinRespuesta: number
    porcentajeSinRespuesta: number | null
    reformulaciones: number
    abandonos: number
    fallas: number
    pulgarAbajo: number
    cifrasContradichas: number
    costoUsd: number
    turnosConCosto: number
  }
  filas: TurnoDelChat[]
  total: number
  pagina: number
  limite: number
  resumen: SemanaDeInmobiliariaDelChat[]
  temas: Array<{ tema: TemaDelChat; nombre: string; preguntas: number }>
  especialistas: Array<{ nombre: string; veces: number }>
  fuentes: Array<{ nombre: string; veces: number }>
  sugerencias: SugerenciaDelChat[]
  inmobiliarias: Array<{ agencyId: string; nombre: string | null; preguntas: number }>
  generadoEn: string
}

export interface FiltrosDePreguntas {
  agencyId?: string
  desde?: string
  hasta?: string
  sinRespuesta?: boolean
  pulgarAbajo?: boolean
  q?: string
  tema?: string
  pagina?: number
  limite?: number
}

export function getChatPreguntas(f: FiltrosDePreguntas & { signal?: AbortSignal } = {}): Promise<ChatPreguntasResponse> {
  return agentAdminApi<ChatPreguntasResponse>('/api/admin/ai-hub/chat/preguntas', {
    query: {
      agencyId: f.agencyId,
      desde: f.desde,
      hasta: f.hasta,
      sinRespuesta: f.sinRespuesta ? '1' : undefined,
      pulgarAbajo: f.pulgarAbajo ? '1' : undefined,
      q: f.q,
      tema: f.tema,
      pagina: f.pagina,
      limite: f.limite ?? 50,
    },
    ...(f.signal ? { signal: f.signal } : {}),
  })
}

// ── El maestro de Leasefy (micro de agentes) ─────────────────────────────────
//
// Fase 3 y 4 de «Naira lo sabe todo» (Nico, 17 y 19-10-2026): cada noche el maestro lee los diarios de todas las Nairas
// y deja insights y propuestas de mejora por categoría; Leasefy aprueba cada una y, aprobada, la Naira de cada
// inmobiliaria de esa categoría la aplica sola.

export type TamanoDelMaestro = 'pequena' | 'mediana' | 'grande'
export interface AjustesDelMaestro {
  tamanoPequenaHasta: number
  tamanoMedianaHasta: number
}
export interface InmobiliariaConNombre {
  id: string
  nombre: string
}
export interface InsightDelMaestro {
  titulo: string
  detalle: string
  tipo: 'producto' | 'agente' | 'chat' | 'operacion'
  inmobiliarias: InmobiliariaConNombre[]
}
export interface NocheDelMaestro {
  id: string
  dia: string
  estado: 'listo' | 'fallo_del_modelo' | 'muy_caro' | 'sin_diarios'
  modelo: string | null
  costoUsd: number
  diarios: number
  inmobiliarias: number
  insights: InsightDelMaestro[]
  /** alias («I3») → nombre, para leer los insights. */
  alias: Record<string, string>
  descubiertas: Array<{ id: string; nombre: string; descripcion: string; inmobiliarias: InmobiliariaConNombre[] }>
  descartadas: Array<{ tipo: string; motivo: string }>
  creadaEn: string
}
export type ContenidoDeLaMejora =
  | { tipo: 'leccion'; texto: string; agente: string | null }
  | { tipo: 'modo'; agente: string; modo: 'sombra' | 'copiloto' | 'autonomo' }
  | { tipo: 'regla'; parametro: string; valor: number }
export type ResultadoDelReparto = 'aplicado' | 'ya_estaba' | 'falta_la_delegacion' | 'agente_sin_modo' | 'no_se_pudo'
export interface MejoraDelMaestro {
  id: string
  estado: 'por_decidir' | 'rechazada' | 'aprobada' | 'aplicada'
  contenido: ContenidoDeLaMejora
  categoria: { dimension: string; valor: string; nombre: string }
  porque: string
  evidencia: InmobiliariaConNombre[]
  alcance: number
  creadaEn: string
  decision: { tipo: 'aprobada' | 'rechazada'; quien: string; en: string } | null
  aplicacion: {
    en: string
    porResultado: Partial<Record<ResultadoDelReparto, number>>
    porInmobiliaria: Array<{ tenantId: string; nombre: string; resultado: ResultadoDelReparto }>
  } | null
}
export interface MaestroResponse {
  prendido: boolean
  ajustes: AjustesDelMaestro
  corridas: NocheDelMaestro[]
  propuestas: MejoraDelMaestro[]
  inmobiliarias: Array<InmobiliariaConNombre & { tamano: TamanoDelMaestro | null; ciudad: string | null; negocio: string | null }>
  generadoEn: string
}
export interface DiaDelDiario {
  tenantId: string
  nombre: string
  dia: string
  version: number
  bytes: number
  creadoEn: string
}

export function getMaestro(signal?: AbortSignal): Promise<MaestroResponse> {
  return agentAdminApi<MaestroResponse>('/api/admin/maestro', { signal })
}

export function getDiariosDelMaestro(f: { desde?: string; hasta?: string; signal?: AbortSignal } = {}): Promise<{ desde: string; hasta: string; diarios: DiaDelDiario[] }> {
  return agentAdminApi('/api/admin/maestro/diarios', { query: { desde: f.desde, hasta: f.hasta }, signal: f.signal })
}

export function getDiarioDelMaestro(tenantId: string, dia: string, signal?: AbortSignal): Promise<{ nombre: string; dia: string; contenido: Record<string, unknown> }> {
  return agentAdminApi(`/api/admin/maestro/diarios/${encodeURIComponent(tenantId)}/${encodeURIComponent(dia)}`, { signal })
}

export function decidirMejoraDelMaestro(
  id: string,
  decision: 'aprobar' | 'rechazar',
): Promise<{ estado: string; mensaje?: string; inmobiliarias?: number; porResultado?: Partial<Record<ResultadoDelReparto, number>>; porInmobiliaria?: Array<{ nombre: string; resultado: ResultadoDelReparto }> }> {
  return agentAdminApi(`/api/admin/maestro/propuestas/${encodeURIComponent(id)}/decision`, { method: 'POST', body: { decision } })
}

export function guardarAjustesDelMaestro(a: AjustesDelMaestro): Promise<{ ajustes: AjustesDelMaestro; mensaje: string }> {
  return agentAdminApi('/api/admin/maestro/ajustes', { method: 'PUT', body: a })
}

