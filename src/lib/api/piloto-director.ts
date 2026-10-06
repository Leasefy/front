'use client'

/**
 * piloto-director.ts — el cliente del DIRECTOR del Piloto (fase 1, 28-09-2026).
 *
 * Espejo escrito a mano de `director-api-front.md` (lo fijó el integrador el
 * 28-09). Las rutas las construye el micro EN PARALELO, así que acá se
 * codifica contra el contrato, no contra un servidor vivo:
 *
 *   GET  /api/agency/{id}/piloto/director/hoy[?fecha=YYYY-MM-DD]
 *   POST /api/agency/{id}/piloto/director/replanear                 (ADMIN)
 *   GET  /api/agency/{id}/piloto/director/metas
 *   POST /api/agency/{id}/piloto/director/metas/{metaId}/{aceptar|ajustar|pausar}  (ADMIN)
 *   GET  /api/agency/{id}/piloto/director/gasto[?mes=YYYY-MM]
 *   GET  /api/agency/{id}/piloto/director/experimento
 *   PUT  /api/agency/{id}/piloto/director/experimento               (ADMIN)
 *
 * Convenciones del resto del Piloto (`piloto.ts`): un 404 es «el micro no
 * publica la ruta» (`notAvailable`), no un error; un fallo tira el status
 * como mensaje para que `clasificarFallo` lo lea.
 *
 * 🔴 `encendido: false` NO es un error: la llave `PILOTO_DIRECTOR` no tiene a
 * esta inmobiliaria y el micro responde 200 con el resto vacío. La pantalla lo
 * dice con una frase y sigue.
 *
 * Las respuestas se NORMALIZAN al llegar: lo que no venga se lee como lista
 * vacía o `null`. El render no tiene que defenderse campo por campo, y un
 * micro que todavía no manda un campo nuevo no tumba la tarjeta.
 */

import { agentFetch } from './agent-fetch'
import {
  getJson,
  type AutonomiaModo,
  type DirectorDeLaAccion,
  type EvidenciaDelDirector,
  type MetaDelDirectorRef,
  type PilotoFetchResult,
} from './piloto'

export type { DirectorDeLaAccion, EvidenciaDelDirector, MetaDelDirectorRef }

// ── Tipos del contrato ──────────────────────────────────────────────────────

export type TipoDeCiclo = 'dia' | 'replan'
export type EstadoDelCiclo = 'en_curso' | 'listo' | 'fallido' | 'sin_modelo'

export interface CicloDelDirector {
  id: string
  tipo: TipoDeCiclo
  estado: EstadoDelCiclo
  /** ISO completo. */
  inicio: string | null
  fin: string | null
  modelo: string | null
  esfuerzo: string | null
  /** Lo que costó el plan, en PESOS (ninguna pantalla con dólares, 04-10-2026). */
  costoCop: number | null
  /** Con `sin_modelo`: por qué planearon las reglas («tope de IA al 92 %»…). */
  sinModeloPorque: string | null
}

export interface EntidadDelDirector {
  tipo: string
  id: string
  /** Lo pone el micro al responder; el modelo nunca lo ve (I-5). */
  nombre: string | null
  enlace: string | null
}

export type EstadoDeLaOrden =
  | 'en_bandeja'
  | 'aprobada'
  | 'ejecutada'
  | 'descartada'
  | 'fallida'
  | 'deshecha'
  | 'vencida'
  | 'la_hace_el_agente'

export interface OrdenDelDirector {
  ordenId: string
  agente: string
  agenteNombre: string
  proceso: string
  procesoNombre: string
  entidad: EntidadDelDirector | null
  cuando: string | null
  /**
   * MANDO-DATOS (05-10-2026): el mismo «cuándo» como instante ISO (`null` =
   * «hoy» o «ahora», sin hora fija). Un micro anterior no lo manda.
   */
  cuandoIso?: string | null
  prioridad: number
  porQue: string
  evidencia: EvidenciaDelDirector[]
  meta: MetaDelDirectorRef | null
  alternativaDescartada: string | null
  conflictoResuelto: string | null
  estado: EstadoDeLaOrden | string
  /** La fila de la Bandeja: con ella se abre el cajón que ya existe (`acc:<id>`). */
  accionId: string | null
  motivoDeLaPerilla: string | null
}

