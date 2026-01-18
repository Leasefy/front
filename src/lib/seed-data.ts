/**
 * Seed Data for Arriendo Facil
 *
 * Realistic Colombian rental market data for testing and demos.
 * Includes properties across 5 major cities, landlords, and tenants
 * with varied risk profiles (A/B/C/D) for scoring engine testing.
 */

import {
  UserRole,
  PropertyStatus,
  ApplicationStatus,
  RiskLevel,
} from '@prisma/client'

// =============================================================================
// TYPE DEFINITIONS
// =============================================================================

export interface SeedUser {
  id: string
  clerkId: string
  email: string
  name: string
  phone: string
  role: UserRole
}

export interface SeedPropertyImage {
  url: string
  blurDataUrl: string
  order: number
}

export interface SeedProperty {
  id: string
  title: string
  description: string
  address: string
  city: string
  neighborhood: string
  priceMonthly: number
  deposit: number
  bedrooms: number
  bathrooms: number
  area: number
  petFriendly: boolean
  furnished: boolean
  parking: boolean
  availableFrom: Date
  rules: string | null
  status: PropertyStatus
  ownerId: string
  images: SeedPropertyImage[]
}

export interface SeedApplication {
  id: string
  status: ApplicationStatus
  submittedAt: Date | null
  applicantId: string
  propertyId: string
  // Identity
  documentType: string | null
  documentNumber: string | null
  birthDate: Date | null
  // Employment
  employmentType: string | null
  companyName: string | null
  jobTitle: string | null
  monthlyIncome: number | null
  employmentMonths: number | null
  contractType: string | null
  // Financial
  monthlyDebt: number | null
  monthlyExpenses: number | null
  hasCosigner: boolean
  cosignerName: string | null
  cosignerPhone: string | null
  // Stability
  currentAddressMonths: number | null
  previousLandlord: string | null
  previousLandlordPhone: string | null
  // References
  personalRefName: string | null
  personalRefPhone: string | null
  personalRefRelation: string | null
  // Documents
  identityDocUrl: string | null
  incomeProofUrl: string | null
}

export interface SeedRiskScore {
  id: string
  applicationId: string
  totalScore: number
  level: RiskLevel
  recommendation: string
  subscoresJson: object
  driversJson: object[]
  flagsJson: object[]
  conditionsJson: object[]
}

// =============================================================================
// PLACEHOLDER IMAGE DATA
// =============================================================================

// Placeholder blur data URL (tiny base64 placeholder)
const BLUR_PLACEHOLDER =
  'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAAIAAoDASIAAhEBAxEB/8QAFgABAQEAAAAAAAAAAAAAAAAAAAUH/8QAIhAAAgEDAwUBAAAAAAAAAAAAAQIEAwAFESExBhITQVFh/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAZEQADAQEBAAAAAAAAAAAAAAAAAQIRITH/2gAMAwEAAhEDEEA/AJFjtd6vMlYttbmqZKhmIYoQCQCQM+/lc1cweq77Hx/xS2nDpXU0l1p7QH'

// Unsplash apartment images for realistic property photos
const APARTMENT_IMAGES = {
  living: [
    'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800',
    'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800',
    'https://images.unsplash.com/photo-1493809842364-78817add7ffb?w=800',
    'https://images.unsplash.com/photo-1502005229762-cf1b2da7c5d6?w=800',
  ],
  bedroom: [
    'https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?w=800',
    'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?w=800',
    'https://images.unsplash.com/photo-1560185127-6ed189bf02f4?w=800',
    'https://images.unsplash.com/photo-1540518614846-7eded433c457?w=800',
  ],
  kitchen: [
    'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=800',
    'https://images.unsplash.com/photo-1556909172-54557c7e4fb7?w=800',
    'https://images.unsplash.com/photo-1507089947368-19c1da9775ae?w=800',
  ],
  bathroom: [
    'https://images.unsplash.com/photo-1552321554-5fefe8c9ef14?w=800',
    'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=800',
  ],
  exterior: [
    'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=800',
    'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=800',
    'https://images.unsplash.com/photo-1460317442991-0ec209397118?w=800',
  ],
}

function generatePropertyImages(seed: number): SeedPropertyImage[] {
  const images: SeedPropertyImage[] = []
  const livingIdx = seed % APARTMENT_IMAGES.living.length
  const bedroomIdx = seed % APARTMENT_IMAGES.bedroom.length
  const kitchenIdx = seed % APARTMENT_IMAGES.kitchen.length
  const bathroomIdx = seed % APARTMENT_IMAGES.bathroom.length
  const exteriorIdx = seed % APARTMENT_IMAGES.exterior.length

  images.push({
    url: APARTMENT_IMAGES.living[livingIdx],
    blurDataUrl: BLUR_PLACEHOLDER,
    order: 0,
  })
  images.push({
    url: APARTMENT_IMAGES.bedroom[bedroomIdx],
    blurDataUrl: BLUR_PLACEHOLDER,
    order: 1,
  })
  images.push({
    url: APARTMENT_IMAGES.kitchen[kitchenIdx],
    blurDataUrl: BLUR_PLACEHOLDER,
    order: 2,
  })
  images.push({
    url: APARTMENT_IMAGES.bathroom[bathroomIdx],
    blurDataUrl: BLUR_PLACEHOLDER,
    order: 3,
  })
  images.push({
    url: APARTMENT_IMAGES.exterior[exteriorIdx],
    blurDataUrl: BLUR_PLACEHOLDER,
    order: 4,
  })

  return images
}

// =============================================================================
// LANDLORDS (5 total)
// =============================================================================

