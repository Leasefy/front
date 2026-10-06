/**
 * Las cuentas PURAS del centro de mando. Nada de esto decide nada del negocio
 * ni inventa una cifra: toma lo que mandó el micro (pulso, bandeja, actividad,
 * flota, director) y lo pone en la forma que pinta cada dirección.
 *
 * Regla de la torre (31-08): cada número sale de un endpoint real y aparece UNA
 * sola vez en la pantalla. Lo que no viene se devuelve `null` («sin dato»),
 * nunca 0.
 */

import type {
  ActivityItem,
  AutonomiaModo,
  BriefingNumeros,
  InboxItem,
  PilotoBriefing,
  PilotoFlotaResponse,
  PulsoAlerta,
  PulsoEnCurso,
  PulsoResponse,
  PulsoSeveridad,
} from '@/lib/api/piloto'
import type { DirectorHoy, MetaDelDirector } from '@/lib/api/piloto-director'
import type { EstadoDelOrbe } from '@/lib/agentes/agente-que-habla'

export const ZONA = 'America/Bogota'
const DIA_MS = 86_400_000
const SEMANA_MS = 7 * DIA_MS

// ── El día en Colombia ─────────────────────────────────────────────────────

/** «2026-10-05» del instante en la hora de Colombia (como `PilotoFeed`, QA-IA-95). */
export function diaEnColombia(d: Date): string {
  return d.toLocaleDateString('en-CA', { timeZone: ZONA })
}

/** Minutos desde la medianoche de Colombia. Colombia no cambia de hora: UTC−5 fijo. */
export function minutosDelDia(d: Date): number {
  const enColombia = new Date(d.getTime() - 5 * 3_600_000)
  return enColombia.getUTCHours() * 60 + enColombia.getUTCMinutes()
}

/** «3:05 p. m.» en Colombia. */
export function horaCorta(d: Date): string {
  return d
    .toLocaleTimeString('es-CO', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: ZONA })
    .replace(/\s+/g, ' ')
}

/** «lunes 5 de octubre». */
export function fechaDeHoy(d: Date): string {
  return d.toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long', timeZone: ZONA })
}

// ── Estado del piloto ──────────────────────────────────────────────────────

export type EstadoDelMando = 'ok' | 'atencion' | 'critico' | 'desconocido' | 'apagado'

/** ¿El piloto automático está activo para esta inmobiliaria? `null` = no se supo. */
export function pilotoActivo(flota: PilotoFlotaResponse | null): boolean | null {
  if (!flota) return null
  if (flota.piloto && typeof flota.piloto.activo === 'boolean') return flota.piloto.activo
  return typeof flota.activo === 'boolean' ? flota.activo : null
}

/**
 * El estado que pinta el orbe y el rótulo. Apagado manda: con el piloto
 * automático apagado los agentes no actúan solos, aunque el pulso diga
 * «atención» por lo que espera en la Bandeja (eso se dice aparte). Un estado
 * que no se conoce se pinta neutro, nunca verde (auditoría del Piloto, hallazgo 5).
 */
export function estadoDelMando(pulso: PulsoResponse | null, activo: boolean | null): EstadoDelMando {
  if (activo === false) return 'apagado'
  const e = pulso?.estado
  if (e === 'ok' || e === 'atencion' || e === 'critico') return e
  return 'desconocido'
}

/** El orbe: respira tranquilo, piensa con algo pendiente, late con trabajo o con lo crítico. */
export function estadoDelOrbe(estado: EstadoDelMando, hayTrabajo: boolean): EstadoDelOrbe {
  if (estado === 'apagado') return 'apagado'
  if (estado === 'critico') return 'trabajando'
  if (hayTrabajo) return 'trabajando'
  if (estado === 'atencion') return 'pensando'
  return 'quieto'
}

// ── La Bandeja ─────────────────────────────────────────────────────────────

/** Cuántas decisiones llevan más de una semana esperando (la misma cuenta de la torre). */
export function atrasadas(items: readonly InboxItem[], ahora: number): number {
  const corte = ahora - SEMANA_MS
  return items.filter((i) => new Date(i.desde).getTime() < corte).length
}

const PESO_PRIORIDAD: Record<string, number> = { alta: 0, media: 1, baja: 2 }

/** Lo urgente: primero la prioridad alta, después quien más lleva esperando. */
export function urgentes(items: readonly InboxItem[], cuantos: number): InboxItem[] {
  return [...items]
    .sort((a, b) => {
      const p = (PESO_PRIORIDAD[a.prioridad] ?? 1) - (PESO_PRIORIDAD[b.prioridad] ?? 1)
      if (p !== 0) return p
      return new Date(a.desde).getTime() - new Date(b.desde).getTime()
    })
    .slice(0, cuantos)
}

