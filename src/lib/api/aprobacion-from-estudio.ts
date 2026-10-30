/**
 * aprobacion-from-estudio — translates the free document study (T-0193) into
 * the `Aprobacion` shape that the rest of the tenant journey already consumes
 * (catalog filter, home banner, `TopeAprobadoBanner`, `para-ti`, `aplicar`).
 *
 * Contract §8 (front surfaces): COMPLETED → `aprobado` (or `rechazado` when the
 * bureau could not verify an income, i.e. `canonMaximoCop === null`),
 * PROCESSING → `en_proceso`, anything else → `sin_estudio`.
 *
 * Hard rule (scoring-domain): the figure is the back's `canonMaximoCop`,
 * verbatim. No arithmetic here, no invented number, never `$0`.
 */

import { SIN_APROBACION, type Aprobacion } from './aprobacion.service'
import type { EstudioDeCanon } from './estudio-de-canon.types'

export function mapEstudioToAprobacion(estudio: EstudioDeCanon | null): Aprobacion {
  if (!estudio) return SIN_APROBACION

  if (estudio.status === 'PROCESSING') return { ...SIN_APROBACION, estado: 'en_proceso' }

  if (estudio.status === 'COMPLETED') {
    const resultado = estudio.resultado
    const tope = resultado?.canonMaximoCop ?? null
    return {
      estado: tope === null ? 'rechazado' : 'aprobado',
      topeAprobadoCop: tope,
      aseguradoras: [],
      vigenteHasta: estudio.venceEl,
      resueltoEn: estudio.terminadoEl,
      condicionada: (resultado?.condiciones.length ?? 0) > 0,
      canonConsultadoCop: null,
    }
  }

  // DRAFT | FAILED: nothing verifiable to show; must not keep filtering the catalog.
  return SIN_APROBACION
}