export type EstadoDeLaRetencion = 'en_bandeja' | 'activa' | 'vencida' | 'descartada'

export interface RetencionDelDirector {
  retencionId: string
  entidad: EntidadDelDirector | null
  agentes: string[]
  hasta: string | null
  porQue: string
  evidencia: EvidenciaDelDirector[]
  estado: EstadoDeLaRetencion | string
  accionId: string | null
}

export interface SugerenciaDelDirector {
  agente: string
  agenteNombre: string
  que: string
  porQue: string
}

export interface PropuestaDeAutonomia {
  agente: string
  agenteNombre: string
  de: AutonomiaModo | string
  a: AutonomiaModo | string
  evidencia: EvidenciaDelDirector[]
}

export interface AlertaDelDirector {
  nivel: string
  que: string
  porQue: string
}

/** Lo que el modelo quiso y la validación de código no dejó. */
export interface RechazadaDelDirector {
  ordenId: string
  proceso: string
  /** No está en el contrato de hoy; si el micro lo agrega, se usa. */
  procesoNombre: string | null
  entidad: { tipo: string; id: string; nombre: string | null } | null
  motivo: string
}

export interface PrioridadDelDirector {
  meta: MetaDelDirectorRef | null
  porQue: string
}

export interface DirectorHoy {
  encendido: boolean
  /**
   * ¿El Piloto automático está activo para la inmobiliaria? Sin él el director
   * no planea ni ordena (04-10-2026). Un micro que no lo manda cuenta como sí:
   * así era antes.
   */
  pilotoActivo: boolean
  fecha: string | null
  ciclo: CicloDelDirector | null
  resumen: string | null
  /** El resumen del pensamiento del modelo, tal cual (decisión 12). */
  pensamiento: string | null
  prioridades: PrioridadDelDirector[]
  ordenes: OrdenDelDirector[]
  retenciones: RetencionDelDirector[]
  sugerencias: SugerenciaDelDirector[]
  propuestasDeAutonomia: PropuestaDeAutonomia[]
  alertas: AlertaDelDirector[]
  rechazadas: RechazadaDelDirector[]
  grupoDeControl: { activo: boolean; omitidas: number }
}

/** `pesos`: la meta de lo recuperado (la sexta, Nico 05-10-2026). */
export type UnidadDeMeta = 'porcentaje' | 'dias' | 'horas' | 'pesos'
export type EstadoDeMeta = 'propuesta' | 'activa' | 'pausada' | 'cumplida' | 'vencida'
export type AccionSobreMeta = 'aceptar' | 'ajustar' | 'pausar'

export interface PuntoDeSerie {
  fecha: string
  valor: number
}

export interface HitoDeMeta {
  en: string
  quien: string
  que: string
  objetivo: number | null
}

export interface MetaDelDirector {
  id: string
  metrica: string
  nombre: string
  estado: EstadoDeMeta | string
  direccion: 'subir' | 'bajar' | string
  unidad: UnidadDeMeta | string
  lineaBase: number | null
  objetivo: number | null
  actual: number | null
  desde: string | null
  hasta: string | null
  /** `horas_ahorradas` va SIEMPRE estimada: lo fuerza `normalizarMeta`. */
  estimada: boolean
  porQue: string | null
  serie: PuntoDeSerie[]
  historial: HitoDeMeta[]
}

export interface DirectorMetas {
  encendido: boolean
  metas: MetaDelDirector[]
  /**
   * Las métricas del catálogo que todavía no tienen meta (no hay historia para
   * proponerla), con su nombre. Un micro anterior no lo manda: vacío.
   */
  sinMeta?: Array<{ metrica: string; nombre: string }>
}

