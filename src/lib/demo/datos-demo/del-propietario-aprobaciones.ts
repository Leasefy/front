/**
 * El propietario independiente → Aprobar reparaciones con datos de ejemplo (el modo demo; Nico 30-10-2026: «ver cómo
 * quedaría pintada cada sección»). En el apartamento de las demás demos (Cra 43A): dos por aprobar —la del calentador
 * es de prioridad Alta y la hace Leasefy; la de pintura la puede hacer él—, una que está haciendo por su cuenta y tres
 * en el historial (aprobada, rechazada y una emergencia). Proveedores, valores y textos INVENTADOS.
 */
import type {
  AprobacionEnElPortal,
  DetalleDeLaReparacionEnElPortal,
  PaginaDelHistorialDeAprobaciones,
  ReparacionQueHagoYo,
} from '@/lib/types/deducciones';
import type { LecturaDeLaDemo } from './index';

const INMUEBLE = 'Cra 43A # 18 Sur 135, apto 702';

type Datos = Pick<AprobacionEnElPortal, 'id' | 'valorCop' | 'estado' | 'pedidaAt' | 'decididaAt'> &
  Partial<AprobacionEnElPortal> & { titulo: string; descripcion: string; proveedor: string; dias: number | null };

function aprobacion(d: Datos): AprobacionEnElPortal {
  const { titulo, descripcion, proveedor, dias, ...resto } = d;
  return {
    solicitudId: `${d.id}-solicitud`,
    quoteId: `${d.id}-cotizacion`,
    consignacionId: 'demo-pr-1-mandato-1',
    propietarioId: 'demo-pr-1',
    motivo: 'La reparación es a cargo del propietario según el contrato.',
    emergencia: false,
    motivoDeEmergencia: null,
    soporteNombre: null,
    aviso: null,
    motivoDeRechazo: null,
    anuladaAt: null,
    motivoDeAnulacion: null,
    inmobiliaria: 'Leasefy',
    inmueble: INMUEBLE,
    reparacion: { titulo, descripcion },
    cotizacion: { proveedor, descripcion: null, diasEstimados: dias },
    prioridad: 'MEDIUM',
    puedeHacerlaElPropietario: false,
    laHaceElPropietario: false,
    ...resto,
  };
}

const PENDIENTES: readonly AprobacionEnElPortal[] = [
  aprobacion({
    id: 'demo-apr-1',
    titulo: 'Fuga en el calentador de agua',
    descripcion: 'Laura reportó que el calentador gotea por la válvula de abajo y el piso del patio de ropas está mojado.',
    proveedor: 'Plomería y Gas del Sur',
    dias: 1,
    valorCop: 680_000,
    estado: 'PENDIENTE',
    prioridad: 'HIGH',
    pedidaAt: '2026-10-29T13:40:00.000Z',
    decididaAt: null,
  }),
  aprobacion({
    id: 'demo-apr-2',
    titulo: 'Pintar la habitación principal',
    descripcion: 'La pared junto a la ventana tiene manchas de humedad ya secas. Pintura tipo 1 y resane.',
    proveedor: 'Acabados La 80',
    dias: 2,
    valorCop: 420_000,
    estado: 'PENDIENTE',
    prioridad: 'LOW',
    puedeHacerlaElPropietario: true,
    pedidaAt: '2026-10-27T16:00:00.000Z',
    decididaAt: null,
  }),
];

const HISTORIAL: readonly AprobacionEnElPortal[] = [
  aprobacion({
    id: 'demo-apr-3',
    titulo: 'Daño eléctrico en la cocina',
    descripcion: 'Un corto en el tablero dejó la cocina sin luz.',
    proveedor: 'Electricistas del Valle de Aburrá',
    dias: 1,
    valorCop: 340_000,
    estado: 'EMERGENCIA',
    emergencia: true,
    motivoDeEmergencia: 'La cocina quedó sin luz y la nevera apagada: no daba espera.',
    soporteNombre: 'factura-electricista.pdf',
    aviso: { asunto: 'Hicimos una reparación de emergencia en tu apartamento', cuerpo: 'Se cambió el breaker de la cocina.', generadoAt: '2026-09-12T20:10:00.000Z' },
    prioridad: 'EMERGENCY',
    pedidaAt: '2026-09-12T19:30:00.000Z',
    decididaAt: '2026-09-12T19:30:00.000Z',
  }),
  aprobacion({
    id: 'demo-apr-4',
    titulo: 'Cambio del sanitario del baño social',
    descripcion: 'El tanque no deja de llenarse.',
    proveedor: 'Plomería y Gas del Sur',
    dias: 1,
    valorCop: 1_250_000,
    estado: 'RECHAZADA',
    motivoDeRechazo: 'Prefiero que primero le cambien el flotador; si sigue fallando, lo cambiamos.',
    pedidaAt: '2026-08-20T15:00:00.000Z',
    decididaAt: '2026-08-21T12:30:00.000Z',
  }),
  aprobacion({
    id: 'demo-apr-5',
    titulo: 'Cambio de la chapa de la puerta principal',
    descripcion: 'La chapa se trababa al cerrar.',
    proveedor: 'Cerrajería Envigado',
    dias: 1,
    valorCop: 185_000,
    estado: 'APROBADA',
    pedidaAt: '2026-07-03T14:00:00.000Z',
    decididaAt: '2026-07-03T18:45:00.000Z',
  }),
];