export const landlords: SeedUser[] = [
  {
    id: 'landlord_01',
    clerkId: 'clerk_landlord_01',
    email: 'carlos.rodriguez@gmail.com',
    name: 'Carlos Rodriguez Martinez',
    phone: '+573001234567',
    role: UserRole.LANDLORD,
  },
  {
    id: 'landlord_02',
    clerkId: 'clerk_landlord_02',
    email: 'maria.gonzalez@hotmail.com',
    name: 'Maria Gonzalez Ramirez',
    phone: '+573012345678',
    role: UserRole.LANDLORD,
  },
  {
    id: 'landlord_03',
    clerkId: 'clerk_landlord_03',
    email: 'inversiones.bogota@company.co',
    name: 'Inversiones Bogota SAS',
    phone: '+573023456789',
    role: UserRole.LANDLORD,
  },
  {
    id: 'landlord_04',
    clerkId: 'clerk_landlord_04',
    email: 'pedro.martinez@outlook.com',
    name: 'Pedro Martinez Lopez',
    phone: '+573034567890',
    role: UserRole.LANDLORD,
  },
  {
    id: 'landlord_05',
    clerkId: 'clerk_landlord_05',
    email: 'inmobiliaria.costa@empresa.co',
    name: 'Inmobiliaria Costa Caribe',
    phone: '+573045678901',
    role: UserRole.LANDLORD,
  },
]

// =============================================================================
// TENANTS (15 total with A/B/C/D risk profiles)
// =============================================================================

export const tenants: SeedUser[] = [
  // Level A profiles (3) - High income, stable, low risk
  {
    id: 'tenant_a1',
    clerkId: 'clerk_tenant_a1',
    email: 'andres.silva@bancolombia.co',
    name: 'Andres Felipe Silva',
    phone: '+573101234567',
    role: UserRole.TENANT,
  },
  {
    id: 'tenant_a2',
    clerkId: 'clerk_tenant_a2',
    email: 'carolina.mendez@ecopetrol.co',
    name: 'Carolina Mendez Vargas',
    phone: '+573112345678',
    role: UserRole.TENANT,
  },
  {
    id: 'tenant_a3',
    clerkId: 'clerk_tenant_a3',
    email: 'juan.herrera@avianca.com',
    name: 'Juan Pablo Herrera',
    phone: '+573123456789',
    role: UserRole.TENANT,
  },

  // Level B profiles (5) - Good income, stable employment
  {
    id: 'tenant_b1',
    clerkId: 'clerk_tenant_b1',
    email: 'laura.castro@gmail.com',
    name: 'Laura Castro Pineda',
    phone: '+573134567890',
    role: UserRole.TENANT,
  },
  {
    id: 'tenant_b2',
    clerkId: 'clerk_tenant_b2',
    email: 'diego.moreno@rappi.com',
    name: 'Diego Moreno Suarez',
    phone: '+573145678901',
    role: UserRole.TENANT,
  },
  {
    id: 'tenant_b3',
    clerkId: 'clerk_tenant_b3',
    email: 'valentina.ruiz@outlook.com',
    name: 'Valentina Ruiz Gomez',
    phone: '+573156789012',
    role: UserRole.TENANT,
  },
  {
    id: 'tenant_b4',
    clerkId: 'clerk_tenant_b4',
    email: 'santiago.lopez@gmail.com',
    name: 'Santiago Lopez Torres',
    phone: '+573167890123',
    role: UserRole.TENANT,
  },
  {
    id: 'tenant_b5',
    clerkId: 'clerk_tenant_b5',
    email: 'camila.ortiz@empresa.co',
    name: 'Camila Ortiz Restrepo',
    phone: '+573178901234',
    role: UserRole.TENANT,
  },

  // Level C profiles (4) - Moderate income, some concerns
  {
    id: 'tenant_c1',
    clerkId: 'clerk_tenant_c1',
    email: 'felipe.rojas@hotmail.com',
    name: 'Felipe Rojas Diaz',
    phone: '+573189012345',
    role: UserRole.TENANT,
  },
  {
    id: 'tenant_c2',
    clerkId: 'clerk_tenant_c2',
    email: 'daniela.jimenez@gmail.com',
    name: 'Daniela Jimenez Parra',
    phone: '+573190123456',
    role: UserRole.TENANT,
  },
  {
    id: 'tenant_c3',
    clerkId: 'clerk_tenant_c3',
    email: 'nicolas.vargas@yahoo.com',
    name: 'Nicolas Vargas Mejia',
    phone: '+573201234567',
    role: UserRole.TENANT,
  },
  {
    id: 'tenant_c4',
    clerkId: 'clerk_tenant_c4',
    email: 'isabella.torres@outlook.com',
    name: 'Isabella Torres Cruz',
    phone: '+573212345678',
    role: UserRole.TENANT,
  },

  // Level D profiles (3) - Lower income, higher risk
  {
    id: 'tenant_d1',
    clerkId: 'clerk_tenant_d1',
    email: 'miguel.santos@gmail.com',
    name: 'Miguel Angel Santos',
    phone: '+573223456789',
    role: UserRole.TENANT,
  },
  {
    id: 'tenant_d2',
    clerkId: 'clerk_tenant_d2',
    email: 'ana.perez@hotmail.com',
    name: 'Ana Maria Perez',
    phone: '+573234567890',
    role: UserRole.TENANT,
  },
  {
    id: 'tenant_d3',
    clerkId: 'clerk_tenant_d3',
    email: 'jorge.ramirez@yahoo.com',
    name: 'Jorge Luis Ramirez',
    phone: '+573245678901',
    role: UserRole.TENANT,
  },
]

// =============================================================================
// PROPERTIES (19 total across 5 Colombian cities)
// =============================================================================

const availableDate = new Date('2026-02-01')