// ── Las alertas ────────────────────────────────────────────────────────────

const ORDEN_SEVERIDAD: Record<PulsoSeveridad, number> = { critica: 0, alta: 1, media: 2, info: 3 }

export function alertasPorSeveridad(alertas: readonly PulsoAlerta[]): Record<PulsoSeveridad, number> {
  const c: Record<PulsoSeveridad, number> = { critica: 0, alta: 0, media: 0, info: 0 }
  for (const a of alertas) {
    // La de las decisiones que esperan ya es su propio KPI: no se cuenta dos veces.
    if (esAlertaDeDecisiones(a)) continue
    // Una severidad desconocida cuenta como alta (como la pinta `PilotoPulso`).
    const s: PulsoSeveridad = a.severidad in ORDEN_SEVERIDAD ? a.severidad : 'alta'
    c[s] += 1
  }
  return c
}

/** Dos frases son «la misma» sin la puntuación final, mayúsculas ni espacios de más. */
export function mismaFrase(a: string | undefined | null, b: string | undefined | null): boolean {
  if (!a || !b) return false
  const norm = (s: string) =>
    s
      .trim()
      .replace(/[.·:;,!¡?¿\s]+$/u, '')
      .replace(/\s+/gu, ' ')
      .toLocaleLowerCase('es')
  return norm(a) === norm(b)
}

/**
 * Las alertas en orden de severidad, sin la que ya se lee como voz del día: el
 * micro deriva el titular DE las alertas y la misma frase llegaba dos veces
 * (la lección de `PilotoPulso`, 31-08).
 */
export function alertasParaMostrar(alertas: readonly PulsoAlerta[], voz: string | null): PulsoAlerta[] {
  return [...alertas]
    .filter((a) => !mismaFrase(a.titulo, voz) && !esAlertaDeDecisiones(a))
    .sort((a, b) => (ORDEN_SEVERIDAD[a.severidad] ?? 1) - (ORDEN_SEVERIDAD[b.severidad] ?? 1))
}

// ── La voz del día ─────────────────────────────────────────────────────────

export interface VozDelDia {
  texto: string
  quien: 'director' | 'pulso' | 'gerente'
  /** La hora del plan del director (instante ISO), si la voz es suya. */
  desde: string | null
}

/** La alerta del pulso que cuenta las decisiones que esperan (su número ya es un KPI). */
const ALERTA_DE_DECISIONES = 'decisiones-esperando'

/**
 * La voz del día, UNA sola (la regla de la torre):
 *   1. con plan del director de hoy, su resumen (ARQUITECTURA §7);
 *   2. si no, el titular del pulso…
 *   3. …salvo que el titular sea la alerta de las decisiones que esperan: ese
 *      número ya está en su medidor, y repetirlo en la frase grande es el error
 *      del 31-08 («el mismo número tres veces»). Ahí habla la lectura del
 *      Gerente (briefing), si la hay.
 */
export function vozDelDia(hoy: DirectorHoy | null, pulso: PulsoResponse | null, briefing: PilotoBriefing | null = null): VozDelDia | null {
  if (hoy?.encendido && hoy.resumen && hoy.ciclo?.estado !== 'en_curso') {
    return { texto: hoy.resumen, quien: 'director', desde: hoy.ciclo?.fin ?? hoy.ciclo?.inicio ?? null }
  }
  const lectura = [...(Array.isArray(briefing?.resumen) ? briefing.resumen : []), ...(Array.isArray(briefing?.narrativa) ? briefing.narrativa : [])]
    .filter((x): x is string => typeof x === 'string' && x.trim() !== '')
    .join(' ')
  const titularEsDeDecisiones = (pulso?.alertas ?? []).some((a) => a.id === ALERTA_DE_DECISIONES && mismaFrase(a.titulo, pulso?.titular))
  if (pulso?.titular && !(titularEsDeDecisiones && lectura)) return { texto: pulso.titular, quien: 'pulso', desde: null }
  if (lectura) return { texto: lectura, quien: 'gerente', desde: null }
  return null
}

/** ¿La alerta es la de las decisiones que esperan? (su número ya está en un KPI: no se lista). */
export function esAlertaDeDecisiones(a: PulsoAlerta): boolean {
  return a.id === ALERTA_DE_DECISIONES
}