/** El informe de la semana a la gerencia (#59): lo que hizo el Piloto, metas y gasto en pesos. */
export interface DirectorSemana {
  encendido: boolean
  desde: string | null
  hasta: string | null
  piloto: { detectadas: number; hechasSolas: number; hechasConClic: number; esperanClic: number; fallidas: number } | null
  director: {
    planes: number
    conLaIa: number
    conReglas: number
    fallidos: number
    ordenes: number
    aprobadas: number
    hechas: number
    descartadas: number
    enBandeja: number
    costoCop: number
  } | null
  metas: Array<{ metrica: string; nombre: string; vaBien: boolean | null; frase: string }>
  gasto: { mes: string; gastadoCop: number; topeCop: number } | null
  /** Las frases del informe, en orden de lectura. */
  resumen: string[]
}

export type TramoDelTope = 'pequena' | 'mediana' | 'grande'
export type EscalonDelGasto = 'normal' | 'ahorro' | 'sinModelo'

export interface GastoPorComponente {
  componente: string
  cop: number
  cuentaParaTope: boolean
}

export interface DirectorGasto {
  encendido: boolean
  mes: string | null
  /** En PESOS: el micro convierte el tope y el gasto (ninguna pantalla con dólares, 04-10-2026). */
  topeCop: number | null
  tramo: TramoDelTope | string | null
  gastadoCop: number
  /** Lo que no cuenta para el tope (cobranza: se cobra aparte). */
  excluidoCop: number
  escalon: EscalonDelGasto | string | null
  porComponente: GastoPorComponente[]
  porDia: Array<{ fecha: string; cop: number }>
}

export interface DirectorExperimento {
  encendido: boolean
  activo: boolean
  porcentajeControl: number
  desde: string | null
  entidadesEnControl: number
}

// ── Normalizar: lo que no viene se lee vacío ────────────────────────────────

type Objeto = Record<string, unknown>

const esObjeto = (v: unknown): v is Objeto => typeof v === 'object' && v !== null && !Array.isArray(v)
const texto = (v: unknown): string | null => (typeof v === 'string' && v.trim() !== '' ? v : null)
const numero = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) ? v : null)
const lista = (v: unknown): unknown[] => (Array.isArray(v) ? v : [])

function normalizarMetaRef(v: unknown): MetaDelDirectorRef | null {
  if (!esObjeto(v)) return null
  const id = texto(v.id)
  if (!id) return null
  return { id, metrica: texto(v.metrica) ?? '', nombre: texto(v.nombre) ?? texto(v.metrica) ?? '' }
}

export function normalizarEvidencias(v: unknown): EvidenciaDelDirector[] {
  return lista(v)
    .filter(esObjeto)
    .map((e) => ({
      tipo: texto(e.tipo) ?? '',
      ref: texto(e.ref) ?? '',
      texto: texto(e.texto) ?? '',
      enlace: texto(e.enlace),
    }))
    .filter((e) => e.texto !== '')
}

function normalizarEntidad(v: unknown): EntidadDelDirector | null {
  if (!esObjeto(v)) return null
  return {
    tipo: texto(v.tipo) ?? '',
    id: texto(v.id) ?? '',
    nombre: texto(v.nombre),
    enlace: texto(v.enlace),
  }
}

/** El `director` de un ítem de la Bandeja o del cajón. `null` si no viene. */
export function normalizarDirectorDeLaAccion(v: unknown): DirectorDeLaAccion | null {
  if (!esObjeto(v)) return null
  const porQue = texto(v.porQue)
  if (!porQue) return null
  return {
    prioridad: numero(v.prioridad) ?? 0,
    porQue,
    evidencia: normalizarEvidencias(v.evidencia),
    meta: normalizarMetaRef(v.meta),
    alternativaDescartada: texto(v.alternativaDescartada),
  }
}

