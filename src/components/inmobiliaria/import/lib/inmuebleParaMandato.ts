/**
 * inmuebleParaMandato — maps a just-created `Property` (the
 * `propertiesApi.create` response) into the `InmuebleSinConsignacion` shape
 * `buildMandatoPayload` already knows how to turn into a mandate (T-0030
 * WU-3, Slice A / R1).
 *
 * `Property.type` already uses the same lowercase union as
 * `PropertyTypeAmplio` (contract.md T-0030 §3.2's ROOM trap included — see
 * `front/src/lib/types/property.ts`), so no enum translation is needed here;
 * `buildMandatoPayload` is what omits `propertyType` for a ROOM row.
 *
 * `status`/`createdAt` on `InmuebleSinConsignacion` are not read by
 * `buildMandatoPayload` — they exist only to satisfy the shared type, so a
 * fixed placeholder is fine (the row IS freshly created and, per contract
 * §3.4, is never auto-published here — see `StepConfirmImport.tsx`).
 */

import type { Property } from '@/lib/types/property';
import type { InmuebleSinConsignacion, PropertyTypeAmplio } from '@/lib/types/inmobiliaria';

export function inmuebleParaMandato(property: Property): InmuebleSinConsignacion {
  return {
    propertyId: property.id,
    propertyTitle: property.title,
    propertyAddress: property.address,
    propertyCity: property.city,
    propertyZone: property.neighborhood ?? '',
    propertyType: property.type as PropertyTypeAmplio,
    // The property was JUST created — photos (if any) upload in the phase
    // right after this, so there is no thumbnail to offer yet. Omitting is
    // honest; `buildMandatoPayload` treats null the same as "not present".
    propertyThumbnail: null,
    monthlyRent: property.monthlyRent,
    adminFee: property.adminFee,
    status: 'draft',
    createdAt: property.createdAt,
  };
}
