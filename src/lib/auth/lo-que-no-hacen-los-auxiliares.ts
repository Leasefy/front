import { AGENCY_ROLES } from '@/lib/auth/agency-roles'

/**
 * 🔴 ROLES AUXILIARES (Nico, 20-10-2026): lo que la matriz de permisos no
 * alcanza a decir. Espejo de `back/src/inmobiliaria/agency/permissions/
 * los-auxiliares-no-firman-ni-aprueban.ts`: el back responde 403 con ESTAS
 * frases; acá sólo se esconde el botón para que nadie llegue al 403.
 *
 *   · AUXILIAR ADMINISTRATIVO: arma el contrato y el acta, pero no envía a
 *     firmar, no firma, no activa, no cancela, no termina ni emite el pagaré.
 *   · AUXILIAR DE MANTENIMIENTO (y el administrativo): coordina la reparación,
 *     pero no elige la cotización, no aprueba, no usa la emergencia ni escribe
 *     el costo final.
 */
export function elAuxiliarNoFirma(agencyRole: string | null | undefined): boolean {
  return agencyRole === AGENCY_ROLES.AUXILIAR_ADMINISTRATIVO
}

export function elAuxiliarNoApruebaCostos(agencyRole: string | null | undefined): boolean {
  return (
    agencyRole === AGENCY_ROLES.AUXILIAR_MANTENIMIENTO ||
    agencyRole === AGENCY_ROLES.AUXILIAR_ADMINISTRATIVO
  )
}

export const MOTIVO_EL_AUXILIAR_NO_FIRMA =
  'El auxiliar administrativo arma el contrato y lo deja listo: enviarlo a firmar, firmarlo, activarlo, cancelarlo o terminarlo lo hace el administrador o el asesor.'

export const MOTIVO_EL_AUXILIAR_NO_APRUEBA_COSTOS =
  'El auxiliar coordina la reparación, pero el costo lo aprueba el administrador o el coordinador: elegir la cotización, aprobar la solicitud, la emergencia y el costo final no van con este rol.'
