/**
 * Operación → Servicios públicos con datos de ejemplo (el modo demo). Personas, direcciones y cuentas INVENTADAS: no
 * son de ningún cliente. El mes es el que pida la pantalla.
 */
import type {
  EstadoDelMes,
  FacturaDeServicio,
  FilaDelTablero,
  LiquidacionDeEntradaEnHoja,
  LiquidacionDeSalida,
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
  /** 29-10-2026: el inicio del contrato (`SIN_INICIAR` = empieza después del corte del mes). */
  inicio?: string;
  /** La factura trae un acuerdo de pago del propietario y Servi la revisó. */
  conServi?: boolean;
}

const CONTRATOS: readonly ContratoDeEjemplo[] = [
  { id: 'demo-sp-1', contrato: '101', inquilino: 'Laura Restrepo', documento: '1036654321', inmueble: 'Cra 43A # 18 Sur 135, apto 702, Medellín', estado: 'AL_DIA', cuenta: { numero: '13249728' } },
  { id: 'demo-sp-2', contrato: '102', inquilino: 'Andrés Gómez', documento: '71234567', inmueble: 'Cl 10 # 34-21, casa 4, Sabaneta', estado: 'POR_REVISAR', cuenta: { numero: '20871456' }, recordado: true },
  { id: 'demo-sp-3', contrato: '103', inquilino: 'Comercializadora El Poblado SAS', documento: '901234567', inmueble: 'Cra 37 # 8A-56, local 2, Medellín', estado: 'AL_DIA' },
  { id: 'demo-sp-4', contrato: '104', inquilino: 'Valentina Ríos', documento: '1017223344', inmueble: 'Cl 79 Sur # 47E-80, apto 1504, Sabaneta', estado: 'SIN_FACTURA', cuenta: { numero: '18834012', meses: 12, sinServicio: true }, recordado: true },
  { id: 'demo-sp-5', contrato: '105', inquilino: 'Juan Pablo Cardona', documento: '98765432', inmueble: 'Cra 70 # 44-10, apto 301, Medellín', estado: 'RECHAZADA' },
  { id: 'demo-sp-6', contrato: '106', inquilino: 'Mariana Ochoa', documento: '1152334455', inmueble: 'Cl 5 Sur # 25-80, apto 902, Envigado', estado: 'AL_DIA', cuenta: { numero: '30115589' } },
  { id: 'demo-sp-7', contrato: '107', inquilino: 'Santiago Mejía', documento: '1020445566', inmueble: 'Cra 65 # 32D-40, apto 1203, Medellín', estado: 'SIN_INICIAR' },
];

const DIA = 86_400_000;
const dia = (d: Date) => d.toISOString().slice(0, 10);
const masDias = (iso: string, n: number) => dia(new Date(Date.parse(`${iso}T00:00:00Z`) + n * DIA));
const diasEntre = (desde: string, hasta: string) => Math.round((Date.parse(`${hasta}T00:00:00Z`) - Date.parse(`${desde}T00:00:00Z`)) / DIA) + 1; // redondeo: no es plata (días)
const mesSiguiente = (mes: string) => {
  const [a, m] = mes.split('-').map(Number);
  return m === 12 ? `${a + 1}-01` : `${a}-${String(m + 1).padStart(2, '0')}`;
};
/** El inicio de cada contrato de ejemplo: el del que no había empezado cae después del corte del mes. */
const inicioDe = (c: ContratoDeEjemplo, mes: string) => c.inicio ?? (c.estado === 'SIN_INICIAR' ? `${mes}-20` : '2025-03-01');