function normalizarCiclo(v: unknown): CicloDelDirector | null {
  if (!esObjeto(v)) return null
  return {
    id: texto(v.id) ?? '',
    tipo: v.tipo === 'replan' ? 'replan' : 'dia',
    estado: (['en_curso', 'listo', 'fallido', 'sin_modelo'] as const).includes(v.estado as EstadoDelCiclo)
      ? (v.estado as EstadoDelCiclo)
      : 'listo',
    inicio: texto(v.inicio),
    fin: texto(v.fin),
    modelo: texto(v.modelo),
    esfuerzo: texto(v.esfuerzo),
    costoCop: numero(v.costoCop),
    sinModeloPorque: texto(v.sinModeloPorque),
  }
}

export function normalizarHoy(raw: unknown): DirectorHoy {
  const r: Objeto = esObjeto(raw) ? raw : {}
  const control = esObjeto(r.grupoDeControl) ? r.grupoDeControl : {}
  return {
    encendido: r.encendido === true,
    pilotoActivo: r.pilotoActivo !== false,
    fecha: texto(r.fecha),
    ciclo: normalizarCiclo(r.ciclo),
    resumen: texto(r.resumen),
    pensamiento: texto(r.pensamiento),
    prioridades: lista(r.prioridades)
      .filter(esObjeto)
      .map((p) => ({ meta: normalizarMetaRef(p.meta), porQue: texto(p.porQue) ?? '' }))
      .filter((p) => p.porQue !== '' || p.meta !== null),
    ordenes: lista(r.ordenes)
      .filter(esObjeto)
      .map((o) => ({
        ordenId: texto(o.ordenId) ?? '',
        agente: texto(o.agente) ?? '',
        agenteNombre: texto(o.agenteNombre) ?? texto(o.agente) ?? '',
        proceso: texto(o.proceso) ?? '',
        procesoNombre: texto(o.procesoNombre) ?? '',
        entidad: normalizarEntidad(o.entidad),
        cuando: texto(o.cuando),
        cuandoIso: texto(o.cuandoIso),
        prioridad: numero(o.prioridad) ?? 0,
        porQue: texto(o.porQue) ?? '',
        evidencia: normalizarEvidencias(o.evidencia),
        meta: normalizarMetaRef(o.meta),
        alternativaDescartada: texto(o.alternativaDescartada),
        conflictoResuelto: texto(o.conflictoResuelto),
        estado: texto(o.estado) ?? 'en_bandeja',
        accionId: texto(o.accionId),
        motivoDeLaPerilla: texto(o.motivoDeLaPerilla),
      })),
    retenciones: lista(r.retenciones)
      .filter(esObjeto)
      .map((x) => ({
        retencionId: texto(x.retencionId) ?? '',
        entidad: normalizarEntidad(x.entidad),
        agentes: lista(x.agentes).filter((a): a is string => typeof a === 'string'),
        hasta: texto(x.hasta),
        porQue: texto(x.porQue) ?? '',
        evidencia: normalizarEvidencias(x.evidencia),
        estado: texto(x.estado) ?? 'en_bandeja',
        accionId: texto(x.accionId),
      })),
    sugerencias: lista(r.sugerencias)
      .filter(esObjeto)
      .map((s) => ({
        agente: texto(s.agente) ?? '',
        agenteNombre: texto(s.agenteNombre) ?? texto(s.agente) ?? '',
        que: texto(s.que) ?? '',
        porQue: texto(s.porQue) ?? '',
      }))
      .filter((s) => s.que !== ''),
    propuestasDeAutonomia: lista(r.propuestasDeAutonomia)
      .filter(esObjeto)
      .map((p) => ({
        agente: texto(p.agente) ?? '',
        agenteNombre: texto(p.agenteNombre) ?? texto(p.agente) ?? '',
        de: texto(p.de) ?? '',
        a: texto(p.a) ?? '',
        evidencia: normalizarEvidencias(p.evidencia),
      })),
    alertas: lista(r.alertas)
      .filter(esObjeto)
      .map((a) => ({ nivel: texto(a.nivel) ?? 'info', que: texto(a.que) ?? '', porQue: texto(a.porQue) ?? '' }))
      .filter((a) => a.que !== ''),
    rechazadas: lista(r.rechazadas)
      .filter(esObjeto)
      .map((x) => {
        const e = esObjeto(x.entidad) ? x.entidad : null
        return {
          ordenId: texto(x.ordenId) ?? '',
          proceso: texto(x.proceso) ?? '',
          procesoNombre: texto(x.procesoNombre),
          entidad: e ? { tipo: texto(e.tipo) ?? '', id: texto(e.id) ?? '', nombre: texto(e.nombre) } : null,
          motivo: texto(x.motivo) ?? '',
        }
      }),
    grupoDeControl: { activo: control.activo === true, omitidas: numero(control.omitidas) ?? 0 },
  }
}