export const properties: SeedProperty[] = [
  // ---------------------------------------------------------------------------
  // BOGOTA (8 properties)
  // ---------------------------------------------------------------------------
  {
    id: 'prop_bog_01',
    title: 'Moderno Apartamento en Chapinero Alto',
    description:
      'Hermoso apartamento de 2 habitaciones con vista a los cerros. Cocina integral, closets en madera. Cerca a universidades y zona gastronómica.',
    address: 'Calle 63 #7-45, Edificio Torres del Parque',
    city: 'Bogotá',
    neighborhood: 'Chapinero',
    priceMonthly: 2800000,
    deposit: 2800000,
    bedrooms: 2,
    bathrooms: 2,
    area: 75,
    petFriendly: true,
    furnished: false,
    parking: true,
    availableFrom: availableDate,
    rules: 'No fumar en el apartamento. Mascotas pequeñas permitidas.',
    status: PropertyStatus.ACTIVE,
    ownerId: 'landlord_01',
    images: generatePropertyImages(1),
  },
  {
    id: 'prop_bog_02',
    title: 'Elegante Penthouse en Usaquén',
    description:
      'Espectacular penthouse duplex con terraza privada y jacuzzi. 3 habitaciones, estudio, 2 parqueaderos. Zona exclusiva.',
    address: 'Carrera 7 #116-50, Edificio Platinum',
    city: 'Bogotá',
    neighborhood: 'Usaquén',
    priceMonthly: 5000000,
    deposit: 10000000,
    bedrooms: 3,
    bathrooms: 3,
    area: 180,
    petFriendly: false,
    furnished: true,
    parking: true,
    availableFrom: availableDate,
    rules: 'Edificio exclusivo. No mascotas. Eventos con autorización.',
    status: PropertyStatus.ACTIVE,
    ownerId: 'landlord_03',
    images: generatePropertyImages(2),
  },
  {
    id: 'prop_bog_03',
    title: 'Acogedor Studio en Cedritos',
    description:
      'Studio moderno ideal para profesional soltero. Zona de trabajo, cocina americana, excelente iluminación natural.',
    address: 'Calle 140 #15-22, Conjunto Residencial Cedros',
    city: 'Bogotá',
    neighborhood: 'Cedritos',
    priceMonthly: 1200000,
    deposit: 1200000,
    bedrooms: 0,
    bathrooms: 1,
    area: 35,
    petFriendly: false,
    furnished: true,
    parking: false,
    availableFrom: availableDate,
    rules: 'No mascotas. No subarriendo.',
    status: PropertyStatus.ACTIVE,
    ownerId: 'landlord_01',
    images: generatePropertyImages(3),
  },
  {
    id: 'prop_bog_04',
    title: 'Amplio Apartamento Familiar en Suba',
    description:
      'Apartamento de 3 habitaciones perfecto para familia. Zonas verdes, parque infantil, vigilancia 24 horas.',
    address: 'Calle 145 #91-50, Conjunto Mirador de Suba',
    city: 'Bogotá',
    neighborhood: 'Suba',
    priceMonthly: 2200000,
    deposit: 2200000,
    bedrooms: 3,
    bathrooms: 2,
    area: 95,
    petFriendly: true,
    furnished: false,
    parking: true,
    availableFrom: availableDate,
    rules: 'Familias bienvenidas. Mascotas con depósito adicional.',
    status: PropertyStatus.ACTIVE,
    ownerId: 'landlord_02',
    images: generatePropertyImages(4),
  },
  {
    id: 'prop_bog_05',
    title: 'Loft Industrial en La Candelaria',
    description:
      'Auténtico loft en edificio patrimonial restaurado. Techos altos, ladrillo expuesto, ubicación histórica.',
    address: 'Calle 12 #3-15, Edificio Colonial',
    city: 'Bogotá',
    neighborhood: 'La Candelaria',
    priceMonthly: 1800000,
    deposit: 3600000,
    bedrooms: 1,
    bathrooms: 1,
    area: 65,
    petFriendly: false,
    furnished: true,
    parking: false,
    availableFrom: availableDate,
    rules: 'Edificio patrimonio. No modificaciones estructurales.',
    status: PropertyStatus.ACTIVE,
    ownerId: 'landlord_03',
    images: generatePropertyImages(5),
  },
  {
    id: 'prop_bog_06',
    title: 'Apartamento Renovado en Chapinero',
    description:
      'Recién renovado con acabados de lujo. Cocina abierta, baño principal con tina. Cerca a Zona G.',
    address: 'Carrera 11 #67-20, Edificio Boutique 67',
    city: 'Bogotá',
    neighborhood: 'Chapinero',
    priceMonthly: 3200000,
    deposit: 3200000,
    bedrooms: 2,
    bathrooms: 2,
    area: 80,
    petFriendly: true,
    furnished: false,
    parking: true,
    availableFrom: availableDate,
    rules: null,
    status: PropertyStatus.ACTIVE,
    ownerId: 'landlord_01',
    images: generatePropertyImages(6),
  },
  {
    id: 'prop_bog_07',
    title: 'Apartamento Económico en Suba',
    description:
      'Apartamento funcional de 2 habitaciones. Transporte público cercano. Ideal primera vivienda.',
    address: 'Calle 130 #88-30, Conjunto Villa Suba',
    city: 'Bogotá',
    neighborhood: 'Suba',
    priceMonthly: 1500000,
    deposit: 1500000,
    bedrooms: 2,
    bathrooms: 1,
    area: 55,
    petFriendly: false,
    furnished: false,
    parking: false,
    availableFrom: availableDate,
    rules: 'Contrato mínimo 12 meses.',
    status: PropertyStatus.ACTIVE,
    ownerId: 'landlord_02',
    images: generatePropertyImages(7),
  },
  {
    id: 'prop_bog_08',
    title: 'Exclusivo Apartamento en Usaquén',
    description:
      'Lujo y confort en zona premium. Gimnasio, piscina, salón social. Vista panorámica de la ciudad.',
    address: 'Carrera 7 #120-10, Edificio Sky Tower',
    city: 'Bogotá',
    neighborhood: 'Usaquén',
    priceMonthly: 4500000,
    deposit: 9000000,
    bedrooms: 3,
    bathrooms: 2,
    area: 140,
    petFriendly: true,
    furnished: true,
    parking: true,
    availableFrom: availableDate,
    rules: 'Edificio pet-friendly. Gimnasio incluido.',
    status: PropertyStatus.ACTIVE,
    ownerId: 'landlord_03',
    images: generatePropertyImages(8),
  },

  // ---------------------------------------------------------------------------
  // MEDELLIN (4 properties)
  // ---------------------------------------------------------------------------
  {
    id: 'prop_med_01',
    title: 'Moderno Apartamento en El Poblado',
    description:
      'Apartamento contemporáneo en la mejor zona de Medellín. Cerca a Parque Lleras, restaurantes y vida nocturna.',
    address: 'Carrera 35 #10-25, Edificio Oasis',
    city: 'Medellín',
    neighborhood: 'El Poblado',
    priceMonthly: 3500000,
    deposit: 3500000,
    bedrooms: 2,
    bathrooms: 2,
    area: 85,
    petFriendly: true,
    furnished: true,
    parking: true,
    availableFrom: availableDate,
    rules: 'Zona turística. Eventos hasta 10pm.',
    status: PropertyStatus.ACTIVE,
    ownerId: 'landlord_04',
    images: generatePropertyImages(9),
  },
  {
    id: 'prop_med_02',
    title: 'Acogedor Apartamento en Laureles',
    description:
      'Ubicación perfecta en tradicional barrio. Cerca a Estadio, universidades y parques.',
    address: 'Circular 73 #39-15, Unidad Cerrada Los Laureles',
    city: 'Medellín',
    neighborhood: 'Laureles',
    priceMonthly: 2000000,
    deposit: 2000000,
    bedrooms: 2,
    bathrooms: 1,
    area: 70,
    petFriendly: true,
    furnished: false,
    parking: true,
    availableFrom: availableDate,
    rules: null,
    status: PropertyStatus.ACTIVE,
    ownerId: 'landlord_04',
    images: generatePropertyImages(10),
  },
  {
    id: 'prop_med_03',
    title: 'Casa Independiente en Envigado',
    description:
      'Casa de 3 pisos con patio privado. Zona tranquila y familiar. Cerca a centros comerciales.',
    address: 'Calle 38 Sur #27-50, Barrio La Paz',
    city: 'Medellín',
    neighborhood: 'Envigado',
    priceMonthly: 2800000,
    deposit: 5600000,
    bedrooms: 3,
    bathrooms: 2,
    area: 150,
    petFriendly: true,
    furnished: false,
    parking: true,
    availableFrom: availableDate,
    rules: 'Casa independiente. Mantenimiento de jardín incluido.',
    status: PropertyStatus.ACTIVE,
    ownerId: 'landlord_04',
    images: generatePropertyImages(11),
  },
  {
    id: 'prop_med_04',
    title: 'Studio Moderno en Belén',
    description:
      'Perfecto para estudiantes o profesionales. Metro cercano, zona comercial activa.',
    address: 'Carrera 80 #32-10, Edificio Metro Plaza',
    city: 'Medellín',
    neighborhood: 'Belén',
    priceMonthly: 1100000,
    deposit: 1100000,
    bedrooms: 0,
    bathrooms: 1,
    area: 32,
    petFriendly: false,
    furnished: true,
    parking: false,
    availableFrom: availableDate,
    rules: 'No mascotas. Estudiantes bienvenidos.',
    status: PropertyStatus.ACTIVE,
    ownerId: 'landlord_04',
    images: generatePropertyImages(12),
  },

  // ---------------------------------------------------------------------------
  // CALI (3 properties)
  // ---------------------------------------------------------------------------
  {
    id: 'prop_cal_01',
    title: 'Elegante Apartamento en Granada',
    description:
      'Sector exclusivo del norte de Cali. Cerca a centros comerciales, restaurantes y clínicas.',
    address: 'Calle 15 Norte #9-80, Edificio Santa Mónica',
    city: 'Cali',
    neighborhood: 'Granada',
    priceMonthly: 2500000,
    deposit: 2500000,
    bedrooms: 2,
    bathrooms: 2,
    area: 90,
    petFriendly: true,
    furnished: false,
    parking: true,
    availableFrom: availableDate,
    rules: null,
    status: PropertyStatus.ACTIVE,
    ownerId: 'landlord_02',
    images: generatePropertyImages(13),
  },
  {
    id: 'prop_cal_02',
    title: 'Casa Campestre en Ciudad Jardín',
    description:
      'Amplia casa con jardín y BBQ. Ideal para familia grande. Zona residencial exclusiva.',
    address: 'Carrera 127 #16-200, Urbanización Los Jardines',
    city: 'Cali',
    neighborhood: 'Ciudad Jardín',
    priceMonthly: 4000000,
    deposit: 8000000,
    bedrooms: 4,
    bathrooms: 3,
    area: 250,
    petFriendly: true,
    furnished: false,
    parking: true,
    availableFrom: availableDate,
    rules: 'Casa con jardín. Jardinero no incluido.',
    status: PropertyStatus.ACTIVE,
    ownerId: 'landlord_02',
    images: generatePropertyImages(14),
  },
  {
    id: 'prop_cal_03',
    title: 'Apartamento Céntrico en San Fernando',
    description:
      'Ubicación estratégica cerca a todo. Transporte, comercio, entretenimiento.',
    address: 'Calle 5 #38-45, Edificio San Fernando Plaza',
    city: 'Cali',
    neighborhood: 'San Fernando',
    priceMonthly: 1600000,
    deposit: 1600000,
    bedrooms: 2,
    bathrooms: 1,
    area: 65,
    petFriendly: false,
    furnished: false,
    parking: false,
    availableFrom: availableDate,
    rules: 'Contrato mínimo 6 meses.',
    status: PropertyStatus.ACTIVE,
    ownerId: 'landlord_02',
    images: generatePropertyImages(15),
  },

  // ---------------------------------------------------------------------------
  // BARRANQUILLA (2 properties)
  // ---------------------------------------------------------------------------
  {
    id: 'prop_baq_01',
    title: 'Lujoso Apartamento en Alto Prado',
    description:
      'Exclusivo sector residencial. Brisa caribeña, acabados premium, club house.',
    address: 'Carrera 52 #82-150, Edificio Altos del Prado',
    city: 'Barranquilla',
    neighborhood: 'Alto Prado',
    priceMonthly: 3000000,
    deposit: 6000000,
    bedrooms: 3,
    bathrooms: 2,
    area: 120,
    petFriendly: true,
    furnished: true,
    parking: true,
    availableFrom: availableDate,
    rules: 'Edificio con piscina. Aire acondicionado incluido.',
    status: PropertyStatus.ACTIVE,
    ownerId: 'landlord_05',
    images: generatePropertyImages(16),
  },
  {
    id: 'prop_baq_02',
    title: 'Apartamento Familiar en El Golf',
    description:
      'Cerca al Country Club. Ambiente tranquilo y seguro para familias.',
    address: 'Calle 76 #56-30, Conjunto Golf Residence',
    city: 'Barranquilla',
    neighborhood: 'El Golf',
    priceMonthly: 2400000,
    deposit: 2400000,
    bedrooms: 3,
    bathrooms: 2,
    area: 110,
    petFriendly: true,
    furnished: false,
    parking: true,
    availableFrom: availableDate,
    rules: null,
    status: PropertyStatus.ACTIVE,
    ownerId: 'landlord_05',
    images: generatePropertyImages(17),
  },

  // ---------------------------------------------------------------------------
  // CARTAGENA (2 properties)
  // ---------------------------------------------------------------------------
  {
    id: 'prop_ctg_01',
    title: 'Apartamento con Vista al Mar en Bocagrande',
    description:
      'Espectacular vista al Caribe. Cerca a la playa, centros comerciales y vida nocturna.',
    address: 'Carrera 3 #8-45, Edificio Bahía Dorada',
    city: 'Cartagena',
    neighborhood: 'Bocagrande',
    priceMonthly: 4500000,
    deposit: 9000000,
    bedrooms: 2,
    bathrooms: 2,
    area: 95,
    petFriendly: false,
    furnished: true,
    parking: true,
    availableFrom: availableDate,
    rules: 'No fiestas. Edificio turístico. Aire acondicionado incluido.',
    status: PropertyStatus.ACTIVE,
    ownerId: 'landlord_05',
    images: generatePropertyImages(18),
  },
  {
    id: 'prop_ctg_02',
    title: 'Encantador Apartamento Colonial en Manga',
    description:
      'Estilo colonial caribeño. Balcón con vista a la bahía. Ambiente histórico.',
    address: 'Calle Real #25-10, Casa Colonial Manga',
    city: 'Cartagena',
    neighborhood: 'Manga',
    priceMonthly: 2200000,
    deposit: 4400000,
    bedrooms: 1,
    bathrooms: 1,
    area: 70,
    petFriendly: false,
    furnished: true,
    parking: false,
    availableFrom: availableDate,
    rules: 'Edificio histórico. Decoración original.',
    status: PropertyStatus.ACTIVE,
    ownerId: 'landlord_05',
    images: generatePropertyImages(19),
  },
]

