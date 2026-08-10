/**
 * Paso 11 del recorrido: dejar registrado **qué aseguradora aprobó y con qué
 * número**.
 *
 * El hueco que cierra: el contrato guardaba `insuranceTier` —cuál de nuestros
 * planes se contrató— pero no cuál aseguradora externa respaldó a ese inquilino
 * ni el número de la póliza. Seis meses después, con un siniestro encima,
 * nadie sabía a quién reclamarle.
 *
 * Dónde se guarda: en una cláusula del contrato (`customClauses`), que es un
 * campo real y persistido. No es un rodeo: el respaldo de un arriendo pertenece
 * al texto del contrato, y así queda también en el PDF que firman las partes.
 *
 * ⚠️ Cuando el backend tenga un campo estructurado para esto, migrar leyendo
 * la cláusula con `leerRespaldo` — por eso el formato es estable y parseable,
 * no prosa libre.
 */

import type { CustomClause } from '@/lib/api/contracts.types'

export const TITULO_CLAUSULA = 'Respaldo del arriendo'

/** Marca que permite reconocer la cláusula sin depender del título. */
const MARCA = '[respaldo-v1]'

export interface Respaldo {
  /** Nombre de la aseguradora o afianzadora que aprobó. */
  aseguradora: string
  /** Póliza, radicado o como sea que la aseguradora identifique la aprobación. */
  identificador: string
  /** 'seguro' | 'fianza' — cómo respalda. */
  tipo: 'seguro' | 'fianza'
  /** YYYY-MM-DD. Opcional: no todas las aseguradoras la dan al aprobar. */
  vigenciaDesde?: string
  vigenciaHasta?: string
}

export interface ErroresDeRespaldo {
  aseguradora?: string
  identificador?: string
  vigencia?: string
}

const ETIQUETA_TIPO: Record<Respaldo['tipo'], string> = {
  seguro: 'Seguro de arrendamiento',
  fianza: 'Fianza',
}

/**
 * Valida antes de guardar. Una póliza sin número no sirve para reclamar, así
 * que el identificador es obligatorio en cuanto se nombra una aseguradora.
 */
export function validarRespaldo(r: Partial<Respaldo>): ErroresDeRespaldo {
  const errores: ErroresDeRespaldo = {}

  if (!r.aseguradora?.trim()) {
    errores.aseguradora = 'Decí qué aseguradora aprobó'
  }
  if (!r.identificador?.trim()) {
    errores.identificador = 'Sin el número no se le puede reclamar a nadie'
  } else if (r.identificador.trim().length < 3) {
    errores.identificador = 'Parece incompleto'
  }
  if (r.vigenciaDesde && r.vigenciaHasta && r.vigenciaHasta <= r.vigenciaDesde) {
    errores.vigencia = 'La vigencia termina antes de empezar'
  }

  return errores
}

/** Serializa a una cláusula del contrato, en formato estable y legible. */
export function comoClausula(r: Respaldo): CustomClause {
  const lineas = [
    `${MARCA}`,
    `Aseguradora: ${r.aseguradora.trim()}`,
    `Tipo: ${ETIQUETA_TIPO[r.tipo]}`,
    `Identificador: ${r.identificador.trim()}`,
  ]
  if (r.vigenciaDesde) lineas.push(`Vigencia desde: ${r.vigenciaDesde}`)
  if (r.vigenciaHasta) lineas.push(`Vigencia hasta: ${r.vigenciaHasta}`)

  return {
    title: TITULO_CLAUSULA.slice(0, 100),
    content: lineas.join('\n').slice(0, 2000),
  }
}

function valorDe(texto: string, etiqueta: string): string | undefined {
  const linea = texto
    .split('\n')
    .find((l) => l.trim().toLowerCase().startsWith(`${etiqueta.toLowerCase()}:`))
  if (!linea) return undefined
  const valor = linea.slice(linea.indexOf(':') + 1).trim()
  return valor || undefined
}

/**
 * Lee el respaldo de las cláusulas de un contrato. Devuelve `null` si no hay:
 * los contratos viejos no lo tienen, y eso no es un error — es un contrato
 * anterior a que existiera el campo.
 */
export function leerRespaldo(clausulas: CustomClause[] | undefined): Respaldo | null {
  const clausula = clausulas?.find(
    (c) => c.content?.includes(MARCA) || c.title === TITULO_CLAUSULA,
  )
  if (!clausula) return null

  const aseguradora = valorDe(clausula.content, 'Aseguradora')
  const identificador = valorDe(clausula.content, 'Identificador')
  if (!aseguradora || !identificador) return null

  const tipoTexto = valorDe(clausula.content, 'Tipo')
  const tipo: Respaldo['tipo'] = tipoTexto === ETIQUETA_TIPO.fianza ? 'fianza' : 'seguro'

  return {
    aseguradora,
    identificador,
    tipo,
    vigenciaDesde: valorDe(clausula.content, 'Vigencia desde'),
    vigenciaHasta: valorDe(clausula.content, 'Vigencia hasta'),
  }
}

export function etiquetaDeTipo(tipo: Respaldo['tipo']): string {
  return ETIQUETA_TIPO[tipo]
}
