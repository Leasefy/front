/**
 * fundir-filas-del-mismo-contrato — T-0153 §4.3.
 *
 * El archivo «contratos por detalles» trae un contrato con varios dueños en
 * varias filas (una por copropietario): «Valor canon» es la parte de ese dueño
 * y «Total Canon Contrato» el canon entero. El back trata un `externalId`
 * repetido como error del archivo, así que sin este paso esas filas quedaban
 * todas frenadas.
 *
 * Sólo se funde cuando TODO coincide. Ante cualquier duda las filas quedan
 * como vinieron y el back sigue frenándolas: acá no se adivina un reparto.
 * El validador del reparto sigue siendo `decidirReparto` del back.
 *
 * T-0163: también funde «un dueño, varios inquilinos» (una fila por inquilino,
 * «Valor canon» = su parte). Manda `canonPorInquilino` y el back deriva el
 * reparto; el mixto (dueños Y inquilinos distintos) no se funde.
 *
 * Es un paso del front, sin clave nueva en el cable salvo `canonPorInquilino`: el «Consecutivo detalle»
 * ordena a los dueños y no se manda.
 */

import { conSuParte, type FilaLeida } from './armar-fila'
import type { PersonaDeOrigen } from '@/lib/migracion/valores-de-origen'

const normalizar = (t: string | undefined): string => (t ?? '').trim().toLowerCase()

/** Una llave de comparación; `null` = la fila no trae el dato y no puede fundirse. */
function llaveDelInmueble(l: FilaLeida): string | null {
  const llave = normalizar(l.fila.codigoInmueble) || normalizar(l.fila.direccion)
  return llave || null
}

function todosIguales<T>(valores: T[]): boolean {
  return valores.every((v) => v === valores[0])
}

function ordenDeDetalle(a: string, b: string): number {
  const na = Number(a)
  const nb = Number(b)
  return Number.isFinite(na) && Number.isFinite(nb) ? na - nb : a.localeCompare(b)
}

type ModoDeFusion = 'duenos' | 'inquilinos'

/**
 * ¿Qué persona varía en el grupo? Dueños distintos con el mismo inquilino
 * (T-0153) o inquilinos distintos con el mismo dueño (T-0163). Si varían los
 * dos (mixto) o ninguno, `null`: las filas siguen separadas y el back las frena.
 */
function modoDelGrupo(grupo: FilaLeida[]): ModoDeFusion | null {
  const inquilinos = grupo.map((l) => normalizar(l.fila.inquilino.documento))
  const duenos = grupo.map((l) => normalizar(l.fila.propietario?.documento))
  // Sin documento no hay con qué decidir quién es quién.
  if (inquilinos.some((d) => !d) || duenos.some((d) => !d)) return null
  const mismoInquilino = todosIguales(inquilinos)
  const mismoDueno = todosIguales(duenos)
  if (mismoInquilino && !mismoDueno) return 'duenos'
  if (mismoDueno && !mismoInquilino) return 'inquilinos'
  return null
}

