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

  // Pricing (COP as integers)
  monthlyRent: number;
  adminFee: number;
  deposit: number;

  // Features
  bedrooms: number;
  bathrooms: number;
  area: number; // m²
  floor?: number;

  // Amenities
  amenities: PropertyAmenity[];

  // Images
  images: string[];
  thumbnailUrl: string;

  // Metadata
  landlordId: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Major Colombian cities for property listings
 */
export const COLOMBIAN_CITIES: string[] = [
  'Bogota',
  'Medellin',
  'Cali',
  'Barranquilla',
  'Cartagena',
  'Bucaramanga',
  'Pereira',
  'Santa Marta',
  'Manizales',
  'Cucuta',
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
  { id: 'balcony', name: 'Balcon', icon: 'sun' },
  { id: 'laundry', name: 'Zona de lavado', icon: 'shirt' },
  { id: 'pets', name: 'Acepta mascotas', icon: 'dog' },
  { id: 'furnished', name: 'Amoblado', icon: 'sofa' },
  { id: 'storage', name: 'Deposito', icon: 'archive' },
  { id: 'terrace', name: 'Terraza', icon: 'home' },
  { id: 'bbq', name: 'Zona BBQ', icon: 'flame' },
];