// =============================================================================
// APPLICATIONS (10 total with varied statuses)
// =============================================================================

const submittedDate = new Date('2026-01-15')

export const applications: SeedApplication[] = [
  // ---------------------------------------------------------------------------
  // Level A profiles - APPROVED/UNDER_REVIEW (3)
  // ---------------------------------------------------------------------------
  {
    id: 'app_a1',
    status: ApplicationStatus.APPROVED,
    submittedAt: submittedDate,
    applicantId: 'tenant_a1',
    propertyId: 'prop_bog_02', // Penthouse Usaquén ($5M)
    documentType: 'CC',
    documentNumber: '1020123456',
    birthDate: new Date('1985-03-15'),
    employmentType: 'employed',
    companyName: 'Bancolombia S.A.',
    jobTitle: 'Gerente de Tecnología',
    monthlyIncome: 12000000, // $12M/month - rent/income = 42% but excellent profile
    employmentMonths: 48, // 4 years
    contractType: 'indefinido',
    monthlyDebt: 0,
    monthlyExpenses: 2000000,
    hasCosigner: false,
    cosignerName: null,
    cosignerPhone: null,
    currentAddressMonths: 36, // 3 years
    previousLandlord: 'Maria Torres',
    previousLandlordPhone: '+573001112233',
    personalRefName: 'Ricardo Gomez',
    personalRefPhone: '+573002223344',
    personalRefRelation: 'Colega',
    identityDocUrl: 'https://utfs.io/f/placeholder-id-1.pdf',
    incomeProofUrl: 'https://utfs.io/f/placeholder-income-1.pdf',
  },
  {
    id: 'app_a2',
    status: ApplicationStatus.UNDER_REVIEW,
    submittedAt: submittedDate,
    applicantId: 'tenant_a2',
    propertyId: 'prop_med_01', // El Poblado ($3.5M)
    documentType: 'CC',
    documentNumber: '1030234567',
    birthDate: new Date('1988-07-22'),
    employmentType: 'employed',
    companyName: 'Ecopetrol S.A.',
    jobTitle: 'Ingeniera de Producción',
    monthlyIncome: 15000000, // $15M/month - rent/income = 23%
    employmentMonths: 60, // 5 years
    contractType: 'indefinido',
    monthlyDebt: 500000,
    monthlyExpenses: 3000000,
    hasCosigner: false,
    cosignerName: null,
    cosignerPhone: null,
    currentAddressMonths: 48,
    previousLandlord: 'Jorge Mejia',
    previousLandlordPhone: '+573003334455',
    personalRefName: 'Ana Lucia Velez',
    personalRefPhone: '+573004445566',
    personalRefRelation: 'Amiga',
    identityDocUrl: 'https://utfs.io/f/placeholder-id-2.pdf',
    incomeProofUrl: 'https://utfs.io/f/placeholder-income-2.pdf',
  },
  {
    id: 'app_a3',
    status: ApplicationStatus.UNDER_REVIEW,
    submittedAt: submittedDate,
    applicantId: 'tenant_a3',
    propertyId: 'prop_bog_08', // Usaquén luxury ($4.5M)
    documentType: 'CC',
    documentNumber: '1040345678',
    birthDate: new Date('1982-11-10'),
    employmentType: 'employed',
    companyName: 'Avianca Holdings',
    jobTitle: 'Director Comercial',
    monthlyIncome: 18000000, // $18M/month - rent/income = 25%
    employmentMonths: 72, // 6 years
    contractType: 'indefinido',
    monthlyDebt: 1000000, // Car payment
    monthlyExpenses: 4000000,
    hasCosigner: false,
    cosignerName: null,
    cosignerPhone: null,
    currentAddressMonths: 60,
    previousLandlord: 'Inversiones ABC',
    previousLandlordPhone: '+573005556677',
    personalRefName: 'Fernando Lozano',
    personalRefPhone: '+573006667788',
    personalRefRelation: 'Hermano',
    identityDocUrl: 'https://utfs.io/f/placeholder-id-3.pdf',
    incomeProofUrl: 'https://utfs.io/f/placeholder-income-3.pdf',
  },

  // ---------------------------------------------------------------------------
  // Level B profiles - SUBMITTED/UNDER_REVIEW (3)
  // ---------------------------------------------------------------------------
  {
    id: 'app_b1',
    status: ApplicationStatus.SUBMITTED,
    submittedAt: submittedDate,
    applicantId: 'tenant_b1',
    propertyId: 'prop_bog_01', // Chapinero ($2.8M)
    documentType: 'CC',
    documentNumber: '1050456789',
    birthDate: new Date('1992-05-18'),
    employmentType: 'employed',
    companyName: 'Globant Colombia',
    jobTitle: 'Desarrolladora Senior',
    monthlyIncome: 8500000, // $8.5M/month - rent/income = 33%
    employmentMonths: 24, // 2 years
    contractType: 'indefinido',
    monthlyDebt: 300000,
    monthlyExpenses: 2500000,
    hasCosigner: false,
    cosignerName: null,
    cosignerPhone: null,
    currentAddressMonths: 18,
    previousLandlord: 'Pedro Suarez',
    previousLandlordPhone: '+573007778899',
    personalRefName: 'Lucia Fernandez',
    personalRefPhone: '+573008889900',
    personalRefRelation: 'Prima',
    identityDocUrl: 'https://utfs.io/f/placeholder-id-4.pdf',
    incomeProofUrl: 'https://utfs.io/f/placeholder-income-4.pdf',
  },
  {
    id: 'app_b2',
    status: ApplicationStatus.SUBMITTED,
    submittedAt: submittedDate,
    applicantId: 'tenant_b2',
    propertyId: 'prop_med_02', // Laureles ($2M)
    documentType: 'CC',
    documentNumber: '1060567890',
    birthDate: new Date('1990-09-25'),
    employmentType: 'employed',
    companyName: 'Rappi S.A.S.',
    jobTitle: 'Product Manager',
    monthlyIncome: 7000000, // $7M/month - rent/income = 29%
    employmentMonths: 18, // 1.5 years
    contractType: 'indefinido',
    monthlyDebt: 200000,
    monthlyExpenses: 2000000,
    hasCosigner: false,
    cosignerName: null,
    cosignerPhone: null,
    currentAddressMonths: 12,
    previousLandlord: 'Martha Rodriguez',
    previousLandlordPhone: '+573009990011',
    personalRefName: 'Carlos Mejia',
    personalRefPhone: '+573010001122',
    personalRefRelation: 'Amigo',
    identityDocUrl: 'https://utfs.io/f/placeholder-id-5.pdf',
    incomeProofUrl: 'https://utfs.io/f/placeholder-income-5.pdf',
  },
  {
    id: 'app_b3',
    status: ApplicationStatus.APPROVED,
    submittedAt: submittedDate,
    applicantId: 'tenant_b3',
    propertyId: 'prop_cal_01', // Granada ($2.5M)
    documentType: 'CC',
    documentNumber: '1070678901',
    birthDate: new Date('1994-02-14'),
    employmentType: 'employed',
    companyName: 'Carvajal Empaques',
    jobTitle: 'Analista Financiera',
    monthlyIncome: 6500000, // $6.5M/month - rent/income = 38%
    employmentMonths: 30, // 2.5 years
    contractType: 'indefinido',
    monthlyDebt: 0,
    monthlyExpenses: 1800000,
    hasCosigner: false,
    cosignerName: null,
    cosignerPhone: null,
    currentAddressMonths: 24,
    previousLandlord: 'Juan Cardenas',
    previousLandlordPhone: '+573011112233',
    personalRefName: 'Sandra Velasquez',
    personalRefPhone: '+573012223344',
    personalRefRelation: 'Jefa anterior',
    identityDocUrl: 'https://utfs.io/f/placeholder-id-6.pdf',
    incomeProofUrl: 'https://utfs.io/f/placeholder-income-6.pdf',
  },

  // ---------------------------------------------------------------------------
  // Level C profiles - SUBMITTED/UNDER_REVIEW (2)
  // ---------------------------------------------------------------------------
  {
    id: 'app_c1',
    status: ApplicationStatus.SUBMITTED,
    submittedAt: submittedDate,
    applicantId: 'tenant_c1',
    propertyId: 'prop_bog_07', // Suba económico ($1.5M)
    documentType: 'CC',
    documentNumber: '1080789012',
    birthDate: new Date('1996-12-03'),
    employmentType: 'employed',
    companyName: 'Almacenes Éxito',
    jobTitle: 'Supervisor de Tienda',
    monthlyIncome: 3500000, // $3.5M/month - rent/income = 43%
    employmentMonths: 14, // 1.2 years
    contractType: 'fijo',
    monthlyDebt: 400000,
    monthlyExpenses: 1200000,
    hasCosigner: true,
    cosignerName: 'Roberto Rojas',
    cosignerPhone: '+573013334455',
    currentAddressMonths: 8,
    previousLandlord: 'N/A - vivía con familia',
    previousLandlordPhone: null,
    personalRefName: 'Patricia Diaz',
    personalRefPhone: '+573014445566',
    personalRefRelation: 'Madre',
    identityDocUrl: 'https://utfs.io/f/placeholder-id-7.pdf',
    incomeProofUrl: 'https://utfs.io/f/placeholder-income-7.pdf',
  },
  {
    id: 'app_c2',
    status: ApplicationStatus.UNDER_REVIEW,
    submittedAt: submittedDate,
    applicantId: 'tenant_c2',
    propertyId: 'prop_cal_03', // San Fernando ($1.6M)
    documentType: 'CC',
    documentNumber: '1090890123',
    birthDate: new Date('1993-08-20'),
    employmentType: 'independent',
    companyName: 'Freelance',
    jobTitle: 'Diseñadora Gráfica',
    monthlyIncome: 4000000, // $4M/month - rent/income = 40%
    employmentMonths: 24,
    contractType: 'prestacion',
    monthlyDebt: 600000,
    monthlyExpenses: 1500000,
    hasCosigner: false,
    cosignerName: null,
    cosignerPhone: null,
    currentAddressMonths: 12,
    previousLandlord: 'Edificio Centro',
    previousLandlordPhone: '+573015556677',
    personalRefName: 'Marco Jimenez',
    personalRefPhone: '+573016667788',
    personalRefRelation: 'Cliente',
    identityDocUrl: 'https://utfs.io/f/placeholder-id-8.pdf',
    incomeProofUrl: 'https://utfs.io/f/placeholder-income-8.pdf',
  },

  // ---------------------------------------------------------------------------
  // Level D profiles - REJECTED/DRAFT (2)
  // ---------------------------------------------------------------------------
  {
    id: 'app_d1',
    status: ApplicationStatus.REJECTED,
    submittedAt: submittedDate,
    applicantId: 'tenant_d1',
    propertyId: 'prop_bog_04', // Suba familiar ($2.2M)
    documentType: 'CC',
    documentNumber: '1100901234',
    birthDate: new Date('1998-04-12'),
    employmentType: 'employed',
    companyName: 'Restaurante El Sabor',
    jobTitle: 'Mesero',
    monthlyIncome: 1800000, // $1.8M/month - rent/income = 122%!
    employmentMonths: 6, // Only 6 months
    contractType: 'fijo',
    monthlyDebt: 800000,
    monthlyExpenses: 900000,
    hasCosigner: false,
    cosignerName: null,
    cosignerPhone: null,
    currentAddressMonths: 4,
    previousLandlord: null,
    previousLandlordPhone: null,
    personalRefName: 'Jose Santos',
    personalRefPhone: '+573017778899',
    personalRefRelation: 'Padre',
    identityDocUrl: 'https://utfs.io/f/placeholder-id-9.pdf',
    incomeProofUrl: null, // Missing document
  },
  {
    id: 'app_d2',
    status: ApplicationStatus.DRAFT,
    submittedAt: null, // Not submitted
    applicantId: 'tenant_d2',
    propertyId: 'prop_med_04', // Belén studio ($1.1M)
    documentType: 'CC',
    documentNumber: '1111012345',
    birthDate: new Date('1999-01-30'),
    employmentType: 'unemployed',
    companyName: null,
    jobTitle: null,
    monthlyIncome: 1200000, // From family support
    employmentMonths: 0,
    contractType: null,
    monthlyDebt: 300000,
    monthlyExpenses: 600000,
    hasCosigner: false,
    cosignerName: null,
    cosignerPhone: null,
    currentAddressMonths: 2,
    previousLandlord: null,
    previousLandlordPhone: null,
    personalRefName: null, // Incomplete
    personalRefPhone: null,
    personalRefRelation: null,
    identityDocUrl: null, // Missing
    incomeProofUrl: null, // Missing
  },
]