// ── El plan del director ───────────────────────────────────────────────────

const HECHAS = new Set(['ejecutada', 'aprobada'])
const FUERA = new Set(['descartada', 'fallida', 'deshecha', 'vencida'])

export interface AvanceDelPlan {
  total: number
  hechas: number
  enBandeja: number
  agente: number
  fuera: number
  /** hechas / (total − fuera). `null` si no queda nada por hacer. */
  avance: number | null
}

export function avanceDelPlan(hoy: DirectorHoy | null): AvanceDelPlan | null {
  if (!hoy?.encendido || hoy.ordenes.length === 0) return null
  let hechas = 0
  let enBandeja = 0
  let agente = 0
  let fuera = 0
  for (const o of hoy.ordenes) {
    const e = String(o.estado)
    if (HECHAS.has(e)) hechas += 1
    else if (FUERA.has(e)) fuera += 1
    else if (e === 'la_hace_el_agente') agente += 1
    else enBandeja += 1
  }
  const total = hoy.ordenes.length
  const vivas = total - fuera
  return { total, hechas, enBandeja, agente, fuera, avance: vivas > 0 ? hechas / vivas : null }
}

// ── Las metas ──────────────────────────────────────────────────────────────

/**
 * Cuánto se ha caminado de la línea base al objetivo (0–1). Sirve igual para
 * «subir» y «bajar»: el signo lo pone la resta. `null` si falta un dato o el
 * objetivo es la misma base.
 */
export function avanceDeMeta(m: MetaDelDirector): number | null {
  if (m.lineaBase === null || m.objetivo === null || m.actual === null) return null
  const tramo = m.objetivo - m.lineaBase
  if (tramo === 0) return null
  return Math.min(1, Math.max(0, (m.actual - m.lineaBase) / tramo))
}

/** Las metas que se muestran: activas primero, después las propuestas. */
export function metasParaMostrar(metas: readonly MetaDelDirector[]): MetaDelDirector[] {
  const peso = (e: string) => (e === 'activa' ? 0 : e === 'propuesta' ? 1 : e === 'cumplida' ? 2 : 3)
  return [...metas].filter((m) => String(m.estado) !== 'pausada').sort((a, b) => peso(String(a.estado)) - peso(String(b.estado)))
}

/** El avance medio de las metas ACTIVAS con avance medible. */
export function avanceMedio(metas: readonly MetaDelDirector[]): { n: number; avance: number } | null {
  const avances = metas
    .filter((m) => String(m.estado) === 'activa')
    .map(avanceDeMeta)
    .filter((a): a is number => a !== null)
  if (avances.length === 0) return null
  return { n: avances.length, avance: avances.reduce((s, a) => s + a, 0) / avances.length }
}

// ── La flota (la tripulación) ──────────────────────────────────────────────

/** El chat también tiene fila en la flota, pero no es el piloto automático (Nico, 29-09). */
const NO_ES_DEL_PILOTO = new Set(['chat'])

export interface ConteoDeLaFlota {
  /** Agentes del piloto automático (sin el chat). */
  total: number
  /** Corren para esta inmobiliaria. */
  encendidos: number
  /** Corren y su modo los gobierna. */
  actuan: number
  porModo: Record<AutonomiaModo, number>
}

export function conteoDeLaFlota(flota: PilotoFlotaResponse | null): ConteoDeLaFlota | null {
  if (!flota) return null
  const agentes = flota.agentes.filter((a) => !NO_ES_DEL_PILOTO.has(a.agente))
  const porModo: Record<AutonomiaModo, number> = { sombra: 0, copiloto: 0, autonomo: 0 }
  let encendidos = 0
  let actuan = 0
  for (const a of agentes) {
    if (!a.corre) continue
    encendidos += 1
    if (a.actua) actuan += 1
    if (a.modo in porModo) porModo[a.modo] += 1
  }
  return { total: agentes.length, encendidos, actuan, porModo }
}

/**
 * Qué agente está detrás de algo EN CURSO, leído del tipo (una llamada o un
 * WhatsApp son de cobranza; un depósito, de conciliación). Sin coincidencia,
 * nadie (no se inventa).
 */
export function agenteDelEnCurso(e: Pick<PulsoEnCurso, 'tipo'>): string | null {
  if (/llamada|whatsapp|conversaci/i.test(e.tipo)) return 'cobranza'
  if (/dep[oó]sito|concilia/i.test(e.tipo)) return 'conciliacion'
  return null
}

