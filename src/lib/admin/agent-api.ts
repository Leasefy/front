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
  origen: 'noche' | 'manual'
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
  | { tipo: 'deshacer'; propuestaId: string; que: string }
export type ResultadoDelReparto = 'aplicado' | 'ya_estaba' | 'falta_la_delegacion' | 'agente_sin_modo' | 'no_se_pudo' | 'sin_dato_previo' | 'ya_no_era_suya'
export type EstadoDeLaMejora = 'por_decidir' | 'por_revisar' | 'rechazada' | 'aprobada' | 'aplicada' | 'deshecha'
export type VeredictoDelEnsayo = 'mejora' | 'neutro' | 'empeora' | 'sin_datos'
export type VeredictoDeLaMedicion = 'sirvio' | 'sin_cambio' | 'empeoro' | 'sin_datos'
export type MotivoDeRevision = 'ensayo_empeora' | 'revisor_la_tumba'
/** El ensayo de una mejora con los 30 días reales (laboratorio del maestro, 19-10-2026). */
export interface EnsayoDeLaMejora {
  version: number
  veredicto: VeredictoDelEnsayo
  resumen: string
  cifras: Record<string, number>
  filas: string[]
  dias: string[]
  grillas: Array<{ medida: string; referencia: number[][]; conLaMejora: number[][] | null }>
  porInmobiliaria: Array<{ alias: string; veredicto: VeredictoDelEnsayo; cifras: Record<string, number> }>
}
export type RevisionDeLaMejora = { aguanta: boolean; objecion: string; confianza: 'alta' | 'media' | 'baja'; modelo: string } | { noCorrio: string }
export interface MejoraDelMaestro {
  id: string
  estado: EstadoDeLaMejora
  contenido: ContenidoDeLaMejora
  /** Lo que propone, en una frase (la dice el micro). */
  que: string
  veredicto: 'pasa' | 'por_revisar'
  motivos: MotivoDeRevision[]
  ensayo: EnsayoDeLaMejora | null
  revision: RevisionDeLaMejora | null
  /** La mejora que deshace (sólo un «deshacer»). */
  deshace: string | null
  /** El «deshacer» que el maestro ya propuso para esta (si empeoró). */
  deshacerPropuesto: string | null
  medicion: { veredicto: VeredictoDeLaMedicion; resumen: string; aLosDias: number; medidaEn: string } | null
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


// ── El laboratorio del maestro (Nico, 19-10-2026: «quiero que al final el maestro sea así de crack») ──────────

export type RolDelMaestro = 'lector' | 'pensador' | 'verificador' | 'revisor' | 'medidor' | 'archivista'
export interface PasoDelMaestro {
  orden: number
  en: string
  rol: RolDelMaestro
  paso: string
  texto: string
  detalle: Record<string, unknown>
  /** El nombre de la inmobiliaria del paso, si el paso es de una. */
  nombre: string | null
}
export interface InmobiliariaDelLaboratorio {
  alias: string
  tenantId: string
  nombre: string
  diarios: number
  preguntas: number
  categorias: { tamano: TamanoDelMaestro | null; ciudad: string | null; negocio: string | null } | null
  agentes: Array<{ agente: string; modo: string; acciones30d: number; malas30d: number }>
}
export interface PropuestaDelLaboratorio {
  id: string
  /** La huella: la bitácora la nombra así en los pasos del ensayo y del revisor. */
  huella: string
  tipo: ContenidoDeLaMejora['tipo']
  que: string
  estado: EstadoDeLaMejora
  veredicto: 'pasa' | 'por_revisar'
  motivos: MotivoDeRevision[]
  categoria: string
  porque: string
  evidencia: Array<{ alias: string | null; nombre: string }>
  alcance: number
  ensayo: EnsayoDeLaMejora | null
  revision: RevisionDeLaMejora | null
  reparto: Array<{ alias: string | null; nombre: string; resultado: ResultadoDelReparto }> | null
  medicion: { veredicto: VeredictoDeLaMedicion; resumen: string; serie: { dias: string[]; valores: Array<number | null> } } | null
}
export interface LaboratorioResponse {
  prendido: boolean
  topeUsd: number
  costoEstimadoUsd: number | null
  enCurso: { corridaId: string; desde: string } | null
  corridaId: string | null
  corrida: {
    id: string
    dia: string
    origen: 'noche' | 'manual'
    pedidaPor: string | null
    estado: NocheDelMaestro['estado']
    modelo: string | null
    costoUsd: number
    diarios: number
    inmobiliarias: number
    insights: number
    creadaEn: string
  } | null
  corridas: Array<{ id: string; dia: string; origen: 'noche' | 'manual'; estado: NocheDelMaestro['estado']; costoUsd: number; creadaEn: string }>
  bitacora: PasoDelMaestro[]
  inmobiliarias: InmobiliariaDelLaboratorio[]
  propuestas: PropuestaDelLaboratorio[]
  mediciones: Array<{ propuestaId: string; que: string | null; veredicto: VeredictoDeLaMedicion; resumen: string; medidaEn: string; serie: { dias: string[]; valores: Array<number | null> } }>
  ontologia: { agentes: Array<{ id: string; nombre: string | null; funcion: string }>; limites: number }
  generadoEn: string
}

export function getLaboratorioDelMaestro(corrida: string | null, signal?: AbortSignal): Promise<LaboratorioResponse> {
  return agentAdminApi<LaboratorioResponse>('/api/admin/maestro/laboratorio', { query: { corrida: corrida ?? undefined }, signal })
}

export function getBitacoraDelMaestro(corridaId: string, desde: number, signal?: AbortSignal): Promise<{ pasos: PasoDelMaestro[]; terminada: boolean; guardada: boolean }> {
  return agentAdminApi(`/api/admin/maestro/corridas/${encodeURIComponent(corridaId)}/bitacora`, { query: { desde: String(desde) }, signal })
}

export function correrElMaestroAhora(): Promise<{ corridaId: string; como: 'inngest' | 'en_proceso'; mensaje: string }> {
  return agentAdminApi('/api/admin/maestro/correr-ahora', { method: 'POST', body: { confirmo: true } })
}
