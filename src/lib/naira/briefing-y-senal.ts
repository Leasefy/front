/**
 * briefing-y-senal.ts — lo que decide el Briefing y la ficha de una señal antes de pintar (Fase 13, plan 13-03;
 * D13-7, D13-8, D13-10, INV-06, NOT-05).
 *
 * Puro: sin React, sin red y SIN rutas del workspace (D13-1: las rutas viven en src/lib/nav/rutas-de-naira.ts y en las
 * páginas). Decide:
 *   · el día en Bogotá (`hoyEnBogota`, zona fija: ni la del navegador ni la del proceso) y la aritmética de días de
 *     calendario (`esDiaValido`, `sumarDias`, `esLunes`, `formatearDia`);
 *   · qué entrega se pinta (`elegirEntrega`: el briefing antes que el aviso de suspensión; el correo antes que WhatsApp)
 *     y qué ítems van en cada sección, en el orden en que llegan (la UI no reordena, NOT-12);
 *   · qué dice un silencio (`mensajeDelSilencio`): sin inventario, la atención vacía NUNCA se afirma como un día
 *     tranquilo (INV-06: un silencio sin inventario es indistinguible de una supresión).
 *
 * Qué trae HOY la ruta y qué no:
 *   · E13-2 (entidades afectadas) y E13-3 (citas con su clase) ya están en el contrato (D13-23): `entidadesDeLaSenal`
 *     devuelve `item.entidades` tal cual y `citasSinClase` queda como el respaldo de una causa sin `citasConClase`
 *     (y como la forma de la `razon` del ítem, que el contrato no clasifica).
 *   · E13-5 (inventario del día, líneas de madurez y arranque) sigue SIN aplicar en 10-06: sus tipos se espejan acá
 *     desde los tipos VISIBLES de 10-04 / 09-04 / 10-01 (PLANIFICADO) más un `no_viaja` propio del front.
 *     `loQueTraeElDia` es el ÚNICO lugar que cambia cuando la ruta los traiga; hoy devuelve `no_viaja` en los tres.
 *
 * No busca palabras en ningún texto del agente (la guardia claimclass-del-contrato lo vigila): la única expresión
 * regular valida la forma de una fecha.
 */

import type { NairaBriefingDay, NairaBriefingDelivery, NairaBriefingItem, NairaSignalDetail } from '@/lib/api/naira/contrato'
import type { OracionCausal } from '@/lib/naira/afirmaciones'
import { ZONA_DE_NAIRA } from '@/lib/naira/formato'

// fuente: 10-06-PLAN.md:281 (LARGO_MAXIMO_DE_RECALL; paridad con NairaRecallRequestSchema, por test)
// estado: PLANIFICADO
export const LARGO_MAXIMO_DE_RECALL = 2000

/** UI-SPEC §7.2: cuántas entidades afectadas se listan antes de mandar a la fuente (sin decir cuántas hay, U5). */
export const TOPE_DE_ENTIDADES_VISIBLES = 50

// ── Días de calendario ──

const FORMA_DE_DIA = /^\d{4}-\d{2}-\d{2}$/

function partesDelDia(dia: string): { readonly anio: number; readonly mes: number; readonly d: number } {
  const [anio, mes, d] = dia.split('-').map((p) => Number(p))
  return { anio: anio ?? NaN, mes: mes ?? NaN, d: d ?? NaN }
}

function comoFecha(dia: string): Date {
  const { anio, mes, d } = partesDelDia(dia)
  return new Date(Date.UTC(anio, mes - 1, d))
}

function aTexto(fecha: Date): string {
  const anio = String(fecha.getUTCFullYear()).padStart(4, '0')
  const mes = String(fecha.getUTCMonth() + 1).padStart(2, '0')
  const d = String(fecha.getUTCDate()).padStart(2, '0')
  return anio + '-' + mes + '-' + d
}

/** 'YYYY-MM-DD' del instante en America/Bogota, sin importar la zona del proceso ni la del navegador. */
export function hoyEnBogota(ahora: Date): string {
  const partes = new Intl.DateTimeFormat('en-CA', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    timeZone: ZONA_DE_NAIRA,
  }).formatToParts(ahora)
  const de = (tipo: Intl.DateTimeFormatPartTypes) => partes.find((p) => p.type === tipo)?.value ?? ''
  return de('year') + '-' + de('month') + '-' + de('day')
}