export interface MiembroDeLaTripulacion {
  /** El id de la flota (`cobranza`, `facturacion`…). */
  agente: string
  modo: AutonomiaModo | 'mixto'
  corre: boolean
  actua: boolean
  porQueNoCorre: string | null
  efectoReal: string | null
  /** Lo último que hizo, del feed. */
  ultimo: ActivityItem | null
  /** Tiene algo en curso ahora (pulso). */
  trabajando: boolean
}

export function tripulacion(
  flota: PilotoFlotaResponse | null,
  actividad: readonly ActivityItem[],
  enCurso: readonly PulsoEnCurso[],
): MiembroDeLaTripulacion[] {
  if (!flota) return []
  const ocupados = new Set(enCurso.map(agenteDelEnCurso).filter((a): a is string => a !== null))
  const miembros = flota.agentes
    .filter((a) => !NO_ES_DEL_PILOTO.has(a.agente))
    .map((a) => ({
      agente: a.agente,
      modo: a.modo,
      corre: a.corre,
      actua: Boolean(a.actua),
      porQueNoCorre: a.porQueNoCorre ?? null,
      efectoReal: a.efectoReal ?? null,
      ultimo: actividad.find((i) => i.agente === a.agente) ?? null,
      trabajando: a.corre && ocupados.has(a.agente),
    }))
  const peso = (m: MiembroDeLaTripulacion) => (m.trabajando ? 0 : m.actua ? 1 : m.corre ? 2 : 3)
  // Orden estable: el de la flota dentro de cada grupo.
  return miembros.map((m, i) => ({ m, i })).sort((a, b) => peso(a.m) - peso(b.m) || a.i - b.i).map((x) => x.m)
}

export function estadoDelOrbeDelAgente(m: MiembroDeLaTripulacion, pilotoEncendido: boolean): EstadoDelOrbe {
  if (!m.corre) return 'apagado'
  if (m.trabajando) return 'trabajando'
  if (!pilotoEncendido) return 'quieto'
  return m.actua ? 'listo' : 'quieto'
}

// ── Lo que hicieron hoy ────────────────────────────────────────────────────

export interface HechoHoy {
  llamadas: number
  conversaciones: number
  resueltas: number
  planeados: number | null
  promesas: number | null
}

/** Los acuerdos del día vienen del briefing (`promesasHoy`, o `promesasCreadasHoy` según la versión del micro). */
function promesasDelBriefing(n: BriefingNumeros | undefined): number | null {
  if (!n) return null
  if (typeof (n as Record<string, unknown>).promesasHoy === 'number') return (n as Record<string, number>).promesasHoy as number
  const otra = (n as Record<string, unknown>).promesasCreadasHoy
  return typeof otra === 'number' ? otra : null
}

export function hechoHoy(pulso: PulsoResponse | null, briefing: PilotoBriefing | null): HechoHoy | null {
  if (!pulso) return null
  return {
    llamadas: pulso.hoy.llamadas,
    conversaciones: pulso.hoy.conversacionesActivas,
    resueltas: pulso.hoy.decisionesResueltas,
    planeados: typeof pulso.hoy.contactosPlaneados === 'number' ? pulso.hoy.contactosPlaneados : null,
    promesas: promesasDelBriefing(briefing?.numeros),
  }
}

/** La plata recuperada del mes (del briefing). `null` = el micro no la mandó. */
export function recuperadoDelMes(briefing: PilotoBriefing | null): number | null {
  const v = briefing?.numeros?.recuperadoMesCop
  return typeof v === 'number' && Number.isFinite(v) ? v : null
}

/** Las acciones del equipo (cambios de modo hechos por personas) no son «lo que hicieron solos». */
export const DEL_EQUIPO = 'equipo'

/**
 * ¿La hizo (o la decidió) una persona? Firma `equipo`, o «Lo decidió una
 * persona del equipo» en las acciones del back.
 */
export function esDeUnaPersona(i: Pick<ActivityItem, 'agente' | 'detalle'>): boolean {
  return i.agente === DEL_EQUIPO || /decidi[oó] una persona/i.test(i.detalle ?? '')
}

export interface SoloPorAgente {
  agente: string
  n: number
  ultimo: ActivityItem
}

/**
 * Lo que cada agente hizo HOY (día de Colombia), contado sobre el feed. Si el
 * feed vino lleno (`limite`) y su acción más vieja es de hoy, el conteo puede
 * quedarse corto: `recortado` lo dice.
 */
