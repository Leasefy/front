/**
 * Property types for the rental catalog
 * Used throughout the app for property listings, cards, and details
 */

export type PropertyStatus = 'available' | 'rented' | 'pending';
export type PropertyType = 'apartment' | 'house' | 'studio' | 'room';

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

  // Pricing (COP as integers)
  monthlyRent: number;
  adminFee: number;
  deposit: number;

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
  createdAt: string;
  updatedAt: string;

  // Availability schedule for visits
  availabilitySchedule?: AvailabilitySchedule;
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
