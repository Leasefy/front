/**
 * Reportes con datos de ejemplo (el modo demo): el resumen del negocio, la rentabilidad por inmueble y la ocupación
 * del centro de reportes. Inquilinos, propietarios, asesores y direcciones INVENTADOS: no son de ningún cliente. Las
 * fechas se cuentan desde hoy, así la demo siempre se ve al día.
 *
 * Una inmobiliaria de 52 inmuebles en catálogo (46 arrendados) en Medellín y el Valle de Aburrá, con el recaudo del
 * mes a medio camino, dos cuotas ya en cartera, cuatro asesores y seis personas en el embudo. Las cifras cuadran
 * entre sí: lo que dice el resumen es lo que suma la ocupación.
 */
import type {
  Agente,
  InmobiliariaDashboardKPIs,
  OcupacionReport,
  RentabilidadFila,
  RentabilidadReport,
} from '@/lib/types/inmobiliaria';
import type { MedidaDeLaTasa } from '@/lib/tasa-de-recaudo';
import type { LecturaDeLaDemo } from './index';

const HORA = 3_600_000;
const DIA = 24 * HORA;

const haceRato = (ms: number) => new Date(Date.now() - ms).toISOString();
const enUnRato = (ms: number) => new Date(Date.now() + ms).toISOString();

/** `YYYY-MM` de hoy más `n` meses. */
function mesDesdeHoy(n: number): string {
  const d = new Date();
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + n, 1)).toISOString().slice(0, 7);
}

const hoy = () => new Date().toISOString().slice(0, 10);

const MEDIDA: MedidaDeLaTasa = {
  base: 'CAUSADO',
  porDefecto: true,
  rotulo: 'Recaudo sobre lo causado',
  definicion:
    'Lo que entró a las cuotas del mes ÷ lo que los contratos cobran ese mes. Sale de la deuda del contrato, exista o no el cobro.',
};

// ─── El resumen del negocio ─────────────────────────────────────────────────

const CAUSADO_DEL_MES = 128_450_000;
const ABONADO_DEL_MES = 104_870_000;
const EN_CARTERA_DEL_MES = 6_380_000;

function kpis(): InmobiliariaDashboardKPIs {
  const pct = Math.round((ABONADO_DEL_MES / CAUSADO_DEL_MES) * 10_000) / 100;
  return {
    totalProperties: 58,
    propertiesAvailable: 5,
    propertiesRented: 46,
    propertiesInProcess: 1,
    occupancyRate: 88.46,
    propertiesInCatalog: 52,
    propertiesOutOfCatalog: 6,
    propertiesRentedOutOfCatalog: 0,
    expectedRevenue: CAUSADO_DEL_MES,
    collectedRevenue: ABONADO_DEL_MES,
    pendingCollections: CAUSADO_DEL_MES - ABONADO_DEL_MES,
    lateCollections: EN_CARTERA_DEL_MES,
    collectionRate: pct,
    tasaDeRecaudo: { ...MEDIDA, numeradorCop: ABONADO_DEL_MES, denominadorCop: CAUSADO_DEL_MES, pct },
    totalCommissions: 12_845_000,
    collectionTrend: 4.2,
    commissionsTrend: 3.1,
    activeLeads: 23,
    scheduledVisits: 7,
    pendingApplications: 4,
    contractsInProgress: 3,
    totalAgents: 4,
    closedThisMonth: 5,
    avgDaysToClose: 18,
    totalPropietarios: 39,
    pendingDispersions: 2,
    deuda: {
      month: mesDesdeHoy(0),
      hoy: hoy(),
      total: {
        totalCop: 31_960_000,
        porVencerCop: 17_200_000,
        vencidaEnPlazoCop: 8_380_000,
        carteraCop: EN_CARTERA_DEL_MES,
        cuotas: 14,
        cuotasPorVencer: 8,
        cuotasVencidasEnPlazo: 4,
        cuotasEnCartera: 2,
      },
      delMes: {
        totalCop: CAUSADO_DEL_MES - ABONADO_DEL_MES,
        porVencerCop: 12_400_000,
        vencidaEnPlazoCop: 4_800_000,
        carteraCop: EN_CARTERA_DEL_MES,
        cuotas: 11,
        cuotasPorVencer: 6,
        cuotasVencidasEnPlazo: 3,
        cuotasEnCartera: 2,
      },
      causadoDelMesCop: CAUSADO_DEL_MES,
      abonadoDelMesCop: ABONADO_DEL_MES,
      recaudadoEnCajaCop: 106_120_000,
      porGirarAPropietariosCop: 18_900_000,
      cuotasDeInquilino: 46,
      contratosSinCuotas: 0,
      avisos: [],
    },
  };
}

