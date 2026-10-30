/**
 * Nómina con datos de ejemplo (el modo demo): el estado del módulo, el resumen del mes, los períodos del año con su
 * liquidación y las personas. Personas INVENTADAS (los asesores de la demo de Reportes y su equipo): no son de ningún
 * cliente. Las fechas se cuentan desde hoy.
 *
 * Las cifras se arman con la forma de una nómina colombiana mensual (salud y pensión del trabajador, aportes del
 * empleador, auxilio de transporte para los salarios bajos, provisiones de prestaciones), redondeadas como en un
 * desprendible. Son de ejemplo: los porcentajes de verdad los pone el back con los parámetros del año.
 */
import type {
  CatalogoDePersonas,
  EstadoDeNomina,
  LiquidacionDeNomina,
  LineaDeLiquidacion,
  PeriodoConLiquidaciones,
  PeriodoDeNomina,
  PersonaDeNomina,
  Periodos,
  Personas,
  ResumenDelMes,
  TipoDePersona,
} from '@/lib/api/nomina.types';
import type { LecturaDeLaDemo } from './index';

const DIA = 24 * 3_600_000;
const haceRato = (ms: number) => new Date(Date.now() - ms).toISOString();

function mesDesdeHoy(n: number): string {
  const d = new Date();
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + n, 1)).toISOString().slice(0, 7);
}
const ultimoDia = (mes: string) => {
  const [a, m] = mes.split('-').map(Number);
  return `${mes}-${String(new Date(Date.UTC(a, m, 0)).getUTCDate()).padStart(2, '0')}`;
};

const AUXILIO = 200_000;

const EQUIPO: readonly { nombre: string; documento: string; cargo: string; tipo: TipoDePersona; salario: number; ingreso: number; correo: string }[] = [
  { nombre: 'Daniela Restrepo', documento: '1037612345', cargo: 'Asesora comercial', tipo: 'EMPLEADO', salario: 2_600_000, ingreso: 420, correo: 'daniela@inmobiliaria-demo.test' },
  { nombre: 'Santiago Ospina', documento: '1017234567', cargo: 'Asesor comercial', tipo: 'EMPLEADO', salario: 2_600_000, ingreso: 540, correo: 'santiago@inmobiliaria-demo.test' },
  { nombre: 'Camila Arboleda', documento: '1152445566', cargo: 'Asesora comercial', tipo: 'EMPLEADO', salario: 2_400_000, ingreso: 300, correo: 'camila@inmobiliaria-demo.test' },
  { nombre: 'Natalia Henao', documento: '43987654', cargo: 'Contadora', tipo: 'EMPLEADO', salario: 4_800_000, ingreso: 900, correo: 'natalia@inmobiliaria-demo.test' },
  { nombre: 'Julián Mesa', documento: '1036998877', cargo: 'Auxiliar de cartera', tipo: 'EMPLEADO', salario: 1_900_000, ingreso: 210, correo: 'julian@inmobiliaria-demo.test' },
  { nombre: 'Laura Tobón', documento: '1000456789', cargo: 'Aprendiz SENA · gestión administrativa', tipo: 'APRENDIZ', salario: 1_300_000, ingreso: 95, correo: 'laura.t@inmobiliaria-demo.test' },
];

function personas(): PersonaDeNomina[] {
  return EQUIPO.map((p, i) => ({
    id: `demo-np-${i + 1}`,
    tipo: p.tipo,
    nombre: p.nombre,
    documentoTipo: 'CC',
    documento: p.documento,
    correo: p.correo,
    telefono: `+57 300 555 03${i}0`,
    cargo: p.cargo,
    sedeId: null,
    fechaIngreso: haceRato(p.ingreso * DIA).slice(0, 10),
    fechaRetiro: null,
    tipoContrato: p.tipo === 'APRENDIZ' ? 'APRENDIZAJE' : 'INDEFINIDO',
    causalRetiro: null,
    salarioCop: p.salario,
    salarioIntegral: false,
    periodicidad: 'MENSUAL',
    auxilioTransporte: p.salario <= 2_600_000 && p.tipo !== 'APRENDIZ',
    claseRiesgoArl: 'I',
    eps: 'Sura EPS',
    fondoPension: p.tipo === 'APRENDIZ' ? null : 'Protección',
    fondoCesantias: p.tipo === 'APRENDIZ' ? null : 'Protección',
    caja: 'Comfama',
    banco: 'Bancolombia',
    tipoCuenta: 'AHORROS',
    numeroDeCuenta: `****${String(4310 + i * 17).slice(-4)}`,
    procedimientoRetencion: 1,
    porcentajeFijoBps: null,
    tieneDependientes: false,
    interesesViviendaMesCop: null,
    medicinaPrepagadaMesCop: null,
    aportesVoluntariosMesCop: null,
    perfilTributario: null,
    responsableIva: null,
    tarifaIcaPorMil: null,
    etapaAprendizaje: p.tipo === 'APRENDIZ' ? 'PRODUCTIVA' : null,
    activo: true,
    notas: null,
  }));
}