export function normalizarMeta(raw: unknown): MetaDelDirector | null {
  if (!esObjeto(raw)) return null
  const id = texto(raw.id)
  if (!id) return null
  const metrica = texto(raw.metrica) ?? ''
  return {
    id,
    metrica,
    nombre: texto(raw.nombre) ?? metrica,
    estado: texto(raw.estado) ?? 'propuesta',
    direccion: texto(raw.direccion) ?? 'subir',
    unidad: texto(raw.unidad) ?? 'porcentaje',
    lineaBase: numero(raw.lineaBase),
    objetivo: numero(raw.objetivo),
    actual: numero(raw.actual),
    desde: texto(raw.desde),
    hasta: texto(raw.hasta),
    // Decisión 11: las horas ahorradas son una estimación; la pantalla lo dice
    // SIEMPRE, aunque un micro se olvide de mandar la bandera.
    estimada: raw.estimada === true || metrica === 'horas_ahorradas',
    porQue: texto(raw.porQue),
    serie: lista(raw.serie)
      .filter(esObjeto)
      .map((p) => ({ fecha: texto(p.fecha) ?? '', valor: numero(p.valor) }))
      .filter((p): p is PuntoDeSerie => p.valor !== null),
    historial: lista(raw.historial)
      .filter(esObjeto)
      .map((h) => ({
        en: texto(h.en) ?? '',
        quien: texto(h.quien) ?? '',
        que: texto(h.que) ?? '',
        objetivo: numero(h.objetivo),
      })),
  }
}

export function normalizarMetas(raw: unknown): DirectorMetas {
  const r: Objeto = esObjeto(raw) ? raw : {}
  return {
    encendido: r.encendido === true,
    metas: lista(r.metas)
      .map(normalizarMeta)
      .filter((m): m is MetaDelDirector => m !== null),
    sinMeta: lista(r.sinMeta)
      .filter(esObjeto)
      .map((m) => ({ metrica: texto(m.metrica) ?? '', nombre: texto(m.nombre) ?? '' }))
      .filter((m) => m.metrica !== '' && m.nombre !== ''),
  }
}

const entero = (v: unknown): number => numero(v) ?? 0

export function normalizarSemana(raw: unknown): DirectorSemana {
  const r: Objeto = esObjeto(raw) ? raw : {}
  const p = esObjeto(r.piloto) ? r.piloto : null
  const d = esObjeto(r.director) ? r.director : null
  const g = esObjeto(r.gasto) ? r.gasto : null
  return {
    encendido: r.encendido === true,
    desde: texto(r.desde),
    hasta: texto(r.hasta),
    piloto: p
      ? { detectadas: entero(p.detectadas), hechasSolas: entero(p.hechasSolas), hechasConClic: entero(p.hechasConClic), esperanClic: entero(p.esperanClic), fallidas: entero(p.fallidas) }
      : null,
    director: d
      ? {
          planes: entero(d.planes),
          conLaIa: entero(d.conLaIa),
          conReglas: entero(d.conReglas),
          fallidos: entero(d.fallidos),
          ordenes: entero(d.ordenes),
          aprobadas: entero(d.aprobadas),
          hechas: entero(d.hechas),
          descartadas: entero(d.descartadas),
          enBandeja: entero(d.enBandeja),
          costoCop: entero(d.costoCop),
        }
      : null,
    metas: lista(r.metas)
      .filter(esObjeto)
      .map((m) => ({
        metrica: texto(m.metrica) ?? '',
        nombre: texto(m.nombre) ?? '',
        vaBien: typeof m.vaBien === 'boolean' ? m.vaBien : null,
        frase: texto(m.frase) ?? '',
      }))
      .filter((m) => m.frase !== ''),
    gasto: g ? { mes: texto(g.mes) ?? '', gastadoCop: entero(g.gastadoCop), topeCop: entero(g.topeCop) } : null,
    resumen: lista(r.resumen).map(texto).filter((x): x is string => x !== null),
  }
}