const ASESORES: readonly { nombre: string; zona: string; inmuebles: number; arriendos: number; mes: number; anio: number; dias: number; conversion: number }[] = [
  { nombre: 'Daniela Restrepo', zona: 'El Poblado', inmuebles: 17, arriendos: 15, mes: 2, anio: 19, dias: 15, conversion: 31.25 },
  { nombre: 'Santiago Ospina', zona: 'Envigado', inmuebles: 14, arriendos: 12, mes: 2, anio: 14, dias: 19, conversion: 26.4 },
  { nombre: 'Camila Arboleda', zona: 'Laureles', inmuebles: 12, arriendos: 11, mes: 1, anio: 11, dias: 21, conversion: 22.5 },
  { nombre: 'Mateo Giraldo', zona: 'Sabaneta', inmuebles: 9, arriendos: 8, mes: 0, anio: 6, dias: 24, conversion: 18.75 },
];

function agentes(): Agente[] {
  return ASESORES.map((a, i) => ({
    id: `demo-ag-${i + 1}`,
    userId: `demo-agu-${i + 1}`,
    name: a.nombre,
    email: `${a.nombre.split(' ')[0].toLowerCase()}@inmobiliaria-demo.test`,
    phone: `+57 300 555 01${i + 1}0`,
    role: 'agent',
    status: 'active',
    commissionSplit: 30,
    assignedPropertyIds: [],
    hireDate: haceRato((400 + i * 120) * DIA),
    zone: a.zona,
    specialization: 'all',
    metrics: {
      assignedProperties: a.inmuebles,
      activeLeases: a.arriendos,
      closedThisMonth: a.mes,
      closedThisYear: a.anio,
      avgDaysToClose: a.dias,
      conversionRate: a.conversion,
    },
    createdAt: haceRato((400 + i * 120) * DIA),
    updatedAt: haceRato(2 * DIA),
  }));
}

/** El embudo como lo manda el back: la etapa en MAYÚSCULAS y el inmueble anidado. */
function embudo(): Record<string, unknown>[] {
  const filas: readonly [string, string, string, number, string, string][] = [
    ['Natalia Correa', 'CONTRACT', 'Apartamento en Envigado', 2_900_000, 'Cl 5 Sur # 25-80, apto 1104, Envigado', 'Firmar el contrato'],
    ['Esteban Mesa', 'APPROVED', 'Apartamento en El Poblado', 3_200_000, 'Cra 43A # 18 Sur 135, apto 805, Medellín', 'Enviar el contrato a firmar'],
    ['Paula Jaramillo', 'EVALUATION', 'Apartamento en Laureles', 2_400_000, 'Cra 70 # 44-10, apto 502, Medellín', 'Esperar el estudio'],
    ['Tomás Villa', 'APPLICATION', 'Casa en Sabaneta', 2_650_000, 'Cl 10 # 34-21, casa 7, Sabaneta', 'Revisar los documentos'],
    ['Isabela Cano', 'VISIT_SCHEDULED', 'Apartamento en Castropol', 4_100_000, 'Cra 25 # 1A Sur-155, apto 1201, Medellín', 'Visita el jueves 10:00 a. m.'],
    ['Julián Betancur', 'LEAD', 'Apartamento en Aves María', 2_100_000, 'Cl 79 Sur # 47E-80, apto 1602, Sabaneta', 'Llamar para agendar la visita'],
  ];
  return filas.map(([nombre, etapa, titulo, canon, direccion, siguiente], i) => ({
    id: `demo-pl-${i + 1}`,
    consignacionId: `demo-rc-${i + 1}`,
    agenteUserId: `demo-agu-${(i % ASESORES.length) + 1}`,
    candidateName: nombre,
    candidateEmail: `${nombre.split(' ')[0].toLowerCase()}@correo-demo.test`,
    candidatePhone: `+57 310 555 02${i + 1}0`,
    candidateAvatar: null,
    riskScore: null,
    riskLevel: null,
    stage: etapa,
    enteredStageAt: haceRato((i + 1) * DIA),
    daysInStage: i + 1,
    nextAction: siguiente,
    nextActionDate: enUnRato((i + 1) * DIA),
    lastContactDate: haceRato((i + 1) * 5 * HORA),
    notes: null,
    lostReason: null,
    completedLeaseId: null,
    createdAt: haceRato((i + 6) * DIA),
    updatedAt: haceRato((i + 1) * DIA),
    consignacion: { propertyId: `demo-rp-${i + 1}`, propertyTitle: titulo, propertyAddress: direccion, monthlyRent: canon },
  }));
}