function linea(id: string, orden: number, codigo: string, nombre: string, clase: LineaDeLiquidacion['clase'], valorCop: number, cuentaPuc: string): LineaDeLiquidacion {
  return { id, orden, codigo, nombre, clase, cantidadCentesimas: null, valorCop, constitutivoSalario: codigo === 'SALARIO', cuentaPuc, detalle: null, requiereValidacionContador: false, motivoValidacion: null };
}

function liquidacion(periodoId: string, i: number): LiquidacionDeNomina {
  const p = EQUIPO[i];
  const aprendiz = p.tipo === 'APRENDIZ';
  const auxilio = !aprendiz && p.salario <= 2_600_000 ? AUXILIO : 0;
  const salud = aprendiz ? 0 : Math.round(p.salario * 0.04);
  const pension = aprendiz ? 0 : Math.round(p.salario * 0.04);
  const devengado = p.salario + auxilio;
  const deducciones = salud + pension;
  const aportes = aprendiz ? Math.round(p.salario * 0.04522) : Math.round(p.salario * 0.16522);
  const provisiones = aprendiz ? 0 : Math.round((p.salario + auxilio) * 0.1767 + p.salario * 0.0417);
  const id = `${periodoId}-l${i + 1}`;
  const lineas = [
    linea(`${id}-1`, 1, aprendiz ? 'APOYO_SOSTENIMIENTO' : 'SALARIO', aprendiz ? 'Apoyo de sostenimiento' : 'Salario básico', 'DEVENGADO', p.salario, aprendiz ? '510527' : '510506'),
    ...(auxilio ? [linea(`${id}-2`, 2, 'AUXILIO_TRANSPORTE', 'Auxilio de transporte', 'DEVENGADO', auxilio, '510527')] : []),
    ...(salud ? [linea(`${id}-3`, 3, 'SALUD_TRABAJADOR', 'Salud (4 %)', 'DEDUCCION', salud, '237005')] : []),
    ...(pension ? [linea(`${id}-4`, 4, 'PENSION_TRABAJADOR', 'Pensión (4 %)', 'DEDUCCION', pension, '238030')] : []),
  ];
  return {
    id,
    periodoId,
    personaId: `demo-np-${i + 1}`,
    nombre: p.nombre,
    documento: p.documento,
    cargo: p.cargo,
    tipo: p.tipo,
    salarioCop: p.salario,
    sedeId: null,
    diasLiquidados: 30,
    devengadoCop: devengado,
    deduccionesCop: deducciones,
    netoCop: devengado - deducciones,
    aportesEmpleadorCop: aportes,
    provisionesCop: provisiones,
    ibcCop: p.salario,
    baseRetencionCop: Math.max(0, p.salario - deducciones),
    retencionCop: 0,
    esDefinitiva: false,
    fechaRetiro: null,
    causalRetiro: null,
    requiereValidacionContador: false,
    avisos: null,
    desprendibleEnviadoA: p.correo,
    desprendibleEnviadoAt: null,
    desprendibleError: null,
    desprendibleIntentos: 0,
    lineas,
  };
}

/** Los meses del año hasta el actual: el de este mes aprobado y por pagar, los anteriores pagados. */
function periodosDelAnio(): PeriodoDeNomina[] {
  const actual = mesDesdeHoy(0);
  const mesActual = Number(actual.slice(5, 7));
  const lista: PeriodoDeNomina[] = [];
  for (let k = 0; k < Math.min(mesActual, 10); k++) {
    const mes = mesDesdeHoy(-k);
    const id = `demo-pn-${mes}`;
    const liqs = EQUIPO.map((_, i) => liquidacion(id, i));
    const estado: PeriodoDeNomina['estado'] = k === 0 ? 'APROBADO' : 'PAGADO';
    lista.push({
      id,
      mes,
      quincena: null,
      desde: `${mes}-01`,
      hasta: ultimoDia(mes),
      estado,
      totalDevengadoCop: liqs.reduce((s, l) => s + l.devengadoCop, 0),
      totalDeduccionesCop: liqs.reduce((s, l) => s + l.deduccionesCop, 0),
      totalNetoCop: liqs.reduce((s, l) => s + l.netoCop, 0),
      totalAportesCop: liqs.reduce((s, l) => s + l.aportesEmpleadorCop, 0),
      personas: liqs.length,
      aprobadoAt: k === 0 ? haceRato(DIA) : haceRato((k * 30 - 2) * DIA),
      pagadoAt: k >= 1 ? haceRato((k * 30 - 3) * DIA) : null,
      asientoId: `demo-as-${mes}`,
      loteDeEgresosId: k >= 1 ? `demo-le-${mes}` : null,
      motivoAnulacion: null,
    });
  }
  return lista;
}

