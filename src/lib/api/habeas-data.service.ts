import { apiClient } from './client';

/**
 * 🔴 PROTECCIÓN DE DATOS: las solicitudes de habeas data de los titulares
 * (Ley 1581, 23-09-2026).
 *
 * La mayoría de las personas cuyos datos guarda la inmobiliaria —propietarios
 * e inquilinos migrados, postulantes, proveedores— no tiene cuenta en
 * Leasefy: piden por correo, carta o en la oficina. La inmobiliaria registra
 * la solicitud, el back cuenta el plazo en días hábiles con los festivos y
 * avisa cuando se acerca el vencimiento, y la respuesta queda como constancia.
 *
 * Sólo ADMIN y CONTADOR (`HabeasDataGuard` del back).
 */

const BASE = '/inmobiliaria/habeas-data';

export type TipoDeSolicitud = 'CONSULTA' | 'RECTIFICACION' | 'SUPRESION' | 'REVOCATORIA';
export type CanalDeLaSolicitud = 'CORREO' | 'CARTA' | 'PRESENCIAL' | 'TELEFONO' | 'OTRO';
export type EstadoDelPlazo = 'RESPONDIDA' | 'EN_PLAZO' | 'POR_VENCER' | 'VENCIDA';
export type ResultadoDeLaSolicitud = 'ATENDIDA' | 'NEGADA';
export type TipoDeDocumentoDelTitular = 'CC' | 'CE' | 'TI' | 'NIT' | 'PASSPORT' | 'PPT';

export interface SolicitudDeHabeasData {
  id: string;
  tipo: TipoDeSolicitud;
  canal: CanalDeLaSolicitud;
  titular: {
    nombre: string;
    tipoDocumento: string;
    documento: string;
    correo: string | null;
    telefono: string | null;
  };
  descripcion: string;
  /** `YYYY-MM-DD`, día civil de Bogotá. */
  recibidaEl: string;
  venceEl: string;
  plazoEnDiasHabiles: number;
  /** Negativo cuando ya venció. */
  diasHabilesRestantes: number;
  estado: 'ABIERTA' | 'RESPONDIDA';
  estadoDelPlazo: EstadoDelPlazo;
  resultado: ResultadoDeLaSolicitud | null;
  respuesta: string | null;
  respondidaEl: string | null;
  respondidaPor: string | null;
  creadaEl: string;
}

export interface ListaDeSolicitudes {
  disponible: boolean;
  /** La migración que falta, cuando `disponible` es false. */
  migracion: string | null;
  resumen: { abiertas: number; porVencer: number; vencidas: number; respondidas: number };
  solicitudes: SolicitudDeHabeasData[];
}

export interface NuevaSolicitud {
  tipo: TipoDeSolicitud;
  canal: CanalDeLaSolicitud;
  titularNombre: string;
  titularTipoDocumento: TipoDeDocumentoDelTitular;
  titularDocumento: string;
  titularCorreo?: string;
  titularTelefono?: string;
  descripcion: string;
  /** Sin él, hoy en Bogotá. */
  recibidaEl?: string;
}

export interface DatosDelTitular {
  solicitudId: string;
  generadoEl: string;
  titular: { nombre: string; tipoDocumento: string; documento: string };
  encontrados: number;
  secciones: Record<string, unknown>;
  noIncluye: string[];
}

export const habeasDataApi = {
  listar: () => apiClient.get<ListaDeSolicitudes>(`${BASE}/solicitudes`),
  crear: (datos: NuevaSolicitud) =>
    apiClient.post<SolicitudDeHabeasData>(`${BASE}/solicitudes`, datos),
  responder: (id: string, datos: { resultado: ResultadoDeLaSolicitud; respuesta: string }) =>
    apiClient.post<SolicitudDeHabeasData>(
      `${BASE}/solicitudes/${encodeURIComponent(id)}/responder`,
      datos,
    ),
  datosDelTitular: (id: string) =>
    apiClient.get<DatosDelTitular>(
      `${BASE}/solicitudes/${encodeURIComponent(id)}/datos-del-titular`,
    ),
};