/** Funde un grupo con el mismo `externalId`, o `null` si no cumple TODO. */
function fundirGrupo<T extends FilaLeida>(grupo: T[]): T | null {
  const modo = modoDelGrupo(grupo)
  if (!modo) return null

  const inmuebles = grupo.map(llaveDelInmueble)
  if (!inmuebles[0] || !todosIguales(inmuebles)) return null

  for (const campo of ['startDate', 'endDate', 'fechaDeCartera'] as const) {
    if (!todosIguales(grupo.map((l) => l.fila[campo]))) return null
  }
  // Lo que el contrato dice una vez no puede contradecirse entre sus filas.
  for (const campo of ['prorratearPrimerMes', 'noSeProrroga', 'trasladaGmfAlPropietario', 'tipoDeInteres', 'comisionPorcentaje', 'diasDePlazo'] as const) {
    if (!todosIguales(grupo.map((l) => l.fila[campo]))) return null
  }
  if (!todosIguales(grupo.map((l) => l.origen.prorrateo.estado))) return null

  // Una persona por fila en el lado que varía; en el otro, una sola persona sin reparto propio.
  if (grupo.some((l) => (l.fila.propietarios?.length ?? 0) > 1 || l.fila.canonPorPropietario)) return null
  if (modo === 'inquilinos' && grupo.some((l) => (l.fila.inquilinos?.length ?? 0) > 1 || l.fila.canonPorInquilino)) return null

  // La parte de cada fila: un número por fila (y sin centavos por confirmar).
  const partes = grupo.map((l) => l.origen.canonDeLaFila)
  if (partes.some((p) => p === undefined || p <= 0)) return null
  if (grupo.some((l) => l.fila.canonConCentavosDelArchivo !== undefined)) return null

  // «Consecutivo detalle»: si el archivo lo trae, en todas y distinto.
  const detalles = grupo.map((l) => l.origen.consecutivoDetalle)
  const conDetalle = detalles.some((d) => d !== undefined)
  if (conDetalle && (detalles.some((d) => d === undefined) || new Set(detalles).size !== grupo.length)) {
    return null
  }

  // El total: el del archivo (igual en todas) o, sin la columna, la suma.
  const totales = grupo.map((l) => l.origen.canonTotal)
  let total: number
  if (totales.every((t) => t === undefined)) {
    total = Math.round((partes as number[]).reduce((a, p) => a + p, 0) * 100) / 100
  } else if (totales.every((t) => t !== undefined) && todosIguales(totales)) {
    total = totales[0] as number
  } else {
    return null
  }

  const ordenadas = conDetalle
    ? [...grupo].sort((a, b) => ordenDeDetalle(a.origen.consecutivoDetalle ?? "", b.origen.consecutivoDetalle ?? ""))
    : grupo
  const primera = ordenadas[0]
  const reparto = ordenadas.map((l) => l.origen.canonDeLaFila as number)

  if (modo === 'inquilinos') {
    // T-0163: el back deriva el reparto (R-M1…R-M7). Acá sólo viajan las personas y la plata de cada una.
    const personas: PersonaDeOrigen[] = ordenadas.map((l, i) => ({
      documento: l.fila.inquilino.documento,
      nombre: l.fila.inquilino.nombre || l.origen.inquilinos[0]?.nombre,
      orden: i + 1,
    }))
    // Todos los inquilinos con documento y todos distintos (el modo sólo probó que no son todos iguales).
    if (new Set(personas.map((p) => normalizar(p.documento))).size !== grupo.length) return null
    return {
      ...primera,
      fila: {
        ...primera.fila,
        monthlyRent: total,
        inquilino: primera.fila.inquilino,
        inquilinos: personas.map((p) => ({ documento: p.documento, nombre: p.nombre })),
        canonPorInquilino: reparto,
      },
      origen: { ...primera.origen, inquilinos: personas },
    }
  }

  const personas: PersonaDeOrigen[] = ordenadas.map((l, i) => ({
    documento: l.fila.propietario!.documento,
    nombre: l.fila.propietario!.nombre ?? l.origen.propietarios[0]?.nombre,
    orden: i + 1,
  }))
  // Un dueño por fila, con documento, todos distintos (el modo ya probó que varían).
  if (new Set(personas.map((p) => normalizar(p.documento))).size !== grupo.length) return null

  return {
    ...primera,
    fila: {
      ...primera.fila,
      monthlyRent: total,
      propietario: primera.fila.propietario,
      propietarios: conSuParte(personas, reparto, total),
      canonPorPropietario: reparto,
    },
    origen: { ...primera.origen, propietarios: personas },
  }
}

/**
 * Funde las filas que son UN mismo contrato con varios dueños (T-0153) o con
 * varios inquilinos (T-0163). Conserva el
 * orden del archivo (el contrato ocupa el lugar de su primera fila).
 */
export function fundirFilasDelMismoContrato<T extends FilaLeida>(filas: T[]): T[] {
  const grupos = new Map<string, T[]>()
  for (const l of filas) {
    const id = l.fila.externalId
    if (!id) continue
    grupos.set(id, [...(grupos.get(id) ?? []), l])
  }
  const fundidas = new Map<string, T | null>()
  for (const [id, grupo] of grupos) {
    if (grupo.length >= 2) fundidas.set(id, fundirGrupo(grupo))
  }

  const salida: T[] = []
  const yaPuestos = new Set<string>()
  for (const l of filas) {
    const id = l.fila.externalId
    const fundida = id ? fundidas.get(id) : null
    if (!id || !fundida) {
      salida.push(l)
      continue
    }
    if (yaPuestos.has(id)) continue
    yaPuestos.add(id)
    salida.push(fundida)
  }
  return salida
}