function periodos(camino: string): Periodos {
  const mes = /[?&]mes=(\d{4}-\d{2})/.exec(camino)?.[1];
  const estado = /[?&]estado=([A-Z]+)/.exec(camino)?.[1];
  return {
    disponible: true,
    motivo: null,
    periodos: periodosDelAnio().filter((p) => (!mes || p.mes === mes) && (!estado || p.estado === estado)),
  };
}

function periodo(camino: string): PeriodoConLiquidaciones | null {
  const p = periodosDelAnio().find((x) => camino.endsWith(x.id));
  if (!p) return null;
  return { ...p, liquidaciones: EQUIPO.map((_, i) => liquidacion(p.id, i)) };
}

function resumen(camino: string): ResumenDelMes {
  const mes = /[?&]mes=(\d{4}-\d{2})/.exec(camino)?.[1] ?? mesDesdeHoy(0);
  const liqs = EQUIPO.map((_, i) => liquidacion(`demo-pn-${mes}`, i));
  const devengado = liqs.reduce((s, l) => s + l.devengadoCop, 0);
  const aportes = liqs.reduce((s, l) => s + l.aportesEmpleadorCop, 0);
  const provisiones = liqs.reduce((s, l) => s + l.provisionesCop, 0);
  return {
    disponible: true,
    motivo: null,
    mes,
    personas: liqs.length,
    devengadoCop: devengado,
    aportesCop: aportes,
    provisionesCop: provisiones,
    netoCop: liqs.reduce((s, l) => s + l.netoCop, 0),
    retencionCop: 0,
    costoTotalCop: devengado + aportes + provisiones,
    porSede: [{ sedeId: null, devengadoCop: devengado, aportesCop: aportes, provisionesCop: provisiones }],
  };
}

function estado(): EstadoDeNomina {
  return {
    anio: Number(mesDesdeHoy(0).slice(0, 4)),
    parametros: { disponible: true, motivo: null, completos: true, queFalta: [], confirmados: true },
    personas: { disponible: true, total: EQUIPO.length, cuotaDeAprendices: { obligada: false, minimos: 0, actuales: 1, faltan: 0, aviso: null, fuente: 'Ley 789 de 2002' } },
    conceptos: { disponible: true, sembrados: 24, deSistema: 24, sinCuenta: [] },
    nominaElectronica: { nombre: 'Feel', configurado: true, esDePrueba: false, aviso: null, pila: 'Aportes en línea' },
    avisos: {
      pila: 'La planilla de aportes (PILA) se paga por el operador; Leasefy te deja el archivo listo.',
      recobroEps: 'Las incapacidades de más de dos días se recobran a la EPS.',
      recorteDeDeducciones: 'Ninguna deducción puede dejar a la persona con menos de la mitad de su salario.',
    },
  };
}

function personasDeNomina(): Personas {
  const lista = personas();
  return { disponible: true, motivo: null, personas: lista, total: lista.length, cuotaDeAprendices: { obligada: false, minimos: 0, actuales: 1, faltan: 0, aviso: null, fuente: 'Ley 789 de 2002' } };
}

function catalogo(): CatalogoDePersonas {
  return {
    tipos: [
      { tipo: 'EMPLEADO', nombre: 'Empleado', descripcion: 'Con contrato laboral: salario, prestaciones y aportes.' },
      { tipo: 'ASESOR', nombre: 'Asesor por comisión', descripcion: 'Comercial que gana por lo que cierra.' },
      { tipo: 'PRESTACION_SERVICIOS', nombre: 'Contratista', descripcion: 'Por prestación de servicios: cobra con cuenta de cobro.' },
      { tipo: 'APRENDIZ', nombre: 'Aprendiz', descripcion: 'Del SENA o similar, con apoyo de sostenimiento.' },
    ],
    tiposDeContrato: ['INDEFINIDO', 'FIJO', 'OBRA_O_LABOR', 'APRENDIZAJE'],
    periodicidades: ['MENSUAL', 'QUINCENAL'],
    clasesDeRiesgoArl: ['I', 'II', 'III', 'IV', 'V'],
    claseDeRiesgoSugerida: 'I',
    fuenteArl: 'Decreto 1295 de 1994',
    modeloDeAprendizajeSugerido: 'PRODUCTIVA',
  };
}

export const NOMINA_DEMO: readonly LecturaDeLaDemo[] = [
  { patron: /^\/inmobiliaria\/nomina\/estado(\?|$)/, respuesta: estado },
  { patron: /^\/inmobiliaria\/nomina\/resumen(\?|$)/, respuesta: resumen },
  { patron: /^\/inmobiliaria\/nomina\/periodos\/demo-pn-[^/?]+$/, respuesta: periodo },
  { patron: /^\/inmobiliaria\/nomina\/periodos(\?|$)/, respuesta: periodos },
  { patron: /^\/inmobiliaria\/nomina\/personas\/catalogo(\?|$)/, respuesta: catalogo },
  { patron: /^\/inmobiliaria\/nomina\/personas(\?|$)/, respuesta: personasDeNomina },
];
