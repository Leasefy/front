/**
 * 🔴 LAS LLAVES DE LOS CENTAVOS, VISTAS DESDE EL FRONT («centavos en todo»,
 * C3-FRONT, 03-10-2026).
 *
 * El front NO decide si una plata lleva centavos: se lo pregunta al back con
 * `GET /config/plata` (`back/src/common/plata/config-de-plata.controller.ts`).
 * El back responde por ÁREA con sus dos llaves (`con-centavos.ts` del back):
 * el interruptor `PLATA_CON_CENTAVOS` y la migración de C2 de esa área ya
 * aplicada. Un área sólo cuenta como prendida si el back dice `true`.
 *
 *   · Prendida: los campos de plata de esa área aceptan coma decimal (hasta
 *     dos decimales; el tercero se frena), las frases dicen «hasta dos
 *     decimales» y los documentos escriben siempre los dos decimales (P8 a).
 *   · Apagada, un back viejo (404) o la pregunta FALLA: sin centavos,
 *     EXACTAMENTE como hoy (pesos enteros y la frase «sin centavos»).
 *
 * Se pregunta UNA vez y la respuesta —también el «no» de una falla— se
 * recuerda 60 s, la misma caché del back (`max-age=60`). Todas las pantallas
 * comparten la respuesta: diez campos de plata no son diez preguntas.
 *
 * El hook de React está en `use-plata-con-centavos.ts`.
 */

import { aCentavos } from './plata'

/**
 * Las áreas de la plata: una por migración de C2, en el orden en que se
 * aplican. 🔁 Espejo de `AREAS_DE_PLATA` del back (`common/plata/con-centavos.ts`).
 */
export const AREAS_DE_PLATA = [
  'configuracion_y_saas',
  'inmuebles_y_mandato',
  'contratos_y_cuotas',
  'cobros_recibos_y_cartera',
  'dispersion_y_liquidacion',
  'tesoreria_y_conciliacion',
  'contabilidad_facturacion_y_exogena',
  'nomina',
  'piloto_y_bitacora',
] as const

export type AreaDePlata = (typeof AREAS_DE_PLATA)[number]

/**
 * La deuda (cuotas, cobro del mes, recibos, el canon) vive en DOS áreas y sólo
 * va al centavo con las dos prendidas: así la cuota y su cobro nunca dicen dos
 * números. 🔁 Espejo de `AREAS_DE_LA_DEUDA` del back
 * (`inmobiliaria/deuda-del-contrato/deuda-con-centavos.ts`).
 */
export const AREAS_DE_LA_DEUDA = [
  'contratos_y_cuotas',
  'cobros_recibos_y_cartera',
] as const satisfies readonly AreaDePlata[]

/** Una o varias áreas: con varias, TODAS tienen que estar prendidas. */
export type AreasDePlata = AreaDePlata | readonly AreaDePlata[]

export type ConCentavosPorArea = Readonly<Record<AreaDePlata, boolean>>

/** Todas apagadas: lo de hoy, y lo que vale si el back no contesta. */
export const NINGUNA_CON_CENTAVOS: ConCentavosPorArea = Object.freeze(
  Object.fromEntries(AREAS_DE_PLATA.map((area) => [area, false])) as Record<AreaDePlata, boolean>,
)

/**
 * La frase cuando un valor trae más de dos decimales, con las llaves
 * prendidas. 🔁 Espejo de `MENSAJE_PLATA_HASTA_EL_CENTAVO` del back
 * (`common/plata/validar-plata.ts`): la MISMA frase que devuelve el DTO.
 */
export const MENSAJE_PLATA_HASTA_EL_CENTAVO =
  'Escribe el valor en pesos, con hasta dos decimales (centavos).'

/**
 * ¿Este valor es plata que el back acepta HOY? 🔁 Espejo de
 * `esPlataDeLasAreas` del back (`common/plata/validar-plata.ts`): sin la llave,
 * sólo pesos enteros (el `@IsInt` de siempre); con la llave, hasta dos
 * decimales —el tercero se frena, no se redondea (P14 a)—.
 */
export function esPlataQueSeAcepta(valor: number, conCentavos: boolean): boolean {
  if (!Number.isFinite(valor)) return false
  if (Number.isInteger(valor)) return true
  if (!conCentavos) return false
  try {
    aCentavos(valor, { talCual: true })
    return true
  } catch {
    return false
  }
}

/**
 * La frase de un valor que no es plata aceptable: la «sin centavos» de cada
 * campo SÓLO con la llave apagada; con la llave, la de «hasta dos decimales»
 * (lo mismo que dice el DTO del back con `@EsPlataDeLasAreas`).
 */
