/**
 * preparar-filas-para-migrar — lo que SALE hacia el back (T-0153).
 *
 * Tres pasos, siempre en este orden y siempre los mismos para la vista previa
 * y para el envío:
 *   1. leer cada fila del archivo (`leerFilaConHoja`);
 *   1b. unir las filas repetidas (copias exactas de un mismo contrato, T-0158);
 *   2. fundir los copropietarios de un mismo contrato (§4.3);
 *   3. §3.4: el sistema NUNCA asume el prorrateo. Una fila sin SI/NO
 *      reconocido (celda vacía, columna ausente o texto ilegible) no se manda
 *      hasta que la agencia lo define; las que sí lo traen siguen. Lo elegido
 *      viaja como un `prorratearPrimerMes` explícito: el back no distingue si
 *      vino del archivo o de la vista previa.
 */

import type { FilaAMigrar } from '@/lib/api/contracts.service'
import { leerFilaConHoja, type OpcionesDeLaLectura } from './armar-fila'
import type { MapeoDeColumna } from './columnas-de-contrato'
import { fundirFilasDelMismoContrato } from './fundir-filas-del-mismo-contrato'
import { unirFilasRepetidas } from './unir-filas-repetidas'

/** Un contrato al que le falta decidir si se prorratea el primer mes. */
export interface FilaPorDecidir {
  /** Posición, en el archivo, de la primera fila del contrato: es la llave de la decisión. */
  indice: number
  /** La fila que ve la persona en Excel. */
  filaDelArchivo: number
  /** Lo que la celda decía, si decía algo que no se entiende. */
  texto?: string
  inmueble: string
  inquilino: string
  /** Lo que la agencia eligió para este contrato; `undefined` = todavía falta. */
  decision?: boolean
}

export interface FilasParaMigrar {
  aMigrar: FilaAMigrar[]
  /** Por cada fila de `aMigrar`, su posición de origen en el archivo (para decir «Fila N»). */
  posiciones: number[]
  /** Todos los contratos cuyo archivo no dice SI/NO (con la decisión de la agencia, si ya la tomó). */
  porDefinir: FilaPorDecidir[]
  /** Los de `porDefinir` que todavía NO tienen decisión: esos no se mandan. */
  pendientes: FilaPorDecidir[]
  /** Cuántas filas del archivo se absorbieron en el contrato de otra (copropietarios). */
  fundidas: number
  /** De `fundidas`, las que fueron «una fila por inquilino» (T-0163). */
  fundidasPorInquilinos: number
  /** Cuántas filas eran copia exacta de otra del mismo contrato y se unieron (T-0158). */
  repetidas: number
}

export function prepararFilasParaMigrar(
  filas: Array<Record<string, unknown>>,
  mapeo: MapeoDeColumna[],
  opciones: OpcionesDeLaLectura,
  decisiones: ReadonlyMap<number, boolean>,
): FilasParaMigrar {
  const leidas = filas.map((f, indice) => ({ ...leerFilaConHoja(f, mapeo, opciones), indice }))
  const { filas: sinRepetir, repetidas } = unirFilasRepetidas(leidas)
  const contratos = fundirFilasDelMismoContrato(sinRepetir)

  const aMigrar: FilaAMigrar[] = []
  const posiciones: number[] = []
  const porDefinir: FilaPorDecidir[] = []
  for (const { fila, origen, indice } of contratos) {
    const delArchivo = fila.prorratearPrimerMes
    const elegido = delArchivo ?? decisiones.get(indice)
    if (delArchivo === undefined) {
      porDefinir.push({
        indice,
        filaDelArchivo: fila.filaDelArchivo ?? indice + 2,
        texto: origen.prorrateo.texto,
        inmueble: fila.direccion || fila.codigoInmueble || '',
        inquilino: fila.inquilino.nombre,
        decision: elegido,
      })
    }
    if (elegido === undefined) continue
    aMigrar.push({ ...fila, prorratearPrimerMes: elegido })
    posiciones.push(indice)
  }
  return {
    aMigrar,
    posiciones,
    porDefinir,
    pendientes: porDefinir.filter((p) => p.decision === undefined),
    fundidas: sinRepetir.length - contratos.length,
    fundidasPorInquilinos: contratos.reduce(
      (n, c) => n + (c.fila.canonPorInquilino ? c.fila.canonPorInquilino.length - 1 : 0),
      0,
    ),
    repetidas,
  }
}

/** Aplica UN valor a todas las filas elegidas (acción masiva), sin tocar las demás. */
export function conLaMismaDecision(
  actuales: ReadonlyMap<number, boolean>,
  indices: Iterable<number>,
  valor: boolean,
): Map<number, boolean> {
  const siguiente = new Map(actuales)
  for (const i of indices) siguiente.set(i, valor)
  return siguiente
}
