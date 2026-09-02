/**
 * Properties API service
 * Wraps apiClient with property-specific mapper logic
 */

import { apiClient, getAccessToken, ApiError } from './client';
import { mapBackendProperty, mapBackendAgencyProperty, TYPE_TO_BACKEND, LISTING_TYPE_TO_BACKEND } from './properties.mapper';
import type { BackendProperty, PaginatedResponse, PropertyFiltersParams } from './properties.types';
import type { Property, AgencyProperty } from '@/lib/types/property';
import type { PaginationMeta } from './properties.types';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3000';

export interface PaginatedProperties {
  data: Property[];
  meta: PaginationMeta;
}

function buildQueryString(filters: PropertyFiltersParams): string {
  const params = new URLSearchParams();

  if (filters.city) params.set('city', filters.city);
  if (filters.neighborhood) params.set('neighborhood', filters.neighborhood);
  if (filters.minPrice != null) params.set('minPrice', String(filters.minPrice));
  if (filters.maxPrice != null) params.set('maxPrice', String(filters.maxPrice));
  if (filters.bedrooms != null) params.set('bedrooms', String(filters.bedrooms));
  if (filters.bathrooms != null) params.set('bathrooms', String(filters.bathrooms));
  if (filters.parkingSpaces != null) params.set('parkingSpaces', String(filters.parkingSpaces));
  if (filters.stratum != null) params.set('stratum', String(filters.stratum));
  if (filters.minArea != null) params.set('minArea', String(filters.minArea));
  if (filters.maxArea != null) params.set('maxArea', String(filters.maxArea));
  if (filters.floor != null) params.set('floor', String(filters.floor));
  if (filters.propertyType) params.set('propertyType', filters.propertyType);
  if (filters.amenities?.length) params.set('amenities', filters.amenities.join(','));
  if (filters.searchQuery) params.set('searchQuery', filters.searchQuery);
  if (filters.naturalQuery) params.set('naturalQuery', filters.naturalQuery);
  if (filters.page != null) params.set('page', String(filters.page));
  if (filters.limit != null) params.set('limit', String(filters.limit));

  const qs = params.toString();
  return qs ? `?${qs}` : '';
}

