/**
 * Maps backend property responses to frontend Property type
 */

import type { Property, PropertyType, PropertyStatus, PropertyAmenity, AgencyProperty, ListingType } from '@/lib/types/property';
import { PROPERTY_AMENITIES } from '@/lib/types/property';
import type { BackendProperty, BackendListingType } from './properties.types';

/**
 * Backend UPPERCASE -> Frontend lowercase.
 *
 * Exported because the bulk-import review UI reads `fila.datos.type` straight
 * off the wire and has to map it back for its picker (contract-addendum-3.md
 * §3.4, consequence 2). Use this rather than a second inverse table: two
 * mapping dictionaries drifting apart on a boundary with no codegen is the
 * failure this task exists to fix.
 */
export const TYPE_MAP: Record<string, PropertyType> = {
  APARTMENT: 'apartment',
  HOUSE: 'house',
  STUDIO: 'studio',
  ROOM: 'room',
  COMMERCIAL: 'commercial',
  OFFICE: 'office',
  WAREHOUSE: 'warehouse',
};

const STATUS_MAP: Record<string, PropertyStatus> = {
  DRAFT: 'pending',
  AVAILABLE: 'available',
  RENTED: 'rented',
  PENDING: 'pending',
};

// Frontend lowercase -> Backend UPPERCASE (for create/update)
export const TYPE_TO_BACKEND: Record<PropertyType, string> = {
  apartment: 'APARTMENT',
  house: 'HOUSE',
  studio: 'STUDIO',
  room: 'ROOM',
  commercial: 'COMMERCIAL',
  office: 'OFFICE',
  warehouse: 'WAREHOUSE',
};

/**
 * contract.md T-0038 §3.2.2 — wire UPPER_SNAKE -> front lowercase.
 * `undefined` (key absent, older backend build) degrades to `'rent'`.
 * A present-but-unrecognised value THROWS — no silent coercion (C19), the
 * same rule `TYPE_TO_BACKEND`/`TYPE_MAP` violate-not, since `PropertyType`
 * mapping already defaults quietly (a pre-existing, unrelated drift — not
 * widened here).
 */
export function resolveListingType(raw: string | undefined): ListingType {
  if (raw === undefined) return 'rent';
  if (raw === 'RENT') return 'rent';
  if (raw === 'SALE') return 'sale';
  throw new Error(`Tipo de operación desconocido: "${raw}". No se puede mostrar esta propiedad.`);
}

export const LISTING_TYPE_TO_BACKEND: Record<ListingType, BackendListingType> = {
  rent: 'RENT',
  sale: 'SALE',
};

// Amenity ID -> PropertyAmenity object lookup
const amenityMap = new Map<string, PropertyAmenity>(
  PROPERTY_AMENITIES.map((a) => [a.id, a]),
);

function resolveAmenities(ids: string[]): PropertyAmenity[] {
  return ids
    .map((id) => amenityMap.get(id))
    .filter((a): a is PropertyAmenity => a !== undefined);
}

/**
 * Convert a backend Property to the frontend Property interface
 */
export function mapBackendProperty(bp: BackendProperty): Property {
  // Sort images by order, extract URLs
  const sortedImages = [...(bp.images ?? [])].sort((a, b) => a.order - b.order);
  const imageUrls = sortedImages.map((img) => img.url);
  const thumbnailUrl = imageUrls[0] ?? '';

  // contract.md T-0038 §3.2.6 — absent vs `null` are different contracts.
  // Spreading only when the key exists is what lets `'consignedAt' in result`
  // stay false for an unentitled reader instead of becoming `undefined` via
  // an always-present property (which reads identically to a lost value).
  const consignedAt: { consignedAt?: string | null } =
    'consignedAt' in bp ? { consignedAt: bp.consignedAt } : {};

  return {
    id: bp.id,
    title: bp.title,
    description: bp.description,
    type: TYPE_MAP[bp.type] ?? 'apartment',
    status: STATUS_MAP[bp.status] ?? 'available',

    // Location
    city: bp.city,
    neighborhood: bp.neighborhood,
    address: bp.address,
    // `null` se queda `null`: convertirlo en 0 inventaba una ubicación en (0,0).
    latitude: bp.latitude ?? null,
    longitude: bp.longitude ?? null,
    department: bp.department,

    // Sale vs rent (contract.md T-0038 §3.2.2-§3.2.4)
    listingType: resolveListingType(bp.listingType),
    // Ausente en un back viejo ⇒ se deja `undefined` y el aviso ofrece las dos,
    // que es como venía funcionando. NUNCA se rellena con un arreglo vacío:
    // vacío significa «ninguna» y apagaría el agendamiento sin que nadie lo
    // haya pedido.
    ...(Array.isArray((bp as { visitTypes?: unknown }).visitTypes)
      ? {
          visitTypes: (bp as unknown as {
            visitTypes: Array<'IN_PERSON' | 'VIRTUAL'>;
          }).visitTypes,
        }
      : {}),
    salePrice: bp.salePrice ?? null,

    // Pricing
    monthlyRent: bp.monthlyRent,
    adminFee: bp.adminFee,
    deposit: bp.deposit,
    // PORTFOLIO-only (§3.2.5) — absent on the two @Public() routes. Passing
    // through `bp.code` preserves that absence as `undefined` (never `0`).
    code: bp.code,
    ...consignedAt,

    // Features
    bedrooms: bp.bedrooms,
    bathrooms: bp.bathrooms,
    area: bp.area,
    floor: bp.floor ?? undefined,

    // Extra backend fields
    parkingSpaces: bp.parkingSpaces ?? undefined,
    stratum: bp.stratum ?? undefined,
    yearBuilt: bp.yearBuilt ?? undefined,

    // Amenities: string[] -> PropertyAmenity[]
    amenities: resolveAmenities(bp.amenities),

    // Images
    images: imageUrls,
    thumbnailUrl,

    // Metadata
    landlordId: bp.landlordId,
    agencyName: bp.agency?.name ?? null,
    // Only present on GET /properties/:id (detail); null on list responses
    agencySocials: bp.agency?.branding?.socials ?? null,
    createdAt: bp.createdAt,
    updatedAt: bp.updatedAt,
  };
}

/**
 * Convert a backend Property (with propertyAccess) to AgencyProperty
 */
export function mapBackendAgencyProperty(bp: BackendProperty): AgencyProperty {
  const base = mapBackendProperty(bp);
  return {
    ...base,
    agents: (bp.propertyAccess ?? []).map((pa) => ({
      accessId: pa.id,
      agentId: pa.agent.id,
      firstName: pa.agent.firstName,
      lastName: pa.agent.lastName,
      email: pa.agent.email,
      phone: pa.agent.phone,
    })),
  };
}
