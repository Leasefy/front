/**
 * Property types for the rental catalog
 * Used throughout the app for property listings, cards, and details
 */

export type PropertyStatus = 'available' | 'rented' | 'pending';
/**
 * Mirrors the backend `PropertyType` Prisma enum (contract.md §3.2, T-0011).
 * Wire values are the same names UPPERCASE — see `TYPE_TO_BACKEND` /
 * `TYPE_MAP` in `src/lib/api/properties.mapper.ts`.
 */
export type PropertyType =
  | 'apartment'
  | 'house'
  | 'studio'
  | 'room'
  | 'commercial'
  | 'office'
  | 'warehouse';

/**
 * contract.md T-0038 §3.2.2. Front-lowercase pair; wire is UPPER_SNAKE — see
 * `resolveListingType()` / `LISTING_TYPE_TO_BACKEND` in
 * `src/lib/api/properties.mapper.ts`.
 */
export type ListingType = 'rent' | 'sale';

export interface PropertyAmenity {
  id: string;
  name: string;
  icon?: string;
}

// ============================================================================
// Availability Schedule Types
// ============================================================================

export interface TimeRange {
  start: string; // "09:00" format 24h
  end: string;   // "18:00"
}

export interface DayAvailability {
  enabled: boolean;
  ranges: TimeRange[]; // Multiple ranges per day
}

export type DayOfWeek = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';

export interface AvailabilitySchedule {
  monday: DayAvailability;
  tuesday: DayAvailability;
  wednesday: DayAvailability;
  thursday: DayAvailability;
  friday: DayAvailability;
  saturday: DayAvailability;
  sunday: DayAvailability;
}

// ============================================================================
// Property Interface
// ============================================================================

export interface Property {
  id: string;
  title: string;
  description: string;
  type: PropertyType;
  status: PropertyStatus;

  // Location
  city: string;
  neighborhood: string;
  address: string;
  latitude: number;
  longitude: number;
  /** contract.md T-0038 §3.2.1 — `null` when no department could be resolved. */
  department: string | null;

  // Sale vs rent (contract.md T-0038 §3.2.2)
  listingType: ListingType;
  /** COP. `null` on a `listingType === 'rent'` listing, or unset. Never `0` (C6). */
  salePrice: number | null;

  // Pricing (COP as integers)
  /** `null` on a `listingType === 'sale'` listing. Never `0` (C6). */
  monthlyRent: number | null;
  adminFee: number;
  deposit: number;
  /**
   * contract.md T-0038 §3.2.5 — PORTFOLIO-only. `undefined` means "not
   * entitled to see it" (anonymous/tenant reader of a `@Public()` route), NOT
   * "no code yet". Render `—`, never fabricate.
   */
  code?: number;
  /**
   * contract.md T-0038 §3.2.6 — PORTFOLIO-only, agency/landlord/assigned
   * agent reads. Three states: `undefined` = not entitled (render nothing);
   * `null` = entitled, no date recorded ("Sin fecha"); string = the date.
   * Never construct a `Date` from it for display (day-off-by-one in
   * America/Bogotá) — render the `"YYYY-MM-DD"` string directly.
   */
  consignedAt?: string | null;

  // Features
  bedrooms: number;
  bathrooms: number;
  area: number; // m²
  floor?: number;
  parkingSpaces?: number;
  stratum?: number;
  yearBuilt?: number;

  // Amenities
  amenities: PropertyAmenity[];

  // Images
  images: string[];
  thumbnailUrl: string;

  // Metadata
  landlordId: string;
  agencyName?: string | null;
  /**
   * Offering agency's social links — only populated on the detail response
   * (GET /properties/:id); null on list cards.
   */
  agencySocials?: {
    instagram?: string;
    facebook?: string;
    x?: string;
    tiktok?: string;
    whatsapp?: string;
  } | null;
  createdAt: string;
  updatedAt: string;

  // Availability schedule for visits
  availabilitySchedule?: AvailabilitySchedule;
}

// ============================================================================
// Agency property — extends Property with agent assignment data
// Used in /panel/inmobiliaria/inmuebles
// ============================================================================

export interface PropertyAgent {
  accessId: string; // PropertyAccess record id (needed for DELETE)
  agentId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
}

export interface AgencyProperty extends Property {
  agents: PropertyAgent[]; // empty array when no agent assigned
}

// ============================================================================
// Constants
// ============================================================================

/**
 * Major Colombian cities for property listings
 */
export const COLOMBIAN_CITIES: string[] = [
  'Bogotá',
  'Medellín',
  'Cali',
  'Barranquilla',
  'Cartagena',
  'Bucaramanga',
  'Pereira',
  'Santa Marta',
  'Manizales',
  'Cúcuta',
];

/**
 * Common amenities available in Colombian properties
 */
export const PROPERTY_AMENITIES: PropertyAmenity[] = [
  { id: 'parking', name: 'Parqueadero', icon: 'car' },
  { id: 'gym', name: 'Gimnasio', icon: 'dumbbell' },
  { id: 'pool', name: 'Piscina', icon: 'waves' },
  { id: 'security', name: 'Seguridad 24h', icon: 'shield' },
  { id: 'elevator', name: 'Ascensor', icon: 'arrow-up' },
  { id: 'balcony', name: 'Balcón', icon: 'sun' },
  { id: 'laundry', name: 'Zona de lavado', icon: 'shirt' },
  { id: 'pets', name: 'Acepta mascotas', icon: 'dog' },
  { id: 'furnished', name: 'Amoblado', icon: 'sofa' },
  { id: 'storage', name: 'Depósito', icon: 'archive' },
  { id: 'terrace', name: 'Terraza', icon: 'home' },
  { id: 'bbq', name: 'Zona BBQ', icon: 'flame' },
];

/**
 * Days of the week for availability schedule
 */
export const DAYS_OF_WEEK: { key: DayOfWeek; label: string; shortLabel: string }[] = [
  { key: 'monday', label: 'Lunes', shortLabel: 'Lun' },
  { key: 'tuesday', label: 'Martes', shortLabel: 'Mar' },
  { key: 'wednesday', label: 'Miércoles', shortLabel: 'Mié' },
  { key: 'thursday', label: 'Jueves', shortLabel: 'Jue' },
  { key: 'friday', label: 'Viernes', shortLabel: 'Vie' },
  { key: 'saturday', label: 'Sábado', shortLabel: 'Sáb' },
  { key: 'sunday', label: 'Domingo', shortLabel: 'Dom' },
];

/**
 * Time options from 07:00 to 22:00 in 30-minute increments
 */
export const TIME_OPTIONS: string[] = Array.from({ length: 31 }, (_, i) => {
  const hours = Math.floor(i / 2) + 7;
  const minutes = (i % 2) * 30;
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
});

/**
 * Default availability schedule (Mon-Fri 9-18, Sat 10-14, Sun off)
 */
export const DEFAULT_AVAILABILITY_SCHEDULE: AvailabilitySchedule = {
  monday: { enabled: true, ranges: [{ start: '09:00', end: '18:00' }] },
  tuesday: { enabled: true, ranges: [{ start: '09:00', end: '18:00' }] },
  wednesday: { enabled: true, ranges: [{ start: '09:00', end: '18:00' }] },
  thursday: { enabled: true, ranges: [{ start: '09:00', end: '18:00' }] },
  friday: { enabled: true, ranges: [{ start: '09:00', end: '18:00' }] },
  saturday: { enabled: true, ranges: [{ start: '10:00', end: '14:00' }] },
  sunday: { enabled: false, ranges: [] },
};
