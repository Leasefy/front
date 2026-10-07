/**
 * Cómo se dice la marca del estudio de una postulación (back:
 * `applications/marca-del-estudio.ts`).
 *
 * 🔴 Nico (04-10-2026): «el estudio es opcional, no es obligatorio». Cualquiera
 * se postula —sin estudio, con el estudio en curso o vencido, o con un canon
 * por encima de su respaldo— y la inmobiliaria lo ve marcado en Postulaciones,
 * en la ficha del candidato y en Candidatos del inmueble. Al aprobar una
 * postulación marcada se pide confirmar diciendo qué falta.
 */

import type { MarcaDelEstudio } from '@/lib/api/applications.types'
import { formatCurrency } from '@/lib/format'

/** El texto corto de la marca (chip o columna). `null` = sin marca. */
export function textoDeLaMarca(marca: MarcaDelEstudio | null | undefined): string | null {
  if (!marca) return null
  switch (marca.codigo) {
    case 'SIN_ESTUDIO':
      return 'Sin estudio'
    case 'ESTUDIO_EN_CURSO':
      return 'Estudio en curso'
    case 'ESTUDIO_VENCIDO':
      return 'Estudio vencido'
    case 'CANON_SOBRE_RESPALDO':
      return `Canon por encima de su respaldo (${formatCurrency(marca.respaldoCop ?? 0)})`
    default:
      return null
  }
}

/**
 * Lo que dice el cajón de «Aprobar» de una postulación marcada: qué falta, y
 * la pregunta. `null` = sin marca, se aprueba como siempre.
 */
export function avisoAlAprobar(marca: MarcaDelEstudio | null | undefined): string | null {
  if (!marca) return null
  switch (marca.codigo) {
    case 'SIN_ESTUDIO':
      return 'Esta persona no tiene estudio de arrendamiento. ¿Aprobarla igual?'
    case 'ESTUDIO_EN_CURSO':
      return 'El estudio de arrendamiento de esta persona todavía está en curso: no sabemos aún hasta cuánto la respaldan. ¿Aprobarla igual?'
    case 'ESTUDIO_VENCIDO':
      return 'El estudio de arrendamiento de esta persona venció. ¿Aprobarla igual?'
    case 'CANON_SOBRE_RESPALDO':
      return `El canon está por encima de lo que la respaldan las aseguradoras (${formatCurrency(marca.respaldoCop ?? 0)}). ¿Aprobarla igual?`
    default:
      return null
  }
}
