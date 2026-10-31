/**
 * Los demás agentes de IA con datos de ejemplo (el modo demo; Nico 30-10-2026: «ver cómo quedaría pintada cada
 * sección»): Afinidad, Asegurabilidad, Conciliación, Retención, Agente de pagos y Desempeño IA. Lo que responde el
 * MICRO, en su forma. Personas, cifras y movimientos INVENTADOS; los inmuebles y los inquilinos son los de las demos del
 * back (Contratos, Propietarios) para que cuadren de una sección a otra.
 */
import type { AgentOverviewResponse, OverviewKpi } from '@/lib/api/agent-workspace';
import type { AgenteId } from '@/lib/api/work-item';
import type { PilotoGobiernoResponse } from '@/lib/api/piloto';
import type { CotizadorOverviewResponse } from '@/lib/hooks/cotizador/use-cotizador-overview';
import type { ConciliacionSummaryResponse } from '@/lib/hooks/conciliacion/use-conciliacion-summary';
import type { CasoDeVinci, DecisionDeVinci, MetricasDeVinci, RiesgoDeVinci, UmbralDeVinci } from '@/lib/types/retencion';
import type { LecturaDeLaDemo } from '../index';

const HOY = '2026-10-30';
const AHORA = `${HOY}T15:20:00.000Z`;

const kpi = (id: string, label: string, value: number, format: OverviewKpi['format'] = 'number'): OverviewKpi => ({ id, label, value, format });

/** El resumen de cada agente (`ai-hub/agentes/<agente>/overview`): sus cifras, en qué va su trabajo y lo último que hizo. */
const RESUMENES: Partial<Record<AgenteId, Omit<AgentOverviewResponse, 'agente' | 'generatedAt'>>> = {
  cobranza: {
    kpis: [kpi('gestionados', 'Casos gestionados hoy', 18), kpi('recuperado', 'Recuperado este mes', 48_350_000, 'cop'), kpi('promesas', 'Promesas cumplidas', 0.81, 'percent')],
    pipeline: [{ estado: 'detectado', count: 6 }, { estado: 'en_revision', count: 4 }, { estado: 'ejecutando', count: 9 }, { estado: 'resuelto', count: 31 }],
    feed: [
      { id: 'demo-fc-1', titulo: 'Andrés Gómez pagó el canon de octubre', detalle: 'Por PSE, después del recordatorio de ayer', actorType: 'agent', occurredAt: `${HOY}T15:12:00.000Z` },
      { id: 'demo-fc-2', titulo: 'Carta prejurídica lista para aprobar', detalle: 'Comercializadora El Poblado SAS · 52 días de mora', actorType: 'agent', occurredAt: `${HOY}T09:00:00.000Z` },
    ],
  },
  pagos: {
    kpis: [kpi('enlaces', 'Enlaces de pago enviados', 64), kpi('recuperados', 'Pagos fallidos recuperados', 9), kpi('recaudado', 'Recaudado por enlace', 31_400_000, 'cop')],
    pipeline: [{ estado: 'detectado', count: 3 }, { estado: 'sugerido', count: 2 }, { estado: 'ejecutando', count: 5 }, { estado: 'resuelto', count: 58 }],
    feed: [
      { id: 'demo-fp-1', titulo: 'Se recuperó el pago de Valentina Ríos', detalle: 'La tarjeta falló el 5; pagó con el enlace nuevo', actorType: 'agent', occurredAt: `${HOY}T12:30:00.000Z` },
      { id: 'demo-fp-2', titulo: 'Enlace de pago enviado a Juan Pablo Cardona', detalle: 'Primera cuota del acuerdo · $825.000', actorType: 'agent', occurredAt: `${HOY}T11:25:00.000Z` },
    ],
  },
  conciliacion: {
    kpis: [kpi('conciliados', 'Movimientos conciliados', 412), kpi('automatico', 'Conciliado solo', 0.93, 'percent'), kpi('monto', 'Monto conciliado', 286_900_000, 'cop')],
    pipeline: [{ estado: 'sugerido', count: 14 }, { estado: 'en_revision', count: 6 }, { estado: 'resuelto', count: 412 }],
    feed: [
      { id: 'demo-fn-1', titulo: '38 movimientos de Bancolombia conciliados', detalle: 'Extracto del 29 de octubre', actorType: 'agent', occurredAt: `${HOY}T07:10:00.000Z` },
      { id: 'demo-fn-2', titulo: 'Un pago sin identificar por $1.850.000', detalle: 'Propuesto: Andrés Gómez, Cl 10 # 34-21', actorType: 'agent', occurredAt: `${HOY}T07:12:00.000Z` },
    ],
  },
  matching: {
    kpis: [kpi('interesados', 'Interesados activos', 37), kpi('cruces', 'Cruces sugeridos', 22), kpi('visitas', 'Visitas agendadas', 8)],
    pipeline: [{ estado: 'detectado', count: 37 }, { estado: 'sugerido', count: 22 }, { estado: 'aprobado', count: 11 }, { estado: 'resuelto', count: 5 }],
    feed: [
      { id: 'demo-fm-1', titulo: 'Daniela Cardona: 3 inmuebles que le sirven', detalle: 'Busca en El Poblado hasta $3.500.000', actorType: 'agent', occurredAt: `${HOY}T14:00:00.000Z` },
      { id: 'demo-fm-2', titulo: 'Visita agendada en la Cra 25 # 1A Sur 45', detalle: 'Sebastián Mesa · sábado 10:00', actorType: 'agent', occurredAt: '2026-10-29T18:40:00.000Z' },
    ],
  },
  cotizador: {
    kpis: [kpi('cotizaciones', 'Cotizaciones del mes', 46), kpi('aprobadas', 'Aprobadas', 0.74, 'percent'), kpi('prima', 'Prima promedio', 92_000, 'cop')],
    pipeline: [{ estado: 'detectado', count: 4 }, { estado: 'ejecutando', count: 2 }, { estado: 'resuelto', count: 40 }],
    feed: [
      { id: 'demo-fq-1', titulo: 'Daniela Cardona: aprobada en 3 de 3 aseguradoras', detalle: 'Canon $3.400.000', actorType: 'agent', occurredAt: `${HOY}T13:20:00.000Z` },
    ],
  },
};

