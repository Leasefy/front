/**
 * Property Publishing Types
 */

export interface PropertyDraft {
  // Step 1: Property Type
  type: 'apartment' | 'house' | 'studio' | 'room' | '';

  // Step 2: Location
  city: string;
  neighborhood: string;
  address: string;

  // Step 3: Details
  bedrooms: number;
  bathrooms: number;
  area: number;
  parkingSpaces: number;
  floor: number;
  stratum: number;
  yearBuilt: number;

  // Step 4: Amenities
  amenities: string[];

  // Step 5: Photos
  photos: string[];

  // Step 6: Pricing
  monthlyRent: number;
  adminFee: number;
  deposit: number;

  // Step 7: Description
  title: string;
  description: string;

  // Step 8: Plan Selection
  selectedPlan: 'free' | 'pro' | 'business' | '';
}

export interface PublishStep {
  id: number;
  key: string;
  label: string;
  description: string;
}

export const PUBLISH_STEPS: PublishStep[] = [
  { id: 1, key: 'type', label: 'Tipo', description: 'Tipo de inmueble' },
  { id: 2, key: 'location', label: 'Ubicacion', description: 'Ubicacion del inmueble' },
  { id: 3, key: 'details', label: 'Detalles', description: 'Caracteristicas del inmueble' },
  { id: 4, key: 'amenities', label: 'Amenidades', description: 'Amenidades disponibles' },
  { id: 5, key: 'photos', label: 'Fotos', description: 'Fotos del inmueble' },
  { id: 6, key: 'pricing', label: 'Precios', description: 'Precio y costos' },
  { id: 7, key: 'description', label: 'Descripcion', description: 'Titulo y descripcion' },
  { id: 8, key: 'plan', label: 'Plan', description: 'Elige tu plan' },
  { id: 9, key: 'review', label: 'Revisar', description: 'Revisar y publicar' },
];

export const PROPERTY_TYPES = [
  { value: 'apartment', label: 'Apartamento', description: 'Unidad en edificio residencial' },
  { value: 'house', label: 'Casa', description: 'Vivienda independiente' },
  { value: 'studio', label: 'Estudio', description: 'Espacio abierto compacto' },
  { value: 'room', label: 'Habitacion', description: 'Cuarto individual en vivienda compartida' },
];

export const AMENITIES_OPTIONS = [
  { value: 'pool', label: 'Piscina' },
  { value: 'gym', label: 'Gimnasio' },
  { value: 'security', label: 'Vigilancia 24/7' },
  { value: 'parking', label: 'Parqueadero' },
  { value: 'elevator', label: 'Ascensor' },
  { value: 'terrace', label: 'Terraza' },
  { value: 'bbq', label: 'Zona BBQ' },
  { value: 'playground', label: 'Zona infantil' },
  { value: 'laundry', label: 'Lavanderia' },
  { value: 'pets', label: 'Acepta mascotas' },
  { value: 'furnished', label: 'Amoblado' },
  { value: 'balcony', label: 'Balcon' },
  { value: 'storage', label: 'Deposito' },
  { value: 'ac', label: 'Aire acondicionado' },
  { value: 'heating', label: 'Calefaccion' },
];

export const CITIES = [
  'Bogota',
  'Medellin',
  'Cali',
  'Barranquilla',
  'Cartagena',
  'Bucaramanga',
];

export const NEIGHBORHOODS: Record<string, string[]> = {
  'Bogota': ['Chapinero', 'Usaquen', 'Suba', 'Cedritos', 'Santa Barbara', 'Chico', 'La Candelaria', 'Teusaquillo'],
  'Medellin': ['El Poblado', 'Laureles', 'Envigado', 'Belen', 'La America', 'Estadio'],
  'Cali': ['Granada', 'Ciudad Jardin', 'San Fernando', 'El Penon', 'San Antonio'],
  'Barranquilla': ['El Prado', 'Alto Prado', 'Riomar', 'Villa Country'],
  'Cartagena': ['Bocagrande', 'Castillogrande', 'Manga', 'Getsemani'],
  'Bucaramanga': ['Cabecera', 'Sotomayor', 'Cacique', 'La Florida'],
};

export const initialPropertyDraft: PropertyDraft = {
  type: '',
  city: '',
  neighborhood: '',
  address: '',
  bedrooms: 1,
  bathrooms: 1,
  area: 50,
  parkingSpaces: 0,
  floor: 1,
  stratum: 3,
  yearBuilt: 2020,
  amenities: [],
  photos: [],
  monthlyRent: 0,
  adminFee: 0,
  deposit: 0,
  title: '',
  description: '',
  selectedPlan: '',
};
