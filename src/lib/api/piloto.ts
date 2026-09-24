'use client'

/**
 * piloto.ts — front mirror of the «Piloto automático» contracts (§4 of
 * agent-integracion/claudedocs/piloto-contratos-v1.md).
 *
 * MIRROR hand-authored contra el contrato — los endpoints del micro se
 * construyen EN PARALELO, así que acá se codifica contra el contrato, no
 * contra un servidor vivo:
 *
 *   GET /api/agency/{agencyId}/ai-hub/activity?limit=50            → { items: ActivityItem[] }
 *   GET /api/agency/{agencyId}/ai-hub/inbox                        → { items, total, porPrioridad }
 *   GET/PUT /api/agency/{agencyId}/ai-hub/agentes/{agente}/autonomia
 *   GET /api/agency/{agencyId}/ai-hub/briefing
 *
 * Un 404 significa «el micro aún no publica este endpoint» y se expone como
 * `notAvailable`, NO como error (misma convención que agent-workspace.ts).
 *
 * Fetch: `agentFetch` (Authorization del agente + reintento ante 401 por
 * token vencido) — ver src/lib/api/agent-fetch.ts.
 */

import { agentFetch } from './agent-fetch'
import { conBackoff } from './fetch-with-backoff'
import type { AgenteId } from './work-item'

// ── Tipos del contrato (§4 — no inventar campos) ────────────────────────────

/** Entrada del feed global de actividad. Agregado determinista, sin PII. */
export interface ActivityItem {
  id: string
  /** ISO-8601. */
  at: string
  agente: string
  tipo: string
  titulo: string
  detalle?: string
  href?: string
}

export interface PilotoActivityResponse {
  items: ActivityItem[]
}

export type PilotoPrioridad = 'alta' | 'media' | 'baja'

/** La única acción declarada por el micro sobre un item de la bandeja. */
/**
 * Un dato que la acción le pide al humano antes de ejecutarse. Espejo de
 * `AccionCampo` en el micro (`src/piloto/bandeja.ts`).
 */
export interface AccionCampo {
  /** Llave con la que el valor entra al cuerpo. */
  id: string
  label: string
  tipo: 'opcion' | 'multiple' | 'texto'
  opciones?: Array<{ valor: string; label: string }>
  requerido?: boolean
  placeholder?: string
  maxLargo?: number
}

export interface InboxAccion {
  label: string
  method: 'POST' | 'PATCH'
  /** Path completo del micro (empieza con /api/...), ya templado. */
  path: string
  /** Cuando viene, se envía VERBATIM como cuerpo. Nunca se inventa uno acá. */
  body?: Record<string, unknown>
  /**
   * Lo que hay que preguntar antes de ejecutar. Ausente ⇒ acción de un clic,
   * igual que siempre. El front NO inventa campos: pinta los que el micro
   * declaró, con los valores que el micro declaró.
   */
  campos?: AccionCampo[]
  /**
   * Advertencia que se muestra antes de ejecutar (efecto fuera del sistema).
   * Si viene —o si hay `campos`—, el botón de la LISTA no ejecuta: abre el
   * cajón, que pregunta. Un solo camino (auditoría del Piloto, hallazgo 9).
   */
  confirmacion?: string
  tono?: 'normal' | 'peligro'
  /** Roles del micro que la pueden ejecutar (los mismos del middleware de su ruta). */
  roles?: string[]
  /**
   * P-9: ¿quien mira la puede ejecutar? Lo calcula el MICRO con el rol del
   * token (`false` ⇒ el micro contestaría 403). Ausente = no se sabe; decide
   * el micro al ejecutar.
   */
  permitida?: boolean
  /** Si no está permitida, por qué, en palabras. */
  porQueNo?: string
}

/** ¿Esta acción pide algo antes de ejecutarse (datos o una advertencia)? */
export function accionPregunta(accion: InboxAccion): boolean {
  return (accion.campos?.length ?? 0) > 0 || Boolean(accion.confirmacion)
}

