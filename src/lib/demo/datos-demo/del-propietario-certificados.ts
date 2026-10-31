/**
 * El propietario independiente → Certificados con datos de ejemplo (el modo demo; Nico 30-10-2026: «ver cómo quedaría
 * pintada cada sección»). Del apartamento de las demás demos (Cra 43A): el certificado de la retención que le practicó
 * en 2025 la empresa que lo arrendaba (3,5 % de $26.400.000, el mismo de la demo de Informes), la certificación de lo
 * que Leasefy le facturó ese año como mandatario y las facturas de la comisión de 2026. Números y cifras INVENTADOS.
 * Los PDF no se bajan en la demo (`requestBlob` lo frena con su frase).
 */
import type { CertificadoDelPropietario, MisCertificados } from '@/lib/api/tesoreria.types';
import type { CertificacionDelMandatario, FacturaDeLaComision } from '@/lib/api/portal-del-propietario.service';
import type { LecturaDeLaDemo } from './index';

const INMUEBLE = 'Cra 43A # 18 Sur 135, apto 702';
const BASE_2025 = 2_200_000 * 12;
const RETENIDO_2025 = (BASE_2025 * 35) / 1000;

const CERTIFICADO: CertificadoDelPropietario = {
  id: 'demo-cr-2025',
  agencyId: 'demo-leasefy',
  anio: 2025,
  numero: 18,
  nombre: 'Carlos Mejía',
  documento: '70123456',
  baseCop: BASE_2025,
  retefuenteCop: RETENIDO_2025,
  reteIvaCop: 0,
  reteIcaCop: 0,
  totalRetenidoCop: RETENIDO_2025,
  emitidoAt: '2026-01-15T15:00:00.000Z',
};

const CERTIFICACION: CertificacionDelMandatario = {
  id: 'demo-cm-2025',
  inmobiliaria: 'Leasefy',
  periodo: '2025',
  desde: '2025-01-01',
  hasta: '2025-12-31',
  facturas: 12,
  totalCop: (2_200_000 / 10) * 12,
};

/** Las facturas de la comisión de 2026, de la más nueva a la más vieja (marzo, el primer mes de Laura). */
function facturas(): FacturaDeLaComision[] {
  return ['2026-10', '2026-09', '2026-08', '2026-07', '2026-06', '2026-05', '2026-04', '2026-03'].map((mes, i) => ({
    id: `demo-fc-${mes}`,
    inmobiliaria: 'Leasefy',
    numero: `LF-${1287 - i * 41}`,
    mes,
    inmueble: INMUEBLE,
    totalCop: 235_000,
    emitidaEl: `${mes}-08T15:00:00.000Z`,
  }));
}

export const CERTIFICADOS_DEL_PROPIETARIO_DEMO: readonly LecturaDeLaDemo[] = [
  { patron: /^\/portal\/certificados-de-retencion(\?|$)/, respuesta: (): MisCertificados => ({ certificados: [CERTIFICADO], motivo: null }) },
  { patron: /^\/portal\/propietario\/certificaciones-del-mandatario(\?|$)/, respuesta: () => ({ disponible: true, certificaciones: [CERTIFICACION] }) },
  { patron: /^\/portal\/propietario\/facturas(\?|$)/, respuesta: () => ({ facturas: facturas() }) },
];
