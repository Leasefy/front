/**
 * Portal del Propietario — servicio de finanzas (F3 "Ver mi plata", v8-02).
 *
 * Los 8 endpoints owner-facing de finanzas. Todo pasa por la capa HTTP compartida
 * (`owner-portal.http`) → transporte agent-directo + degrade honesto a `null`/`[]` = no-disponible.
 * Montos leídos VERBATIM (sin aritmética de cliente).
 */
import {
  ownerGet,
  ownerGetBlob,
  ownerGetBlobConEstado,
  ownerGetConEstado,
  type ResultadoDelPortal,
} from './owner-portal.http';
import type {
  FinanzasPortafolio,
  FinanzasInmueble,
  FinanzasInmuebleDetalle,
  FinanzasPagos,
  FinanzasRecaudoAnual,
  FinanzasProyeccion,
} from './owner-finanzas.types';

export const ownerFinanzasApi = {
  /** GET /portafolio con el estado: «no habilitado» ≠ «falló» (O1). Es lo que gobierna Mi plata. */
  getPortafolioConEstado: (
    agencyId: string | null,
  ): Promise<ResultadoDelPortal<FinanzasPortafolio>> =>
    ownerGetConEstado<FinanzasPortafolio>(agencyId, '/portafolio'),

  /** GET /portafolio — consolidado multi-inmueble. */
  getPortafolio: (agencyId: string | null): Promise<FinanzasPortafolio | null> =>
    ownerGet<FinanzasPortafolio>(agencyId, '/portafolio'),

  /** GET /inmuebles — lista de inmuebles del propietario. `[]` si no-disponible. */
  getInmuebles: async (agencyId: string | null): Promise<FinanzasInmueble[]> =>
    (await ownerGet<FinanzasInmueble[]>(agencyId, '/inmuebles')) ?? [],

  /** GET /inmuebles/{ref} — detalle de un inmueble. */
  getInmueble: (agencyId: string | null, propertyRef: string): Promise<FinanzasInmuebleDetalle | null> =>
    ownerGet<FinanzasInmuebleDetalle>(agencyId, `/inmuebles/${propertyRef}`),

  /** GET /inmuebles/{ref}/pagos — historial de pagos paginado. */
  getPagos: (
    agencyId: string | null,
    propertyRef: string,
    opts?: { limit?: number; offset?: number },
  ): Promise<FinanzasPagos | null> => {
    const qs = new URLSearchParams();
    if (opts?.limit != null) qs.set('limit', String(opts.limit));
    if (opts?.offset != null) qs.set('offset', String(opts.offset));
    const suffix = qs.toString() ? `?${qs}` : '';
    return ownerGet<FinanzasPagos>(agencyId, `/inmuebles/${propertyRef}/pagos${suffix}`);
  },

  /**
   * GET /recaudo/anual CON el estado (O3): una tarjeta que desaparece no dice
   * si falló o si no hay nada, y en una pantalla de plata esas dos cosas se
   * arreglan distinto.
   */
  getRecaudoAnualConEstado: (
    agencyId: string | null,
    year: number,
  ): Promise<ResultadoDelPortal<FinanzasRecaudoAnual>> =>
    ownerGetConEstado<FinanzasRecaudoAnual>(agencyId, `/recaudo/anual?year=${year}`),

  /** GET /proyeccion CON el estado (O3), por lo mismo. */
  getProyeccionConEstado: (
    agencyId: string | null,
  ): Promise<ResultadoDelPortal<FinanzasProyeccion>> =>
    ownerGetConEstado<FinanzasProyeccion>(agencyId, '/proyeccion'),

  /** GET /recaudo/anual — totales del año por concepto. */
  getRecaudoAnual: (agencyId: string | null, year: number): Promise<FinanzasRecaudoAnual | null> =>
    ownerGet<FinanzasRecaudoAnual>(agencyId, `/recaudo/anual?year=${year}`),

  /** GET /proyeccion — proyección de ingresos + supuestos. */
  getProyeccion: (agencyId: string | null): Promise<FinanzasProyeccion | null> =>
    ownerGet<FinanzasProyeccion>(agencyId, '/proyeccion'),

  /** GET /informe.pdf con el estado: la descarga dice si falló o si todavía no está (O2). */
  getInformePdfConEstado: (agencyId: string | null): Promise<ResultadoDelPortal<Blob>> =>
    ownerGetBlobConEstado(agencyId, '/informe.pdf'),

  /** GET /informe.pdf — informe descargable. `null` si no-disponible. */
  getInformePdf: (agencyId: string | null): Promise<Blob | null> =>
    ownerGetBlob(agencyId, '/informe.pdf'),
};
