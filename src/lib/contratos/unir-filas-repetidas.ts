/**
 * unir-filas-repetidas — T-0158 (#4).
 *
 * Un archivo del sistema viejo a veces trae la MISMA fila de un contrato dos
 * veces (un duplicado verdadero). Sin este paso el back las ve como
 * `consecutivo_repetido` y el contrato queda trabado sin que la agencia haya
 * hecho nada mal.
 *
 * Se unen sólo las filas de un mismo consecutivo que son IDÉNTICAS salvo la
 * fila del archivo y las observaciones. Cualquier otra diferencia (otro
 * inquilino, otro propietario, otro canon, otra fecha…) las deja como están:
 * los co-inquilinos y los copropietarios no son duplicados, y esos casos los
 * resuelve otro paso (`fundirFilasDelMismoContrato`) o el back.
 *
 * Se conserva la primera fila; de las demás sólo se rescatan las
 * observaciones distintas.
 */

import type { FilaLeida } from './armar-fila'

/** Lo que identifica a la fila, sin lo que puede variar entre duplicados. */
function huella(l: FilaLeida): string {
  const { filaDelArchivo: _f, observaciones: _o, ...fila } = l.fila
  const { observaciones: _p, ...origen } = l.origen
  return JSON.stringify([fila, origen])
}

function observacionesUnidas(grupo: FilaLeida[]): string | undefined {
  const distintas: string[] = []
  for (const l of grupo) {
    const o = l.fila.observaciones?.trim()
    if (o && !distintas.includes(o)) distintas.push(o)
  }
  return distintas.length > 0 ? distintas.join('\n') : undefined
}

export interface FilasSinRepetir<T extends FilaLeida> {
  filas: T[]
  /** Cuántas filas del archivo se descartaron por ser copia exacta de otra. */
  repetidas: number
}

export function unirFilasRepetidas<T extends FilaLeida>(filas: T[]): FilasSinRepetir<T> {
  // Por consecutivo y huella: la primera fila de cada huella manda.
  const grupos = new Map<string, T[]>()
  for (const l of filas) {
    const id = l.fila.externalId
    if (!id) continue
    const clave = `${id}\u0000${huella(l)}`
    grupos.set(clave, [...(grupos.get(clave) ?? []), l])
  }

  const salida: T[] = []
  const yaPuestas = new Set<string>()
  let repetidas = 0
  for (const l of filas) {
    const id = l.fila.externalId
    if (!id) {
      salida.push(l)
      continue
    }
    const clave = `${id}\u0000${huella(l)}`
    const grupo = grupos.get(clave) ?? [l]
    if (grupo.length === 1) {
      salida.push(l)
      continue
    }
    if (yaPuestas.has(clave)) {
      repetidas += 1
      continue
    }
    yaPuestas.add(clave)
    const observaciones = observacionesUnidas(grupo)
    salida.push({
      ...l,
      fila: { ...l.fila, observaciones },
      origen: { ...l.origen, observaciones },
    })
  }
  return { filas: salida, repetidas }
}