export function solosHoyPorAgente(
  actividad: readonly ActivityItem[],
  ahora: number,
  limite: number,
): { porAgente: SoloPorAgente[]; total: number; recortado: boolean } {
  const hoy = diaEnColombia(new Date(ahora))
  const mapa = new Map<string, SoloPorAgente>()
  let total = 0
  for (const i of actividad) {
    const d = new Date(i.at)
    if (Number.isNaN(d.getTime()) || diaEnColombia(d) !== hoy || esDeUnaPersona(i)) continue
    total += 1
    const ya = mapa.get(i.agente)
    if (ya) ya.n += 1
    else mapa.set(i.agente, { agente: i.agente, n: 1, ultimo: i })
  }
  const masVieja = actividad.at(-1)
  const recortado =
    actividad.length >= limite && masVieja !== undefined && diaEnColombia(new Date(masVieja.at)) === hoy
  return { porAgente: [...mapa.values()].sort((a, b) => b.n - a.n), total, recortado }
}

/**
 * Acciones por día para una mini-gráfica, SÓLO con días completos: se saca hoy
 * (va a medias) y, si el feed vino recortado, el día más viejo (también va a
 * medias). Con menos de 3 días completos no hay gráfica: `null` (no se dibuja
 * una tendencia de mentira — ojo con `PilotoFeed.dias`).
 */
export function actividadPorDia(
  actividad: readonly ActivityItem[],
  ahora: number,
  limite: number,
): Array<{ dia: string; n: number }> | null {
  if (actividad.length === 0) return null
  const hoy = diaEnColombia(new Date(ahora))
  const conteo = new Map<string, number>()
  for (const i of actividad) {
    const d = new Date(i.at)
    if (Number.isNaN(d.getTime())) continue
    const k = diaEnColombia(d)
    conteo.set(k, (conteo.get(k) ?? 0) + 1)
  }
  const dias = [...conteo.keys()].sort()
  const masViejo = dias[0]
  const completos = dias.filter((k) => k !== hoy && !(actividad.length >= limite && k === masViejo))
  if (completos.length < 3) return null
  // Los días sin acciones entre el primero y el último cuentan como 0 (sí pasaron).
  const primero = completos[0] as string
  const ultimo = completos[completos.length - 1] as string
  const serie: Array<{ dia: string; n: number }> = []
  for (let t = Date.parse(`${primero}T12:00:00Z`); t <= Date.parse(`${ultimo}T12:00:00Z`); t += DIA_MS) {
    const k = new Date(t).toISOString().slice(0, 10)
    serie.push({ dia: k, n: conteo.get(k) ?? 0 })
  }
  return serie
}

// ── La línea del día ───────────────────────────────────────────────────────

export type MomentoDelEvento = 'corrio' | 'corre' | 'viene'

export interface EventoDelDia {
  id: string
  momento: MomentoDelEvento
  /** `null` = hoy, sin hora fija. */
  at: Date | null
  titulo: string
  detalle: string | null
  /** El agente (id de la flota) o `null`. */
  agente: string | null
  /** El id con que se abre el cajón, si se puede. */
  abrir: string | null
}

const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']

/**
 * El «cuándo» de una orden del director, como instante de HOY. El micro lo
 * manda en palabras («el lunes 5 de octubre a las 3:00 p. m.», `cuandoEnPalabras`)
 * o como «hoy»/«ahora»; un ISO también se acepta. Lo que no es de hoy o no trae
 * hora devuelve `null` (va a «Hoy, sin hora fija» si es de hoy).
 */
export function horaDelCuando(cuando: string | null, ahora: number): { at: Date | null; esDeHoy: boolean } {
  if (!cuando) return { at: null, esDeHoy: false }
  const hoy = diaEnColombia(new Date(ahora))
  if (/^\d{4}-\d{2}-\d{2}T/.test(cuando)) {
    const d = new Date(cuando)
    if (Number.isNaN(d.getTime())) return { at: null, esDeHoy: false }
    return diaEnColombia(d) === hoy ? { at: d, esDeHoy: true } : { at: null, esDeHoy: false }
  }
  const t = cuando.toLocaleLowerCase('es')
  if (t.trim() === 'ahora') return { at: new Date(ahora), esDeHoy: true }
  const [y, m, d] = hoy.split('-').map(Number) as [number, number, number]
  const fecha = /(\d{1,2}) de ([a-záéíóú]+)/.exec(t)
  const esDeHoy = fecha
    ? Number(fecha[1]) === d && MESES.indexOf(fecha[2] as string) === m - 1
    : /\bhoy\b/.test(t)
  if (!esDeHoy) return { at: null, esDeHoy: false }
  const h = /(\d{1,2}):(\d{2})\s*([ap])\.?\s*m\.?/.exec(t)
  if (!h) return { at: null, esDeHoy: true }
  let horas = Number(h[1]) % 12
  if (h[3] === 'p') horas += 12
  // Colombia: UTC−5 todo el año.
  return { at: new Date(Date.UTC(y, m - 1, d, horas + 5, Number(h[2]))), esDeHoy: true }
}

