/**
 * El propietario independiente → Mis solicitudes con datos de ejemplo (el modo demo; Nico 30-10-2026: «ver cómo
 * quedaría pintada cada sección»). Lo que él le ha pedido a Leasefy sobre el apartamento de las demás demos (Cra 43A):
 * dos abiertas y dos resueltas, cada una con su historial. Radicados, fechas y textos INVENTADOS. El detalle
 * (`pqrsApi.getMine`) sale de la misma lista.
 */
import type { EventoDelPortal, SolicitudPqrs } from '@/lib/api/pqrs.types';
import type { LecturaDeLaDemo } from './index';

const INMUEBLE = 'Cra 43A # 18 Sur 135, apto 702';
const CONTRATO = 'demo-ct-1';

function solicitud(
  s: Pick<SolicitudPqrs, 'id' | 'radicado' | 'tipo' | 'estado' | 'asunto' | 'descripcion' | 'createdAt' | 'updatedAt'> &
    Partial<SolicitudPqrs> & { eventos: EventoDelPortal[] },
): SolicitudPqrs {
  const { eventos, ...resto } = s;
  return {
    solicitanteNombre: 'Carlos Mejía',
    solicitanteTipo: 'propietario',
    canal: 'web',
    contratoId: CONTRATO,
    contratoLabel: 'Contrato 101',
    propiedadId: 'demo-ct-1-inmueble',
    propiedadDireccion: INMUEBLE,
    consignacionId: 'demo-pr-1-mandato-1',
    historial: eventos,
    adjuntos: [],
    ...resto,
  };
}

const SOLICITUDES: readonly SolicitudPqrs[] = [
  solicitud({
    id: 'demo-sol-1',
    radicado: 'PQRS-2026-0412',
    tipo: 'solicitud',
    estado: 'en_proceso',
    prioridad: 'media',
    asunto: 'Copia del inventario de entrega',
    descripcion: 'Necesito la copia del inventario que se firmó con Laura en marzo, con las fotos.',
    responsableNombre: 'Equipo de Leasefy',
    createdAt: '2026-10-27T14:20:00.000Z',
    updatedAt: '2026-10-28T10:05:00.000Z',
    slaVenceAt: '2026-11-11T23:00:00.000Z',
    eventos: [
      { tipo: 'RADICADA', at: '2026-10-27T14:20:00.000Z', detalle: null },
      { tipo: 'ASIGNADA', at: '2026-10-27T15:02:00.000Z', detalle: 'Equipo de Leasefy' },
      { tipo: 'EN_PROCESO', at: '2026-10-28T10:05:00.000Z', detalle: null },
    ],
  }),
  solicitud({
    id: 'demo-sol-2',
    radicado: 'PQRS-2026-0398',
    tipo: 'peticion',
    estado: 'recibida',
    prioridad: 'baja',
    asunto: 'No renovar el contrato en febrero',
    descripcion: 'Quiero que me cuenten qué pasa si no le renuevo a Laura en febrero: voy a vender el apartamento.',
    createdAt: '2026-10-29T19:40:00.000Z',
    updatedAt: '2026-10-29T19:40:00.000Z',
    slaVenceAt: '2026-11-13T23:00:00.000Z',
    eventos: [{ tipo: 'RADICADA', at: '2026-10-29T19:40:00.000Z', detalle: null }],
  }),
  solicitud({
    id: 'demo-sol-3',
    radicado: 'PQRS-2026-0301',
    tipo: 'reclamo',
    estado: 'cerrada',
    prioridad: 'alta',
    asunto: 'El giro de junio no me llegó',
    descripcion: 'Ya es 10 de julio y no veo el giro de junio en mi cuenta.',
    responsableNombre: 'Equipo de Leasefy',
    respuesta: 'El banco devolvió el giro porque la cuenta estaba bloqueada. Lo volvimos a girar el 11 de julio.',
    respuestaDetalle: { texto: 'El banco devolvió el giro porque la cuenta estaba bloqueada. Lo volvimos a girar el 11 de julio.', medio: 'PORTAL', at: '2026-07-11T16:00:00.000Z' },
    createdAt: '2026-07-10T13:00:00.000Z',
    updatedAt: '2026-07-12T09:00:00.000Z',
    resueltaAt: '2026-07-11T16:00:00.000Z',
    eventos: [
      { tipo: 'RADICADA', at: '2026-07-10T13:00:00.000Z', detalle: null },
      { tipo: 'ASIGNADA', at: '2026-07-10T13:20:00.000Z', detalle: 'Equipo de Leasefy' },
      { tipo: 'RESPUESTA', at: '2026-07-11T16:00:00.000Z', detalle: null },
      { tipo: 'RESUELTA', at: '2026-07-11T16:00:00.000Z', detalle: null },
      { tipo: 'CERRADA', at: '2026-07-12T09:00:00.000Z', detalle: null },
    ],
  }),
  solicitud({
    id: 'demo-sol-4',
    radicado: 'PQRS-2026-0187',
    tipo: 'sugerencia',
    estado: 'resuelta',
    prioridad: 'baja',
    asunto: 'Recibir el extracto por correo cada mes',
    descripcion: 'Me gustaría que el extracto me llegue al correo el día del giro.',
    responsableNombre: 'Equipo de Leasefy',
    respuesta: 'Listo: desde mayo te llega el extracto al correo el mismo día del giro.',
    respuestaDetalle: { texto: 'Listo: desde mayo te llega el extracto al correo el mismo día del giro.', medio: 'CORREO', at: '2026-04-22T15:30:00.000Z' },
    createdAt: '2026-04-20T12:10:00.000Z',
    updatedAt: '2026-04-22T15:30:00.000Z',
    resueltaAt: '2026-04-22T15:30:00.000Z',
    eventos: [
      { tipo: 'RADICADA', at: '2026-04-20T12:10:00.000Z', detalle: null },
      { tipo: 'RESPUESTA', at: '2026-04-22T15:30:00.000Z', detalle: null },
      { tipo: 'RESUELTA', at: '2026-04-22T15:30:00.000Z', detalle: null },
    ],
  }),
];

export const SOLICITUDES_DEL_PROPIETARIO_DEMO: readonly LecturaDeLaDemo[] = [
  {
    patron: /^\/pqrs\/mine(\?|$)/,
    respuesta: () => ({
      solicitudes: [...SOLICITUDES],
      sePuedeRadicar: true,
      contratosParaRadicar: [{ contratoId: CONTRATO, consignacionId: 'demo-pr-1-mandato-1', inmueble: INMUEBLE }],
    }),
  },
];