export interface InboxItem {
  id: string
  fuente: string
  /** Slug LIBRE para el chip (cobranza, pagos, retencion, calidad, … — puede crecer). */
  agente: string
  prioridad: PilotoPrioridad
  titulo: string
  resumen: string
  montoCop?: number
  /** ISO-8601 — desde cuándo espera. */
  desde: string
  href: string
  accion?: InboxAccion
}

export interface PilotoInboxResponse {
  items: InboxItem[]
  /** Cuántas esperan DE VERDAD (≥ items.length: el micro cuenta aparte lo que no cupo). */
  total: number
  porPrioridad: { alta: number; media: number; baja: number }
}

export type AutonomiaModo = 'sombra' | 'copiloto' | 'autonomo'

/** Respuesta del PUT de autonomía (§4). */
export interface PilotoAutonomiaPutResponse {
  agente: string
  modo: AutonomiaModo
}

export interface BriefingNecesitaDeTi {
  titulo: string
  href: string
}

export interface BriefingNumeros {
  pendientes?: number
  altas?: number
  llamadasHoy?: number
  promesasHoy?: number
  /** Plata recuperada por los agentes en el mes corriente (entero COP). */
  recuperadoMesCop?: number
}

/**
 * Briefing del día (contrato §4, ajuste 2026-08-30). El Gerente lo alimenta;
 * el render es DEFENSIVO: todo campo es opcional y lo que no venga con el
 * shape esperado simplemente no se pinta.
 */
export interface PilotoBriefing {
  fecha?: string
  saludo?: string
  resumen?: string[]
  necesitanDeTi?: BriefingNecesitaDeTi[]
  numeros?: BriefingNumeros
  narrativa?: string[]
}

// ── Envelope (misma convención que agent-workspace.ts) ──────────────────────

export interface PilotoFetchResult<T> {
  data: T | null
  /** true cuando el backend devolvió 404 — estado vacío amable, NO error. */
  notAvailable: boolean
}

/**
 * El error de una lectura que no contestó a tiempo. Contiene «timeout» para
 * que `clasificarFallo` lo pinte como «Tardó demasiado en responder», con
 * «Intentar de nuevo» (no como una falla del servidor).
 */
export const ERROR_SIN_RESPUESTA = 'timeout: el Piloto no contestó a tiempo'

async function getJson<T>(
  path: string,
  signal?: AbortSignal,
  /** Tope de espera (ms). Sin tope, una lectura colgada dejaba el esqueleto para siempre. */
  topeMs?: number,
): Promise<PilotoFetchResult<T>> {
  const agentUrl = process.env.NEXT_PUBLIC_AGENT_URL
  if (!agentUrl) throw new Error('not_configured')
  let senal = signal
  let reloj: ReturnType<typeof setTimeout> | undefined
  let seVencio = false
  if (topeMs) {
    const tope = new AbortController()
    reloj = setTimeout(() => {
      seVencio = true
      tope.abort()
    }, topeMs)
    signal?.addEventListener('abort', () => tope.abort(), { once: true })
    senal = tope.signal
  }
  // T-0076: un 429 de `agents_limit` (o el fallo de red que el mismo 429
  // parece cuando NGINX no manda CORS en su página de error) se reintenta
  // con backoff antes de rendirse — ver fetch-with-backoff.ts.
  let res: Response
  try {
    res = await conBackoff(() => agentFetch(`${agentUrl}${path}`, { signal: senal }), senal)
  } catch (err) {
    if (seVencio) throw new Error(ERROR_SIN_RESPUESTA)
    throw err
  } finally {
    if (reloj) clearTimeout(reloj)
  }
  if (res.status === 404) return { data: null, notAvailable: true }
  if (!res.ok) throw new Error(`${res.status}`)
  return { data: (await res.json()) as T, notAvailable: false }
}

// ── Fetchers ────────────────────────────────────────────────────────────────

export function fetchPilotoActivity(
  agencyId: string,
  limit = 50,
  signal?: AbortSignal,
): Promise<PilotoFetchResult<PilotoActivityResponse>> {
  return getJson<PilotoActivityResponse>(
    `/api/agency/${agencyId}/ai-hub/activity?limit=${encodeURIComponent(String(limit))}`,
    signal,
  )
}

