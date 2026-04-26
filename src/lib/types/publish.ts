/**
 * Property Publishing Types
 */

// ============================================================================
// Tenant Requirements Types
// ============================================================================

export type EmploymentType = 'employed' | 'self-employed' | 'student' | 'retired';
export type IncomeRatio = 0 | 2 | 3 | 4;
export type PetsPolicy = 'none' | 'small' | 'all' | '';
export type SmokingPolicy = 'none' | 'outside' | 'allowed' | '';
export type ChildrenPolicy = 'yes' | 'no' | 'indifferent';
export type LeaseDuration = 0 | 6 | 12 | 24;

export interface TenantVerifications {
  creditCheck: boolean;
  backgroundCheck: boolean;
  employmentVerification: boolean;
  previousLandlordRef: boolean;
  guarantorRequired: boolean;
}

export interface TenantRequirements {
  // Employment - multiple selection allowed
  acceptedEmployment: EmploymentType[];
  employmentNonNegotiable: boolean;

  // Income
  minIncomeRatio: IncomeRatio;
  incomeNonNegotiable: boolean;

  // Pets
  petsPolicy: PetsPolicy;
  petsNonNegotiable: boolean;

  // Smoking
  smokingPolicy: SmokingPolicy;
  smokingNonNegotiable: boolean;

  // Occupants
  maxOccupants: number; // 0 = no limit
  occupantsNonNegotiable: boolean;

  // Children
  childrenPolicy: ChildrenPolicy;

  // Lease Duration
  minLeaseDuration: LeaseDuration;
  leaseNonNegotiable: boolean;

  // Verifications
  verifications: TenantVerifications;
  verificationsNonNegotiable: boolean;
}

// ============================================================================
// Tenant Requirements Constants
// ============================================================================

export const EMPLOYMENT_OPTIONS: { value: EmploymentType; label: string }[] = [
  { value: 'employed', label: 'Empleado' },
  { value: 'self-employed', label: 'Independiente' },
  { value: 'student', label: 'Estudiante' },
  { value: 'retired', label: 'Jubilado' },
];

export const INCOME_RATIO_OPTIONS: { value: IncomeRatio; label: string }[] = [
  { value: 0, label: 'Sin requisito' },
  { value: 2, label: '2x el arriendo' },
  { value: 3, label: '3x el arriendo' },
  { value: 4, label: '4x el arriendo' },
];

export const PETS_POLICY_OPTIONS: { value: PetsPolicy; label: string; description: string }[] = [
  { value: '', label: 'Sin especificar', description: 'No definir política de mascotas' },
  { value: 'none', label: 'No permitidas', description: 'No se aceptan mascotas' },
  { value: 'small', label: 'Solo pequeñas', description: 'Solo mascotas pequeñas (gatos, perros pequeños)' },
  { value: 'all', label: 'Todas permitidas', description: 'Se aceptan todo tipo de mascotas' },
];

export const SMOKING_POLICY_OPTIONS: { value: SmokingPolicy; label: string; description: string }[] = [
  { value: '', label: 'Sin especificar', description: 'No definir política de fumadores' },
  { value: 'none', label: 'No permitido', description: 'Propiedad libre de humo' },
  { value: 'outside', label: 'Solo exterior', description: 'Permitido solo en áreas exteriores' },
  { value: 'allowed', label: 'Permitido', description: 'Se permite fumar en la propiedad' },
];

export const CHILDREN_POLICY_OPTIONS: { value: ChildrenPolicy; label: string }[] = [
  { value: 'indifferent', label: 'Indiferente' },
  { value: 'yes', label: 'Sí, familias bienvenidas' },
  { value: 'no', label: 'Preferiblemente sin niños' },
];

export const LEASE_DURATION_OPTIONS: { value: LeaseDuration; label: string }[] = [
  { value: 0, label: 'Sin mínimo' },
  { value: 6, label: '6 meses' },
  { value: 12, label: '12 meses' },
  { value: 24, label: '24 meses' },
];

export const VERIFICATION_OPTIONS: { key: keyof TenantVerifications; label: string; description: string }[] = [
  { key: 'creditCheck', label: 'Verificación de crédito', description: 'Consulta historial crediticio' },
  { key: 'backgroundCheck', label: 'Antecedentes', description: 'Verificación de antecedentes penales' },
  { key: 'employmentVerification', label: 'Verificación de empleo', description: 'Confirmar situación laboral' },
  { key: 'previousLandlordRef', label: 'Referencias de arrendador anterior', description: 'Contactar arrendadores previos' },
  { key: 'guarantorRequired', label: 'Codeudor requerido', description: 'Exigir fiador o codeudor' },
];

