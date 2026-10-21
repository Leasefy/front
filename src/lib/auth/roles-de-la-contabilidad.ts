import { AGENCY_ROLES, type AgencyRole } from '@/lib/auth/agency-roles'

/**
 * Quién entra a la contabilidad (espejo de `ContabilidadLecturaGuard` del back).
 *
 * · `ROLES_DE_LA_CONTABILIDAD`: el administrador, el contador y —desde los roles
 *   auxiliares (Nico, 20-10-2026)— el AUXILIAR CONTABLE, que registra asientos,
 *   egresos y facturas de proveedor. Son las pantallas donde registra o consulta:
 *   el libro, gastos, egresos, el PUC, reportes y estados financieros.
 * · Lo demás (certificados, copropiedades, deterioro, exógena, mapeo,
 *   presupuesto) sigue siendo sólo del administrador y el contador.
 */
export const ROLES_DE_LA_CONTABILIDAD: AgencyRole[] = [
  AGENCY_ROLES.ADMIN,
  AGENCY_ROLES.CONTADOR,
  AGENCY_ROLES.AUXILIAR_CONTABLE,
]
