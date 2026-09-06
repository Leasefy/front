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

/**
 * `Property.listingType` wire values (contract.md T-0038 §3.2.2). UPPER_SNAKE
 * on the wire; the front lower-cases only for i18n copy, never for the value
 * itself. Kept as a loose `string` on `BackendProperty` (not this union) so an
 * unknown member reaches `resolveListingType()` and throws (C19) instead of
 * being silently narrowed away by the type system.
 */
export type BackendListingType = 'RENT' | 'SALE';

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
  /**
   * contract.md T-0038 §3.2.1. `null` → no department resolved (ambiguous
   * municipality, or a pre-T-0038 row). Always present on the wire (not
   * optional) per the §3.6 visibility matrix — never omitted.
   */
  department: string | null;

  // Pricing (COP)
  /**
   * contract.md T-0038 §3.2.4 — `Property.monthlyRent` is now nullable.
   * `null` on a SALE listing. Optional on this type only to degrade against
   * an older backend build that has not shipped the migration yet; when the
   * key IS present it is always `number | null`, never omitted.
   */
  monthlyRent: number | null;
  adminFee: number;
  deposit: number;
  /**
   * contract.md T-0038 §3.2.2. Optional so an older backend build (pre-T-0038)
   * that omits the key degrades to RENT in `resolveListingType()` — see
   * `properties.mapper.ts`. A present-but-unknown value MUST throw, never
   * silently coerce (C19).
   */
  listingType?: string;
  /**
   * contract.md T-0038 §3.2.3. `bigint` on the wire is serialized as a JSON
   * `number` by the back's `PropertyResponseDto` (never a string — that would
   * be a re-freeze, §3.2.3). `null` → no sale price. Never `0` (C6).
   */
  salePrice?: number | null;
  /**
   * contract.md T-0038 §3.2.5. **PORTFOLIO-only.** Absent (not just
   * `undefined` after JSON parse, actually missing from the payload) on the
   * two `@Public()` routes — that absence means "not entitled to see it", NOT
   * "no code yet" (every property has one server-side). Never send back to
   * the API — `code` is rejected on write (`forbidNonWhitelisted`).
   */
  code?: number;
  /**
   * contract.md T-0038 §3.2.6. Date-only `"YYYY-MM-DD"` string — never parse
   * into a `Date` for display (UTC offset reads as the previous day in
   * America/Bogotá). Two absent states that MUST render differently:
   *  - key **absent** → not entitled to see it (anonymous/tenant reader).
   *  - explicit **`null`** → entitled, but no date recorded yet.
   * Collapsing these two is the exact bug §3.2.6 exists to prevent.
   */
  consignedAt?: string | null;

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
  // GET /properties/:id (detail) includes the offering agency's branding;
  // the list endpoint (GET /properties) returns only `{ name }`.
  agency?: {
    name: string;
    branding?: {
      primaryColor?: string;
      secondaryColor?: string;
      socials?: {
        instagram?: string;
        facebook?: string;
        x?: string;
        tiktok?: string;
        whatsapp?: string;
      } | null;
    } | null;
  } | null;
}

export interface PaginationMeta {
  /**
   * Qué entendió el back del texto libre: `{ ciudad: 'Medellín',
   * 'área': '50-90 m²' }`. Ausente cuando la búsqueda no traía texto.
   *
   * Se muestra en pantalla a propósito: escribir «de 70 m2» y ver una lista
   * no dice si el metraje se tuvo en cuenta o se ignoró.
   */
  interpretacion?: Record<string, string>;
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
  /** contract.md T-0038 §3.7 — absent means no constraint; NOT a default to RENT. */
  listingType?: BackendListingType;
  minSalePrice?: number;
  maxSalePrice?: number;
}