function resumen(camino: string): AgentOverviewResponse | undefined {
  const agente = camino.match(/\/ai-hub\/agentes\/([^/?]+)\/overview/)?.[1] as AgenteId | undefined;
  const r = agente ? RESUMENES[agente] : undefined;
  return agente && r ? { agente, ...r, generatedAt: AHORA } : undefined;
}

/** Asegurabilidad (el cotizador): las últimas cotizaciones y cómo responde cada aseguradora. */
const cotizador = (): CotizadorOverviewResponse => ({
  kpis: { quotesHoy: 4, approvalRate: 0.74, primaPromedioMonthlyCop: 92_000, costPerQuoteCop: 1_800 },
  lastQuotes: [
    { id: 'demo-q-1', cedulaHashPrefix8: 'a3f19c02', nombreCandidato: 'Daniela Cardona', canonCop: 3_400_000, ciudad: 'Medellín', createdAt: `${HOY}T13:18:00.000Z`, status: 'final', approvedCount: 3, totalCarriers: 3 },
    { id: 'demo-q-2', cedulaHashPrefix8: '7be04d51', nombreCandidato: 'Sebastián Mesa', canonCop: 3_400_000, ciudad: 'Medellín', createdAt: `${HOY}T10:02:00.000Z`, status: 'final', approvedCount: 2, totalCarriers: 3 },
    { id: 'demo-q-3', cedulaHashPrefix8: 'c81e5a90', nombreCandidato: 'Paula Andrea Gil', canonCop: 3_400_000, ciudad: 'Medellín', createdAt: '2026-10-29T17:45:00.000Z', status: 'final', approvedCount: 1, totalCarriers: 3 },
    { id: 'demo-q-4', cedulaHashPrefix8: '19d2be77', nombreCandidato: 'Esteban Rojas', canonCop: 2_900_000, ciudad: 'Sabaneta', createdAt: '2026-10-29T15:10:00.000Z', status: 'partial', approvedCount: 1, totalCarriers: 3 },
    { id: 'demo-q-5', cedulaHashPrefix8: 'f4a07c3e', nombreCandidato: 'Mariana Ochoa', canonCop: 3_100_000, ciudad: 'Medellín', createdAt: '2026-10-16T12:00:00.000Z', status: 'final', approvedCount: 3, totalCarriers: 3 },
  ],
  carriers: [
    { name: 'sura', route: 'direct', mode: 'rest', enabled: true, slaState: 'healthy', lastVerdictAt: `${HOY}T13:19:00.000Z` },
    { name: 'mapfre', route: 'sekure', mode: 'rest', enabled: true, slaState: 'healthy', lastVerdictAt: `${HOY}T13:20:00.000Z` },
    { name: 'bolivar', route: 'sekure', mode: 'rest', enabled: true, slaState: 'degraded', lastVerdictAt: `${HOY}T10:05:00.000Z` },
  ],
  generatedAt: AHORA,
});