export function fetchPilotoInbox(
  agencyId: string,
  signal?: AbortSignal,
): Promise<PilotoFetchResult<PilotoInboxResponse>> {
  return getJson<PilotoInboxResponse>(`/api/agency/${agencyId}/ai-hub/inbox`, signal)
}

// ── Pulso: el tablero vivo (contrato §4, ampliación 2026-08-30) ─────────────

/**
 * Estado general del piloto. Lo calcula el micro, no el front.
 * `desconocido`: no se pudo leer nada — se pinta neutro, nunca «bajo control».
 */
export type PulsoEstado = 'ok' | 'atencion' | 'critico' | 'desconocido'

export type PulsoSeveridad = 'critica' | 'alta' | 'media' | 'info'

/** Algo que está pasando AHORA (una llamada viva, un chat abierto, una espera). */
export interface PulsoEnCurso {
  id: string
  tipo: string
  titulo: string
  detalle?: string
  /** ISO-8601 — desde cuándo está en curso. */
  desde?: string
  href?: string
}

/** Un caso concreto detrás del número de una alerta. Su `id` abre el cajón. */
export interface PulsoCasoRef {
  id: string
  titulo: string
  desde?: string
}

/** Un riesgo detectado por una regla explícita sobre datos reales. */
export interface PulsoAlerta {
  id: string
  severidad: PulsoSeveridad
  titulo: string
  detalle: string
  href?: string
  /**
   * Los casos que sostienen el número, recortados a un tope por el micro.
   * Que no venga NO significa cero: el conteo del título se mide aparte.
   */
  items?: PulsoCasoRef[]
}

export interface PulsoResponse {
  estado: PulsoEstado
  /** Una frase que resume el momento. Determinista; el Gerente la mejora. */
  titular: string
  enCurso: PulsoEnCurso[]
  alertas: PulsoAlerta[]
  hoy: {
    llamadas: number
    conversacionesActivas: number
    decisionesResueltas: number
    contactosPlaneados?: number
  }
  /** Cuánto tardó el micro en medirlo (ms). */
  tardoMs?: number
}

/**
 * Tope de espera del pulso. Medido el 23-09-2026 (auditoría del Piloto,
 * hallazgo 4): entre 4 y 13 s en serie; en paralelo, ~1–2 s. Pasado el tope
 * la tarjeta dice que no contestó y ofrece reintentar, en vez de quedarse gris.
 */
export const TOPE_PULSO_MS = 20_000

export function fetchPilotoPulso(
  agencyId: string,
  signal?: AbortSignal,
): Promise<PilotoFetchResult<PulsoResponse>> {
  return getJson<PulsoResponse>(`/api/agency/${agencyId}/ai-hub/pulso`, signal, TOPE_PULSO_MS)
}

/** El conteo del badge del menú: lee el resumen, no arma la bandeja entera. */
export interface PilotoInboxConteo {
  total: number
  masVieja: string | null
  viejas: number
}

export function fetchPilotoInboxConteo(
  agencyId: string,
  signal?: AbortSignal,
): Promise<PilotoFetchResult<PilotoInboxConteo>> {
  return getJson<PilotoInboxConteo>(`/api/agency/${agencyId}/ai-hub/inbox/conteo`, signal)
}

// ── Preparación: ¿esta inmobiliaria puede operar sola? ─────────────────────

export type EstadoRequisito = 'ok' | 'falta' | 'no_aplica'

export interface PreparacionRequisito {
  id: string
  titulo: string
  estado: EstadoRequisito
  /** Qué se midió y qué salió. Concreto, con números. */
  detalle: string
  bloqueante: boolean
  /** Sólo cuando falta y la solución NO es código. */
  comoSeArregla?: string
}

export interface PreparacionResponse {
  /** True sólo si ningún requisito bloqueante está en falta. */
  listo: boolean
  requisitos: PreparacionRequisito[]
}

