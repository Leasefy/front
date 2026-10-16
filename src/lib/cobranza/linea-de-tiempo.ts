/**
 * La línea de tiempo del deudor, en palabras (QA-AGENTES 16-10).
 *
 * 🔴 Antes la pestaña sólo pintaba el TIPO de cada evento: el cambio de etapa
 * se abría como JSON crudo (`id`, `from_stage`, `actor_type: admin:override`),
 * una nota salía como «Memo · ahora mismo» sin su texto, y lo que registró el
 * equipo (gestiones y promesas, que viven en el back) no salía: con una
 * llamada y una promesa registradas decía «Sin eventos registrados».
 *
 * Los eventos del micro son los de `agency-cobranza-debtor-timeline.ts`; las
 * gestiones, las del historial del back (`cobranzaManualApi.historial`). Las
 * del AGENTE en ese historial no se suman: ya vienen del micro; y una nota del
 * micro que el back ya trae (`agente-nota-<id>`) sale una sola vez.
 */

import { stageDisplayName, type CarteraStage } from '@/lib/cartera'
import { callOutcomeLabel, channelLabel, paymentChannelLabel } from '@/lib/cobranza/call-vocab'
import { laHizoUnaPersona, motivoDeLaTransicion } from '@/lib/cobranza/transicion-vocab'
import { plataEnPantalla } from '@/lib/plata/escribir-plata'
import type { EntradaDelHistorial } from '@/lib/api/cobranza-manual.types'

export interface EventoDelMicro {
  event_type: string
  occurred_at: string
  payload?: Record<string, unknown> | null
}

export type TipoDeEvento = 'etapa' | 'llamada' | 'pago' | 'nota' | 'gestion'

export interface EventoParaMostrar {
  clave: string
  tipo: TipoDeEvento
  cuando: string
  titulo: string
  detalle: string | null
  quien: string | null
  /** Sólo una llamada del agente: abre su detalle. */
  callId: string | null
}

const ETAPAS: readonly string[] = ['S0', 'S1', 'S2', 'S3', 'S4', 'S5', 'SX']

function texto(v: unknown): string | null {
  return typeof v === 'string' && v.trim() ? v.trim() : null
}

function nombreDeLaEtapa(v: unknown, locale: string): string | null {
  return typeof v === 'string' && ETAPAS.includes(v) ? stageDisplayName(v as CarteraStage, locale) : null
}