export const initialTenantRequirements: TenantRequirements = {
  acceptedEmployment: [],
  employmentNonNegotiable: false,
  minIncomeRatio: 0,
  incomeNonNegotiable: false,
  petsPolicy: '',
  petsNonNegotiable: false,
  smokingPolicy: '',
  smokingNonNegotiable: false,
  maxOccupants: 0,
  occupantsNonNegotiable: false,
  childrenPolicy: 'indifferent',
  minLeaseDuration: 0,
  leaseNonNegotiable: false,
  verifications: {
    creditCheck: false,
    backgroundCheck: false,
    employmentVerification: false,
    previousLandlordRef: false,
    guarantorRequired: false,
  },
  verificationsNonNegotiable: false,
};

// ============================================================================
// Property Draft Interface
// ============================================================================

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

  // Step 8: Tenant Requirements (NEW)
  tenantRequirements: TenantRequirements;

  // Step 9: Plan Selection
  ownerType: 'propietario' | 'inmobiliaria' | '';
  selectedPlan: 'starter' | 'pro' | 'flex' | 'enterprise' | '';
}

export interface PublishStep {
  id: number;
  key: string;
  label: string;
  description: string;
}

export const PUBLISH_STEPS: PublishStep[] = [
  { id: 1, key: 'type', label: 'Tipo', description: 'Tipo de inmueble' },
  { id: 2, key: 'location', label: 'Ubicación', description: 'Ubicación del inmueble' },
  { id: 3, key: 'details', label: 'Detalles', description: 'Características del inmueble' },
  { id: 4, key: 'amenities', label: 'Amenidades', description: 'Amenidades disponibles' },
  { id: 5, key: 'photos', label: 'Fotos', description: 'Fotos del inmueble' },
  { id: 6, key: 'pricing', label: 'Precios', description: 'Precio y costos' },
  { id: 7, key: 'description', label: 'Descripción', description: 'Título y descripción' },
  { id: 8, key: 'tenant', label: 'Inquilino', description: 'Requisitos del inquilino ideal' },
  { id: 9, key: 'plan', label: 'Plan', description: 'Elige tu plan' },
  { id: 10, key: 'review', label: 'Revisar', description: 'Revisar y publicar' },
];

export const PROPERTY_TYPES = [
  { value: 'apartment', label: 'Apartamento', description: 'Unidad en edificio residencial' },
  { value: 'house', label: 'Casa', description: 'Vivienda independiente' },
  { value: 'studio', label: 'Estudio', description: 'Espacio abierto compacto' },
  { value: 'room', label: 'Habitación', description: 'Cuarto individual en vivienda compartida' },
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
  { value: 'laundry', label: 'Lavandería' },
  { value: 'pets', label: 'Acepta mascotas' },
  { value: 'furnished', label: 'Amoblado' },
  { value: 'balcony', label: 'Balcón' },
  { value: 'storage', label: 'Depósito' },
  { value: 'ac', label: 'Aire acondicionado' },
  { value: 'heating', label: 'Calefacción' },
];

export const CITIES = [
  'Bogotá',
  'Medellín',
  'Cali',
  'Barranquilla',
  'Cartagena',
  'Bucaramanga',
];

export const NEIGHBORHOODS: Record<string, string[]> = {
  'Bogotá': ['Chapinero', 'Usaquén', 'Suba', 'Cedritos', 'Santa Bárbara', 'Chicó', 'La Candelaria', 'Teusaquillo'],
  'Medellín': ['El Poblado', 'Laureles', 'Envigado', 'Belén', 'La América', 'Estadio'],
  'Cali': ['Granada', 'Ciudad Jardín', 'San Fernando', 'El Peñón', 'San Antonio'],
  'Barranquilla': ['El Prado', 'Alto Prado', 'Riomar', 'Villa Country'],
  'Cartagena': ['Bocagrande', 'Castillogrande', 'Manga', 'Getsemaní'],
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
  tenantRequirements: initialTenantRequirements,
  ownerType: '',
  selectedPlan: '',
};