/** Conciliación: lo del mes y lo que queda en la cola, por tipo. */
const conciliacion = (): ConciliacionSummaryResponse => ({
  tenantId: 'demo',
  generatedAt: AHORA,
  taxonomy: { parciales: 4, duplicados: 1, diferencias_monto: 3, fuera_de_fecha: 2, sin_identificar: 4 },
  totals: { movimientos: 426, conciliados: 412, en_cola: 14, monto_conciliado_cop: 286_900_000 },
  tasa_conciliacion: 412 / 426,
});

/** Retención (Vinci): quién se puede ir y qué se le ofrece. */
function caso(c: Partial<CasoDeVinci> & Pick<CasoDeVinci, 'caseId' | 'poblacion' | 'nombre' | 'puntaje' | 'senales' | 'contratos'>): CasoDeVinci {
  const suma = c.senales.reduce((n, s) => n + s.puntos, 0);
  return {
    suma,
    umbral: 60,
    enRiesgo: c.puntaje >= 60,
    canonEnJuegoCop: c.contratos.reduce((n, k) => n + k.canonCop, 0),
    tieneTelefono: true,
    tieneCorreo: true,
    ofertasSugeridas: [],
    ofertas: [],
    plan: null,
    ...c,
  };
}

const CASOS: readonly CasoDeVinci[] = [
  caso({
    caseId: 'demo-vin-1',
    poblacion: 'inquilino',
    nombre: 'Valentina Ríos',
    puntaje: 78,
    senales: [
      { clave: 'vence_pronto', texto: 'El contrato vence en 76 días', puntos: 30 },
      { clave: 'mantenimiento_abierto', texto: 'Tiene una reparación abierta hace 21 días', puntos: 28 },
      { clave: 'incremento_alto', texto: 'El incremento de enero sería del 9,3 %', puntos: 20 },
    ],
    contratos: [{ contratoId: 'demo-ct-4', numero: '104', inmueble: 'Cl 79 Sur # 47E-80, apto 1504', canonCop: 2_900_000, fechaDeFin: '2027-01-14', diasParaVencer: 76 }],
    ofertasSugeridas: [
      { tipo: 'resolver_pendiente', nombre: 'Cerrar la reparación abierta', porque: 'Es lo que más pesa en su riesgo', cuestaPlata: false, quienAprueba: null },
      { tipo: 'bajar_incremento', nombre: 'Incremento del 6 % en vez del 9,3 %', porque: 'El canon queda en el rango del sector', cuestaPlata: true, quienAprueba: 'El propietario' },
    ],
  }),
  caso({
    caseId: 'demo-vin-2',
    poblacion: 'propietario',
    nombre: 'Jorge Arango',
    puntaje: 66,
    senales: [
      { clave: 'giro_tarde', texto: 'Dos giros llegaron después del día 10', puntos: 36 },
      { clave: 'pregunto_por_salir', texto: 'Preguntó cómo terminar el mandato', puntos: 30 },
    ],
    contratos: [{ contratoId: 'demo-ct-4', numero: '104', inmueble: 'Cl 79 Sur # 47E-80, apto 1504', canonCop: 2_900_000, fechaDeFin: '2027-01-14', diasParaVencer: 76 }],
    ofertasSugeridas: [{ tipo: 'llamada_del_asesor', nombre: 'Llamada del asesor esta semana', porque: 'Quiere hablar con una persona', cuestaPlata: false, quienAprueba: null }],
  }),
  caso({
    caseId: 'demo-vin-3',
    poblacion: 'inquilino',
    nombre: 'Juan Pablo Cardona',
    puntaje: 41,
    enCobranza: true,
    senales: [{ clave: 'mora', texto: 'Lleva 18 días en mora', puntos: 41 }],
    contratos: [{ contratoId: 'demo-ct-5', numero: '105', inmueble: 'Cra 70 # 44-10, apto 301', canonCop: 1_650_000, fechaDeFin: '2026-11-30', diasParaVencer: 31 }],
  }),
];

