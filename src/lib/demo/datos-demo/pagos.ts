/**
 * Pagos con datos de ejemplo (el modo demo): la deuda del mes de los inquilinos, cuota por cuota, con su cajón (por
 * vencer, vencida en plazo, cartera o pagada). Inquilinos y direcciones INVENTADOS (los de la demo de Contratos y su
 * embudo): no son de ningún cliente. Las fechas se cuentan desde hoy, así la demo siempre se ve al día.
 */
import type { CajonDeLaCuota, CarteraDelMes, EstadoDeCuota, FilaDeLaCuotaDelMes } from '@/lib/api/cartera.types';
import type { LecturaDeLaDemo } from './index';

const DIA = 24 * 3_600_000;

function mesDesdeHoy(n: number): string {
  const d = new Date();
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + n, 1)).toISOString().slice(0, 7);
}
const hoy = () => new Date().toISOString().slice(0, 10);
const diasDelMes = (mes: string) => {
  const [a, m] = mes.split('-').map(Number);
  return new Date(Date.UTC(a, m, 0)).getUTCDate();
};

interface CuotaDeEjemplo {
  contrato: string;
  codigo: string;
  inquilino: string;
  documento: string;
  telefono: string;
  inmueble: string;
  totalCop: number;
  /** Día del mes en que vence. */
  vence: number;
  diasDePlazo: number;
  /** Lo pagado este mes (en los meses anteriores, todas quedaron pagadas). */
  pagadoEsteMes: number;
}

const CUOTAS: readonly CuotaDeEjemplo[] = [
  { contrato: 'demo-ct-1', codigo: '101', inquilino: 'Laura Restrepo', documento: '1036654321', telefono: '+57 300 555 0110', inmueble: 'Cra 43A # 18 Sur 135, apto 702', totalCop: 2_350_000, vence: 5, diasDePlazo: 5, pagadoEsteMes: 2_350_000 },
  { contrato: 'demo-ct-2', codigo: '102', inquilino: 'Andrés Gómez', documento: '71234567', telefono: '+57 300 555 0120', inmueble: 'Cl 10 # 34-21, casa 4', totalCop: 1_850_000, vence: 5, diasDePlazo: 5, pagadoEsteMes: 1_850_000 },
  { contrato: 'demo-ct-3', codigo: '103', inquilino: 'Comercializadora El Poblado SAS', documento: '901234567', telefono: '+57 604 555 0130', inmueble: 'Cra 37 # 8A-56, local 2', totalCop: 7_616_000, vence: 5, diasDePlazo: 5, pagadoEsteMes: 7_616_000 },
  { contrato: 'demo-ct-4', codigo: '104', inquilino: 'Valentina Ríos', documento: '1017223344', telefono: '+57 300 555 0140', inmueble: 'Cl 79 Sur # 47E-80, apto 1504', totalCop: 2_900_000, vence: 15, diasDePlazo: 5, pagadoEsteMes: 2_900_000 },
  { contrato: 'demo-ct-5', codigo: '105', inquilino: 'Juan Pablo Cardona', documento: '98765432', telefono: '+57 300 555 0150', inmueble: 'Cra 70 # 44-10, apto 301', totalCop: 1_650_000, vence: 5, diasDePlazo: 5, pagadoEsteMes: 0 },
  { contrato: 'demo-ct-8', codigo: '108', inquilino: 'Sofía Vélez', documento: '1152998877', telefono: '+57 300 555 0180', inmueble: 'Cra 25 # 1A Sur-155, apto 1102', totalCop: 4_100_000, vence: 22, diasDePlazo: 10, pagadoEsteMes: 2_000_000 },
  { contrato: 'demo-ct-9', codigo: '109', inquilino: 'Esteban Mesa', documento: '1037001122', telefono: '+57 300 555 0190', inmueble: 'Cra 43A # 18 Sur 135, apto 805', totalCop: 3_200_000, vence: 10, diasDePlazo: 5, pagadoEsteMes: 3_200_000 },
  { contrato: 'demo-ct-10', codigo: '110', inquilino: 'Natalia Correa', documento: '1152667788', telefono: '+57 300 555 0200', inmueble: 'Cl 5 Sur # 25-80, apto 1104', totalCop: 2_900_000, vence: 31, diasDePlazo: 5, pagadoEsteMes: 0 },
  { contrato: 'demo-ct-11', codigo: '111', inquilino: 'Tomás Villa', documento: '1000223344', telefono: '+57 300 555 0210', inmueble: 'Cl 10 # 34-21, casa 7', totalCop: 2_650_000, vence: 31, diasDePlazo: 5, pagadoEsteMes: 0 },
  { contrato: 'demo-ct-12', codigo: '112', inquilino: 'Paula Jaramillo', documento: '1017889900', telefono: '+57 300 555 0220', inmueble: 'Cra 70 # 44-10, apto 502', totalCop: 2_400_000, vence: 25, diasDePlazo: 10, pagadoEsteMes: 0 },
];