function cop(n: number): string {
  return plataEnPantalla('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n)
}

/** «19 de octubre de 2026»: el día civil tal cual, sin correrlo por el huso. */
function diaEnPalabras(dia: string): string {
  const [a, m, d] = dia.slice(0, 10).split('-').map(Number)
  return new Intl.DateTimeFormat('es-CO', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(a!, m! - 1, d!))
}

function duracion(segundos: unknown): string | null {
  const s = typeof segundos === 'number' && Number.isFinite(segundos) ? Math.round(segundos) : null
  if (s === null || s <= 0) return null
  return s < 60 ? `${s} s` : `${Math.round(s / 60)} min`
}

/**
 * La clave de cada evento: lo que ES (su id, o tipo + momento), nunca su
 * posición: con el índice, un evento nuevo que llega arriba (tiempo real) le
 * cambiaba la clave a todos y la lista entera volvía a entrar.
 */
function claveDelEvento(ev: EventoDelMicro): string {
  const p = ev.payload ?? {}
  const id = texto(p.id) ?? texto(p.memo_id) ?? texto(p.payment_id) ?? texto(p.call_id)
  return id ? `${ev.event_type}-${id}` : `${ev.event_type}-${ev.occurred_at}`
}

function delMicro(ev: EventoDelMicro, locale: string): EventoParaMostrar {
  const p = ev.payload ?? {}
  const base = { clave: claveDelEvento(ev), cuando: ev.occurred_at, callId: null as string | null }
  switch (ev.event_type) {
    case 'stage_transition': {
      const desde = nombreDeLaEtapa(p.from_stage, locale)
      const hasta = nombreDeLaEtapa(p.to_stage, locale)
      const titulo = desde && hasta ? `De ${desde} a ${hasta}` : hasta ? `Entró en ${hasta}` : 'Cambio de etapa'
      const motivo = motivoDeLaTransicion(texto(p.reason))
      return {
        ...base,
        tipo: 'etapa',
        titulo,
        detalle: motivo === 'Cambio de etapa' ? null : motivo,
        quien: laHizoUnaPersona(texto(p.actor_type)) ? 'Lo cambió tu equipo a mano' : 'Automático',
      }
    }
    case 'call': {
      const partes = [callOutcomeLabel(texto(p.status)), duracion(p.duration_seconds)].filter(Boolean)
      const canal = channelLabel(texto(p.channel))
      return {
        ...base,
        tipo: 'llamada',
        titulo: canal ? `Llamada · ${canal}` : 'Llamada',
        detalle: partes.length > 0 ? partes.join(' · ') : null,
        quien: 'Mori',
        callId: texto(p.call_id),
      }
    }
    case 'payment': {
      const monto = Number(p.amount)
      const medio = paymentChannelLabel(texto(p.method))
      return {
        ...base,
        tipo: 'pago',
        titulo: Number.isFinite(monto) && monto > 0 ? `Pago de ${cop(monto)}` : 'Pago recibido',
        detalle: medio,
        quien: null,
      }
    }
    default:
      return {
        ...base,
        tipo: 'nota',
        titulo: texto(p.call_id) ? 'Resumen de la llamada' : 'Nota',
        detalle: texto(p.body_excerpt),
        quien: null,
        callId: texto(p.call_id),
      }
  }
}

function delEquipo(g: EntradaDelHistorial): EventoParaMostrar {
  const lineas = [
    g.comentario?.trim() || null,
    g.promesa ? `Prometió pagar ${cop(g.promesa.montoCop)} el ${diaEnPalabras(g.promesa.fecha)}.` : null,
  ].filter(Boolean)
  return {
    clave: `gestion-${g.id}`,
    tipo: 'gestion',
    cuando: g.cuando,
    titulo: g.resultadoTexto ? `${g.tipoTexto} · ${g.resultadoTexto}` : g.tipoTexto,
    detalle: lineas.length > 0 ? lineas.join(' ') : null,
    quien: `Registró ${g.quien}`,
    callId: null,
  }
}

/** Todo junto, del más nuevo al más viejo. */
export function lineaDeTiempo(
  eventos: readonly EventoDelMicro[],
  gestiones: readonly EntradaDelHistorial[],
  locale: string,
): EventoParaMostrar[] {
  // El back ya trae las notas del micro como `agente-nota-<memo_id>` (con su
  // tipo: «Carta prejurídica», «Nota»): esa nota sale UNA vez, la del back.
  const delEquipoIds = new Set(gestiones.filter((g) => g.origen === 'equipo').map((g) => g.id))
  const todos = [
    ...eventos
      .filter((ev) => {
        const memo = ev.event_type === 'memo' ? texto(ev.payload?.memo_id) : null
        return !(memo && delEquipoIds.has(`agente-nota-${memo}`))
      })
      .map((ev) => delMicro(ev, locale)),
    ...gestiones.filter((g) => g.origen === 'equipo').map(delEquipo),
  ].sort((a, b) => new Date(b.cuando).getTime() - new Date(a.cuando).getTime())
  // Dos sin id, del mismo tipo y en el mismo instante: por su orden (`#2`).
  const vistas = new Map<string, number>()
  return todos.map((e) => {
    const n = (vistas.get(e.clave) ?? 0) + 1
    vistas.set(e.clave, n)
    return n === 1 ? e : { ...e, clave: `${e.clave}#${n}` }
  })
}