/** Forma YYYY-MM-DD y un día que existe (el 30 de febrero no). */
export function esDiaValido(dia: string): boolean {
  if (!FORMA_DE_DIA.test(dia)) return false
  return aTexto(comoFecha(dia)) === dia
}

/** El día `n` días después (o antes, con `n` negativo), por aritmética de calendario. */
export function sumarDias(dia: string, n: number): string {
  const fecha = comoFecha(dia)
  fecha.setUTCDate(fecha.getUTCDate() + n)
  return aTexto(fecha)
}

/** Un día de calendario no tiene zona: el lunes se decide sobre el día, no sobre un instante. */
export function esLunes(dia: string): boolean {
  return comoFecha(dia).getUTCDay() === 1
}

/** «lun, 5 oct 2026» (es-CO). El día se formatea en UTC porque es un día de calendario, no un instante. */
export function formatearDia(dia: string): string {
  return new Intl.DateTimeFormat('es-CO', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(comoFecha(dia))
}

// ── Qué entrega se pinta y en qué orden ──

export type EntregaElegida =
  | { readonly kind: 'briefing'; readonly entrega: NairaBriefingDelivery; readonly tambienPorWhatsapp: boolean }
  | { readonly kind: 'solo_aviso' }
  | { readonly kind: 'ninguna' }

/** El briefing antes que el aviso de suspensión; entre briefings, el correo antes que WhatsApp (los ítems son los mismos). */
export function elegirEntrega(entregas: readonly NairaBriefingDelivery[]): EntregaElegida {
  const briefings = entregas.filter((e) => e.tipo === 'briefing')
  const porCorreo = briefings.find((e) => e.canal === 'email')
  const porWhatsapp = briefings.find((e) => e.canal === 'whatsapp')
  if (porCorreo !== undefined) return { kind: 'briefing', entrega: porCorreo, tambienPorWhatsapp: porWhatsapp !== undefined }
  if (porWhatsapp !== undefined) return { kind: 'briefing', entrega: porWhatsapp, tambienPorWhatsapp: false }
  if (entregas.some((e) => e.tipo === 'aviso_suspension')) return { kind: 'solo_aviso' }
  return { kind: 'ninguna' }
}

/** Los ítems de una sección en el orden en que llegaron (el servidor ya ordenó: la UI no reordena, NOT-12). */
export function itemsDeLaSeccion(
  items: readonly NairaBriefingItem[],
  seccion: NairaBriefingItem['seccion'],
): readonly NairaBriefingItem[] {
  return items.filter((it) => it.seccion === seccion)
}

// ── Espejo de E13-5 (inventario, madurez y arranque): la ruta 10-06 no los expone todavía ──

// fuente: 09-04-PLAN.md:340 (CLASES_DEL_DIA)
// estado: PLANIFICADO
export const CLASES_DEL_DIA = ['con_senales', 'silencio', 'sin_evaluacion'] as const
// fuente: 10-04-PLAN.md:309 (DetectorVisible.estado)
// estado: PLANIFICADO
export const ESTADOS_DEL_DETECTOR = ['ok', 'skipped_stale', 'failed'] as const
// fuente: 10-04-PLAN.md:311 (MOTIVOS_SIN_INVESTIGACION)
// estado: PLANIFICADO
export const MOTIVOS_SIN_INVESTIGACION = ['no_promovida', 'no_disponible_hoy', 'sin_explicacion_completa', 'fila_ilegible'] as const

// fuente: 09-04-PLAN.md:342 (AsOfDeFuente)
// estado: PLANIFICADO
export type AsOfDeFuente = { readonly kind: 'observada'; readonly iso: string } | { readonly kind: 'nunca_observada' }

// fuente: 10-04-PLAN.md:309-316 (InventarioVisible, DetectorVisible, FuenteVisible, InvestigacionVisible) + `no_viaja` del front
// estado: PLANIFICADO
export type InventarioDelBriefing =
  | { readonly kind: 'no_viaja' }
  | { readonly kind: 'sin_registro' }
  | {
      readonly kind: 'registrado'
      readonly clase: (typeof CLASES_DEL_DIA)[number]
      readonly detectores: readonly {
        readonly detectorId: string
        readonly metricId: string
        readonly estado: (typeof ESTADOS_DEL_DETECTOR)[number]
      }[]
      readonly fuentes: readonly { readonly fuente: string; readonly etiqueta: string; readonly asOf: AsOfDeFuente }[]
      /** Ids de CompuertaDelInventario (10-04:315); sin cantidad (U5). Su nombre legible vive en el agente. */
      readonly compuertasConDescarte: readonly string[]
      readonly investigacion: readonly {
        readonly metricId: string
        readonly motivo: (typeof MOTIVOS_SIN_INVESTIGACION)[number]
      }[]
    }

// fuente: 10-04-PLAN.md:318 (LineaDeMadurez) + 10-01-PLAN.md:306 (Madurez sin `lista`)
// estado: PLANIFICADO
export interface LineaDeMadurezVisible {
  readonly metricId: string
  readonly asOf: string
  readonly fuente: string
  readonly madurez:
    | { readonly kind: 'fecha_estimada'; readonly dia: string }
    | { readonly kind: 'sin_fecha'; readonly remedio: string }
}

export type MadurezDelBriefing = { readonly kind: 'no_viaja' } | { readonly kind: 'lineas'; readonly lineas: readonly LineaDeMadurezVisible[] }

// fuente: 10-04-PLAN.md:326 (ArranqueVisible) + `no_viaja` del front
// estado: PLANIFICADO
export type ArranqueDelBriefing = { readonly kind: 'no_viaja' } | { readonly kind: 'fijado' } | { readonly kind: 'sin_go_live' }

/**
 * Lo que trae el día además de las entregas. E13-5 está SIN aplicar (la ruta 10-06 no expone inventario, madurez ni
 * arranque): hoy los tres no viajan. Es el ÚNICO punto que cambia cuando la enmienda llegue.
 */
export function loQueTraeElDia(_dia: NairaBriefingDay): {
  readonly inventario: InventarioDelBriefing
  readonly madurez: MadurezDelBriefing
  readonly arranque: ArranqueDelBriefing
} {
  return { inventario: { kind: 'no_viaja' }, madurez: { kind: 'no_viaja' }, arranque: { kind: 'no_viaja' } }
}

export type MensajeDelSilencio = 'frase_de_silencio' | 'sin_evaluacion' | 'silencio_sin_inventario'

/**
 * Qué se dice cuando «Requiere tu atención» está vacía (INV-06). Sin inventario, jamás la frase de silencio: la UI no
 * sabe si el día fue tranquilo o si algo se suprimió, y lo dice.
 */
export function mensajeDelSilencio(atencionVacia: boolean, inventario: InventarioDelBriefing): MensajeDelSilencio | null {
  if (!atencionVacia) return null
  if (inventario.kind !== 'registrado') return 'silencio_sin_inventario'
  if (inventario.clase === 'sin_evaluacion') return 'sin_evaluacion'
  return 'frase_de_silencio'
}

// ── Entidades y causa de la señal (E13-2 y E13-3, aplicadas en el contrato) ──

export type EntidadesDeLaSenal =
  | { readonly kind: 'agregada' }
  | { readonly kind: 'lista'; readonly items: readonly { readonly tipo: string; readonly id: string }[] }

/**
 * Las entidades afectadas tal cual las trae el ítem (E13-2 aplicada, D13-23). Hoy toda señal viaja `agregada` (los
 * detectores activos emiten `affectedEntities` vacío, 10-CONTEXT.md:58); la cola legacy ya puede traer `lista`
 * (10-CONTEXT.md:264).
 */
export function entidadesDeLaSenal(detalle: NairaSignalDetail): EntidadesDeLaSenal {
  return detalle.item.entidades
}

/**
 * Citas SIN clase: la `razon` del ítem del briefing (el contrato no la clasifica) y el respaldo de una causa `citada`
 * que no trae `citasConClase`. `OracionesCausales` las oculta y lo declara (fail-closed, D13-10).
 */
export function citasSinClase(citas: readonly string[]): readonly OracionCausal[] {
  return citas.map((texto) => ({ texto, claimClass: null, hipotesis: null }))
}
