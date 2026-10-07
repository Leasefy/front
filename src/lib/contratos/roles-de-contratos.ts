/**
 * 🔴 QA-CONT-95 (H-08 / UC-15, 04-10-2026): los roles que entran a las
 * pantallas de Contratos. Todos menos el ABOGADO EXTERNO: tiene `contratos`
 * para lo jurídico, pero «sólo sus casos» (O-05) y el back le niega el resto
 * con 403. Sin esto, /contratos/migrar le mostraba el cargador de archivos y
 * /contratos/firmas «No hay nadie pendiente de firmar» —un vacío que miente:
 * no es que no haya, es que no se le deja ver—. Es la misma lista que el menú
 * ya usa para no ofrecerle Contratos ni Inquilinos.
 */
import { AGENCY_ROLES, type AgencyRole } from '@/lib/auth/agency-roles';

export const ROLES_DE_CONTRATOS: AgencyRole[] = (Object.values(AGENCY_ROLES) as AgencyRole[]).filter(
  (rol) => rol !== AGENCY_ROLES.ABOGADO_EXTERNO,
);