export function fraseDeLaPlata(fraseSinCentavos: string, conCentavos: boolean): string {
  return conCentavos ? MENSAJE_PLATA_HASTA_EL_CENTAVO : fraseSinCentavos
}

/**
 * El cuerpo de `GET /config/plata` → prendida/apagada por área. Tolerante a
 * propósito: sólo un `true` literal prende un área; lo que falte, sobre o
 * llegue raro queda apagado (nunca se prende por error).
 */
export function leerConfigDePlata(cuerpo: unknown): ConCentavosPorArea {
  const mapa =
    cuerpo && typeof cuerpo === 'object' && !Array.isArray(cuerpo)
      ? (cuerpo as { conCentavos?: unknown }).conCentavos
      : undefined
  if (!mapa || typeof mapa !== 'object' || Array.isArray(mapa)) return NINGUNA_CON_CENTAVOS
  const crudo = mapa as Record<string, unknown>
  return Object.freeze(
    Object.fromEntries(AREAS_DE_PLATA.map((area) => [area, crudo[area] === true])) as Record<
      AreaDePlata,
      boolean
    >,
  )
}

/**
 * ¿Esas áreas escriben centavos? Con varias, TODAS (una escritura que toca dos
 * áreas va al centavo sólo si las dos lo aceptan). Sin áreas: no.
 */
export function conCentavosEn(
  estado: ConCentavosPorArea,
  areas: AreasDePlata | null | undefined,
): boolean {
  if (areas === null || areas === undefined) return false
  const lista: readonly AreaDePlata[] = typeof areas === 'string' ? [areas] : areas
  return lista.length > 0 && lista.every((area) => estado[area] === true)
}

// ── La respuesta compartida ──────────────────────────────────────────────────

/** Lo mismo que el `max-age` del back. */
export const VIGENCIA_DE_LA_CONFIG_DE_PLATA_MS = 60_000

let estado: ConCentavosPorArea = NINGUNA_CON_CENTAVOS
let venceEn = 0
let enVuelo: Promise<ConCentavosPorArea> | null = null
const oyentes = new Set<() => void>()

function fijar(nuevo: ConCentavosPorArea, vigenteHasta: number): void {
  venceEn = vigenteHasta
  const cambio = AREAS_DE_PLATA.some((area) => nuevo[area] !== estado[area])
  estado = nuevo
  if (cambio) for (const oyente of oyentes) oyente()
}

/**
 * ¿Alguna área de la plata escribe centavos? Es lo que decide si una pantalla
 * muestra los centavos de un valor (P8 a): con TODAS apagadas —lo de hoy— la
 * plata se ve exactamente como siempre.
 */
export function hayPlataConCentavos(estadoActual: ConCentavosPorArea = estado): boolean {
  return AREAS_DE_PLATA.some((area) => estadoActual[area] === true)
}

/** Lo último que dijo el back (o «ninguna», si todavía no dijo nada). */
export function configDePlataAhora(): ConCentavosPorArea {
  return estado
}

export function suscribirseALaConfigDePlata(oyente: () => void): () => void {
  oyentes.add(oyente)
  return () => {
    oyentes.delete(oyente)
  }
}

/**
 * Pregunta al back si la respuesta ya venció (60 s). Nunca lanza: una falla
 * (back viejo, caído, sin red) es «ninguna con centavos» por 60 s.
 */
export function refrescarConfigDePlata(): Promise<ConCentavosPorArea> {
  if (Date.now() < venceEn) return Promise.resolve(estado)
  if (enVuelo) return enVuelo
  // El cliente HTTP se carga recién al preguntar: los formatos de plata leen
  // este módulo (`escribir-plata.ts`) y no tienen por qué arrastrar la red.
  const pregunta = import('@/lib/api/config-de-plata.service')
    .then(({ pedirConfigDePlata }) => pedirConfigDePlata())
    .then(leerConfigDePlata, () => NINGUNA_CON_CENTAVOS)
    .then((nuevo) => {
      fijar(nuevo, Date.now() + VIGENCIA_DE_LA_CONFIG_DE_PLATA_MS)
      return nuevo
    })
    .finally(() => {
      if (enVuelo === pregunta) enVuelo = null
    })
  enVuelo = pregunta
  return pregunta
}

/**
 * Sólo para pruebas: deja la respuesta como si el back la hubiera dado
 * (`null` = olvidarla, como al cargar la página).
 */
export function fijarConfigDePlataParaPruebas(cuerpo: unknown | null): void {
  enVuelo = null
  if (cuerpo === null) {
    fijar(NINGUNA_CON_CENTAVOS, 0)
    return
  }
  fijar(leerConfigDePlata(cuerpo), Date.now() + VIGENCIA_DE_LA_CONFIG_DE_PLATA_MS)
}
