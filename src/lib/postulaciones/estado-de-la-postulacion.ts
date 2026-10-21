import type { LandlordApplicationStatus } from '@/lib/api/applications.types';

/**
 * El estado de una postulación en palabras. Lo usan el cajón del candidato y
 * la ficha del centro de procesos: un solo lugar para que digan lo mismo.
 */
export const NOMBRE_DEL_ESTADO_DE_LA_POSTULACION: Record<LandlordApplicationStatus, string> = {
  DRAFT: 'Borrador',
  SUBMITTED: 'Postulado',
  UNDER_REVIEW: 'En revisión',
  APPROVED: 'Aprobado',
  REJECTED: 'Rechazado',
  NEEDS_INFO: 'Pide info',
  WITHDRAWN: 'Retirado',
  CONTRACT_FAILED: 'Contrato fallido',
  NO_ADJUDICADO: 'No adjudicado',
  PREAPPROVED: 'Preaprobado',
};
