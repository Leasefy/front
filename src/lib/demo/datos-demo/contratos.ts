/**
 * Arrendamientos → Contratos con datos de ejemplo (el modo demo). Personas, direcciones y cifras INVENTADAS: no son de
 * ningún cliente.
 */
import type { BackendContract } from '@/lib/api/contracts.types';
import type { LecturaDeLaDemo } from './index';

const BASE = {
  landlordId: 'demo-propietario',
  landlordEmail: null,
  tenantPhone: null,
  propertyCity: 'Medellín',
  propertyAdminFee: null,
  paymentDay: 5,
  createdAt: '2025-01-10T15:00:00.000Z',
  updatedAt: '2026-10-01T15:00:00.000Z',
  usoInmueble: 'VIVIENDA' as const,
  periodicidad: 'MENSUAL' as const,
};

const FILAS: ReadonlyArray<[string, number, string, string, string, string, number, string, string, string]> = [
  // id, código, inquilino, documento, propietario, dirección, canon, inicio, fin, estado
  ['demo-ct-1', 101, 'Laura Restrepo', '1036654321', 'Carlos Mejía', 'Cra 43A # 18 Sur 135, apto 702', 2_350_000, '2026-03-01', '2027-02-28', 'ACTIVE'],
  ['demo-ct-2', 102, 'Andrés Gómez', '71234567', 'María Isabel Uribe', 'Cl 10 # 34-21, casa 4', 1_850_000, '2026-06-01', '2027-05-31', 'ACTIVE'],
  ['demo-ct-3', 103, 'Comercializadora El Poblado SAS', '901234567', 'Inversiones Palmas SAS', 'Cra 37 # 8A-56, local 2', 6_400_000, '2024-09-01', '2027-08-31', 'ACTIVE'],
  ['demo-ct-4', 104, 'Valentina Ríos', '1017223344', 'Jorge Arango', 'Cl 79 Sur # 47E-80, apto 1504', 2_900_000, '2026-01-15', '2027-01-14', 'ACTIVE'],
  ['demo-ct-5', 105, 'Juan Pablo Cardona', '98765432', 'Luz Marina Henao', 'Cra 70 # 44-10, apto 301', 1_650_000, '2025-12-01', '2026-11-30', 'ACTIVE'],
  ['demo-ct-6', 106, 'Mariana Ochoa', '1152334455', 'Carlos Mejía', 'Cl 5 Sur # 25-80, apto 902', 3_100_000, '2026-11-01', '2027-10-31', 'PENDING_SIGNATURE'],
  ['demo-ct-7', 107, 'Felipe Zuluaga', '1020456789', 'Ana Lucía Vélez', 'Cra 80 # 33-15, apto 210', 1_400_000, '2023-04-01', '2025-03-31', 'TERMINATED'],
];

function contratos(): BackendContract[] {
  return FILAS.map(([id, code, inquilino, documento, propietario, direccion, canon, inicio, fin, status]) => ({
    ...BASE,
    id,
    code,
    propertyId: `${id}-inmueble`,
    tenantId: `${id}-inquilino`,
    status,
    landlordName: propietario,
    landlordDocument: null,
    tenantName: inquilino,
    tenantEmail: `${inquilino.split(' ')[0].toLowerCase()}@ejemplo.test`,
    tenantDocument: documento,
    propertyAddress: direccion,
    monthlyRent: canon,
    startDate: inicio,
    endDate: fin,
    signedAt: status === 'PENDING_SIGNATURE' ? null : `${inicio}T12:00:00.000Z`,
    activatedAt: status === 'ACTIVE' ? `${inicio}T12:00:00.000Z` : null,
  })) as BackendContract[];
}

export const CONTRATOS_DEMO: readonly LecturaDeLaDemo[] = [
  { patron: /^\/contracts(\?|$)/, respuesta: contratos },
  { patron: /^\/contracts\/demo-ct-[^/?]+$/, respuesta: (camino) => contratos().find((c) => camino.endsWith(c.id)) ?? null },
];
