/**
 * Portal del Propietario — servicio de elección de inquilino (F2, v8-03).
 *
 * `getProcesos`/`getComparacion` degradan a `[]`/`null` (no-disponible → "Próximamente").
 * `elegir` usa `ownerPost` con semántica de acción: devuelve `OwnerActionResult` para poder
 * distinguir éxito de `terms_changed` (WYSIWYS) / conflict (CAS single-winner). El `snapshotHash`
 * que se envía DEBE ser el de la comparación mostrada (no uno stale).
 */
import { ownerGet, ownerPost, type OwnerActionResult } from './owner-portal.http';
import type { EleccionProceso, EleccionComparacion, EleccionOk } from './owner-seleccion.types';

export const ownerSeleccionApi = {
  /** GET /procesos — procesos de elección del propietario. `[]` si no-disponible. */
  getProcesos: async (agencyId: string | null): Promise<EleccionProceso[]> =>
    (await ownerGet<EleccionProceso[]>(agencyId, '/procesos')) ?? [],

  /** GET /procesos/{id}/comparacion — postulados asegurables + snapshotHash WYSIWYS. */
  getComparacion: (agencyId: string | null, processId: string): Promise<EleccionComparacion | null> =>
    ownerGet<EleccionComparacion>(agencyId, `/procesos/${processId}/comparacion`),

  /**
   * POST /procesos/{id}/eleccion — elige un candidato (one-click). `snapshotHash` = el de la
   * comparación en pantalla. El back valida WYSIWYS + CAS; el resultado se traduce a copy.
   */
  elegir: (
    agencyId: string | null,
    processId: string,
    candidacyId: string,
    snapshotHash: string,
  ): Promise<OwnerActionResult<EleccionOk>> =>
    ownerPost<EleccionOk>(agencyId, `/procesos/${processId}/eleccion`, { candidacyId, snapshotHash }),
};