// ─── La rentabilidad por inmueble ───────────────────────────────────────────

interface InmuebleDeLaRentabilidad {
  titulo: string;
  direccion: string;
  ciudad: string;
  zona: string;
  propietario: string;
  canon: number;
  valor: number;
  /** Días sin inquilino dentro del rango (se recorta al rango si es más corto). */
  vacantes: number;
  /** Cuotas en cartera al cierre del rango. */
  cuotasEnMora: number;
  /** Cuotas del rango que todavía no vencen. */
  cuotasPorVencer: number;
  gastos: number;
  /** Retención en la fuente de un local comercial (además del 4×1000). */
  retencion: number;
}

const DE_LA_RENTABILIDAD: readonly InmuebleDeLaRentabilidad[] = [
  { titulo: 'Local en El Poblado', direccion: 'Cra 37 # 8A-56, local 2', ciudad: 'Medellín', zona: 'El Poblado', propietario: 'Inversiones Arango Henao', canon: 6_800_000, valor: 1_150_000_000, vacantes: 0, cuotasEnMora: 0, cuotasPorVencer: 0, gastos: 450_000, retencion: 0.035 },
  { titulo: 'Apartamento en Castropol', direccion: 'Cra 25 # 1A Sur-155, apto 1102', ciudad: 'Medellín', zona: 'Castropol', propietario: 'Martha Londoño', canon: 4_100_000, valor: 790_000_000, vacantes: 45, cuotasEnMora: 0, cuotasPorVencer: 0, gastos: 280_000, retencion: 0 },
  { titulo: 'Apartamento en El Poblado', direccion: 'Cra 43A # 18 Sur 135, apto 702', ciudad: 'Medellín', zona: 'El Poblado', propietario: 'Carlos Mejía', canon: 3_200_000, valor: 620_000_000, vacantes: 0, cuotasEnMora: 0, cuotasPorVencer: 0, gastos: 380_000, retencion: 0 },
  { titulo: 'Apartamento en Envigado', direccion: 'Cl 5 Sur # 25-80, apto 902', ciudad: 'Envigado', zona: 'Envigado', propietario: 'Ricardo Posada', canon: 2_900_000, valor: 540_000_000, vacantes: 0, cuotasEnMora: 0, cuotasPorVencer: 1, gastos: 210_000, retencion: 0 },
  { titulo: 'Casa en Sabaneta', direccion: 'Cl 10 # 34-21, casa 4', ciudad: 'Sabaneta', zona: 'Sabaneta', propietario: 'Beatriz Uribe', canon: 2_650_000, valor: 480_000_000, vacantes: 0, cuotasEnMora: 0, cuotasPorVencer: 0, gastos: 1_150_000, retencion: 0 },
  { titulo: 'Apartamento en Laureles', direccion: 'Cra 70 # 44-10, apto 301', ciudad: 'Medellín', zona: 'Laureles', propietario: 'Lucía Henao', canon: 2_400_000, valor: 450_000_000, vacantes: 0, cuotasEnMora: 1, cuotasPorVencer: 0, gastos: 160_000, retencion: 0 },
  { titulo: 'Apartamento en Aves María', direccion: 'Cl 79 Sur # 47E-80, apto 1504', ciudad: 'Sabaneta', zona: 'Aves María', propietario: 'Jorge Arango', canon: 2_100_000, valor: 390_000_000, vacantes: 31, cuotasEnMora: 0, cuotasPorVencer: 0, gastos: 240_000, retencion: 0 },
  { titulo: 'Casa en Belén', direccion: 'Cl 30A # 76-41, casa 12', ciudad: 'Medellín', zona: 'Belén', propietario: 'Hernán Restrepo', canon: 1_950_000, valor: 360_000_000, vacantes: 0, cuotasEnMora: 0, cuotasPorVencer: 0, gastos: 620_000, retencion: 0 },
];