export function fetchPilotoPreparacion(
  agencyId: string,
  signal?: AbortSignal,
): Promise<PilotoFetchResult<PreparacionResponse>> {
  return getJson<PreparacionResponse>(`/api/agency/${agencyId}/ai-hub/preparacion`, signal)
}

// ── Detalle de un ítem: lo que alimenta los cajones ────────────────────────

/** Una fila «label: valor» de un bloque de contexto. */
export interface DetalleFila {
  label: string
  valor: string
  /** El valor que manda en el bloque — el front lo resalta. */
  enfasis?: boolean
}

export interface DetalleGrupo {
  titulo: string
  filas: DetalleFila[]
}

/** Un hito de la línea de tiempo. Derivado por el micro, no una tabla. */
export interface DetalleHito {
  at: string
  titulo: string
  detalle?: string
}

/** Un enlace a la pantalla propia del caso, con el porqué cuando lo hay. */
export interface DetalleEnlace {
  label: string
  href: string
  /** Por qué esto NO se resuelve desde el cajón. */
  razon?: string
}

export interface PilotoDetalle {
  id: string
  fuente: string
  agente: string
  titulo: string
  subtitulo?: string
  prioridad?: PilotoPrioridad
  desde?: string
  montoCop?: number
  contexto: DetalleGrupo[]
  traza: DetalleHito[]
  /** Solo las que se ejecutan con un cuerpo fijo. Se envían VERBATIM. */
  acciones: InboxAccion[]
  enlaces: DetalleEnlace[]
  nota?: string
}

/**
 * El detalle de CUALQUIER ítem del piloto. Acepta los ids con prefijo que ya
 * emiten la bandeja (`esc:` `sin:` …), el feed (`call:` `prom:` …) y el pulso
 * (`venc:`), así que el llamador manda el id que ya tiene en la mano.
 */
export function fetchPilotoDetalle(
  agencyId: string,
  itemId: string,
  signal?: AbortSignal,
): Promise<PilotoFetchResult<PilotoDetalle>> {
  return getJson<PilotoDetalle>(
    `/api/agency/${agencyId}/ai-hub/detalle/${encodeURIComponent(itemId)}`,
    signal,
  )
}

export function fetchPilotoBriefing(
  agencyId: string,
  signal?: AbortSignal,
): Promise<PilotoFetchResult<PilotoBriefing>> {
  return getJson<PilotoBriefing>(`/api/agency/${agencyId}/ai-hub/briefing`, signal)
}

/**
 * PUT del modo de autonomía. El GET ya existe (agent-workspace.ts →
 * fetchAgentAutonomia); acá va solo la escritura nueva del contrato.
 * Permiso: admin de la agencia — el caller decide si dibuja el control.
 */
export async function putPilotoAutonomia(
  agencyId: string,
  // `string`: el endpoint acepta el roster del panel Y los agentes gobernados
  // por agencia (2026-08-31); el micro valida — acá no se duplica el roster.
  agente: string,
  modo: AutonomiaModo,
): Promise<{ ok: boolean; data?: PilotoAutonomiaPutResponse; error?: string }> {
  const agentUrl = process.env.NEXT_PUBLIC_AGENT_URL
  if (!agentUrl) return { ok: false, error: 'not_configured' }
  try {
    const res = await agentFetch(
      `${agentUrl}/api/agency/${agencyId}/ai-hub/agentes/${agente}/autonomia`,
      {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ modo }),
      },
    )
    if (!res.ok) {
      const errBody = (await res.json().catch(() => ({}))) as { error?: string }
      return { ok: false, error: errBody.error ?? `${res.status}` }
    }
    return { ok: true, data: (await res.json()) as PilotoAutonomiaPutResponse }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'put_failed' }
  }
}

// ── Gobierno por inmobiliaria (2026-08-31) ─────────────────────────────────

export interface GobiernoItem {
  agente: string
  corre: boolean
  origen: 'heredado' | 'elegido'
  disponibleGlobal: boolean
}

export interface PilotoGobiernoResponse {
  agentes: GobiernoItem[]
  llavesFinas: string[]
}

