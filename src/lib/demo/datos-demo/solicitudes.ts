/**
 * Operación → Solicitudes (PQRS) con datos de ejemplo (el modo demo). Personas e inmuebles INVENTADOS. Los plazos se
 * cuentan desde hoy, así la demo siempre tiene algo por vencer y algo resuelto.
 */
import type { Pqrs, PqrsListResponse } from '@/lib/api/pqrs-agencia.types';
import type { LecturaDeLaDemo } from './index';

const DIA = 24 * 60 * 60 * 1000;
const en = (dias: number) => new Date(Date.now() + dias * DIA).toISOString();

type Fila = [number, Pqrs['tipo'], Pqrs['solicitanteTipo'], string, string, string, Pqrs['estado'], number, string | null];
const FILAS: readonly Fila[] = [
  // número, tipo, quién, nombre, asunto, inmueble, estado, días al vencimiento, responsable
  [41, 'RECLAMO', 'INQUILINO', 'Laura Restrepo', 'La factura de agua llegó con un cobro de antes', 'Cra 43A # 18 Sur 135, apto 702', 'EN_PROCESO', 2, 'Diana Prueba'],
  [42, 'SOLICITUD', 'INQUILINO', 'Andrés Gómez', 'Certificado de paz y salvo para el banco', 'Cl 10 # 34-21, casa 4', 'ASIGNADA', 5, 'Diana Prueba'],
  [43, 'QUEJA', 'PROPIETARIO', 'María Isabel Uribe', 'No le ha llegado el extracto de octubre', 'Cl 10 # 34-21, casa 4', 'RECIBIDA', 1, null],
  [44, 'PETICION', 'INQUILINO', 'Valentina Ríos', 'Permiso para tener una mascota', 'Cl 79 Sur # 47E-80, apto 1504', 'EN_COTIZACION', 7, 'Diana Prueba'],
  [45, 'SOLICITUD', 'PROPIETARIO', 'Carlos Mejía', 'Copia del contrato firmado', 'Cra 43A # 18 Sur 135, apto 702', 'RESUELTA', 9, 'Diana Prueba'],
  [46, 'RECLAMO', 'INQUILINO', 'Juan Pablo Cardona', 'La puerta del parqueadero no abre con el control', 'Cra 70 # 44-10, apto 301', 'RECIBIDA', -1, null],
];

function solicitudes(): Pqrs[] {
  return FILAS.map(([numero, tipo, solicitanteTipo, nombre, asunto, inmueble, estado, dias, responsable]) => ({
    id: `demo-pqrs-${numero}`,
    numero,
    radicado: `PQRS-${String(numero).padStart(4, '0')}`,
    tipo,
    solicitanteTipo,
    solicitanteNombre: nombre,
    solicitanteContacto: null,
    asunto,
    descripcion: null,
    consignacionId: null,
    inmuebleLabel: `${inmueble}, Medellín`,
    asignadoAUserId: responsable ? 'demo-responsable' : null,
    asignadoANombre: responsable,
    estado,
    slaVenceAt: en(dias),
    resueltaAt: estado === 'RESUELTA' ? en(-1) : null,
    cerradaAt: null,
    createdAt: en(dias - 15),
    updatedAt: en(-1),
  }));
}

function lista(): PqrsListResponse {
  const s = solicitudes();
  const cuenta = (e: Pqrs['estado']) => s.filter((x) => x.estado === e).length;
  const ahora = Date.now();
  return {
    resumen: {
      total: s.length,
      recibidas: cuenta('RECIBIDA'),
      asignadas: cuenta('ASIGNADA'),
      enProceso: cuenta('EN_PROCESO'),
      enCotizacion: cuenta('EN_COTIZACION'),
      resueltas: cuenta('RESUELTA'),
      cerradas: cuenta('CERRADA'),
      vencidas: s.filter((x) => !x.resueltaAt && Date.parse(x.slaVenceAt) < ahora).length,
      porVencer: s.filter((x) => !x.resueltaAt && Date.parse(x.slaVenceAt) >= ahora && Date.parse(x.slaVenceAt) - ahora < 3 * DIA).length,
    },
    solicitudes: s,
  } as PqrsListResponse;
}

export const SOLICITUDES_DEMO: readonly LecturaDeLaDemo[] = [
  { patron: /^\/inmobiliaria\/pqrs(\?|$)/, respuesta: lista },
];