export function normalizarGasto(raw: unknown): DirectorGasto {
  const r: Objeto = esObjeto(raw) ? raw : {}
  return {
    encendido: r.encendido === true,
    mes: texto(r.mes),
    topeCop: numero(r.topeCop),
    tramo: texto(r.tramo),
    gastadoCop: numero(r.gastadoCop) ?? 0,
    excluidoCop: numero(r.excluidoCop) ?? 0,
    escalon: texto(r.escalon),
    porComponente: lista(r.porComponente)
      .filter(esObjeto)
      .map((c) => ({
        componente: texto(c.componente) ?? '',
        cop: numero(c.cop) ?? 0,
        cuentaParaTope: c.cuentaParaTope !== false,
      })),
    porDia: lista(r.porDia)
      .filter(esObjeto)
      .map((d) => ({ fecha: texto(d.fecha) ?? '', cop: numero(d.cop) ?? 0 })),
  }
}

export function normalizarExperimento(raw: unknown): DirectorExperimento {
  const r: Objeto = esObjeto(raw) ? raw : {}
  return {
    encendido: r.encendido === true,
    activo: r.activo === true,
    porcentajeControl: numero(r.porcentajeControl) ?? 10,
    desde: texto(r.desde),
    entidadesEnControl: numero(r.entidadesEnControl) ?? 0,
  }
}

// ── Lecturas ────────────────────────────────────────────────────────────────

const base = (agencyId: string) => `/api/agency/${agencyId}/piloto/director`

/** Tope de espera de las lecturas: sin tope, una lectura colgada deja el esqueleto para siempre. */
export const TOPE_DIRECTOR_MS = 15_000

async function leer<T>(
  path: string,
  normalizar: (raw: unknown) => T,
  signal?: AbortSignal,
): Promise<PilotoFetchResult<T>> {
  const r = await getJson<unknown>(path, signal, TOPE_DIRECTOR_MS)
  return r.notAvailable ? { data: null, notAvailable: true } : { data: normalizar(r.data), notAvailable: false }
}

export function fetchDirectorHoy(
  agencyId: string,
  opciones: { fecha?: string } = {},
  signal?: AbortSignal,
): Promise<PilotoFetchResult<DirectorHoy>> {
  const q = opciones.fecha ? `?fecha=${encodeURIComponent(opciones.fecha)}` : ''
  return leer(`${base(agencyId)}/hoy${q}`, normalizarHoy, signal)
}

export function fetchDirectorSemana(
  agencyId: string,
  signal?: AbortSignal,
): Promise<PilotoFetchResult<DirectorSemana>> {
  return leer(`${base(agencyId)}/semana`, normalizarSemana, signal)
}

export function fetchDirectorMetas(
  agencyId: string,
  signal?: AbortSignal,
): Promise<PilotoFetchResult<DirectorMetas>> {
  return leer(`${base(agencyId)}/metas`, normalizarMetas, signal)
}

export function fetchDirectorGasto(
  agencyId: string,
  opciones: { mes?: string } = {},
  signal?: AbortSignal,
): Promise<PilotoFetchResult<DirectorGasto>> {
  const q = opciones.mes ? `?mes=${encodeURIComponent(opciones.mes)}` : ''
  return leer(`${base(agencyId)}/gasto${q}`, normalizarGasto, signal)
}