const redondo = (n: number) => Math.round(n);
const dosDecimales = (n: number) => Math.round(n * 100) / 100;

function mesesEntre(desde: string, hasta: string): number {
  const [a1, m1] = desde.split('-').map(Number);
  const [a2, m2] = hasta.split('-').map(Number);
  return Math.max(1, (a2 - a1) * 12 + (m2 - m1) + 1);
}

function filaDeLaRentabilidad(x: InmuebleDeLaRentabilidad, i: number, meses: number): RentabilidadFila {
  const dias = redondo(meses * 30.4);
  // En un rango corto la vacancia se queda en lo que cabe (y nunca en todo el rango).
  const vacantes = Math.min(x.vacantes, Math.max(0, dias - 30));
  const mesesConCobro = Math.max(1, meses - Math.round(vacantes / 30.4));
  const esperado = x.canon * mesesConCobro;
  const enMora = x.canon * Math.min(x.cuotasEnMora, mesesConCobro);
  const pendiente = enMora + x.canon * Math.min(x.cuotasPorVencer, mesesConCobro);
  const recaudado = esperado - pendiente;
  const comision = redondo(recaudado * 0.1);
  const retenciones = redondo(recaudado * 0.004 + recaudado * x.retencion);
  const gastos = Math.min(x.gastos, redondo(recaudado * 0.3));
  const neto = recaudado - comision - retenciones - gastos;
  return {
    consignacionId: `demo-rn-${i + 1}`,
    propertyId: `demo-rnp-${i + 1}`,
    codigo: 1001 + i,
    propertyTitle: x.titulo,
    propertyAddress: x.direccion,
    propertyCity: x.ciudad,
    propertyZone: x.zona,
    propietarioId: `demo-rno-${i + 1}`,
    propietarioNombre: x.propietario,
    canonCop: x.canon,
    canonDesconocido: false,
    mesesEnRango: meses,
    mesesConCobro,
    esperadoCop: esperado,
    recaudadoCop: recaudado,
    pendienteCop: pendiente,
    enMoraCop: enMora,
    tasaDeRecaudoPct: dosDecimales((recaudado / esperado) * 100),
    comisionCop: comision,
    retencionesYCargosCop: retenciones,
    gastosMantenimientoCop: gastos,
    netoPropietarioCop: neto,
    margenNetoPct: recaudado > 0 ? dosDecimales((neto / recaudado) * 100) : 0,
    ocupacionPct: dosDecimales(((dias - vacantes) / dias) * 100),
    ocupacionFuente: 'leases',
    diasEnRango: dias,
    diasVacantes: vacantes,
    ingresoPerdidoPorVacanciaCop: redondo((x.canon * vacantes) / 30.4),
    valorInmuebleCop: x.valor,
    rentabilidadBrutaAnualPct: dosDecimales(((x.canon * 12) / x.valor) * 100),
    rentabilidadNetaAnualPct: dosDecimales((((neto / meses) * 12) / x.valor) * 100),
    estado: 'ACTIVE',
    availability: 'RENTED',
  };
}

function rentabilidad(camino: string): RentabilidadReport {
  const pedidoDesde = /[?&]desde=(\d{4}-\d{2})/.exec(camino)?.[1];
  const pedidoHasta = /[?&]hasta=(\d{4}-\d{2})/.exec(camino)?.[1];
  const hasta = pedidoHasta ?? mesDesdeHoy(0);
  const desde = pedidoDesde ?? mesDesdeHoy(-11);
  const meses = Math.min(24, mesesEntre(desde, hasta));
  const filas = DE_LA_RENTABILIDAD.map((x, i) => filaDeLaRentabilidad(x, i, meses)).sort(
    (a, b) => b.netoPropietarioCop - a.netoPropietarioCop,
  );
  const suma = (k: keyof RentabilidadFila) => filas.reduce((s, f) => s + (f[k] as number), 0);
  const esperado = suma('esperadoCop');
  const recaudado = suma('recaudadoCop');
  return {
    desde,
    hasta,
    meses,
    generatedAt: new Date().toISOString(),
    medidaDeLaTasa: MEDIDA,
    filas,
    totales: {
      inmuebles: filas.length,
      esperadoCop: esperado,
      recaudadoCop: recaudado,
      pendienteCop: suma('pendienteCop'),
      enMoraCop: suma('enMoraCop'),
      tasaDeRecaudoPct: dosDecimales((recaudado / esperado) * 100),
      comisionCop: suma('comisionCop'),
      retencionesYCargosCop: suma('retencionesYCargosCop'),
      gastosMantenimientoCop: suma('gastosMantenimientoCop'),
      netoPropietarioCop: suma('netoPropietarioCop'),
      ocupacionPromedioPct: dosDecimales(suma('ocupacionPct') / filas.length),
      ingresoPerdidoPorVacanciaCop: suma('ingresoPerdidoPorVacanciaCop'),
      conValor: filas.length,
      gastosDescontadosEnElReporte: true,
    },
    notas: [],
  };
}