// =============================================================================
// MOCK RISK SCORES (for UNDER_REVIEW and APPROVED applications)
// =============================================================================

export const riskScores: SeedRiskScore[] = [
  // Level A - Approved tenant (Andres Silva)
  {
    id: 'score_a1',
    applicationId: 'app_a1',
    totalScore: 92,
    level: RiskLevel.A,
    recommendation:
      'Excelente perfil. Candidato ideal con ingresos sólidos y estabilidad laboral excepcional. Se recomienda aprobación inmediata.',
    subscoresJson: {
      financial: 95,
      stability: 90,
      employment: 92,
      references: 90,
    },
    driversJson: [
      {
        text: 'Ingresos altos y estables ($12M/mes)',
        impact: 'positive',
        weight: 0.35,
      },
      {
        text: 'Contrato indefinido con 4 años de antigüedad',
        impact: 'positive',
        weight: 0.25,
      },
      {
        text: 'Sin deudas reportadas',
        impact: 'positive',
        weight: 0.2,
      },
      {
        text: 'Referencias laborales verificables',
        impact: 'positive',
        weight: 0.2,
      },
    ],
    flagsJson: [],
    conditionsJson: [],
  },
  // Level A - Under review (Carolina Mendez)
  {
    id: 'score_a2',
    applicationId: 'app_a2',
    totalScore: 88,
    level: RiskLevel.A,
    recommendation:
      'Perfil sobresaliente. Empleada de empresa sólida con excelente historial. Aprobación recomendada sin condiciones.',
    subscoresJson: {
      financial: 90,
      stability: 88,
      employment: 90,
      references: 85,
    },
    driversJson: [
      {
        text: 'Empleada de Ecopetrol con 5 años',
        impact: 'positive',
        weight: 0.3,
      },
      {
        text: 'Ratio arriendo/ingreso de 23%',
        impact: 'positive',
        weight: 0.3,
      },
      {
        text: 'Estabilidad residencial de 4 años',
        impact: 'positive',
        weight: 0.2,
      },
      {
        text: 'Deuda mínima ($500K)',
        impact: 'neutral',
        weight: 0.2,
      },
    ],
    flagsJson: [],
    conditionsJson: [],
  },
  // Level A - Under review (Juan Pablo Herrera)
  {
    id: 'score_a3',
    applicationId: 'app_a3',
    totalScore: 85,
    level: RiskLevel.A,
    recommendation:
      'Excelente candidato con posición ejecutiva y alta capacidad de pago. Se sugiere verificar última referencia.',
    subscoresJson: {
      financial: 88,
      stability: 85,
      employment: 88,
      references: 80,
    },
    driversJson: [
      {
        text: 'Director Comercial en Avianca',
        impact: 'positive',
        weight: 0.3,
      },
      {
        text: 'Ingresos de $18M/mes',
        impact: 'positive',
        weight: 0.3,
      },
      {
        text: '6 años de antigüedad laboral',
        impact: 'positive',
        weight: 0.25,
      },
      {
        text: 'Pago de vehículo en curso',
        impact: 'neutral',
        weight: 0.15,
      },
    ],
    flagsJson: [
      {
        type: 'info',
        text: 'Verificar pago de vehículo al día',
      },
    ],
    conditionsJson: [],
  },
  // Level B - Approved (Valentina Ruiz)
  {
    id: 'score_b3',
    applicationId: 'app_b3',
    totalScore: 75,
    level: RiskLevel.B,
    recommendation:
      'Buen perfil con empleo estable. Ratio arriendo/ingreso algo elevado pero manejable con sus bajos gastos.',
    subscoresJson: {
      financial: 72,
      stability: 78,
      employment: 80,
      references: 70,
    },
    driversJson: [
      {
        text: 'Empleo estable en Carvajal (2.5 años)',
        impact: 'positive',
        weight: 0.3,
      },
      {
        text: 'Sin deudas reportadas',
        impact: 'positive',
        weight: 0.25,
      },
      {
        text: 'Ratio arriendo/ingreso de 38%',
        impact: 'neutral',
        weight: 0.25,
      },
      {
        text: 'Buenas referencias laborales',
        impact: 'positive',
        weight: 0.2,
      },
    ],
    flagsJson: [
      {
        type: 'warning',
        text: 'Ratio arriendo/ingreso cerca del límite',
      },
    ],
    conditionsJson: [
      {
        type: 'deposit',
        text: 'Se sugiere depósito adicional de 1 mes',
      },
    ],
  },
  // Level C - Under review (Daniela Jimenez)
  {
    id: 'score_c2',
    applicationId: 'app_c2',
    totalScore: 52,
    level: RiskLevel.C,
    recommendation:
      'Perfil independiente con ingresos variables. Se recomienda codeudor o depósito adicional.',
    subscoresJson: {
      financial: 50,
      stability: 55,
      employment: 48,
      references: 55,
    },
    driversJson: [
      {
        text: 'Trabajadora independiente',
        impact: 'neutral',
        weight: 0.25,
      },
      {
        text: 'Ingresos variables ($4M promedio)',
        impact: 'neutral',
        weight: 0.25,
      },
      {
        text: 'Deuda mensual de $600K',
        impact: 'negative',
        weight: 0.25,
      },
      {
        text: 'Ratio arriendo/ingreso de 40%',
        impact: 'negative',
        weight: 0.25,
      },
    ],
    flagsJson: [
      {
        type: 'warning',
        text: 'Ingresos no certificables por empleador',
      },
      {
        type: 'warning',
        text: 'Deuda mensual elevada relativa a ingresos',
      },
    ],
    conditionsJson: [
      {
        type: 'cosigner',
        text: 'Se requiere codeudor con ingresos fijos',
      },
      {
        type: 'deposit',
        text: 'Depósito de 2 meses de arriendo',
      },
    ],
  },
]

// =============================================================================
// SUMMARY STATS
// =============================================================================

export const seedStats = {
  landlords: landlords.length,
  tenants: tenants.length,
  properties: properties.length,
  applications: applications.length,
  riskScores: riskScores.length,
  cities: [...new Set(properties.map((p) => p.city))],
  propertiesByCity: properties.reduce(
    (acc, p) => {
      acc[p.city] = (acc[p.city] || 0) + 1
      return acc
    },
    {} as Record<string, number>
  ),
  applicationsByStatus: applications.reduce(
    (acc, a) => {
      acc[a.status] = (acc[a.status] || 0) + 1
      return acc
    },
    {} as Record<string, number>
  ),
  tenantsByProfile: {
    A: tenants.filter((t) => t.id.includes('_a')).length,
    B: tenants.filter((t) => t.id.includes('_b')).length,
    C: tenants.filter((t) => t.id.includes('_c')).length,
    D: tenants.filter((t) => t.id.includes('_d')).length,
  },
}
