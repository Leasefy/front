/**
 * Backend property API types
 * Reflects the exact shape of Prisma/NestJS responses
 */

export interface BackendPropertyImage {
  id: string;
  propertyId: string;
  url: string;
  order: number;
  createdAt: string;
}

export interface BackendPropertyAccessAgent {
  id: string; // access record id
  agentId: string;
  agent: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
  };
}

export interface BackendProperty {
  id: string;
  landlordId: string;
  title: string;
  description: string;
  type: 'APARTMENT' | 'HOUSE' | 'STUDIO' | 'ROOM';
  status: 'DRAFT' | 'AVAILABLE' | 'RENTED' | 'PENDING';

  // Location
  city: string;
  neighborhood: string;
  address: string;
  latitude: number | null;
  longitude: number | null;

  // Pricing (COP)
  monthlyRent: number;
  adminFee: number;
  deposit: number;

  // Characteristics
  bedrooms: number;
  bathrooms: number;
  area: number;
  floor: number | null;
  parkingSpaces: number | null;
  stratum: number | null;
  yearBuilt: number | null;
  amenities: string[];

  // Timestamps
  createdAt: string;
  updatedAt: string;

  // Relations (included by backend)
  images?: BackendPropertyImage[];
  propertyAccess?: BackendPropertyAccessAgent[];
}

export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: PaginationMeta;
}

export interface PropertyFiltersParams {
  city?: string;
  neighborhood?: string;
  minPrice?: number;
  maxPrice?: number;
  bedrooms?: number;
  bathrooms?: number;
  parkingSpaces?: number;
  stratum?: number;
  minArea?: number;
  maxArea?: number;
  floor?: number;
  propertyType?: 'APARTMENT' | 'HOUSE' | 'STUDIO' | 'ROOM';
  amenities?: string[];
  searchQuery?: string;
  naturalQuery?: string;
  page?: number;
  limit?: number;
}
