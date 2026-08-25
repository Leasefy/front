/**
 * Portal del Propietario — tipos de elección de inquilino (F2 "Elegir inquilino", v8-03).
 *
 * Shapes EXACTOS del back (`portal-propietario-eleccion.ts`, schemas `PortalEleccion*`).
 *
 * ⚠️ Anti-PII (LEGAL Q2/Q5): el candidato es EXPLÍCITAMENTE mínimo — el back NO expone
 * cédula/email/evaluationId/buró. El front muestra sólo estos campos y nunca pide más.
 */

/** `GET /procesos` — un proceso de elección por inmueble con postulados. */
export interface EleccionProceso {
  id: string;
  propertyRef: string;
  propertyLabel: string;
  status: string;
  /** null hasta que el propietario elige; luego la candidatura elegida. */
  chosenCandidacyId: string | null;
  createdAt: string;
  updatedAt: string;
}

/** Un postulado dentro de la comparación (mínimo, sin PII). */
export interface EleccionCandidato {
  id: string;
  candidateName: string;
  stage: string;
  /** Verdicto de asegurabilidad (o null si aún no evaluado). */
  insurabilityVerdict: string | null;
  score: number | null;
  status: string;
  /** true = elegible para ser elegido one-click. */
  elegible: boolean;
}

/**
 * `GET /procesos/{id}/comparacion`. `snapshotHash` es la firma WYSIWYS del set mostrado: la
 * elección DEBE reenviarlo para que el back valide que el propietario eligió sobre lo que vio.
 */
export interface EleccionComparacion {
  processId: string;
  status: string;
  snapshotHash: string;
  candidates: EleccionCandidato[];
}

/** `POST /procesos/{id}/eleccion` — resultado. El `status` lo fija el back (nunca se asume). */
export interface EleccionOk {
  processId: string;
  status: 'seleccionado' | 'contrato_habilitado';
  chosenCandidacyId: string;
  decidedAt: string;
}
