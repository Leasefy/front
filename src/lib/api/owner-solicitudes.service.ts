/**
 * Portal del Propietario — servicio de solicitudes (F4, v8-04).
 *
 * `getSolicitudes`/`getSolicitud` degradan a `[]`/`null` (no-disponible → "Próximamente").
 * `crear` usa `ownerPost` (semántica de acción) para distinguir éxito de error de validación /
 * no-disponible y mostrarle al propietario el motivo real.
 */
import { ownerGet, ownerPost, type OwnerActionResult } from './owner-portal.http';
import type { Solicitud, SolicitudDetalle, CrearSolicitudBody } from './owner-solicitudes.types';

export const ownerSolicitudesApi = {
  /** GET /solicitudes — solicitudes del propietario. `[]` si no-disponible. */
  getSolicitudes: async (agencyId: string | null): Promise<Solicitud[]> =>
    (await ownerGet<Solicitud[]>(agencyId, '/solicitudes')) ?? [],

  /** GET /solicitudes/{id} — detalle + timeline de debido proceso. */
  getSolicitud: (agencyId: string | null, requestId: string): Promise<SolicitudDetalle | null> =>
    ownerGet<SolicitudDetalle>(agencyId, `/solicitudes/${requestId}`),

  /** POST /solicitudes — crea una solicitud operativa. */
  crear: (agencyId: string | null, body: CrearSolicitudBody): Promise<OwnerActionResult<Solicitud>> =>
    ownerPost<Solicitud>(agencyId, '/solicitudes', body),
};
