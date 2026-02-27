/**
 * Properties API service
 * Wraps apiClient with property-specific mapper logic
 */

import { apiClient, getAccessToken } from './client';
import { mapBackendProperty, TYPE_TO_BACKEND } from './properties.mapper';
import type { BackendProperty, PaginatedResponse, PropertyFiltersParams } from './properties.types';
import type { Property } from '@/lib/types/property';
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

  /** Get properties owned by the authenticated landlord */
  async getMine(): Promise<Property[]> {
    const bps = await apiClient.get<BackendProperty[]>('/properties/mine');
    return bps.map(mapBackendProperty);
  },

  /** Create a new property */
  async create(data: {
    title: string;
    description: string;
    type: string;
    city: string;
    neighborhood: string;
    address: string;
    monthlyRent: number;
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
  }): Promise<Property> {
    const body = {
      ...data,
      type: TYPE_TO_BACKEND[data.type as keyof typeof TYPE_TO_BACKEND] ?? data.type,
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

  /** Upload an image (multipart - uses fetch directly for FormData) */
  async uploadImage(propertyId: string, file: File): Promise<{ id: string; url: string; order: number }> {
    const token = getAccessToken();

    const formData = new FormData();
    formData.append('file', file);

    const headers: Record<string, string> = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch(`${BACKEND_URL}/properties/${propertyId}/images`, {
      method: 'POST',
      headers,
      body: formData,
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || `Upload failed: ${res.status}`);
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
