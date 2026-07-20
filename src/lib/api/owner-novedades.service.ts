/**
 * Portal del Propietario — servicio de novedades: daños + digest (F5, v8-05).
 *
 * Todo por la capa HTTP compartida (`owner-portal.http`): transporte agent-directo + degrade honesto
 * a `null` = no-disponible → "Próximamente". Daños es además fail-soft por `available:false`.
 */
import { ownerGet } from './owner-portal.http';
import type { DanosResponse, DigestListItem, Digest } from './owner-novedades.types';

export const ownerNovedadesApi = {
  /** GET /danos — daños del propietario (fail-soft: `available:false` si la tabla no existe). */
  getDanos: (agencyId: string | null, propertyRef?: string): Promise<DanosResponse | null> => {
    const suffix = propertyRef ? `?propertyRef=${propertyRef}` : '';
    return ownerGet<DanosResponse>(agencyId, `/danos${suffix}`);
  },

  /** GET /digests — lista de digests mensuales. `[]` si no-disponible. */
  getDigests: async (agencyId: string | null): Promise<DigestListItem[]> =>
    (await ownerGet<DigestListItem[]>(agencyId, '/digests')) ?? [],

  /** GET /digest/{periodo} — digest persistido de un periodo (YYYY-MM). */
  getDigest: (agencyId: string | null, periodo: string): Promise<Digest | null> =>
    ownerGet<Digest>(agencyId, `/digest/${periodo}`),
};