/** Qué agentes corren para esta inmobiliaria (la lista `agentes_habilitados`). */
export async function fetchPilotoGobierno(
  agencyId: string,
  signal?: AbortSignal,
): Promise<{ ok: boolean; data?: PilotoGobiernoResponse; error?: string }> {
  const agentUrl = process.env.NEXT_PUBLIC_AGENT_URL
  if (!agentUrl) return { ok: false, error: 'not_configured' }
  try {
    const res = await agentFetch(`${agentUrl}/api/agency/${agencyId}/ai-hub/gobierno`, { signal })
    if (!res.ok) return { ok: false, error: `${res.status}` }
    return { ok: true, data: (await res.json()) as PilotoGobiernoResponse }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'fetch_failed' }
  }
}

/** Enciende o apaga un agente para esta inmobiliaria. Solo OWNER/ADMIN. */
export async function putPilotoGobierno(
  agencyId: string,
  agente: string,
  habilitado: boolean,
): Promise<{ ok: boolean; data?: PilotoGobiernoResponse; error?: string }> {
  const agentUrl = process.env.NEXT_PUBLIC_AGENT_URL
  if (!agentUrl) return { ok: false, error: 'not_configured' }
  try {
    const res = await agentFetch(
      `${agentUrl}/api/agency/${agencyId}/ai-hub/gobierno/${agente}`,
      {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ habilitado }),
      },
    )
    if (!res.ok) {
      const errBody = (await res.json().catch(() => ({}))) as { error?: string }
      return { ok: false, error: errBody.error ?? `${res.status}` }
    }
    return { ok: true, data: (await res.json()) as PilotoGobiernoResponse }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'put_failed' }
  }
}

/**
 * Ejecuta la `accion` declarada por el micro en un item de la bandeja —
 * método + path + body (si viene) son del backend, VERBATIM; acá nunca se
 * inventa un cuerpo (regla: cero botones muertos ⇒ solo se dibuja el botón
 * cuando el item TRAE `accion`).
 */
export async function runInboxAccion(
  accion: InboxAccion,
  /**
   * Lo que el humano llenó en el formulario del cajón. Se MEZCLA sobre
   * `accion.body` (que trae los valores fijos, como `confirmation:'yes'`);
   * si no hay campos, esto va vacío y el comportamiento es el de siempre.
   */
  valores?: Record<string, unknown>,
): Promise<{ ok: boolean; error?: string; mensaje?: string; programadaPara?: string }> {
  const agentUrl = process.env.NEXT_PUBLIC_AGENT_URL
  if (!agentUrl) return { ok: false, error: 'not_configured' }
  const hayValores = valores !== undefined && Object.keys(valores).length > 0
  const cuerpo =
    accion.body !== undefined || hayValores
      ? { ...(accion.body ?? {}), ...(valores ?? {}) }
      : undefined
  try {
    const res = await agentFetch(`${agentUrl}${accion.path}`, {
      method: accion.method,
      ...(cuerpo !== undefined
        ? {
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify(cuerpo),
          }
        : {}),
    })
    if (!res.ok) {
      const errBody = (await res.json().catch(() => ({}))) as { error?: string }
      return { ok: false, error: errBody.error ?? `${res.status}` }
    }
    // Lo que PASÓ, dicho por el micro («programé la llamada para mañana a las
    // 8:00»). Sin esto el toast decía «Aprobar y llamar · listo» aunque la
    // llamada no hubiera salido (auditoría del Piloto, hallazgo 2).
    const cuerpoOk = (await res.json().catch(() => ({}))) as { mensaje?: unknown; programadaPara?: unknown }
    return {
      ok: true,
      ...(typeof cuerpoOk.mensaje === 'string' ? { mensaje: cuerpoOk.mensaje } : {}),
      ...(typeof cuerpoOk.programadaPara === 'string' ? { programadaPara: cuerpoOk.programadaPara } : {}),
    }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'accion_failed' }
  }
}

// ── La flota como UNA perilla (píldora del header, 2026-09-02) ──────────────