export const propertiesApi = {
  /** List properties with filters and pagination */
  async list(filters: PropertyFiltersParams = {}): Promise<PaginatedProperties> {
    const qs = buildQueryString(filters);
    const res = await apiClient.get<PaginatedResponse<BackendProperty>>(`/properties${qs}`);
    return {
      data: res.data.map(mapBackendProperty),
      meta: res.meta,
    };
  },

  /** Get a single property by ID */
  async getById(id: string): Promise<Property> {
    const bp = await apiClient.get<BackendProperty>(`/properties/${id}`);
    return mapBackendProperty(bp);
  },

  /** Get properties owned by the authenticated landlord (with agent assignments) */
  async getMine(): Promise<AgencyProperty[]> {
    const bps = await apiClient.get<BackendProperty[]>('/properties/mine');
    return bps.map(mapBackendAgencyProperty);
  },

  /** Get properties assigned to the authenticated agent */
  async getAssigned(): Promise<AgencyProperty[]> {
    const bps = await apiClient.get<BackendProperty[]>('/properties/assigned');
    return bps.map(mapBackendAgencyProperty);
  },

  /** Assign an agent to a property by email */
  async assignAgent(propertyId: string, email: string): Promise<void> {
    await apiClient.post(`/properties/${propertyId}/agents`, { email });
  },

  /** Remove an agent from a property */
  async removeAgent(propertyId: string, agentId: string): Promise<void> {
    await apiClient.delete(`/properties/${propertyId}/agents/${agentId}`);
  },

  /** Create a new property */
  async create(data: {
    title: string;
    description: string;
    type: string;
    city: string;
    neighborhood: string;
    address: string;
    /**
     * contract.md T-0038 §3.2.4 — `number | null`, was `number`. A SALE
     * listing sends `null` (or omits the key), never `0` (C6). Kept required
     * (not `?`) so every call site states its intent explicitly instead of
     * silently omitting it.
     */
    monthlyRent: number | null;
    bedrooms: number;
    bathrooms: number;
    area: number;
    status?: string;
    latitude?: number;
    longitude?: number;
    adminFee?: number;
    deposit?: number;
    floor?: number;
    parkingSpaces?: number;
    stratum?: number;
    yearBuilt?: number;
    amenities?: string[];
    /** contract.md T-0038 §3.2.1 — optional on write; `@IsIn` on the back. */
    department?: string;
    /** contract.md T-0038 §3.2.2 — optional, server-defaults to RENT. */
    listingType?: 'rent' | 'sale';
    /** contract.md T-0038 §3.2.3 — required when `listingType === 'sale'`, never `0`. */
    salePrice?: number | null;
    /** contract.md T-0038 §3.2.6 — `"YYYY-MM-DD"`, agency-only, optional. */
    consignedAt?: string;
  }): Promise<Property> {
    const body = {
      ...data,
      type: TYPE_TO_BACKEND[data.type as keyof typeof TYPE_TO_BACKEND] ?? data.type,
      // contract.md T-0038 §3.2.2 — wire is UPPER_SNAKE. Only sent when the
      // caller passed one: `forbidNonWhitelisted: true` on the back means an
      // `undefined` key must not survive JSON.stringify as `listingType:
      // undefined` — it doesn't (JSON drops `undefined` values), but this
      // keeps the mapping explicit rather than relying on that.
      ...(data.listingType ? { listingType: LISTING_TYPE_TO_BACKEND[data.listingType] } : {}),
    };
    const bp = await apiClient.post<BackendProperty>('/properties', body);
    return mapBackendProperty(bp);
  },

  /** Update an existing property */
  async update(id: string, data: Record<string, unknown>): Promise<Property> {
    const body = { ...data };
    if (typeof body.type === 'string' && body.type in TYPE_TO_BACKEND) {
      body.type = TYPE_TO_BACKEND[body.type as keyof typeof TYPE_TO_BACKEND];
    }
    const bp = await apiClient.patch<BackendProperty>(`/properties/${id}`, body);
    return mapBackendProperty(bp);
  },

  /** Delete a property */
  async delete(id: string): Promise<void> {
    await apiClient.delete(`/properties/${id}`);
  },

  /**
   * Get a property's images WITH their ids (GET /properties/:id).
   * mapBackendProperty flattens images to URLs; deletion needs the ids.
   */
  async getImages(propertyId: string): Promise<{ id: string; url: string; order: number }[]> {
    const bp = await apiClient.get<BackendProperty>(`/properties/${propertyId}`);
    return [...(bp.images ?? [])]
      .sort((a, b) => a.order - b.order)
      .map(({ id, url, order }) => ({ id, url, order }));
  },

  /** Upload an image (multipart - uses fetch directly for FormData) */
  async uploadImage(propertyId: string, file: File): Promise<{ id: string; url: string; order: number }> {
    const token = getAccessToken();

    const formData = new FormData();
    formData.append('file', file);

    const headers: Record<string, string> = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;

    let res: Response;
    try {
      res = await fetch(`${BACKEND_URL}/properties/${propertyId}/images`, {
        method: 'POST',
        headers,
        body: formData,
      });
    } catch (err) {
      const raw = err instanceof Error ? err.message : String(err);
      throw new ApiError(0, `No pudimos conectarnos al servidor. ${raw}`);
    }

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new ApiError(res.status, (body as { message?: string }).message || `Upload failed: ${res.status}`);
    }

    return res.json();
  },

  /** Delete an image */
  async deleteImage(propertyId: string, imageId: string): Promise<void> {
    await apiClient.delete(`/properties/${propertyId}/images/${imageId}`);
  },

  /** Reorder images */
  async reorderImages(propertyId: string, imageIds: string[]): Promise<void> {
    await apiClient.patch(`/properties/${propertyId}/images/order`, { imageIds });
  },
};

/**
 * The backend plan-enforcement gate rejects publish-on-create with a 403
 * ForbiddenException whose Spanish message mentions the plan limit
 * (properties.service.ts: "Has alcanzado el limite de N propiedad(es)
 * publicadas en tu plan actual…"). Match by status AND message content so
 * real authorization failures are never swallowed.
 */
function isPlanLimitError(err: unknown): boolean {
  return (
    err instanceof ApiError &&
    err.status === 403 &&
    /l[ií]mite/i.test(err.message) &&
    /plan/i.test(err.message)
  );
}

export interface CreateWithFallbackResult {
  property: Property;
  /** true when the plan limit blocked publishing and the property landed as DRAFT */
  publishBlocked: boolean;
}

/**
 * Create a property published (status AVAILABLE, marketplace contract).
 * If the backend plan limit rejects the publish (403 + plan-limit message),
 * retry ONCE without status so the property is saved as DRAFT instead of
 * losing the whole form. Any other error is rethrown untouched.
 */
export async function createPublishedWithDraftFallback(
  data: Omit<Parameters<typeof propertiesApi.create>[0], 'status'>,
): Promise<CreateWithFallbackResult> {
  try {
    const property = await propertiesApi.create({ ...data, status: 'AVAILABLE' });
    return { property, publishBlocked: false };
  } catch (err) {
    if (!isPlanLimitError(err)) throw err;
    const property = await propertiesApi.create(data);
    return { property, publishBlocked: true };
  }
}
