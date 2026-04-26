/**
 * Maps backend property responses to frontend Property type
 */

import type { Property, PropertyType, PropertyStatus, PropertyAmenity, AgencyProperty } from '@/lib/types/property';
import { PROPERTY_AMENITIES } from '@/lib/types/property';
import type { BackendProperty } from './properties.types';

// Backend UPPERCASE -> Frontend lowercase
const TYPE_MAP: Record<string, PropertyType> = {
  APARTMENT: 'apartment',
  HOUSE: 'house',
  STUDIO: 'studio',
  ROOM: 'room',
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
    latitude: bp.latitude ?? 0,
    longitude: bp.longitude ?? 0,

    // Pricing
    monthlyRent: bp.monthlyRent,
    adminFee: bp.adminFee,
    deposit: bp.deposit,

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