const diasEntre = (a: string, b: string) => Math.round((Date.parse(b) - Date.parse(a)) / DIA);

function fila(c: CuotaDeEjemplo, mes: string): FilaDeLaCuotaDelMes {
  const esteMes = mes === mesDesdeHoy(0);
  const vence = `${mes}-${String(Math.min(c.vence, diasDelMes(mes))).padStart(2, '0')}`;
  const pagado = esteMes ? c.pagadoEsteMes : c.totalCop;
  const pendiente = c.totalCop - pagado;
  const vencida = vence < hoy();
  const diasDeMora = pendiente > 0 && vencida ? diasEntre(vence, hoy()) : 0;
  const cajon: CajonDeLaCuota = pendiente === 0 ? 'SIN_DEUDA' : !vencida ? 'POR_VENCER' : diasDeMora <= c.diasDePlazo ? 'VENCIDA_EN_PLAZO' : 'CARTERA';
  const estado: EstadoDeCuota = pendiente === 0 ? 'CANCELADA' : pagado > 0 ? 'PARCIAL' : 'PENDIENTE';
  return {
    cuotaId: `${c.contrato}-cuota-${mes}`,
    cobroId: null,
    contractId: c.contrato,
    contrato: c.codigo,
    contratoDeLeasefy: c.codigo,
    inquilino: c.inquilino,
    tenantId: `${c.contrato}-inquilino`,
    documento: c.documento,
    telefono: c.telefono,
    inmueble: c.inmueble,
    mes,
    vence,
    estado,
    cajon,
    diasDeMora,
    diasDePlazo: c.diasDePlazo,
    esVencida: vencida && pendiente > 0,
    enMora: cajon === 'CARTERA',
    enSiniestro: false,
    totalCop: c.totalCop,
    pagadoCop: pagado,
    pendienteCop: pendiente,
  };
}

function delMes(camino: string): CarteraDelMes {
  const mes = /[?&]mes=(\d{4}-\d{2})/.exec(camino)?.[1] ?? mesDesdeHoy(0);
  const filas = mes > mesDesdeHoy(0) ? [] : CUOTAS.map((c) => fila(c, mes));
  const suma = (k: 'totalCop' | 'pagadoCop' | 'pendienteCop', cajon?: CajonDeLaCuota) =>
    filas.filter((f) => !cajon || f.cajon === cajon).reduce((s, f) => s + f[k], 0);
  return {
    generadoEn: new Date().toISOString(),
    hoy: hoy(),
    mes,
    totales: {
      cuotas: filas.length,
      contratos: filas.length,
      inquilinos: filas.length,
      totalCop: suma('totalCop'),
      pagadoCop: suma('pagadoCop'),
      pendienteCop: suma('pendienteCop'),
      porVencerCop: suma('pendienteCop', 'POR_VENCER'),
      vencidaEnPlazoCop: suma('pendienteCop', 'VENCIDA_EN_PLAZO'),
      carteraCop: suma('pendienteCop', 'CARTERA'),
      cuotasEnCartera: filas.filter((f) => f.cajon === 'CARTERA').length,
      enSiniestroCop: 0,
      sinCuadrarCop: 0,
    },
    filas,
    contratosSinCuotas: 0,
    excluidas: [],
    avisos: [],
    sinReglasDeMora: false,
  };
}

export const PAGOS_DEMO: readonly LecturaDeLaDemo[] = [
  { patron: /^\/inmobiliaria\/cartera\/mes(\?|$)/, respuesta: delMes },
];