const LAS_QUE_HAGO_YO: readonly ReparacionQueHagoYo[] = [
  {
    solicitudId: 'demo-apr-6-solicitud',
    loDecidio: 'PROPIETARIO',
    nota: 'Mi hermano es maestro de obra: la revisamos el sábado.',
    desde: '2026-10-20T15:00:00.000Z',
    terminadaAt: null,
    terminadaNota: null,
    inmobiliaria: 'Leasefy',
    inmueble: INMUEBLE,
    reparacion: { titulo: 'Revisar la humedad del techo del baño', descripcion: 'Aparece una mancha cuando llueve fuerte.' },
    prioridad: 'MEDIUM',
    venceAt: '2026-11-10T00:00:00.000Z',
  },
];

function historial(camino: string): PaginaDelHistorialDeAprobaciones {
  const q = new URLSearchParams(camino.split('?')[1] ?? '');
  const pagina = Math.max(1, Number(q.get('pagina')) || 1);
  const porPagina = Math.max(1, Number(q.get('porPagina')) || 10);
  return { filas: HISTORIAL.slice((pagina - 1) * porPagina, pagina * porPagina), total: HISTORIAL.length, pagina, porPagina };
}

const ESTADO_DE_LA_SOLICITUD: Record<AprobacionEnElPortal['estado'], string> = {
  PENDIENTE: 'QUOTED',
  APROBADA: 'MAINT_COMPLETED',
  EMERGENCIA: 'MAINT_COMPLETED',
  RECHAZADA: 'MAINT_CANCELLED',
  ANULADA: 'MAINT_CANCELLED',
};

function detalle(camino: string): DetalleDeLaReparacionEnElPortal | null {
  const a = [...PENDIENTES, ...HISTORIAL].find((x) => camino.includes(`/${x.id}/`));
  if (!a) return null;
  return {
    ...a,
    // El estado de la solicitud, como lo manda el back (`DetalleDeLaReparacion` lo lee con esos nombres).
    reparacion: { ...a.reparacion, tipo: null, prioridad: a.prioridad ?? null, estado: ESTADO_DE_LA_SOLICITUD[a.estado], reportadaAt: a.pedidaAt, fotos: [] },
    cotizacion: a.cotizacion ? { ...a.cotizacion, valorCop: a.valorCop } : null,
    aCargoDe: { quien: 'PROPIETARIO', propietarioPct: 100, inquilinoPct: null, motivo: 'Es un daño del inmueble, no del uso.' },
    trabajo: { terminadoAt: ESTADO_DE_LA_SOLICITUD[a.estado] === 'MAINT_COMPLETED' ? a.decididaAt : null, notas: null, fotos: [], garantiaHasta: null },
    sobrecosto: null,
  };
}

export const APROBACIONES_DEL_PROPIETARIO_DEMO: readonly LecturaDeLaDemo[] = [
  { patron: /^\/portal\/aprobaciones-de-reparacion(\?|$)/, respuesta: () => ({ pendientes: [...PENDIENTES], historial: [...HISTORIAL] }) },
  { patron: /^\/portal\/aprobaciones-de-reparacion\/historial(\?|$)/, respuesta: historial },
  { patron: /^\/portal\/aprobaciones-de-reparacion\/las-que-hago-yo(\?|$)/, respuesta: () => [...LAS_QUE_HAGO_YO] },
  { patron: /^\/portal\/aprobaciones-de-reparacion\/sobrecostos(\?|$)/, respuesta: () => ({ disponible: true, pendientes: [], historial: [] }) },
  { patron: /^\/portal\/aprobaciones-de-reparacion\/demo-apr-[^/]+\/detalle$/, respuesta: detalle },
  { patron: /^\/portal\/terminaciones(\?|$)/, respuesta: () => [] },
];