function factura(c: ContratoDeEjemplo, mes: string): FacturaDeServicio | null {
  if (c.estado === 'SIN_FACTURA' || c.estado === 'SIN_INICIAR') return null;
  // Portofino 29-10-2026: el corte va del 16 del mes anterior al 15 del mes, y se factura el mes siguiente.
  const [a, m] = mes.split('-').map(Number);
  const desde = dia(new Date(Date.UTC(a, m - 2, 16)));
  const hasta = `${mes}-15`;
  const estado = c.estado === 'AL_DIA' ? 'AL_DIA' : c.estado === 'RECHAZADA' ? 'RECHAZADA' : 'POR_REVISAR';
  const valorCop = 186_400 + Number(c.contrato) * 1_300;
  const conServi = c.conServi ?? c.estado === 'POR_REVISAR';
  return {
    id: `${c.id}-f`,
    contractId: c.id,
    servicio: 'ENERGIA',
    servicios: ['ENERGIA', 'AGUA', 'GAS', 'ASEO'],
    nombreDelServicio: 'Energía, acueducto y alcantarillado, gas y aseo',
    empresa: 'EPM',
    periodoDesde: desde,
    periodoHasta: hasta,
    corte: { desde, hasta, dias: diasEntre(desde, hasta) },
    mesDelCorte: mes,
    mesFacturado: mesSiguiente(mes),
    mesFacturadoSegun: c.estado === 'AL_DIA' ? 'FACTURA' : 'ESTIMADO',
    comoCaeEnElContrato: 'DENTRO',
    conceptosDelPropietario: conServi ? [{ tipo: 'ACUERDO_DE_PAGO', concepto: 'Cuota 3 de 12 del acuerdo de pago', valorCop: 25_000 }] : [],
    revisionDeServi: conServi
      ? {
          veredicto: 'CUADRA',
          motivos: ['La cuenta, el corte y el valor coinciden con la factura, y trae el sello de pagado.'],
          leido: { empresa: 'EPM', numeroDeCuenta: c.cuenta?.numero ?? null, periodoDesde: desde, periodoHasta: hasta, valorCop, pagada: true, mesFacturado: mesSiguiente(mes) },
          ajuste: null,
          conceptosDelPropietario: [{ tipo: 'ACUERDO_DE_PAGO', concepto: 'Cuota 3 de 12 del acuerdo de pago', valorCop: 25_000 }],
          comoCaeEnElContrato: 'DENTRO',
          entrada: null,
          propuestas: [
            { proceso: 'servicios.aprobar', clave: `factura:${c.id}`, resumen: 'Aprobar la factura: queda al día', montoCop: null },
            { proceso: 'servicios.ajuste', clave: `propietario:${c.id}`, resumen: 'Descontarle al propietario el acuerdo de pago', montoCop: 25_000 },
          ],
          revisadaEn: `${mes}-18T09:30:00.000Z`,
        }
      : null,
    valorCop,
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
      entradaRegistrada: c.estado !== 'SIN_INICIAR',
      inicio: inicioDe(c, mes),
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
    resumen: {
      alDia: cuenta('AL_DIA'),
      porRevisar: cuenta('POR_REVISAR'),
      rechazadas: cuenta('RECHAZADA'),
      sinFactura: cuenta('SIN_FACTURA'),
      sinIniciar: cuenta('SIN_INICIAR'),
      ajustesPorRevisar: 0,
    },
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

/** La liquidación de la entrega (29-10-2026): dos cortes estimados con el promedio de seis facturas. */
function liquidacionDeSalida(camino: string): LiquidacionDeSalida | null {
  const id = /\/contracts\/([^/]+)\/servicios-publicos/.exec(camino)?.[1];
  const c = CONTRATOS.find((x) => x.id === id);
  if (!c) return null;
  const pedida = /[?&]fechaEntrega=(\d{4}-\d{2}-\d{2})/.exec(camino)?.[1];
  const hoy = dia(new Date());
  const fechaEntrega = pedida ?? `${hoy.slice(0, 7)}-28`;
  const tramitesCop = Number(/[?&]tramitesCop=(\d+)/.exec(camino)?.[1] ?? 10_000);
  const saldoAFavorCop = Number(/[?&]saldoAFavorCop=(\d+)/.exec(camino)?.[1] ?? 0);
  const tarifa = 6_893;
  const grupo = 'AGUA,ASEO,ENERGIA,GAS';
  const servicios = ['AGUA', 'ASEO', 'ENERGIA', 'GAS'] as const;
  const nombre = 'Energía, acueducto y alcantarillado, gas y aseo';
  // Los cortes del 16 al 15 desde dos meses antes de la entrega hasta el día de la entrega.
  const [a, m] = fechaEntrega.split('-').map(Number);
  const filas: LiquidacionDeSalida['filas'] = [];
  for (let desde = dia(new Date(Date.UTC(a, m - 3, 16))); desde <= fechaEntrega && filas.length < 6; ) {
    const nominal = dia(new Date(Date.UTC(Number(desde.slice(0, 4)), Number(desde.slice(5, 7)), 15)));
    const hasta = nominal > fechaEntrega ? fechaEntrega : nominal;
    const dias = diasEntre(desde, hasta);
    filas.push({ grupo, servicios: [...servicios], nombreDelServicio: nombre, mesFacturado: mesSiguiente(nominal.slice(0, 7)), corteDesde: desde, corteHasta: hasta, dias, tarifaDiariaCop: tarifa, valorCop: dias * tarifa, estimado: true, valorAMano: false, facturaId: null });
    desde = masDias(nominal, 1);
  }
  const subtotalCop = filas.reduce((s, f) => s + f.valorCop, 0);
  const neto = subtotalCop + tramitesCop - saldoAFavorCop;
  return {
    disponible: true,
    contractId: c.id,
    contrato: c.contrato,
    inquilino: c.inquilino,
    inmueble: c.inmueble,
    fechaEntrega,
    fechaEntregaDe: pedida ? 'PEDIDA' : 'FIN_DEL_CONTRATO',
    tramitesPorDefectoCop: 10_000,
    anticipoDelContratoCop: 0,
    facturasDelPromedio: 6,
    grupos: [
      { grupo, servicios: [...servicios], nombreDelServicio: nombre, ultimoCortePagado: filas[0] ? masDias(filas[0].corteDesde, -1) : null, diaDeCorte: 15, tarifa: { tarifaDiariaCop: tarifa, desviacionCop: 410, facturasUsadas: 6, cortes: [] } },
    ],
    filas,
    subtotalCop,
    tramitesCop,
    saldoAFavorCop,
    totalCop: Math.max(0, neto),
    aDevolverCop: Math.max(0, -neto),
    sinHistorial: false,
    avisos: [],
    frase: '',
  };
}

/** La hoja de entrada (anterior vs nuevo), partida por días al peso (datos de ejemplo). */
function hojaDeEntrada(desde: string, hasta: string, valorCop: number, entrega: string): LiquidacionDeEntradaEnHoja | null {
  if (!(entrega > desde && entrega <= hasta)) return null;
  const total = diasEntre(desde, hasta);
  const delAnterior = diasEntre(desde, masDias(entrega, -1));
  const anterior = Math.round((valorCop * delAnterior) / total); // redondeo: al peso, datos de ejemplo
  return {
    mesFacturado: mesSiguiente(hasta.slice(0, 7)),
    corteDesde: desde,
    corteHasta: hasta,
    diasDelCorte: total,
    fechaEntrega: entrega,
    anterior: { desde, hasta: masDias(entrega, -1), dias: delAnterior, valorCop: anterior },
    nuevo: { desde: entrega, hasta, dias: total - delAnterior, valorCop: valorCop - anterior },
    totalCop: valorCop,
    frase: 'Datos de ejemplo: la factura se parte por los días de consumo de cada uno.',
  };
}

function simularEntrada(camino: string): LiquidacionDeEntradaEnHoja | null {
  const q = new URLSearchParams(camino.split('?')[1] ?? '');
  return hojaDeEntrada(q.get('periodoDesde') ?? '', q.get('periodoHasta') ?? '', Number(q.get('valorCop') ?? 0), q.get('entrega') ?? '');
}

function entradaDeLaFactura(camino: string): LiquidacionDeEntradaEnHoja | null {
  const id = /\/facturas\/(demo-sp-[^/]+)-f\//.exec(camino)?.[1];
  const c = CONTRATOS.find((x) => x.id === id);
  if (!c) return null;
  const mes = dia(new Date()).slice(0, 7);
  const f = factura({ ...c, estado: 'AL_DIA' }, mes);
  if (!f) return null;
  const entrega = /[?&]entrega=(\d{4}-\d{2}-\d{2})/.exec(camino)?.[1] ?? masDias(f.periodoDesde, 10);
  return hojaDeEntrada(f.periodoDesde, f.periodoHasta, f.valorCop, entrega);
}

export const SERVICIOS_PUBLICOS_DEMO: readonly LecturaDeLaDemo[] = [
  { patron: /^\/inmobiliaria\/servicios-publicos\/liquidacion-de-entrada\?/, respuesta: simularEntrada },
  { patron: /^\/inmobiliaria\/servicios-publicos\/facturas\/demo-sp-[^/]+\/liquidacion-de-entrada/, respuesta: entradaDeLaFactura },
  { patron: /^\/inmobiliaria\/servicios-publicos(\?|$)/, respuesta: tablero },
  { patron: /^\/contracts\/demo-sp-[^/]+\/servicios-publicos\/liquidacion-de-salida/, respuesta: liquidacionDeSalida },
  { patron: /^\/contracts\/demo-sp-[^/]+\/servicios-publicos$/, respuesta: delContrato },
];
