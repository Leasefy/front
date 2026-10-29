/**
 * Operación → Servicios públicos con datos de ejemplo (el modo demo). Personas, direcciones y cuentas INVENTADAS: no
 * son de ningún cliente. El mes es el que pida la pantalla.
 */
import type {
  EstadoDelMes,
  FacturaDeServicio,
  FilaDelTablero,
  ServiciosDelContrato,
  TableroDeServicios,
} from '@/lib/api/servicios-publicos.service';
import type { LecturaDeLaDemo } from './index';

interface ContratoDeEjemplo {
  id: string;
  contrato: string;
  inquilino: string;
  documento: string;
  inmueble: string;
  estado: EstadoDelMes;
  cuenta?: { numero: string; meses?: number; sinServicio?: boolean };
  recordado?: boolean;
}

const CONTRATOS: readonly ContratoDeEjemplo[] = [
  { id: 'demo-sp-1', contrato: '101', inquilino: 'Laura Restrepo', documento: '1036654321', inmueble: 'Cra 43A # 18 Sur 135, apto 702, Medellín', estado: 'AL_DIA', cuenta: { numero: '13249728' } },
  { id: 'demo-sp-2', contrato: '102', inquilino: 'Andrés Gómez', documento: '71234567', inmueble: 'Cl 10 # 34-21, casa 4, Sabaneta', estado: 'POR_REVISAR', cuenta: { numero: '20871456' }, recordado: true },
  { id: 'demo-sp-3', contrato: '103', inquilino: 'Comercializadora El Poblado SAS', documento: '901234567', inmueble: 'Cra 37 # 8A-56, local 2, Medellín', estado: 'AL_DIA' },
  { id: 'demo-sp-4', contrato: '104', inquilino: 'Valentina Ríos', documento: '1017223344', inmueble: 'Cl 79 Sur # 47E-80, apto 1504, Sabaneta', estado: 'SIN_FACTURA', cuenta: { numero: '18834012', meses: 12, sinServicio: true }, recordado: true },
  { id: 'demo-sp-5', contrato: '105', inquilino: 'Juan Pablo Cardona', documento: '98765432', inmueble: 'Cra 70 # 44-10, apto 301, Medellín', estado: 'RECHAZADA' },
  { id: 'demo-sp-6', contrato: '106', inquilino: 'Mariana Ochoa', documento: '1152334455', inmueble: 'Cl 5 Sur # 25-80, apto 902, Envigado', estado: 'AL_DIA', cuenta: { numero: '30115589' } },
];

function factura(c: ContratoDeEjemplo, mes: string): FacturaDeServicio | null {
  if (c.estado === 'SIN_FACTURA') return null;
  const [a, m] = mes.split('-').map(Number);
  const anterior = new Date(Date.UTC(a, m - 2, 1));
  const desde = anterior.toISOString().slice(0, 10);
  const hasta = new Date(Date.UTC(a, m - 1, 0)).toISOString().slice(0, 10);
  const estado = c.estado === 'AL_DIA' ? 'AL_DIA' : c.estado === 'RECHAZADA' ? 'RECHAZADA' : 'POR_REVISAR';
  return {
    id: `${c.id}-f`,
    contractId: c.id,
    servicio: 'ENERGIA',
    servicios: ['ENERGIA', 'AGUA', 'GAS', 'ASEO'],
    nombreDelServicio: 'Energía, acueducto y alcantarillado, gas y aseo',
    empresa: 'EPM',
    periodoDesde: desde,
    periodoHasta: hasta,
    valorCop: 186_400 + Number(c.contrato) * 1_300,
    tipo: 'MENSUAL',
    pagadaPor: 'INQUILINO',
    estado,
    tieneSoporte: true,
    soporteNombre: 'factura-epm.pdf',
    subidaPor: 'INQUILINO',
    liquidacion: null,
    nota: null,
    motivoDeLaRevision: estado === 'RECHAZADA' ? 'No se ve el sello de pagado.' : null,
    creadaAt: `${mes}-05T14:20:00.000Z`,
  };
}

function tablero(camino: string): TableroDeServicios {
  const mes = /[?&]mes=(\d{4}-\d{2})/.exec(camino)?.[1] ?? new Date().toISOString().slice(0, 7);
  const contratos: FilaDelTablero[] = CONTRATOS.map((c) => {
    const f = factura(c, mes);
    return {
      contractId: c.id,
      contrato: c.contrato,
      inquilino: c.inquilino,
      documentoDelInquilino: c.documento,
      inmueble: c.inmueble,
      estadoDelMes: c.estado,
      porRevisar: c.estado === 'POR_REVISAR' ? 1 : 0,
      ajustesPorRevisar: 0,
      entradaRegistrada: true,
      ultimaFactura: f,
      recordatorios: c.recordado ? [{ intento: 1, estado: 'ENVIADO', dia: `${mes}-03`, detalle: null }] : [],
      cuentas: c.cuenta
        ? [
            {
              empresa: 'EPM',
              numero: c.cuenta.numero,
              codigoDelInmueble: null,
              vigenciaMeses: c.cuenta.meses ?? null,
              conCobertura: c.cuenta.sinServicio ? false : null,
              cobertura: c.cuenta.sinServicio ? `${c.cuenta.meses} meses sin servicio de EPM` : null,
            },
          ]
        : [],
    };
  });
  const cuenta = (e: EstadoDelMes) => contratos.filter((c) => c.estadoDelMes === e).length;
  return {
    disponible: true,
    mes,
    resumen: { alDia: cuenta('AL_DIA'), porRevisar: cuenta('POR_REVISAR'), rechazadas: cuenta('RECHAZADA'), sinFactura: cuenta('SIN_FACTURA'), ajustesPorRevisar: 0 },
    contratos,
    recordatorio: { disponible: true, dia: 3, diaPorDefecto: 3, diaMaximo: 28 },
  };
}

function delContrato(camino: string): ServiciosDelContrato | null {
  const id = /\/contracts\/([^/]+)\/servicios-publicos/.exec(camino)?.[1];
  const c = CONTRATOS.find((x) => x.id === id);
  if (!c) return null;
  const mes = new Date().toISOString().slice(0, 7);
  const f = factura(c, mes);
  return {
    disponible: true,
    contractId: c.id,
    contrato: c.contrato,
    inquilino: c.inquilino,
    entrega: '2025-03-01',
    devolucion: null,
    entradaRegistrada: true,
    garantia: { saldoCop: 400_000 },
    facturas: f ? [f] : [],
  };
}

export const SERVICIOS_PUBLICOS_DEMO: readonly LecturaDeLaDemo[] = [
  { patron: /^\/inmobiliaria\/servicios-publicos(\?|$)/, respuesta: tablero },
  { patron: /^\/contracts\/demo-sp-[^/]+\/servicios-publicos$/, respuesta: delContrato },
];