const riesgo = (): RiesgoDeVinci => ({
  disponible: true,
  faltan: [],
  notas: [],
  leidoEn: AHORA,
  deLoGuardado: false,
  umbral: 60,
  modo: 'copiloto',
  envioHabilitado: false,
  contratosLeidos: 358,
  propietariosLeidos: 214,
  enRiesgo: { inquilinos: 1, propietarios: 1 },
  enCobranza: 1,
  casos: [...CASOS],
});

const metricas = (): MetricasDeVinci => ({
  enGestion: { inquilinos: 4, propietarios: 2 },
  contratosRetenidos: 11,
  propietariosQueSeQuedaron: 3,
  inmueblesRetenidos: 12,
  canonConservadoCop: 31_750_000,
  perdidos: { inquilinos: 2, propietarios: 0, canonPerdidoCop: 4_300_000 },
  tasaDeRetencion: 0.85,
});

/** En la forma del cable (`decisions`): `api/retencion.ts` lo vuelve `decisiones`. */
const decisiones = (): { decisions: DecisionDeVinci[]; envioHabilitado: boolean } => ({
  decisions: [
    { id: 'demo-dec-1', caseId: 'demo-vin-1', ownerId: null, decisionType: 'oferta_bajar_incremento', tier: 2, reviewable: true, reviewedBy: null, reviewedAt: null, reviewOutcome: null, createdAt: `${HOY}T08:00:00.000Z`, payload: { incrementoPct: 6, inquilino: 'Valentina Ríos' } },
  ],
  envioHabilitado: false,
});

/** Agente de pagos: la bandeja del Piloto (lo que pide una persona) y qué agentes corren. */
const bandejaDelPiloto = () => ({
  items: [
    { id: 'demo-in-1', fuente: 'pagos', agente: 'pagos', prioridad: 'alta', titulo: 'Pago con tarjeta rechazado dos veces', resumen: 'Mariana Ochoa · depósito del contrato 106', montoCop: 3_100_000, desde: `${HOY}T10:40:00.000Z`, href: '/panel/inmobiliaria/pagos/agente' },
    { id: 'demo-in-2', fuente: 'pagos', agente: 'pagos', prioridad: 'media', titulo: 'Pago de más por $120.000', resumen: 'Andrés Gómez pagó $1.970.000 por un canon de $1.850.000', montoCop: 120_000, desde: `${HOY}T15:12:00.000Z`, href: '/panel/inmobiliaria/pagos/agente' },
  ],
  total: 2,
  porPrioridad: { alta: 1, media: 1, baja: 0 },
});

const gobierno = (): PilotoGobiernoResponse => ({
  agentes: ['cobranza', 'pagos', 'conciliacion', 'matching', 'cotizador', 'retencion'].map((agente) => ({ agente, corre: true, origen: 'heredado' as const, disponibleGlobal: true })),
  llavesFinas: [],
});

const umbral = (): UmbralDeVinci => ({
  umbral: 60,
  umbralPorDefecto: 60,
  topeDescuentoComisionPct: 20,
  diasEntreMensajesInquilino: 15,
  diasEntreMensajesPropietario: 30,
  guardable: true,
  actualizadaEn: null,
});

export const AGENTES_DEL_MICRO_DEMO: readonly LecturaDeLaDemo[] = [
  { patron: /^\/api\/agency\/[^/]+\/ai-hub\/agentes\/(cobranza|pagos|conciliacion|matching|cotizador)\/overview(\?|$)/, respuesta: resumen },
  { patron: /^\/api\/agency\/[^/]+\/cotizador\/overview(\?|$)/, respuesta: cotizador },
  { patron: /^\/api\/agency\/[^/]+\/conciliacion\/summary(\?|$)/, respuesta: conciliacion },
  { patron: /^\/api\/agency\/[^/]+\/retencion\/riesgo(\?|$)/, respuesta: riesgo },
  { patron: /^\/api\/agency\/[^/]+\/retencion\/metricas(\?|$)/, respuesta: metricas },
  { patron: /^\/api\/agency\/[^/]+\/retencion\/decisions(\?|$)/, respuesta: decisiones },
  { patron: /^\/api\/agency\/[^/]+\/retencion\/umbral(\?|$)/, respuesta: umbral },
  { patron: /^\/api\/agency\/[^/]+\/ai-hub\/inbox(\?|$)/, respuesta: bandejaDelPiloto },
  { patron: /^\/api\/agency\/[^/]+\/ai-hub\/gobierno(\?|$)/, respuesta: gobierno },
];