export function fetchDirectorExperimento(
  agencyId: string,
  signal?: AbortSignal,
): Promise<PilotoFetchResult<DirectorExperimento>> {
  return leer(`${base(agencyId)}/experimento`, normalizarExperimento, signal)
}

// ── Escrituras (sólo ADMIN: el micro responde 403 `solo_admin` al resto) ────

interface Respuesta {
  status: number
  cuerpo: Objeto
}

async function enviar(path: string, method: 'POST' | 'PUT', cuerpo: Objeto): Promise<Respuesta> {
  const agentUrl = process.env.NEXT_PUBLIC_AGENT_URL
  if (!agentUrl) return { status: 0, cuerpo: { error: 'not_configured' } }
  try {
    const res = await agentFetch(`${agentUrl}${path}`, {
      method,
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(cuerpo),
    })
    const json = (await res.json().catch(() => ({}))) as unknown
    return { status: res.status, cuerpo: esObjeto(json) ? json : {} }
  } catch (err) {
    return { status: 0, cuerpo: { error: err instanceof Error ? err.message : 'sin_red' } }
  }
}

const errorDe = (r: Respuesta): string => texto(r.cuerpo.error) ?? `${r.status}`

export type ResultadoDeReplanear =
  /** 202: el micro arrancó un ciclo nuevo. */
  | { estado: 'arranco'; cicloId: string | null }
  /** 409: ya había uno en curso. Se espera ESE. */
  | { estado: 'en_curso'; cicloId: string | null }
  /** 409 sin ciclo que esperar: el director o el Piloto automático están apagados (`error` dice cuál). */
  | { estado: 'error'; status: number; error: string }

export async function postDirectorReplanear(agencyId: string): Promise<ResultadoDeReplanear> {
  const r = await enviar(`${base(agencyId)}/replanear`, 'POST', {})
  if (r.status === 202 || r.status === 200) return { estado: 'arranco', cicloId: texto(r.cuerpo.cicloId) }
  if (r.status === 409) {
    // Un 409 «apagado» no tiene ciclo que esperar: es un error con su porqué.
    const error = errorDe(r)
    if (error === 'piloto_apagado' || error === 'director_apagado') return { estado: 'error', status: 409, error }
    return { estado: 'en_curso', cicloId: texto(r.cuerpo.cicloId) }
  }
  return { estado: 'error', status: r.status, error: errorDe(r) }
}

export type ResultadoDeMeta =
  | { ok: true; meta: MetaDelDirector }
  /** Con 422, `mensaje` es la frase legible del micro («el recaudo no pasa de 100 %»). */
  | { ok: false; status: number; error: string; mensaje?: string }

export async function accionSobreMeta(
  agencyId: string,
  metaId: string,
  accion: AccionSobreMeta,
  objetivo?: number,
): Promise<ResultadoDeMeta> {
  const r = await enviar(
    `${base(agencyId)}/metas/${encodeURIComponent(metaId)}/${accion}`,
    'POST',
    accion === 'ajustar' && typeof objetivo === 'number' ? { objetivo } : {},
  )
  if (r.status >= 200 && r.status < 300) {
    const meta = normalizarMeta(r.cuerpo)
    if (meta) return { ok: true, meta }
    return { ok: false, status: r.status, error: 'respuesta_invalida' }
  }
  const mensaje = texto(r.cuerpo.mensaje)
  return { ok: false, status: r.status, error: errorDe(r), ...(mensaje ? { mensaje } : {}) }
}

export type ResultadoDeExperimento =
  | { ok: true; data: DirectorExperimento }
  | { ok: false; status: number; error: string }

export async function putDirectorExperimento(
  agencyId: string,
  activo: boolean,
): Promise<ResultadoDeExperimento> {
  const r = await enviar(`${base(agencyId)}/experimento`, 'PUT', { activo })
  if (r.status >= 200 && r.status < 300) return { ok: true, data: normalizarExperimento(r.cuerpo) }
  return { ok: false, status: r.status, error: errorDe(r) }
}