/**
 * El modo de la flota. En pantalla: Manual (`sombra`) / Copiloto / Automático
 * (`autonomo`) — P-1. `mixto` ya no lo manda el micro (23-09-2026); queda en
 * el tipo sólo para leer una respuesta vieja sin romperse.
 */
export type ModoDeLaFlota = AutonomiaModo | 'mixto'

export interface VallaDeLaFlota {
  id: string
  label: string
  value: string
  estado: string
}

export interface AgenteDeLaFlota {
  agente: string
  modo: AutonomiaModo
  origen: 'piloto' | 'politica' | 'default'
  /** Corre para esta inmobiliaria: bandera del servidor Y lista de la agencia. */
  corre: boolean
  porQueNoCorre?: string | null
  /** ¿El modo cambia lo que el agente hace? `false` = «todavía no actúa solo». */
  gobierna?: boolean
  /** Corre y el modo lo gobierna. */
  actua?: boolean
  /** Qué hace HOY el modo para este agente (la misma frase del catálogo). */
  efectoReal?: string
  valla?: VallaDeLaFlota[]
  t323?: boolean
}

export interface PilotoFlotaResponse {
  /** `PILOTO_ENABLED` del micro: apagado, la flota no corre aunque tenga modo. */
  activo: boolean
  /** El modo de la mayoría de los agentes que actúan (empate → el más cauto). */
  modo: ModoDeLaFlota
  /** Los que actúan con OTRO modo: la píldora los nombra al abrirse. */
  distintos?: string[]
  /** Cuántos agentes actúan de verdad con su modo. */
  actuan?: number
  agentes: AgenteDeLaFlota[]
  resumen: Record<AutonomiaModo, number>
  enVivo: { llamadas: number; conciliando: number; esperando: number }
  tomadoAt: string
}

export function fetchPilotoFlota(
  agencyId: string,
  signal?: AbortSignal,
): Promise<PilotoFetchResult<PilotoFlotaResponse>> {
  return getJson<PilotoFlotaResponse>(`/api/agency/${agencyId}/ai-hub/autonomia`, signal)
}

export interface PilotoFlotaPutResponse extends PilotoFlotaResponse {
  cambiados: string[]
  fallidos: Array<{ agente: string; error: string }>
}

/** Mueve la flota ENTERA a un modo. Solo OWNER/ADMIN (el micro devuelve 403 al resto). */
export async function putPilotoFlota(
  agencyId: string,
  modo: AutonomiaModo,
): Promise<{ ok: boolean; data?: PilotoFlotaPutResponse; error?: string }> {
  const agentUrl = process.env.NEXT_PUBLIC_AGENT_URL
  if (!agentUrl) return { ok: false, error: 'not_configured' }
  try {
    const res = await agentFetch(`${agentUrl}/api/agency/${agencyId}/ai-hub/autonomia`, {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ modo }),
    })
    if (!res.ok) {
      const errBody = (await res.json().catch(() => ({}))) as { error?: string }
      return { ok: false, error: errBody.error ?? `${res.status}` }
    }
    return { ok: true, data: (await res.json()) as PilotoFlotaPutResponse }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'put_failed' }
  }
}

// ── Procesos: lo que el Piloto hizo, contado (process view, 2026-09-02) ─────

export type TipoDeProceso = 'deposito' | 'llamada' | 'whatsapp'
export type EstadoDeProceso = 'en_curso' | 'esperando' | 'hecho' | 'sin_resultado'
export type EstadoDelPaso = 'hecho' | 'en_curso' | 'pendiente' | 'fallo'

export interface PasoDeProceso {
  /** ISO Bogotá; `null` cuando el paso todavía no ocurrió. */
  at: string | null
  titulo: string
  detalle?: string
  estado: EstadoDelPaso
}

export interface MensajeDeProceso {
  at: string
  de: 'yo' | 'ellos'
  texto: string
}

