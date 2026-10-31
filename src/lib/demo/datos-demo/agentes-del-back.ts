/**
 * Las secciones de IA que leen del BACK con datos de ejemplo (el modo demo; Nico 30-10-2026: «ver cómo quedaría
 * pintada cada sección»): Avalúos (la lista que el back trae del micro de avalúos) y los enlaces de pago del Agente de
 * pagos (Cobri). Inmuebles y personas de las demás demos (Contratos, Propietarios); cifras INVENTADAS.
 */
import type { AgencyAvaluoItem, AgencyAvaluoListResponse, AiMetricsResponse } from '@/lib/api/inmobiliaria.service';
import type { EstadoDelLinkDePago, LinkDePagoDeCuota, PaginaDeLinksDePago, ResumenDeLinksDePago } from '@/lib/types/payu';
import type { LecturaDeLaDemo } from './index';

function avaluo(a: Pick<AgencyAvaluoItem, 'id' | 'state' | 'valueCop' | 'method' | 'city' | 'ownerName' | 'createdAt'>): AgencyAvaluoItem {
  return {
    slug: a.id,
    identity: '',
    submissionId: null,
    updatedAt: a.createdAt,
    signedAt: a.state === 'firmado' || a.state === 'entregado' ? a.createdAt : null,
    ...a,
  };
}

const AVALUOS: readonly AgencyAvaluoItem[] = [
  avaluo({ id: 'demo-av-1', state: 'firmado', valueCop: 685_000_000, method: 'COMPARABLES_IA', city: 'Medellín', ownerName: 'Carlos Mejía', createdAt: '2026-10-28T15:00:00.000Z' }),
  avaluo({ id: 'demo-av-2', state: 'en_revisión', valueCop: 1_240_000_000, method: 'COMPARABLES', city: 'Medellín', ownerName: 'Inversiones Palmas SAS', createdAt: '2026-10-29T19:30:00.000Z' }),
  avaluo({ id: 'demo-av-3', state: 'entregado', valueCop: 498_000_000, method: 'AVM', city: 'Sabaneta', ownerName: 'Jorge Arango', createdAt: '2026-10-14T13:10:00.000Z' }),
  avaluo({ id: 'demo-av-4', state: 'firmado', valueCop: 392_000_000, method: 'COMPARABLES_IA', city: 'Envigado', ownerName: 'María Isabel Uribe', createdAt: '2026-10-02T16:40:00.000Z' }),
  avaluo({ id: 'demo-av-5', state: 'borrador', valueCop: null, method: '—', city: 'Bello', ownerName: 'Ana Lucía Vélez', createdAt: `2026-10-30T12:00:00.000Z` }),
];

function avaluos(): AgencyAvaluoListResponse {
  return { items: [...AVALUOS], total: AVALUOS.length, page: 1, pageSize: 100 };
}

/** Las cuotas de octubre con su enlace de pago: los inquilinos de la demo de Contratos. */
const LINKS: ReadonlyArray<[contrato: string, numero: string, inmueble: string, inquilino: string, monto: number, estado: EstadoDelLinkDePago]> = [
  ['demo-ct-1', '101', 'Cra 43A # 18 Sur 135, apto 702', 'Laura Restrepo', 2_350_000, 'pagado'],
  ['demo-ct-2', '102', 'Cl 10 # 34-21, casa 4', 'Andrés Gómez', 1_850_000, 'pagado'],
  ['demo-ct-3', '103', 'Cra 37 # 8A-56, local 2', 'Comercializadora El Poblado SAS', 6_400_000, 'vencido'],
  ['demo-ct-4', '104', 'Cl 79 Sur # 47E-80, apto 1504', 'Valentina Ríos', 2_900_000, 'fallido'],
  ['demo-ct-5', '105', 'Cra 70 # 44-10, apto 301', 'Juan Pablo Cardona', 1_650_000, 'enviado'],
];

function links(camino: string): PaginaDeLinksDePago {
  const q = new URLSearchParams(camino.split('?')[1] ?? '');
  const mes = q.get('mes') ?? '2026-10';
  const estado = q.get('estado');
  const items = LINKS.map(([contratoId, contratoNumero, inmueble, inquilino, montoCop, e]): LinkDePagoDeCuota => ({
    cuotaId: `${contratoId}-${mes}`,
    contratoId,
    contratoNumero,
    inmueble,
    inquilino,
    fechaDeVencimiento: `${mes}-05`,
    montoCop,
    estado: e,
    hitosEnviados: e === 'pagado' ? ['antes'] : e === 'enviado' ? ['antes', 'dia'] : ['antes', 'dia', 'despues'],
    ultimoEnvioEn: `${mes}-0${e === 'pagado' ? 2 : 6}T14:00:00.000Z`,
    pagadoEn: e === 'pagado' ? `${mes}-03T16:20:00.000Z` : null,
    paymentUrl: null,
    enMora: e === 'vencido' || e === 'fallido',
  })).filter((l) => !estado || l.estado === estado);
  return { items, total: items.length, page: 1, limit: Number(q.get('limit')) || 20 };
}

function resumen(camino: string): ResumenDeLinksDePago {
  const mes = new URLSearchParams(camino.split('?')[1] ?? '').get('mes') ?? '2026-10';
  const pagados = LINKS.filter((l) => l[5] === 'pagado');
  return {
    mes,
    payuActivo: true,
    cuotas: LINKS.length,
    linksEnviados: LINKS.length,
    pagadosPorLink: pagados.length,
    montoCobradoPorLinkCop: pagados.reduce((n, l) => n + l[4], 0),
    pendientesCop: LINKS.filter((l) => l[5] !== 'pagado').reduce((n, l) => n + l[4], 0),
  };
}

/** Desempeño IA → el estudio de inquilinos (lo cuenta el back): las evaluaciones del mes. */
const metricasDeIa = (): AiMetricsResponse => ({
  scoring: { evaluationsThisMonth: 46, avgTimeMin: '4 min', escalationRate: '4 %', accuracyRate: '96 %' },
  matching: { suggestionsSent: 22, conversionRate: '23 %', candidatesRedirected: 11, avgCompatibility: '81 %' },
  summary: { actionsThisWeek: 318, hoursSavedThisMonth: '64 h' },
});

export const AGENTES_DEL_BACK_DEMO: readonly LecturaDeLaDemo[] = [
  { patron: /^\/inmobiliaria\/ai\/metrics(\?|$)/, respuesta: metricasDeIa },
  { patron: /^\/inmobiliaria\/avaluos(\?|$)/, respuesta: avaluos },
  { patron: /^\/inmobiliaria\/cobros\/links\/resumen(\?|$)/, respuesta: resumen },
  { patron: /^\/inmobiliaria\/cobros\/links(\?|$)/, respuesta: links },
];