// ─── La ocupación (el visor del centro de reportes) ─────────────────────────

const ZONAS: readonly [string, number, number][] = [
  ['El Poblado', 14, 13],
  ['Envigado', 10, 9],
  ['Laureles', 9, 8],
  ['Sabaneta', 8, 7],
  ['Belén', 6, 5],
  ['Castropol', 5, 4],
];

const POR_INMUEBLE: readonly [string, string, string | null, number][] = [
  ['Apartamento en El Poblado', 'El Poblado', 'Laura Restrepo', 3_200_000],
  ['Local en El Poblado', 'El Poblado', 'Comercializadora El Poblado SAS', 6_800_000],
  ['Apartamento en Provenza', 'El Poblado', null, 3_600_000],
  ['Apartamento en Envigado', 'Envigado', 'Mariana Ochoa', 2_900_000],
  ['Casa en Zúñiga', 'Envigado', null, 3_400_000],
  ['Apartamento en Laureles', 'Laureles', 'Juan Pablo Cardona', 2_400_000],
  ['Apartamento en La 70', 'Laureles', null, 2_200_000],
  ['Casa en Sabaneta', 'Sabaneta', 'Andrés Gómez', 2_650_000],
  ['Apartamento en Aves María', 'Sabaneta', 'Valentina Ríos', 2_100_000],
  ['Casa en Belén', 'Belén', 'Felipe Zuluaga', 1_950_000],
  ['Apartamento en Castropol', 'Castropol', 'Sofía Vélez', 4_100_000],
  ['Apartamento en Los Balsos', 'Castropol', null, 4_600_000],
];

function ocupacion(): OcupacionReport {
  const total = ZONAS.reduce((s, z) => s + z[1], 0);
  const ocupados = ZONAS.reduce((s, z) => s + z[2], 0);
  const tendencia = [80.8, 82.7, 82.7, 84.6, 84.6, 86.5, 85.4, 86.5, 87.3, 88.5, 86.5, 88.5];
  return {
    totalProperties: total,
    totalOutOfCatalog: 6,
    totalOccupied: ocupados,
    totalVacant: total - ocupados,
    overallOccupancyRate: dosDecimales((ocupados / total) * 100),
    overallVacancyRate: dosDecimales(((total - ocupados) / total) * 100),
    zones: ZONAS.map(([zona, t, o]) => ({
      zone: zona,
      total: t,
      occupied: o,
      vacant: t - o,
      outOfCatalog: 0,
      rate: dosDecimales((o / t) * 100),
      vacancyRate: dosDecimales(((t - o) / t) * 100),
    })),
    byProperty: POR_INMUEBLE.map(([titulo, zona, inquilino, canon], i) => ({
      consignacionId: `demo-oc-${i + 1}`,
      propertyTitle: titulo,
      propertyZone: zona,
      availability: inquilino ? 'RENTED' : 'AVAILABLE',
      tenantName: inquilino ?? undefined,
      monthlyRent: canon,
      arrendado: Boolean(inquilino),
      enCatalogo: true,
    })),
    monthlyTrend: tendencia.map((rate, i) => ({ month: mesDesdeHoy(i - 11), rate })),
  };
}

export const REPORTES_DEMO: readonly LecturaDeLaDemo[] = [
  { patron: /^\/inmobiliaria\/analytics\/kpis(\?|$)/, respuesta: kpis },
  { patron: /^\/inmobiliaria\/agentes(\?|$)/, respuesta: agentes },
  { patron: /^\/inmobiliaria\/pipeline(\?|$)/, respuesta: embudo },
  { patron: /^\/inmobiliaria\/reports\/rentabilidad(\?|$)/, respuesta: rentabilidad },
  { patron: /^\/inmobiliaria\/reports\/ocupacion(\?|$)/, respuesta: ocupacion },
];