const ORDEN_TERMINADA = new Set(['ejecutada', 'descartada', 'fallida', 'deshecha', 'vencida'])

export function eventosDeHoy(args: {
  actividad: readonly ActivityItem[]
  pulso: PulsoResponse | null
  hoy: DirectorHoy | null
  ahora: number
}): { conHora: EventoDelDia[]; sinHora: EventoDelDia[] } {
  const { actividad, pulso, hoy, ahora } = args
  const diaDeHoy = diaEnColombia(new Date(ahora))
  const conHora: EventoDelDia[] = []
  const sinHora: EventoDelDia[] = []

  for (const i of actividad) {
    const d = new Date(i.at)
    if (Number.isNaN(d.getTime()) || diaEnColombia(d) !== diaDeHoy || i.agente === DEL_EQUIPO) continue
    conHora.push({ id: `act:${i.id}`, momento: 'corrio', at: d, titulo: i.titulo, detalle: i.detalle ?? null, agente: i.agente, abrir: i.id })
  }

  const ciclo = hoy?.encendido ? hoy.ciclo : null
  if (ciclo?.inicio) {
    const d = new Date(ciclo.inicio)
    if (!Number.isNaN(d.getTime()) && diaEnColombia(d) === diaDeHoy) {
      conHora.push({ id: `ciclo:${ciclo.id}`, momento: 'corrio', at: d, titulo: 'El director armó el plan del día', detalle: null, agente: null, abrir: null })
    }
  }

  for (const e of pulso?.enCurso ?? []) {
    const d = e.desde ? new Date(e.desde) : new Date(ahora)
    conHora.push({
      id: `curso:${e.id}`,
      momento: 'corre',
      at: Number.isNaN(d.getTime()) ? new Date(ahora) : d,
      titulo: e.titulo,
      detalle: e.detalle ?? null,
      agente: agenteDelEnCurso(e),
      abrir: e.id,
    })
  }

  if (hoy?.encendido) {
    for (const o of hoy.ordenes) {
      if (ORDEN_TERMINADA.has(String(o.estado))) continue
      const { at, esDeHoy } = horaDelCuando(o.cuando, ahora)
      if (!esDeHoy) continue
      const ev: EventoDelDia = {
        id: `orden:${o.ordenId}`,
        momento: 'viene',
        at,
        titulo: o.procesoNombre || o.proceso,
        detalle: o.entidad?.nombre ?? null,
        agente: o.agente || null,
        abrir: o.accionId ? `acc:${o.accionId}` : null,
      }
      if (at) conHora.push(ev)
      else sinHora.push(ev)
    }
  }

  conHora.sort((a, b) => (a.at as Date).getTime() - (b.at as Date).getTime())
  return { conHora, sinHora }
}

/**
 * El tramo de la línea: de las 6 a. m. a las 8 p. m., estirado si hay algo
 * antes o después. En minutos del día de Colombia.
 */
export function tramoDeLaLinea(eventos: readonly EventoDelDia[], ahora: number): { desde: number; hasta: number } {
  let desde = 6 * 60
  let hasta = 20 * 60
  const minutos = [minutosDelDia(new Date(ahora)), ...eventos.filter((e) => e.at).map((e) => minutosDelDia(e.at as Date))]
  for (const m of minutos) {
    if (m < desde) desde = Math.floor(m / 60) * 60
    if (m > hasta) hasta = Math.min(24 * 60, Math.ceil((m + 1) / 60) * 60)
  }
  return { desde, hasta }
}

/** El porcentaje (0–100) de un instante dentro del tramo. */
export function posicionEnLaLinea(d: Date, tramo: { desde: number; hasta: number }): number {
  const m = minutosDelDia(d)
  return Math.min(100, Math.max(0, ((m - tramo.desde) / (tramo.hasta - tramo.desde)) * 100))
}

// ── Formatos ───────────────────────────────────────────────────────────────

/** «84 %». */
export function porcentaje(x: number): string {
  return `${Math.round(x * 100)}\u00a0%`
}

