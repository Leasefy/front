/**
 * El propietario independiente → Arriendos y Estado de cuenta con datos de ejemplo (el modo demo; Nico 30-10-2026:
 * «ver cómo quedaría pintada cada sección»). El mismo apartamento de las demos de Contratos y Giros: Cra 43A, arrendado
 * a Laura Restrepo por $2.350.000 desde marzo, con la comisión del 10 % y el giro de $2.115.000 cada mes. Personas,
 * cuentas y cifras INVENTADAS.
 *
 * 🔴 `/portal/estado-de-cuenta` es también la pregunta del portal «¿una inmobiliaria le administra los inmuebles?»
 * (`useContratosAdministrados`): el portal la hace con `apiClient.getDeVerdad`, así que esta respuesta sólo la ve la
 * pantalla.
 */
import type { BackendLease, BackendPayment } from '@/lib/api/leases.types';
import type { EstadoDeCuenta, FilaDelEstadoDeCuenta } from '@/lib/types/estado-de-cuenta';
import { mesSiguiente } from './del-propietario-giros';
import type { LecturaDeLaDemo } from './index';

const CANON = 2_350_000;
const COMISION = 235_000;
const NETO = CANON - COMISION;
const LEASE = 'demo-ls-1';

/**
 * Marzo a noviembre de 2026. Laura pagó hasta octubre (julio, con unos días de atraso) y noviembre está por vencer.
 * Al propietario se le gira el 8 del mes siguiente (como en la demo de Giros): hasta septiembre ya se le giró; el de
 * octubre va en camino (8 de noviembre) y no está atrasado.
 */
const MESES = ['2026-03', '2026-04', '2026-05', '2026-06', '2026-07', '2026-08', '2026-09', '2026-10', '2026-11'];
const PAGADO_EL: Readonly<Record<string, string>> = { '2026-07': '2026-07-09' };
const POR_VENCER = '2026-11';
const EN_CAMINO = '2026-10';

function arriendo(): BackendLease {
  return {
    id: LEASE,
    contractId: 'demo-ct-1',
    propertyId: 'demo-ct-1-inmueble',
    landlordId: 'demo-propietario',
    tenantId: 'demo-ct-1-inquilino',
    status: 'ACTIVE',
    monthlyRent: CANON,
    deposit: 0,
    paymentDay: 5,
    venceElDia: 5,
    startDate: '2026-03-01',
    endDate: '2027-02-28',
    propertyTitle: 'Apartamento en El Poblado',
    propertyAddress: 'Cra 43A # 18 Sur 135, apto 702',
    propertyCity: 'Medellín',
    propertyThumbnail: null,
    tenantName: 'Laura Restrepo',
    tenantEmail: 'laura@ejemplo.test',
    tenantPhone: '300 555 0101',
    landlordName: 'Carlos Mejía',
    landlordEmail: 'carlos@ejemplo.test',
    landlordPhone: '300 555 0001',
    renovacion: null,
    avisoNoRenovar: null,
    createdAt: '2026-03-01T12:00:00.000Z',
    updatedAt: '2026-10-05T15:00:00.000Z',
  };
}

function pagos(): BackendPayment[] {
  return [...MESES].reverse().map((mes, i): BackendPayment => {
    const vence = `${mes}-05`;
    if (mes === POR_VENCER) return { id: `demo-pago-${mes}`, leaseId: LEASE, amount: CANON, concept: 'RENT', dueDate: vence, status: 'PENDING' };
    return {
      id: `demo-pago-${mes}`,
      leaseId: LEASE,
      amount: CANON,
      concept: 'RENT',
      dueDate: vence,
      paidDate: PAGADO_EL[mes] ?? `${mes}-0${(i % 3) + 2}`,
      status: 'PAID',
      method: i % 2 === 0 ? 'PSE' : 'NEQUI',
      reference: `PAG-${mes.replace('-', '')}-0702`,
    };
  });
}

const NOMBRE_DEL_MES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

function fila(mes: string): FilaDelEstadoDeCuenta {
  const [anio, m] = mes.split('-');
  const pendiente = mes === POR_VENCER || mes === EN_CAMINO;
  return {
    concepto: `Arriendo de ${NOMBRE_DEL_MES[Number(m) - 1]} de ${anio}`,
    estado: pendiente ? 'PENDIENTE' : 'CANCELADA',
    // Del lado del propietario la fila vence el día de su giro: el 8 del mes siguiente.
    fechaDePago: pendiente ? null : `${mesSiguiente(mes)}-08`,
    valorBruto: CANON,
    iva: 0,
    retencion: 0,
    reteIva: 0,
    reteIca: 0,
    comision: COMISION,
    ivaComision: 0,
    retencionComision: 0,
    reteIvaComision: 0,
    reteIcaComision: 0,
    valorNeto: NETO,
    fechaVencimiento: `${mesSiguiente(mes)}-08`,
    documentoDePago: pendiente ? null : { numero: `GIR-${mes.replace('-', '')}-0142`, tipo: 'GIRO', descripcion: 'Giro a Bancolombia •••• 4821' },
    parcial: false,
    periodoDesde: `${mes}-01`,
    periodoHasta: `${mes}-${new Date(Number(anio), Number(m), 0).getDate()}`,
    cajon: pendiente ? 'POR_VENCER' : 'SIN_DEUDA',
  };
}

function estadoDeCuenta(): EstadoDeCuenta {
  const filas = MESES.map(fila);
  const cancelado = filas.filter((f) => f.estado === 'CANCELADA').reduce((s, f) => s + f.valorNeto, 0);
  const pendiente = filas.filter((f) => f.estado === 'PENDIENTE').reduce((s, f) => s + f.valorNeto, 0);
  const totales = { cancelado, pendiente, restaPorPagar: pendiente };
  return {
    cliente: { nombre: 'Carlos Mejía', documento: '70123456', tipoDocumento: 'CC', tipo: 'PROPIETARIO' },
    inmobiliaria: { razonSocial: 'Leasefy', nombre: 'Leasefy', nit: null, matricula: null, telefono: null, ciudad: 'Medellín', logoUrl: null },
    fecha: '2026-10-30',
    contratos: [
      {
        id: 'demo-ct-1',
        numero: '101',
        numeroDeLeasefy: 101,
        rol: 'PROPIETARIO',
        inmueble: { direccion: 'Cra 43A # 18 Sur 135, apto 702' },
        vigente: true,
        estadoDelContrato: 'VIGENTE',
        inicio: '2026-03-01',
        secciones: { arriendos: filas, otrosConceptos: [] },
        totales,
        cortes: [],
      },
    ],
    totales,
    proximaCuota: { fecha: '2026-11-08', monto: NETO, contratos: 1 },
    porGirar: { hastaMes: '2026-10', porGirarCop: NETO, cuotas: 1, deduccionesCop: 0, proximosGirosCop: NETO * 4, proximosGirosHastaMes: '2027-02' },
    deducciones: { filas: [], porDescontarCop: 0, aplicadasCop: 0 },
  };
}

export const COBRO_DEL_PROPIETARIO_DEMO: readonly LecturaDeLaDemo[] = [
  { patron: /^\/leases(\?|$)/, respuesta: () => [arriendo()] },
  { patron: /^\/tenant-payments\/lease\/demo-ls-1(\?|$)/, respuesta: pagos },
  { patron: /^\/portal\/estado-de-cuenta(\?|$)/, respuesta: estadoDeCuenta },
];