export interface Proceso {
  /** Id del cajón (`mov:` · `call:` · `wa:`). */
  id: string
  tipo: TipoDeProceso
  agente: 'conciliacion' | 'cobranza'
  estado: EstadoDeProceso
  /** En primera persona: «Detecté un depósito de $2.400.000». */
  titulo: string
  resumen: string | null
  resultado: string | null
  quien: { nombre: string; inmueble: string | null } | null
  montoCop: number | null
  inicioAt: string
  ultimoAt: string
  pasos: PasoDeProceso[]
  mensajes?: MensajeDeProceso[]
  enVivo: boolean
  enlace: { label: string; href: string } | null
}

export type SaludDeFuente = 'ok' | 'sin_back' | 'error'

export interface PilotoProcesosResponse {
  procesos: Proceso[]
  /** Cuántos hay EN TOTAL por tipo (no solo los de esta respuesta). */
  totales: Record<TipoDeProceso, number>
  enVivo: number
  fuentes: Record<TipoDeProceso, SaludDeFuente>
  tomadoAt: string
}

export function fetchPilotoProcesos(
  agencyId: string,
  opciones: { tipo?: TipoDeProceso | 'todos'; limite?: number } = {},
  signal?: AbortSignal,
): Promise<PilotoFetchResult<PilotoProcesosResponse>> {
  const q = new URLSearchParams()
  if (opciones.tipo && opciones.tipo !== 'todos') q.set('tipo', opciones.tipo)
  if (opciones.limite) q.set('limite', String(opciones.limite))
  const qs = q.toString()
  return getJson<PilotoProcesosResponse>(
    `/api/agency/${agencyId}/ai-hub/procesos${qs ? `?${qs}` : ''}`,
    signal,
  )
}

// ── Catálogo: TODOS los procesos de la plataforma (2026-09-04) ─────────────

/**
 * El complemento de `Proceso`: aquél es una INSTANCIA (este depósito, esta
 * llamada), éste es el PROCESO — qué existe, quién lo corre, en qué modo está
 * y cuándo dejó su última huella. Lo pidió Nico mirando la píldora del
 * header: «que muestre todos los procesos de todo lo que pasa en la
 * plataforma».
 */
export type AreaDeProceso = 'dinero' | 'operacion' | 'captacion' | 'plataforma'

export interface QuienCorre {
  tipo: 'agente' | 'sistema'
  /** Clave del agente en la flota; `null` cuando lo corre el sistema. */
  agente: string | null
  etiqueta: string
}

export interface UltimaSenal {
  at: string
  /** «38 cobros generados» — lo que se contó, no una promesa de corrida. */
  que: string
}

export interface ProcesoDelCatalogo {
  clave: string
  /** El nombre técnico: id de la función, clase del cron o evento. */
  id: string
  nombre: string
  queHace: string
  area: AreaDeProceso
  quien: QuienCorre
  /** Autonomía efectiva del agente dueño; `null` si lo corre el sistema. */
  modo: AutonomiaModo | null
  /**
   * ¿Ese modo cambia de verdad lo que el proceso hace? Hoy, en casi toda la
   * flota, NO: queda registrado como la decisión de la inmobiliaria pero la
   * ejecución no lo consulta. La tabla lo dice en vez de fingir un control.
   */
  modoGobierna: boolean
  /** Qué hace HOY el modo para el agente dueño (la misma frase de la píldora). */
  efectoDelModo?: string | null
  corre: boolean
  porQueNoCorre: string | null
  disparador: string
  /** Tabla o acción de auditoría de donde sale `ultima`. */
  fuente: string | null
  ultima: UltimaSenal | null
  /** Por qué `ultima` es `null`: nunca se inventa una fecha. */
  sinDato: string | null
  enlace: { label: string; href: string } | null
}

export interface PilotoCatalogoResponse {
  procesos: ProcesoDelCatalogo[]
  totales: { total: number; corriendo: number; conSenal: number; sinDato: number }
  porArea: Record<AreaDeProceso, number>
  activo: boolean
  tomadoAt: string
}

export function fetchPilotoCatalogo(
  agencyId: string,
  signal?: AbortSignal,
): Promise<PilotoFetchResult<PilotoCatalogoResponse>> {
  return getJson<PilotoCatalogoResponse>(`/api/agency/${agencyId}/ai-hub/catalogo`, signal)
}
