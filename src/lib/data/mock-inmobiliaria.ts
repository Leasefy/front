/**
 * Mock data for the Inmobiliaria (Real Estate Agency) module
 * Comprehensive data for portfolio management, agents, owners, and collections
 */

import type {
  Propietario,
  Agente,
  Consignacion,
  PipelineItem,
  Cobro,
  Dispersion,
  SolicitudMantenimiento,
  InmobiliariaDashboardKPIs,
  InmobiliariaConfig,
  CobroSummary,
  DispersionSummary,
  CarteraItem,
  CarteraReport,
  ExtractoPropietario,
} from '@/lib/types/inmobiliaria';

// ============================================================================
// Inmobiliaria Configuration
// ============================================================================

export const MOCK_INMOBILIARIA_CONFIG: InmobiliariaConfig = {
  id: 'inmob-001',
  name: 'Arriendos Premium S.A.S.',
  nit: '901234567-8',
  address: 'Cra 11 #82-76, Oficina 501',
  city: 'Bogotá',
  phone: '+57 601 345 6789',
  email: 'contacto@arriendospremium.co',
  website: 'https://arriendospremium.co',
  logo: '/images/logo-inmobiliaria.png',
  defaultCommissionPercent: 10,
  defaultLateFeePercent: 2,
  paymentDueDay: 5,
  disbursementDay: 15,
  collectionBankAccount: {
    bank: 'bancolombia',
    accountType: 'checking',
    accountNumber: '****5678',
    accountHolder: 'Arriendos Premium S.A.S.',
  },
  reminderDaysBefore: [3, 1],
  reminderDaysAfter: [1, 3, 7, 15],
  createdAt: '2024-01-15T10:00:00Z',
  updatedAt: '2026-01-10T08:00:00Z',
};

// ============================================================================
// Propietarios (Property Owners)
// ============================================================================

export const MOCK_PROPIETARIOS: Propietario[] = [
  {
    id: 'prop-001',
    name: 'Carlos Andrés Ramírez Peña',
    email: 'carlos.ramirez@gmail.com',
    phone: '+57 310 234 5678',
    documentType: 'CC',
    documentNumber: '80.123.456',
    address: 'Cra 15 #93-45, Apto 802',
    city: 'Bogotá',
    bankAccount: {
      bank: 'bancolombia',
      accountType: 'savings',
      accountNumber: '****4532',
      accountHolder: 'Carlos Andrés Ramírez Peña',
    },
    propertyCount: 4,
    activeLeases: 3,
    totalMonthlyRent: 9800000,
    pendingBalance: 0,
    lastPaymentDate: '2026-01-15',
    notes: 'Cliente desde 2022. Pago puntual siempre.',
    tags: ['premium', 'múltiples propiedades'],
    createdAt: '2022-03-10T14:00:00Z',
    updatedAt: '2026-01-15T09:00:00Z',
  },
  {
    id: 'prop-002',
    name: 'María Elena González Vargas',
    email: 'maria.gonzalez@hotmail.com',
    phone: '+57 311 456 7890',
    documentType: 'CC',
    documentNumber: '52.789.123',
    address: 'Calle 127 #15-30, Casa 12',
    city: 'Bogotá',
    bankAccount: {
      bank: 'davivienda',
      accountType: 'savings',
      accountNumber: '****8901',
      accountHolder: 'María Elena González Vargas',
    },
    propertyCount: 2,
    activeLeases: 2,
    totalMonthlyRent: 5200000,
    pendingBalance: 0,
    lastPaymentDate: '2026-01-15',
    tags: ['chapinero'],
    createdAt: '2023-06-20T11:00:00Z',
    updatedAt: '2026-01-15T09:00:00Z',
  },
  {
    id: 'prop-003',
    name: 'Inversiones Hermanos Ruiz S.A.S.',
    email: 'admin@inversionesruiz.com',
    phone: '+57 601 234 5678',
    documentType: 'NIT',
    documentNumber: '900.456.789-1',
    address: 'Calle 72 #10-25, Oficina 1201',
    city: 'Bogotá',
    bankAccount: {
      bank: 'bbva',
      accountType: 'checking',
      accountNumber: '****3456',
      accountHolder: 'Inversiones Hermanos Ruiz S.A.S.',
    },
    propertyCount: 8,
    activeLeases: 6,
    totalMonthlyRent: 18500000,
    pendingBalance: 3200000,
    lastPaymentDate: '2026-01-15',
    notes: 'Empresa familiar con portafolio en crecimiento.',
    tags: ['empresa', 'volumen alto', 'premium'],
    createdAt: '2021-09-05T08:00:00Z',
    updatedAt: '2026-01-20T10:00:00Z',
  },
  {
    id: 'prop-004',
    name: 'Roberto Alejandro Herrera Castro',
    email: 'roberto.herrera@yahoo.com',
    phone: '+57 312 567 8901',
    documentType: 'CC',
    documentNumber: '79.456.321',
    address: 'Cra 7 #116-50, Apto 1502',
    city: 'Bogotá',
    bankAccount: {
      bank: 'bogota',
      accountType: 'savings',
      accountNumber: '****7890',
      accountHolder: 'Roberto Alejandro Herrera Castro',
    },
    propertyCount: 1,
    activeLeases: 1,
    totalMonthlyRent: 3500000,
    pendingBalance: 0,
    lastPaymentDate: '2026-01-15',
    createdAt: '2024-02-15T16:00:00Z',
    updatedAt: '2026-01-15T09:00:00Z',
  },
  {
    id: 'prop-005',
    name: 'Sandra Patricia Moreno López',
    email: 'sandra.moreno@gmail.com',
    phone: '+57 315 678 9012',
    documentType: 'CC',
    documentNumber: '51.234.567',
    address: 'Calle 85 #11-45, Apto 301',
    city: 'Bogotá',
    bankAccount: {
      bank: 'bancolombia',
      accountType: 'savings',
      accountNumber: '****2345',
      accountHolder: 'Sandra Patricia Moreno López',
    },
    propertyCount: 3,
    activeLeases: 2,
    totalMonthlyRent: 4800000,
    pendingBalance: 2400000,
    lastPaymentDate: '2025-12-15',
    notes: 'Un arrendatario en mora. Hacer seguimiento.',
    tags: ['seguimiento mora'],
    createdAt: '2023-11-08T09:00:00Z',
    updatedAt: '2026-01-28T14:00:00Z',
  },
  {
    id: 'prop-006',
    name: 'Luis Fernando Ospina Restrepo',
    email: 'lfospina@empresarial.co',
    phone: '+57 304 789 0123',
    documentType: 'CC',
    documentNumber: '70.987.654',
    address: 'Cra 43A #14-95, Apto 1801',
    city: 'Medellín',
    bankAccount: {
      bank: 'bancolombia',
      accountType: 'savings',
      accountNumber: '****6789',
      accountHolder: 'Luis Fernando Ospina Restrepo',
    },
    propertyCount: 5,
    activeLeases: 4,
    totalMonthlyRent: 8200000,
    pendingBalance: 0,
    lastPaymentDate: '2026-01-15',
    notes: 'Propiedades en Medellín. Coordinación remota.',
    tags: ['medellín', 'remoto'],
    createdAt: '2022-08-22T13:00:00Z',
    updatedAt: '2026-01-15T09:00:00Z',
  },
  {
    id: 'prop-007',
    name: 'Adriana Lucía Pardo Jiménez',
    email: 'adriana.pardo@outlook.com',
    phone: '+57 316 890 1234',
    documentType: 'CC',
    documentNumber: '53.321.987',
    address: 'Calle 100 #19-61, Apto 604',
    city: 'Bogotá',
    bankAccount: {
      bank: 'davivienda',
      accountType: 'savings',
      accountNumber: '****0123',
      accountHolder: 'Adriana Lucía Pardo Jiménez',
    },
    propertyCount: 2,
    activeLeases: 1,
    totalMonthlyRent: 2800000,
    pendingBalance: 0,
    lastPaymentDate: '2026-01-15',
    createdAt: '2024-06-10T10:00:00Z',
    updatedAt: '2026-01-15T09:00:00Z',
  },
  {
    id: 'prop-008',
    name: 'Finca Raíz del Norte Ltda.',
    email: 'contabilidad@fincaraizdelnorte.co',
    phone: '+57 601 456 7890',
    documentType: 'NIT',
    documentNumber: '830.567.890-2',
    address: 'Cra 9 #70A-35, Oficina 301',
    city: 'Bogotá',
    bankAccount: {
      bank: 'occidente',
      accountType: 'checking',
      accountNumber: '****4567',
      accountHolder: 'Finca Raíz del Norte Ltda.',
    },
    propertyCount: 12,
    activeLeases: 10,
    totalMonthlyRent: 28500000,
    pendingBalance: 5700000,
    lastPaymentDate: '2026-01-15',
    notes: 'Mayor propietario. Requiere extractos detallados mensualmente.',
    tags: ['empresa', 'volumen alto', 'extractos mensuales'],
    createdAt: '2020-04-15T08:00:00Z',
    updatedAt: '2026-01-28T11:00:00Z',
  },
  {
    id: 'prop-009',
    name: 'Julián Esteban Martínez Rojas',
    email: 'julian.martinez@gmail.com',
    phone: '+57 317 901 2345',
    documentType: 'CC',
    documentNumber: '80.654.321',
    address: 'Calle 134 #9-45, Casa 5',
    city: 'Bogotá',
    bankAccount: {
      bank: 'itau',
      accountType: 'savings',
      accountNumber: '****8901',
      accountHolder: 'Julián Esteban Martínez Rojas',
    },
    propertyCount: 1,
    activeLeases: 0,
    totalMonthlyRent: 0,
    pendingBalance: 0,
    notes: 'Propiedad disponible para arriendo desde febrero.',
    tags: ['disponible'],
    createdAt: '2025-12-01T15:00:00Z',
    updatedAt: '2025-12-01T15:00:00Z',
  },
  {
    id: 'prop-010',
    name: 'Claudia Marcela Díaz Sánchez',
    email: 'claudia.diaz@corporativo.co',
    phone: '+57 318 012 3456',
    documentType: 'CC',
    documentNumber: '52.147.258',
    address: 'Cra 19 #90-15, Apto 403',
    city: 'Bogotá',
    bankAccount: {
      bank: 'cajasocial',
      accountType: 'savings',
      accountNumber: '****2345',
      accountHolder: 'Claudia Marcela Díaz Sánchez',
    },
    propertyCount: 2,
    activeLeases: 2,
    totalMonthlyRent: 4200000,
    pendingBalance: 0,
    lastPaymentDate: '2026-01-15',
    createdAt: '2024-09-18T12:00:00Z',
    updatedAt: '2026-01-15T09:00:00Z',
  },
];

// ============================================================================
// Agentes (Real Estate Agents)
// ============================================================================

export const MOCK_AGENTES: Agente[] = [
  {
    id: 'agent-001',
    name: 'Carolina Mendoza Ríos',
    email: 'carolina.mendoza@arriendospremium.co',
    phone: '+57 320 111 2222',
    avatar: undefined,
    role: 'coordinator',
    status: 'active',
    commissionSplit: 40,
    assignedPropertyIds: ['cons-001', 'cons-002', 'cons-003', 'cons-010', 'cons-015'],
    hireDate: '2021-03-15',
    zone: 'Zona Norte',
    specialization: 'residential',
    metrics: {
      assignedProperties: 12,
      activeLeases: 10,
      closedThisMonth: 2,
      closedThisYear: 18,
      totalCommissions: 45000000,
      commissionsThisMonth: 3200000,
      avgDaysToClose: 21,
      conversionRate: 0.68,
    },
    createdAt: '2021-03-15T08:00:00Z',
    updatedAt: '2026-02-01T10:00:00Z',
  },
  {
    id: 'agent-002',
    name: 'Andrés Felipe Vargas López',
    email: 'andres.vargas@arriendospremium.co',
    phone: '+57 321 222 3333',
    avatar: undefined,
    role: 'agent',
    status: 'active',
    commissionSplit: 35,
    assignedPropertyIds: ['cons-004', 'cons-005', 'cons-011', 'cons-016'],
    hireDate: '2022-08-01',
    zone: 'Chapinero',
    specialization: 'residential',
    metrics: {
      assignedProperties: 8,
      activeLeases: 6,
      closedThisMonth: 1,
      closedThisYear: 12,
      totalCommissions: 28000000,
      commissionsThisMonth: 1800000,
      avgDaysToClose: 25,
      conversionRate: 0.55,
    },
    createdAt: '2022-08-01T09:00:00Z',
    updatedAt: '2026-02-01T10:00:00Z',
  },
  {
    id: 'agent-003',
    name: 'Valentina Torres Guzmán',
    email: 'valentina.torres@arriendospremium.co',
    phone: '+57 322 333 4444',
    avatar: undefined,
    role: 'agent',
    status: 'active',
    commissionSplit: 35,
    assignedPropertyIds: ['cons-006', 'cons-007', 'cons-012', 'cons-017'],
    hireDate: '2023-02-15',
    zone: 'Usaquén',
    specialization: 'both',
    metrics: {
      assignedProperties: 10,
      activeLeases: 8,
      closedThisMonth: 3,
      closedThisYear: 15,
      totalCommissions: 32000000,
      commissionsThisMonth: 4500000,
      avgDaysToClose: 18,
      conversionRate: 0.72,
    },
    createdAt: '2023-02-15T08:00:00Z',
    updatedAt: '2026-02-01T10:00:00Z',
  },
  {
    id: 'agent-004',
    name: 'Diego Alejandro Ruiz Pineda',
    email: 'diego.ruiz@arriendospremium.co',
    phone: '+57 323 444 5555',
    avatar: undefined,
    role: 'agent',
    status: 'active',
    commissionSplit: 35,
    assignedPropertyIds: ['cons-008', 'cons-013', 'cons-018'],
    hireDate: '2023-07-10',
    zone: 'El Poblado',
    specialization: 'residential',
    metrics: {
      assignedProperties: 6,
      activeLeases: 5,
      closedThisMonth: 1,
      closedThisYear: 8,
      totalCommissions: 18000000,
      commissionsThisMonth: 2100000,
      avgDaysToClose: 28,
      conversionRate: 0.50,
    },
    createdAt: '2023-07-10T09:00:00Z',
    updatedAt: '2026-02-01T10:00:00Z',
  },
  {
    id: 'agent-005',
    name: 'Natalia Andrea Gómez Herrera',
    email: 'natalia.gomez@arriendospremium.co',
    phone: '+57 324 555 6666',
    avatar: undefined,
    role: 'agent',
    status: 'active',
    commissionSplit: 35,
    assignedPropertyIds: ['cons-009', 'cons-014', 'cons-019', 'cons-020'],
    hireDate: '2024-01-08',
    zone: 'Zona Centro',
    specialization: 'commercial',
    metrics: {
      assignedProperties: 5,
      activeLeases: 4,
      closedThisMonth: 0,
      closedThisYear: 6,
      totalCommissions: 15000000,
      commissionsThisMonth: 0,
      avgDaysToClose: 35,
      conversionRate: 0.45,
    },
    createdAt: '2024-01-08T08:00:00Z',
    updatedAt: '2026-02-01T10:00:00Z',
  },
  {
    id: 'agent-006',
    name: 'Sebastián Camilo Ortiz Mejía',
    email: 'sebastian.ortiz@arriendospremium.co',
    phone: '+57 325 666 7777',
    avatar: undefined,
    role: 'agent',
    status: 'active',
    commissionSplit: 30,
    assignedPropertyIds: ['cons-021', 'cons-022'],
    hireDate: '2025-06-15',
    zone: 'Suba',
    specialization: 'residential',
    metrics: {
      assignedProperties: 4,
      activeLeases: 2,
      closedThisMonth: 1,
      closedThisYear: 3,
      totalCommissions: 5000000,
      commissionsThisMonth: 1200000,
      avgDaysToClose: 22,
      conversionRate: 0.60,
    },
    createdAt: '2025-06-15T09:00:00Z',
    updatedAt: '2026-02-01T10:00:00Z',
  },
  {
    id: 'agent-007',
    name: 'Laura Camila Pérez Ángel',
    email: 'laura.perez@arriendospremium.co',
    phone: '+57 326 777 8888',
    avatar: undefined,
    role: 'director',
    status: 'active',
    commissionSplit: 50,
    assignedPropertyIds: [],
    hireDate: '2019-01-10',
    zone: 'Todas',
    specialization: 'both',
    metrics: {
      assignedProperties: 0,
      activeLeases: 0,
      closedThisMonth: 0,
      closedThisYear: 0,
      totalCommissions: 0,
      commissionsThisMonth: 0,
      avgDaysToClose: 0,
      conversionRate: 0,
    },
    createdAt: '2019-01-10T08:00:00Z',
    updatedAt: '2026-02-01T10:00:00Z',
  },
  {
    id: 'agent-008',
    name: 'Camilo Andrés Beltrán Suárez',
    email: 'camilo.beltran@arriendospremium.co',
    phone: '+57 327 888 9999',
    avatar: undefined,
    role: 'agent',
    status: 'on_leave',
    commissionSplit: 35,
    assignedPropertyIds: [],
    hireDate: '2022-04-20',
    zone: 'Chapinero',
    specialization: 'residential',
    metrics: {
      assignedProperties: 0,
      activeLeases: 0,
      closedThisMonth: 0,
      closedThisYear: 5,
      totalCommissions: 12000000,
      commissionsThisMonth: 0,
      avgDaysToClose: 24,
      conversionRate: 0.52,
    },
    createdAt: '2022-04-20T09:00:00Z',
    updatedAt: '2026-01-15T10:00:00Z',
  },
];

// ============================================================================
// Consignaciones (Property Consignments)
// ============================================================================

export const MOCK_CONSIGNACIONES: Consignacion[] = [
  // Propietario 001 - Carlos Ramírez (4 properties)
  {
    id: 'cons-001',
    propertyId: 'prop-1',
    propietarioId: 'prop-001',
    agenteId: 'agent-001',
    propertyTitle: 'Apartamento Moderno Chicó',
    propertyAddress: 'Cra 11 #94-45, Apto 701',
    propertyCity: 'Bogotá',
    propertyZone: 'Chicó',
    propertyType: 'apartment',
    propertyThumbnail: 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=400&h=300&fit=crop',
    monthlyRent: 3200000,
    adminFee: 250000,
    commissionPercent: 10,
    contractDate: '2022-04-01',
    contractEndDate: '2027-04-01',
    minimumTerm: 12,
    status: 'active',
    availability: 'rented',
    currentLeaseId: 'lease-001',
    currentTenantName: 'Andrea Sofía Mendoza',
    leaseEndDate: '2027-01-31',
    createdAt: '2022-04-01T10:00:00Z',
    updatedAt: '2026-01-15T09:00:00Z',
  },
  {
    id: 'cons-002',
    propertyId: 'prop-2',
    propietarioId: 'prop-001',
    agenteId: 'agent-001',
    propertyTitle: 'Estudio Ejecutivo Rosales',
    propertyAddress: 'Calle 73 #5-30, Apto 302',
    propertyCity: 'Bogotá',
    propertyZone: 'Rosales',
    propertyType: 'studio',
    propertyThumbnail: 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=400&h=300&fit=crop',
    monthlyRent: 2100000,
    adminFee: 180000,
    commissionPercent: 10,
    contractDate: '2022-04-01',
    contractEndDate: '2027-04-01',
    minimumTerm: 6,
    status: 'active',
    availability: 'rented',
    currentLeaseId: 'lease-002',
    currentTenantName: 'Felipe Andrés Ramos',
    leaseEndDate: '2026-08-31',
    createdAt: '2022-04-01T10:00:00Z',
    updatedAt: '2026-01-15T09:00:00Z',
  },
  {
    id: 'cons-003',
    propertyId: 'prop-3',
    propietarioId: 'prop-001',
    agenteId: 'agent-001',
    propertyTitle: 'Apartamento Familiar Cedritos',
    propertyAddress: 'Calle 147 #17-85, Apto 501',
    propertyCity: 'Bogotá',
    propertyZone: 'Cedritos',
    propertyType: 'apartment',
    propertyThumbnail: 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=400&h=300&fit=crop',
    monthlyRent: 2800000,
    adminFee: 220000,
    commissionPercent: 10,
    contractDate: '2023-01-15',
    contractEndDate: '2028-01-15',
    minimumTerm: 12,
    status: 'active',
    availability: 'rented',
    currentLeaseId: 'lease-003',
    currentTenantName: 'Familia García Moreno',
    leaseEndDate: '2027-03-31',
    createdAt: '2023-01-15T10:00:00Z',
    updatedAt: '2026-01-15T09:00:00Z',
  },
  {
    id: 'cons-004',
    propertyId: 'prop-4',
    propietarioId: 'prop-001',
    agenteId: 'agent-002',
    propertyTitle: 'Local Comercial Chapinero',
    propertyAddress: 'Cra 13 #60-25, Local 101',
    propertyCity: 'Bogotá',
    propertyZone: 'Chapinero',
    propertyType: 'commercial',
    propertyThumbnail: 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=400&h=300&fit=crop',
    monthlyRent: 1700000,
    adminFee: 0,
    commissionPercent: 8,
    contractDate: '2024-06-01',
    contractEndDate: '2029-06-01',
    minimumTerm: 24,
    status: 'active',
    availability: 'available',
    createdAt: '2024-06-01T10:00:00Z',
    updatedAt: '2026-01-28T15:00:00Z',
  },

  // Propietario 002 - María González (2 properties)
  {
    id: 'cons-005',
    propertyId: 'prop-5',
    propietarioId: 'prop-002',
    agenteId: 'agent-002',
    propertyTitle: 'Apartamento Chapinero Alto',
    propertyAddress: 'Cra 5 #59-30, Apto 402',
    propertyCity: 'Bogotá',
    propertyZone: 'Chapinero Alto',
    propertyType: 'apartment',
    propertyThumbnail: 'https://images.unsplash.com/photo-1493809842364-78817add7ffb?w=400&h=300&fit=crop',
    monthlyRent: 2600000,
    adminFee: 200000,
    commissionPercent: 10,
    contractDate: '2023-07-01',
    contractEndDate: '2028-07-01',
    minimumTerm: 12,
    status: 'active',
    availability: 'rented',
    currentLeaseId: 'lease-004',
    currentTenantName: 'Camila Rodríguez Pinto',
    leaseEndDate: '2026-12-31',
    createdAt: '2023-07-01T11:00:00Z',
    updatedAt: '2026-01-15T09:00:00Z',
  },
  {
    id: 'cons-006',
    propertyId: 'prop-6',
    propietarioId: 'prop-002',
    agenteId: 'agent-003',
    propertyTitle: 'Estudio Parque 93',
    propertyAddress: 'Calle 93A #13-50, Apto 805',
    propertyCity: 'Bogotá',
    propertyZone: 'Parque 93',
    propertyType: 'studio',
    propertyThumbnail: 'https://images.unsplash.com/photo-1502672023488-70e25813eb80?w=400&h=300&fit=crop',
    monthlyRent: 2600000,
    adminFee: 200000,
    commissionPercent: 10,
    contractDate: '2023-07-01',
    contractEndDate: '2028-07-01',
    minimumTerm: 6,
    status: 'active',
    availability: 'rented',
    currentLeaseId: 'lease-005',
    currentTenantName: 'Martín Eduardo Lagos',
    leaseEndDate: '2026-09-30',
    createdAt: '2023-07-01T11:00:00Z',
    updatedAt: '2026-01-15T09:00:00Z',
  },

  // Propietario 003 - Inversiones Ruiz (8 properties, showing 6)
  {
    id: 'cons-007',
    propertyId: 'prop-7',
    propietarioId: 'prop-003',
    agenteId: 'agent-003',
    propertyTitle: 'Apartamento Usaquén Centro',
    propertyAddress: 'Cra 6 #119-52, Apto 601',
    propertyCity: 'Bogotá',
    propertyZone: 'Usaquén',
    propertyType: 'apartment',
    propertyThumbnail: 'https://images.unsplash.com/photo-1484154218962-a197022b5858?w=400&h=300&fit=crop',
    monthlyRent: 3500000,
    adminFee: 280000,
    commissionPercent: 9,
    contractDate: '2021-10-01',
    contractEndDate: '2026-10-01',
    minimumTerm: 12,
    status: 'active',
    availability: 'rented',
    currentLeaseId: 'lease-006',
    currentTenantName: 'Ricardo Alberto Muñoz',
    leaseEndDate: '2026-04-30',
    createdAt: '2021-10-01T10:00:00Z',
    updatedAt: '2026-01-15T09:00:00Z',
  },
  {
    id: 'cons-008',
    propertyId: 'prop-8',
    propietarioId: 'prop-003',
    agenteId: 'agent-004',
    propertyTitle: 'Casa El Poblado',
    propertyAddress: 'Cra 35 #10-100, Casa 25',
    propertyCity: 'Medellín',
    propertyZone: 'El Poblado',
    propertyType: 'house',
    propertyThumbnail: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=400&h=300&fit=crop',
    monthlyRent: 5200000,
    adminFee: 350000,
    commissionPercent: 9,
    contractDate: '2021-10-01',
    contractEndDate: '2026-10-01',
    minimumTerm: 12,
    status: 'active',
    availability: 'rented',
    currentLeaseId: 'lease-007',
    currentTenantName: 'Familia Escobar Vélez',
    leaseEndDate: '2026-06-30',
    createdAt: '2021-10-01T10:00:00Z',
    updatedAt: '2026-01-15T09:00:00Z',
  },
  {
    id: 'cons-009',
    propertyId: 'prop-9',
    propietarioId: 'prop-003',
    agenteId: 'agent-005',
    propertyTitle: 'Oficina La Candelaria',
    propertyAddress: 'Calle 12 #3-15, Oficina 201',
    propertyCity: 'Bogotá',
    propertyZone: 'La Candelaria',
    propertyType: 'office',
    propertyThumbnail: 'https://images.unsplash.com/photo-1497366754035-f200968a6e72?w=400&h=300&fit=crop',
    monthlyRent: 2800000,
    adminFee: 180000,
    commissionPercent: 8,
    contractDate: '2022-03-01',
    contractEndDate: '2027-03-01',
    minimumTerm: 24,
    status: 'active',
    availability: 'rented',
    currentLeaseId: 'lease-008',
    currentTenantName: 'Startups Colombia SAS',
    leaseEndDate: '2027-02-28',
    createdAt: '2022-03-01T10:00:00Z',
    updatedAt: '2026-01-15T09:00:00Z',
  },
  {
    id: 'cons-010',
    propertyId: 'prop-10',
    propietarioId: 'prop-003',
    agenteId: 'agent-001',
    propertyTitle: 'Apartamento Santa Bárbara',
    propertyAddress: 'Cra 19 #116-30, Apto 902',
    propertyCity: 'Bogotá',
    propertyZone: 'Santa Bárbara',
    propertyType: 'apartment',
    propertyThumbnail: 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=400&h=300&fit=crop',
    monthlyRent: 3800000,
    adminFee: 300000,
    commissionPercent: 9,
    contractDate: '2022-06-15',
    contractEndDate: '2027-06-15',
    minimumTerm: 12,
    status: 'active',
    availability: 'rented',
    currentLeaseId: 'lease-009',
    currentTenantName: 'Paola Andrea Ríos',
    leaseEndDate: '2026-11-30',
    createdAt: '2022-06-15T10:00:00Z',
    updatedAt: '2026-01-15T09:00:00Z',
  },
  {
    id: 'cons-011',
    propertyId: 'prop-11',
    propietarioId: 'prop-003',
    agenteId: 'agent-002',
    propertyTitle: 'Estudio Virrey',
    propertyAddress: 'Calle 88 #13-05, Apto 1102',
    propertyCity: 'Bogotá',
    propertyZone: 'Virrey',
    propertyType: 'studio',
    propertyThumbnail: 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=400&h=300&fit=crop',
    monthlyRent: 1800000,
    adminFee: 150000,
    commissionPercent: 9,
    contractDate: '2023-02-01',
    contractEndDate: '2028-02-01',
    minimumTerm: 6,
    status: 'active',
    availability: 'in_process',
    createdAt: '2023-02-01T10:00:00Z',
    updatedAt: '2026-02-01T14:00:00Z',
  },
  {
    id: 'cons-012',
    propertyId: 'prop-12',
    propietarioId: 'prop-003',
    agenteId: 'agent-003',
    propertyTitle: 'Apartamento Country',
    propertyAddress: 'Cra 15 #127-45, Apto 1201',
    propertyCity: 'Bogotá',
    propertyZone: 'Country',
    propertyType: 'apartment',
    propertyThumbnail: 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=400&h=300&fit=crop',
    monthlyRent: 2900000,
    adminFee: 230000,
    commissionPercent: 9,
    contractDate: '2024-01-10',
    contractEndDate: '2029-01-10',
    minimumTerm: 12,
    status: 'active',
    availability: 'available',
    createdAt: '2024-01-10T10:00:00Z',
    updatedAt: '2026-01-30T11:00:00Z',
  },

  // Propietario 004 - Roberto Herrera (1 property)
  {
    id: 'cons-013',
    propertyId: 'prop-13',
    propietarioId: 'prop-004',
    agenteId: 'agent-004',
    propertyTitle: 'Penthouse Zona T',
    propertyAddress: 'Calle 82 #12-50, PH 2001',
    propertyCity: 'Bogotá',
    propertyZone: 'Zona T',
    propertyType: 'apartment',
    propertyThumbnail: 'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=400&h=300&fit=crop',
    monthlyRent: 3500000,
    adminFee: 280000,
    commissionPercent: 10,
    contractDate: '2024-03-01',
    contractEndDate: '2029-03-01',
    minimumTerm: 12,
    status: 'active',
    availability: 'rented',
    currentLeaseId: 'lease-010',
    currentTenantName: 'Juan Pablo Hernández',
    leaseEndDate: '2026-08-31',
    createdAt: '2024-03-01T10:00:00Z',
    updatedAt: '2026-01-15T09:00:00Z',
  },

  // More properties for other propietarios...
  {
    id: 'cons-014',
    propertyId: 'prop-14',
    propietarioId: 'prop-005',
    agenteId: 'agent-005',
    propertyTitle: 'Apartamento Nogal',
    propertyAddress: 'Calle 79 #7-20, Apto 403',
    propertyCity: 'Bogotá',
    propertyZone: 'El Nogal',
    propertyType: 'apartment',
    propertyThumbnail: 'https://images.unsplash.com/photo-1493809842364-78817add7ffb?w=400&h=300&fit=crop',
    monthlyRent: 2400000,
    adminFee: 190000,
    commissionPercent: 10,
    contractDate: '2023-12-01',
    contractEndDate: '2028-12-01',
    minimumTerm: 12,
    status: 'active',
    availability: 'rented',
    currentLeaseId: 'lease-011',
    currentTenantName: 'Miguel Ángel Castro',
    leaseEndDate: '2026-05-31',
    createdAt: '2023-12-01T10:00:00Z',
    updatedAt: '2026-01-15T09:00:00Z',
  },
  {
    id: 'cons-015',
    propertyId: 'prop-15',
    propietarioId: 'prop-005',
    agenteId: 'agent-001',
    propertyTitle: 'Estudio Quinta Camacho',
    propertyAddress: 'Cra 9 #69A-15, Apto 204',
    propertyCity: 'Bogotá',
    propertyZone: 'Quinta Camacho',
    propertyType: 'studio',
    propertyThumbnail: 'https://images.unsplash.com/photo-1502672023488-70e25813eb80?w=400&h=300&fit=crop',
    monthlyRent: 2400000,
    adminFee: 0,
    commissionPercent: 10,
    contractDate: '2024-04-15',
    contractEndDate: '2029-04-15',
    minimumTerm: 6,
    status: 'active',
    availability: 'rented',
    currentLeaseId: 'lease-012',
    currentTenantName: 'Laura Valentina Suárez',
    leaseEndDate: '2026-10-14',
    createdAt: '2024-04-15T10:00:00Z',
    updatedAt: '2026-01-15T09:00:00Z',
  },
];

// ============================================================================
// Pipeline Items
// ============================================================================

export const MOCK_PIPELINE_ITEMS: PipelineItem[] = [
  // Leads
  {
    id: 'pipe-001',
    consignacionId: 'cons-004',
    propertyId: 'prop-4',
    candidateId: 'cand-001',
    agenteId: 'agent-002',
    propertyTitle: 'Local Comercial Chapinero',
    propertyAddress: 'Cra 13 #60-25, Local 101',
    propertyThumbnail: 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=400&h=300&fit=crop',
    monthlyRent: 1700000,
    candidateName: 'Restaurante El Buen Sabor',
    candidateEmail: 'contacto@elbuensabor.co',
    candidatePhone: '+57 300 111 2222',
    stage: 'lead',
    enteredStageAt: '2026-02-03T10:00:00Z',
    daysInStage: 4,
    nextAction: 'Llamar para agendar visita',
    nextActionDate: '2026-02-07',
    createdAt: '2026-02-03T10:00:00Z',
    updatedAt: '2026-02-03T10:00:00Z',
  },
  {
    id: 'pipe-002',
    consignacionId: 'cons-012',
    propertyId: 'prop-12',
    candidateId: 'cand-002',
    agenteId: 'agent-003',
    propertyTitle: 'Apartamento Country',
    propertyAddress: 'Cra 15 #127-45, Apto 1201',
    propertyThumbnail: 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=400&h=300&fit=crop',
    monthlyRent: 2900000,
    candidateName: 'Patricia Elena Gómez',
    candidateEmail: 'patricia.gomez@email.com',
    candidatePhone: '+57 301 222 3333',
    stage: 'lead',
    enteredStageAt: '2026-02-05T14:00:00Z',
    daysInStage: 2,
    nextAction: 'Enviar información del inmueble',
    nextActionDate: '2026-02-07',
    createdAt: '2026-02-05T14:00:00Z',
    updatedAt: '2026-02-05T14:00:00Z',
  },

  // Visits Scheduled
  {
    id: 'pipe-003',
    consignacionId: 'cons-012',
    propertyId: 'prop-12',
    candidateId: 'cand-003',
    agenteId: 'agent-003',
    propertyTitle: 'Apartamento Country',
    propertyAddress: 'Cra 15 #127-45, Apto 1201',
    propertyThumbnail: 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=400&h=300&fit=crop',
    monthlyRent: 2900000,
    candidateName: 'Carlos Eduardo Vargas',
    candidateEmail: 'carlos.vargas@corporativo.co',
    candidatePhone: '+57 302 333 4444',
    stage: 'visit_scheduled',
    enteredStageAt: '2026-02-04T09:00:00Z',
    daysInStage: 3,
    nextAction: 'Visita programada',
    nextActionDate: '2026-02-08',
    lastContactDate: '2026-02-04',
    createdAt: '2026-02-01T11:00:00Z',
    updatedAt: '2026-02-04T09:00:00Z',
  },
  {
    id: 'pipe-004',
    consignacionId: 'cons-004',
    propertyId: 'prop-4',
    candidateId: 'cand-004',
    agenteId: 'agent-002',
    propertyTitle: 'Local Comercial Chapinero',
    propertyAddress: 'Cra 13 #60-25, Local 101',
    propertyThumbnail: 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=400&h=300&fit=crop',
    monthlyRent: 1700000,
    candidateName: 'Clínica Dental Sonrisa',
    candidateEmail: 'admin@clinicasonrisa.co',
    candidatePhone: '+57 303 444 5555',
    stage: 'visit_scheduled',
    enteredStageAt: '2026-02-05T16:00:00Z',
    daysInStage: 2,
    nextAction: 'Visita programada',
    nextActionDate: '2026-02-09',
    lastContactDate: '2026-02-05',
    createdAt: '2026-01-28T10:00:00Z',
    updatedAt: '2026-02-05T16:00:00Z',
  },

  // Visit Done
  {
    id: 'pipe-005',
    consignacionId: 'cons-011',
    propertyId: 'prop-11',
    candidateId: 'cand-005',
    agenteId: 'agent-002',
    propertyTitle: 'Estudio Virrey',
    propertyAddress: 'Calle 88 #13-05, Apto 1102',
    propertyThumbnail: 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=400&h=300&fit=crop',
    monthlyRent: 1800000,
    candidateName: 'Daniela Alejandra Pinzón',
    candidateEmail: 'daniela.pinzon@gmail.com',
    candidatePhone: '+57 304 555 6666',
    stage: 'visit_done',
    enteredStageAt: '2026-02-03T18:00:00Z',
    daysInStage: 4,
    nextAction: 'Esperar decisión del candidato',
    nextActionDate: '2026-02-10',
    lastContactDate: '2026-02-03',
    notes: 'Muy interesada. Preguntó por mascotas (no permitidas).',
    createdAt: '2026-01-25T09:00:00Z',
    updatedAt: '2026-02-03T18:00:00Z',
  },

  // Application
  {
    id: 'pipe-006',
    consignacionId: 'cons-011',
    propertyId: 'prop-11',
    candidateId: 'cand-006',
    agenteId: 'agent-002',
    propertyTitle: 'Estudio Virrey',
    propertyAddress: 'Calle 88 #13-05, Apto 1102',
    propertyThumbnail: 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=400&h=300&fit=crop',
    monthlyRent: 1800000,
    candidateName: 'Santiago Andrés Mejía',
    candidateEmail: 'santiago.mejia@empresa.co',
    candidatePhone: '+57 305 666 7777',
    stage: 'application',
    enteredStageAt: '2026-02-01T14:00:00Z',
    daysInStage: 6,
    nextAction: 'Revisar documentos',
    lastContactDate: '2026-02-01',
    riskScore: 75,
    riskLevel: 'B',
    createdAt: '2026-01-20T11:00:00Z',
    updatedAt: '2026-02-01T14:00:00Z',
  },

  // Evaluation
  {
    id: 'pipe-007',
    consignacionId: 'cons-011',
    propertyId: 'prop-11',
    candidateId: 'cand-007',
    agenteId: 'agent-002',
    propertyTitle: 'Estudio Virrey',
    propertyAddress: 'Calle 88 #13-05, Apto 1102',
    propertyThumbnail: 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=400&h=300&fit=crop',
    monthlyRent: 1800000,
    candidateName: 'María Fernanda Ospina',
    candidateEmail: 'mfospina@outlook.com',
    candidatePhone: '+57 306 777 8888',
    stage: 'evaluation',
    enteredStageAt: '2026-01-30T10:00:00Z',
    daysInStage: 8,
    nextAction: 'Evaluación de riesgo en proceso',
    lastContactDate: '2026-01-30',
    riskScore: 82,
    riskLevel: 'A',
    notes: 'Excelente perfil. Ingresos verificados.',
    createdAt: '2026-01-15T09:00:00Z',
    updatedAt: '2026-01-30T10:00:00Z',
  },

  // Approved
  {
    id: 'pipe-008',
    consignacionId: 'cons-011',
    propertyId: 'prop-11',
    candidateId: 'cand-008',
    agenteId: 'agent-002',
    propertyTitle: 'Estudio Virrey',
    propertyAddress: 'Calle 88 #13-05, Apto 1102',
    propertyThumbnail: 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=400&h=300&fit=crop',
    monthlyRent: 1800000,
    candidateName: 'Alejandro José Restrepo',
    candidateEmail: 'alejandro.restrepo@tech.co',
    candidatePhone: '+57 307 888 9999',
    stage: 'approved',
    enteredStageAt: '2026-02-05T11:00:00Z',
    daysInStage: 2,
    nextAction: 'Preparar contrato',
    nextActionDate: '2026-02-08',
    lastContactDate: '2026-02-05',
    riskScore: 88,
    riskLevel: 'A',
    notes: 'Aprobado. Programar firma de contrato.',
    createdAt: '2026-01-10T10:00:00Z',
    updatedAt: '2026-02-05T11:00:00Z',
  },

  // Contract
  {
    id: 'pipe-009',
    consignacionId: 'cons-012',
    propertyId: 'prop-12',
    candidateId: 'cand-009',
    agenteId: 'agent-003',
    propertyTitle: 'Apartamento Country',
    propertyAddress: 'Cra 15 #127-45, Apto 1201',
    propertyThumbnail: 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=400&h=300&fit=crop',
    monthlyRent: 2900000,
    candidateName: 'Familia Torres Mendoza',
    candidateEmail: 'familia.torres@gmail.com',
    candidatePhone: '+57 308 999 0000',
    stage: 'contract',
    enteredStageAt: '2026-02-04T15:00:00Z',
    daysInStage: 3,
    nextAction: 'Firma de contrato',
    nextActionDate: '2026-02-10',
    lastContactDate: '2026-02-04',
    riskScore: 91,
    riskLevel: 'A',
    notes: 'Contrato en revisión por abogado del arrendatario.',
    createdAt: '2026-01-05T14:00:00Z',
    updatedAt: '2026-02-04T15:00:00Z',
  },

  // Handover
  {
    id: 'pipe-010',
    consignacionId: 'cons-004',
    propertyId: 'prop-4',
    candidateId: 'cand-010',
    agenteId: 'agent-002',
    propertyTitle: 'Local Comercial Chapinero',
    propertyAddress: 'Cra 13 #60-25, Local 101',
    propertyThumbnail: 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=400&h=300&fit=crop',
    monthlyRent: 1700000,
    candidateName: 'Café Aromático SAS',
    candidateEmail: 'gerencia@cafearomatico.co',
    candidatePhone: '+57 309 000 1111',
    stage: 'handover',
    enteredStageAt: '2026-02-06T09:00:00Z',
    daysInStage: 1,
    nextAction: 'Entrega de llaves y acta',
    nextActionDate: '2026-02-10',
    lastContactDate: '2026-02-06',
    riskScore: 85,
    riskLevel: 'A',
    notes: 'Depósito recibido. Programar entrega.',
    createdAt: '2025-12-20T10:00:00Z',
    updatedAt: '2026-02-06T09:00:00Z',
  },

  // Completed (recent)
  {
    id: 'pipe-011',
    consignacionId: 'cons-015',
    propertyId: 'prop-15',
    candidateId: 'cand-011',
    agenteId: 'agent-001',
    propertyTitle: 'Estudio Quinta Camacho',
    propertyAddress: 'Cra 9 #69A-15, Apto 204',
    propertyThumbnail: 'https://images.unsplash.com/photo-1502672023488-70e25813eb80?w=400&h=300&fit=crop',
    monthlyRent: 2400000,
    candidateName: 'Laura Valentina Suárez',
    candidateEmail: 'laura.suarez@creativos.co',
    candidatePhone: '+57 310 111 2222',
    stage: 'completed',
    enteredStageAt: '2026-01-28T16:00:00Z',
    daysInStage: 10,
    lastContactDate: '2026-01-28',
    riskScore: 90,
    riskLevel: 'A',
    completedLeaseId: 'lease-012',
    notes: 'Cerrado exitosamente. Contrato firmado por 12 meses.',
    createdAt: '2025-11-15T09:00:00Z',
    updatedAt: '2026-01-28T16:00:00Z',
  },

  // Lost
  {
    id: 'pipe-012',
    consignacionId: 'cons-012',
    propertyId: 'prop-12',
    candidateId: 'cand-012',
    agenteId: 'agent-003',
    propertyTitle: 'Apartamento Country',
    propertyAddress: 'Cra 15 #127-45, Apto 1201',
    propertyThumbnail: 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=400&h=300&fit=crop',
    monthlyRent: 2900000,
    candidateName: 'Andrés Felipe Duarte',
    candidateEmail: 'aduarte@empresa.co',
    candidatePhone: '+57 311 222 3333',
    stage: 'lost',
    enteredStageAt: '2026-01-25T10:00:00Z',
    daysInStage: 13,
    lastContactDate: '2026-01-25',
    riskScore: 72,
    riskLevel: 'B',
    lostReason: 'Encontró opción más económica',
    notes: 'Candidato optó por otro inmueble más barato.',
    createdAt: '2026-01-05T11:00:00Z',
    updatedAt: '2026-01-25T10:00:00Z',
  },
];

// ============================================================================
// Cobros (Collections) - Current Month
// ============================================================================

export const MOCK_COBROS: Cobro[] = [
  // February 2026 - Current month
  {
    id: 'cobro-001',
    leaseId: 'lease-001',
    consignacionId: 'cons-001',
    propertyId: 'prop-1',
    propietarioId: 'prop-001',
    tenantId: 'tenant-001',
    agenteId: 'agent-001',
    propertyTitle: 'Apartamento Moderno Chicó',
    propertyAddress: 'Cra 11 #94-45, Apto 701',
    tenantName: 'Andrea Sofía Mendoza',
    tenantEmail: 'andrea.mendoza@email.com',
    tenantPhone: '+57 320 123 4567',
    month: '2026-02',
    rentAmount: 3200000,
    adminAmount: 250000,
    totalAmount: 3450000,
    lateFee: 0,
    totalWithFees: 3450000,
    status: 'paid',
    dueDate: '2026-02-05',
    paidDate: '2026-02-03',
    paidAmount: 3450000,
    pendingAmount: 0,
    paymentMethod: 'pse',
    paymentReference: 'PSE-2026020301',
    daysLate: 0,
    remindersSent: 0,
    createdAt: '2026-02-01T00:00:00Z',
    updatedAt: '2026-02-03T10:00:00Z',
  },
  {
    id: 'cobro-002',
    leaseId: 'lease-002',
    consignacionId: 'cons-002',
    propertyId: 'prop-2',
    propietarioId: 'prop-001',
    tenantId: 'tenant-002',
    agenteId: 'agent-001',
    propertyTitle: 'Estudio Ejecutivo Rosales',
    propertyAddress: 'Calle 73 #5-30, Apto 302',
    tenantName: 'Felipe Andrés Ramos',
    tenantEmail: 'felipe.ramos@email.com',
    tenantPhone: '+57 321 234 5678',
    month: '2026-02',
    rentAmount: 2100000,
    adminAmount: 180000,
    totalAmount: 2280000,
    lateFee: 0,
    totalWithFees: 2280000,
    status: 'pending',
    dueDate: '2026-02-05',
    paidAmount: 0,
    pendingAmount: 2280000,
    daysLate: 2,
    remindersSent: 1,
    lastReminderDate: '2026-02-06',
    createdAt: '2026-02-01T00:00:00Z',
    updatedAt: '2026-02-06T09:00:00Z',
  },
  {
    id: 'cobro-003',
    leaseId: 'lease-003',
    consignacionId: 'cons-003',
    propertyId: 'prop-3',
    propietarioId: 'prop-001',
    tenantId: 'tenant-003',
    agenteId: 'agent-001',
    propertyTitle: 'Apartamento Familiar Cedritos',
    propertyAddress: 'Calle 147 #17-85, Apto 501',
    tenantName: 'Familia García Moreno',
    tenantEmail: 'garcia.moreno@email.com',
    tenantPhone: '+57 322 345 6789',
    month: '2026-02',
    rentAmount: 2800000,
    adminAmount: 220000,
    totalAmount: 3020000,
    lateFee: 0,
    totalWithFees: 3020000,
    status: 'paid',
    dueDate: '2026-02-05',
    paidDate: '2026-02-05',
    paidAmount: 3020000,
    pendingAmount: 0,
    paymentMethod: 'nequi',
    paymentReference: 'NEQ-2026020501',
    daysLate: 0,
    remindersSent: 0,
    createdAt: '2026-02-01T00:00:00Z',
    updatedAt: '2026-02-05T15:00:00Z',
  },
  {
    id: 'cobro-004',
    leaseId: 'lease-004',
    consignacionId: 'cons-005',
    propertyId: 'prop-5',
    propietarioId: 'prop-002',
    tenantId: 'tenant-004',
    agenteId: 'agent-002',
    propertyTitle: 'Apartamento Chapinero Alto',
    propertyAddress: 'Cra 5 #59-30, Apto 402',
    tenantName: 'Camila Rodríguez Pinto',
    tenantEmail: 'camila.rodriguez@email.com',
    tenantPhone: '+57 323 456 7890',
    month: '2026-02',
    rentAmount: 2600000,
    adminAmount: 200000,
    totalAmount: 2800000,
    lateFee: 0,
    totalWithFees: 2800000,
    status: 'paid',
    dueDate: '2026-02-05',
    paidDate: '2026-02-04',
    paidAmount: 2800000,
    pendingAmount: 0,
    paymentMethod: 'credit_card',
    paymentReference: 'CC-2026020401',
    daysLate: 0,
    remindersSent: 0,
    createdAt: '2026-02-01T00:00:00Z',
    updatedAt: '2026-02-04T11:00:00Z',
  },
  {
    id: 'cobro-005',
    leaseId: 'lease-005',
    consignacionId: 'cons-006',
    propertyId: 'prop-6',
    propietarioId: 'prop-002',
    tenantId: 'tenant-005',
    agenteId: 'agent-003',
    propertyTitle: 'Estudio Parque 93',
    propertyAddress: 'Calle 93A #13-50, Apto 805',
    tenantName: 'Martín Eduardo Lagos',
    tenantEmail: 'martin.lagos@email.com',
    tenantPhone: '+57 324 567 8901',
    month: '2026-02',
    rentAmount: 2600000,
    adminAmount: 200000,
    totalAmount: 2800000,
    lateFee: 0,
    totalWithFees: 2800000,
    status: 'paid',
    dueDate: '2026-02-05',
    paidDate: '2026-02-02',
    paidAmount: 2800000,
    pendingAmount: 0,
    paymentMethod: 'pse',
    paymentReference: 'PSE-2026020201',
    daysLate: 0,
    remindersSent: 0,
    createdAt: '2026-02-01T00:00:00Z',
    updatedAt: '2026-02-02T09:00:00Z',
  },
  // Late payment
  {
    id: 'cobro-006',
    leaseId: 'lease-011',
    consignacionId: 'cons-014',
    propertyId: 'prop-14',
    propietarioId: 'prop-005',
    tenantId: 'tenant-011',
    agenteId: 'agent-005',
    propertyTitle: 'Apartamento Nogal',
    propertyAddress: 'Calle 79 #7-20, Apto 403',
    tenantName: 'Miguel Ángel Castro',
    tenantEmail: 'miguel.castro@email.com',
    tenantPhone: '+57 325 678 9012',
    month: '2026-02',
    rentAmount: 2400000,
    adminAmount: 190000,
    totalAmount: 2590000,
    lateFee: 51800,
    totalWithFees: 2641800,
    status: 'late',
    dueDate: '2026-02-05',
    paidAmount: 0,
    pendingAmount: 2641800,
    daysLate: 2,
    remindersSent: 2,
    lastReminderDate: '2026-02-07',
    createdAt: '2026-02-01T00:00:00Z',
    updatedAt: '2026-02-07T10:00:00Z',
  },
  // Partial payment
  {
    id: 'cobro-007',
    leaseId: 'lease-006',
    consignacionId: 'cons-007',
    propertyId: 'prop-7',
    propietarioId: 'prop-003',
    tenantId: 'tenant-006',
    agenteId: 'agent-003',
    propertyTitle: 'Apartamento Usaquén Centro',
    propertyAddress: 'Cra 6 #119-52, Apto 601',
    tenantName: 'Ricardo Alberto Muñoz',
    tenantEmail: 'ricardo.munoz@email.com',
    tenantPhone: '+57 326 789 0123',
    month: '2026-02',
    rentAmount: 3500000,
    adminAmount: 280000,
    totalAmount: 3780000,
    lateFee: 0,
    totalWithFees: 3780000,
    status: 'partial',
    dueDate: '2026-02-05',
    paidDate: '2026-02-05',
    paidAmount: 2000000,
    pendingAmount: 1780000,
    paymentMethod: 'pse',
    paymentReference: 'PSE-2026020502',
    daysLate: 0,
    remindersSent: 1,
    lastReminderDate: '2026-02-06',
    createdAt: '2026-02-01T00:00:00Z',
    updatedAt: '2026-02-06T14:00:00Z',
  },
  // More paid cobros for other properties...
  {
    id: 'cobro-008',
    leaseId: 'lease-007',
    consignacionId: 'cons-008',
    propertyId: 'prop-8',
    propietarioId: 'prop-003',
    tenantId: 'tenant-007',
    agenteId: 'agent-004',
    propertyTitle: 'Casa El Poblado',
    propertyAddress: 'Cra 35 #10-100, Casa 25',
    tenantName: 'Familia Escobar Vélez',
    tenantEmail: 'escobar.velez@email.com',
    tenantPhone: '+57 327 890 1234',
    month: '2026-02',
    rentAmount: 5200000,
    adminAmount: 350000,
    totalAmount: 5550000,
    lateFee: 0,
    totalWithFees: 5550000,
    status: 'paid',
    dueDate: '2026-02-05',
    paidDate: '2026-02-01',
    paidAmount: 5550000,
    pendingAmount: 0,
    paymentMethod: 'pse',
    paymentReference: 'PSE-2026020101',
    daysLate: 0,
    remindersSent: 0,
    createdAt: '2026-02-01T00:00:00Z',
    updatedAt: '2026-02-01T08:00:00Z',
  },
  {
    id: 'cobro-009',
    leaseId: 'lease-008',
    consignacionId: 'cons-009',
    propertyId: 'prop-9',
    propietarioId: 'prop-003',
    tenantId: 'tenant-008',
    agenteId: 'agent-005',
    propertyTitle: 'Oficina La Candelaria',
    propertyAddress: 'Calle 12 #3-15, Oficina 201',
    tenantName: 'Startups Colombia SAS',
    tenantEmail: 'admin@startupscol.co',
    tenantPhone: '+57 328 901 2345',
    month: '2026-02',
    rentAmount: 2800000,
    adminAmount: 180000,
    totalAmount: 2980000,
    lateFee: 0,
    totalWithFees: 2980000,
    status: 'paid',
    dueDate: '2026-02-05',
    paidDate: '2026-02-03',
    paidAmount: 2980000,
    pendingAmount: 0,
    paymentMethod: 'pse',
    paymentReference: 'PSE-2026020302',
    daysLate: 0,
    remindersSent: 0,
    createdAt: '2026-02-01T00:00:00Z',
    updatedAt: '2026-02-03T11:00:00Z',
  },
  {
    id: 'cobro-010',
    leaseId: 'lease-010',
    consignacionId: 'cons-013',
    propertyId: 'prop-13',
    propietarioId: 'prop-004',
    tenantId: 'tenant-010',
    agenteId: 'agent-004',
    propertyTitle: 'Penthouse Zona T',
    propertyAddress: 'Calle 82 #12-50, PH 2001',
    tenantName: 'Juan Pablo Hernández',
    tenantEmail: 'jp.hernandez@email.com',
    tenantPhone: '+57 329 012 3456',
    month: '2026-02',
    rentAmount: 3500000,
    adminAmount: 280000,
    totalAmount: 3780000,
    lateFee: 0,
    totalWithFees: 3780000,
    status: 'paid',
    dueDate: '2026-02-05',
    paidDate: '2026-02-04',
    paidAmount: 3780000,
    pendingAmount: 0,
    paymentMethod: 'credit_card',
    paymentReference: 'CC-2026020402',
    daysLate: 0,
    remindersSent: 0,
    createdAt: '2026-02-01T00:00:00Z',
    updatedAt: '2026-02-04T16:00:00Z',
  },
];

// ============================================================================
// Dispersiones (Disbursements)
// ============================================================================

export const MOCK_DISPERSIONES: Dispersion[] = [
  // January 2026 - Completed dispersions
  {
    id: 'disp-001',
    propietarioId: 'prop-001',
    propietarioName: 'Carlos Andrés Ramírez Peña',
    propietarioBankAccount: {
      bank: 'bancolombia',
      accountType: 'savings',
      accountNumber: '****4532',
      accountHolder: 'Carlos Andrés Ramírez Peña',
    },
    month: '2026-01',
    items: [
      {
        cobroId: 'cobro-jan-001',
        propertyTitle: 'Apartamento Moderno Chicó',
        rentCollected: 3450000,
        commissionPercent: 10,
        commissionAmount: 345000,
        netAmount: 3105000,
      },
      {
        cobroId: 'cobro-jan-002',
        propertyTitle: 'Estudio Ejecutivo Rosales',
        rentCollected: 2280000,
        commissionPercent: 10,
        commissionAmount: 228000,
        netAmount: 2052000,
      },
      {
        cobroId: 'cobro-jan-003',
        propertyTitle: 'Apartamento Familiar Cedritos',
        rentCollected: 3020000,
        commissionPercent: 10,
        commissionAmount: 302000,
        netAmount: 2718000,
      },
    ],
    totalCollected: 8750000,
    totalCommission: 875000,
    netToPropietario: 7875000,
    status: 'completed',
    approvedBy: 'agent-007',
    approvedAt: '2026-01-14T10:00:00Z',
    processedAt: '2026-01-15T09:00:00Z',
    transferReference: 'TRF-20260115-001',
    createdAt: '2026-01-10T08:00:00Z',
    updatedAt: '2026-01-15T09:00:00Z',
  },
  {
    id: 'disp-002',
    propietarioId: 'prop-002',
    propietarioName: 'María Elena González Vargas',
    propietarioBankAccount: {
      bank: 'davivienda',
      accountType: 'savings',
      accountNumber: '****8901',
      accountHolder: 'María Elena González Vargas',
    },
    month: '2026-01',
    items: [
      {
        cobroId: 'cobro-jan-004',
        propertyTitle: 'Apartamento Chapinero Alto',
        rentCollected: 2800000,
        commissionPercent: 10,
        commissionAmount: 280000,
        netAmount: 2520000,
      },
      {
        cobroId: 'cobro-jan-005',
        propertyTitle: 'Estudio Parque 93',
        rentCollected: 2800000,
        commissionPercent: 10,
        commissionAmount: 280000,
        netAmount: 2520000,
      },
    ],
    totalCollected: 5600000,
    totalCommission: 560000,
    netToPropietario: 5040000,
    status: 'completed',
    approvedBy: 'agent-007',
    approvedAt: '2026-01-14T11:00:00Z',
    processedAt: '2026-01-15T09:30:00Z',
    transferReference: 'TRF-20260115-002',
    createdAt: '2026-01-10T08:00:00Z',
    updatedAt: '2026-01-15T09:30:00Z',
  },

  // February 2026 - Pending dispersions
  {
    id: 'disp-003',
    propietarioId: 'prop-001',
    propietarioName: 'Carlos Andrés Ramírez Peña',
    propietarioBankAccount: {
      bank: 'bancolombia',
      accountType: 'savings',
      accountNumber: '****4532',
      accountHolder: 'Carlos Andrés Ramírez Peña',
    },
    month: '2026-02',
    items: [
      {
        cobroId: 'cobro-001',
        propertyTitle: 'Apartamento Moderno Chicó',
        rentCollected: 3450000,
        commissionPercent: 10,
        commissionAmount: 345000,
        netAmount: 3105000,
      },
      {
        cobroId: 'cobro-003',
        propertyTitle: 'Apartamento Familiar Cedritos',
        rentCollected: 3020000,
        commissionPercent: 10,
        commissionAmount: 302000,
        netAmount: 2718000,
      },
    ],
    totalCollected: 6470000,
    totalCommission: 647000,
    netToPropietario: 5823000,
    status: 'pending',
    createdAt: '2026-02-06T08:00:00Z',
    updatedAt: '2026-02-06T08:00:00Z',
  },
  {
    id: 'disp-004',
    propietarioId: 'prop-002',
    propietarioName: 'María Elena González Vargas',
    propietarioBankAccount: {
      bank: 'davivienda',
      accountType: 'savings',
      accountNumber: '****8901',
      accountHolder: 'María Elena González Vargas',
    },
    month: '2026-02',
    items: [
      {
        cobroId: 'cobro-004',
        propertyTitle: 'Apartamento Chapinero Alto',
        rentCollected: 2800000,
        commissionPercent: 10,
        commissionAmount: 280000,
        netAmount: 2520000,
      },
      {
        cobroId: 'cobro-005',
        propertyTitle: 'Estudio Parque 93',
        rentCollected: 2800000,
        commissionPercent: 10,
        commissionAmount: 280000,
        netAmount: 2520000,
      },
    ],
    totalCollected: 5600000,
    totalCommission: 560000,
    netToPropietario: 5040000,
    status: 'pending',
    createdAt: '2026-02-06T08:00:00Z',
    updatedAt: '2026-02-06T08:00:00Z',
  },
];

// ============================================================================
// Solicitudes de Mantenimiento (Maintenance Requests)
// ============================================================================

export const MOCK_MANTENIMIENTOS: SolicitudMantenimiento[] = [
  {
    id: 'mant-001',
    consignacionId: 'cons-001',
    propertyId: 'prop-1',
    propietarioId: 'prop-001',
    tenantId: 'tenant-001',
    agenteId: 'agent-001',
    propertyTitle: 'Apartamento Moderno Chicó',
    propertyAddress: 'Cra 11 #94-45, Apto 701',
    tenantName: 'Andrea Sofía Mendoza',
    propietarioName: 'Carlos Andrés Ramírez Peña',
    type: 'plumbing',
    priority: 'high',
    title: 'Fuga de agua en baño principal',
    description: 'Se detecta fuga de agua debajo del lavamanos del baño principal. El agua se acumula en el piso.',
    photoUrls: [
      'https://images.unsplash.com/photo-1585704032915-c3400ca199e7?w=400',
    ],
    status: 'quoted',
    quotes: [
      {
        id: 'quote-001',
        providerName: 'Plomería Express',
        providerPhone: '+57 300 555 1111',
        amount: 180000,
        description: 'Reparación de sifón y cambio de empaques',
        estimatedDays: 1,
        createdAt: '2026-02-04T10:00:00Z',
      },
      {
        id: 'quote-002',
        providerName: 'Servicios del Hogar',
        providerPhone: '+57 300 555 2222',
        amount: 220000,
        description: 'Diagnóstico completo y reparación',
        estimatedDays: 1,
        createdAt: '2026-02-05T09:00:00Z',
      },
    ],
    paidBy: 'owner',
    createdAt: '2026-02-03T14:00:00Z',
    updatedAt: '2026-02-05T09:00:00Z',
  },
  {
    id: 'mant-002',
    consignacionId: 'cons-008',
    propertyId: 'prop-8',
    propietarioId: 'prop-003',
    tenantId: 'tenant-007',
    agenteId: 'agent-004',
    propertyTitle: 'Casa El Poblado',
    propertyAddress: 'Cra 35 #10-100, Casa 25',
    tenantName: 'Familia Escobar Vélez',
    propietarioName: 'Inversiones Hermanos Ruiz S.A.S.',
    type: 'electrical',
    priority: 'medium',
    title: 'Interruptor de cocina no funciona',
    description: 'El interruptor de la luz de la cocina dejó de funcionar. No enciende la luz.',
    status: 'approved',
    quotes: [
      {
        id: 'quote-003',
        providerName: 'Electricidad Profesional',
        providerPhone: '+57 300 555 3333',
        amount: 95000,
        description: 'Cambio de interruptor y revisión del circuito',
        estimatedDays: 1,
        createdAt: '2026-02-02T11:00:00Z',
      },
    ],
    selectedQuoteId: 'quote-003',
    approvedAmount: 95000,
    paidBy: 'owner',
    createdAt: '2026-02-01T10:00:00Z',
    updatedAt: '2026-02-03T15:00:00Z',
  },
  {
    id: 'mant-003',
    consignacionId: 'cons-005',
    propertyId: 'prop-5',
    propietarioId: 'prop-002',
    tenantId: 'tenant-004',
    agenteId: 'agent-002',
    propertyTitle: 'Apartamento Chapinero Alto',
    propertyAddress: 'Cra 5 #59-30, Apto 402',
    tenantName: 'Camila Rodríguez Pinto',
    propietarioName: 'María Elena González Vargas',
    type: 'appliance',
    priority: 'low',
    title: 'Nevera hace ruido extraño',
    description: 'La nevera hace un ruido tipo zumbido intermitente. Funciona bien pero el ruido es molesto.',
    status: 'reported',
    quotes: [],
    paidBy: 'owner',
    createdAt: '2026-02-05T16:00:00Z',
    updatedAt: '2026-02-05T16:00:00Z',
  },
  {
    id: 'mant-004',
    consignacionId: 'cons-007',
    propertyId: 'prop-7',
    propietarioId: 'prop-003',
    tenantId: 'tenant-006',
    agenteId: 'agent-003',
    propertyTitle: 'Apartamento Usaquén Centro',
    propertyAddress: 'Cra 6 #119-52, Apto 601',
    tenantName: 'Ricardo Alberto Muñoz',
    propietarioName: 'Inversiones Hermanos Ruiz S.A.S.',
    type: 'locks',
    priority: 'high',
    title: 'Cerradura de puerta principal atorada',
    description: 'La cerradura de la puerta principal se atoró. Difícil abrir y cerrar.',
    status: 'in_progress',
    quotes: [
      {
        id: 'quote-004',
        providerName: 'Cerrajería 24H',
        providerPhone: '+57 300 555 4444',
        amount: 150000,
        description: 'Cambio de cilindro y ajuste de cerradura',
        estimatedDays: 1,
        createdAt: '2026-02-04T08:00:00Z',
      },
    ],
    selectedQuoteId: 'quote-004',
    approvedAmount: 150000,
    paidBy: 'tenant',
    createdAt: '2026-02-03T18:00:00Z',
    updatedAt: '2026-02-06T10:00:00Z',
  },
  {
    id: 'mant-005',
    consignacionId: 'cons-006',
    propertyId: 'prop-6',
    propietarioId: 'prop-002',
    tenantId: 'tenant-005',
    agenteId: 'agent-003',
    propertyTitle: 'Estudio Parque 93',
    propertyAddress: 'Calle 93A #13-50, Apto 805',
    tenantName: 'Martín Eduardo Lagos',
    propietarioName: 'María Elena González Vargas',
    type: 'painting',
    priority: 'low',
    title: 'Humedad en pared de habitación',
    description: 'Mancha de humedad en la pared cerca de la ventana. Parece ser por condensación.',
    status: 'completed',
    quotes: [
      {
        id: 'quote-005',
        providerName: 'Pinturas del Norte',
        providerPhone: '+57 300 555 5555',
        amount: 350000,
        description: 'Tratamiento antihumedad y pintura de pared completa',
        estimatedDays: 2,
        createdAt: '2026-01-20T10:00:00Z',
      },
    ],
    selectedQuoteId: 'quote-005',
    approvedAmount: 350000,
    paidBy: 'owner',
    completedAt: '2026-01-25T17:00:00Z',
    completionNotes: 'Se aplicó tratamiento antihumedad y dos manos de pintura. Garantía 6 meses.',
    createdAt: '2026-01-18T11:00:00Z',
    updatedAt: '2026-01-25T17:00:00Z',
  },
];

// ============================================================================
// Dashboard KPIs
// ============================================================================

export const MOCK_DASHBOARD_KPIS: InmobiliariaDashboardKPIs = {
  // Portfolio
  totalProperties: 50,
  propertiesAvailable: 6,
  propertiesRented: 40,
  propertiesInProcess: 4,
  occupancyRate: 80,

  // Financial (current month)
  expectedRevenue: 145000000,
  collectedRevenue: 128500000,
  pendingCollections: 12800000,
  lateCollections: 3700000,
  collectionRate: 88.6,
  totalCommissions: 12850000,

  // Pipeline
  activeLeads: 8,
  scheduledVisits: 5,
  pendingApplications: 4,
  contractsInProgress: 3,

  // Team
  totalAgents: 6,
  closedThisMonth: 8,
  avgDaysToClose: 24,

  // Owners
  totalPropietarios: 10,
  pendingDispersions: 5,
};

// ============================================================================
// Helper Functions
// ============================================================================

export function getPropietarioById(id: string): Propietario | undefined {
  return MOCK_PROPIETARIOS.find((p) => p.id === id);
}

export function getAgenteById(id: string): Agente | undefined {
  return MOCK_AGENTES.find((a) => a.id === id);
}

export function getConsignacionById(id: string): Consignacion | undefined {
  return MOCK_CONSIGNACIONES.find((c) => c.id === id);
}

export function getConsignacionesForPropietario(propietarioId: string): Consignacion[] {
  return MOCK_CONSIGNACIONES.filter((c) => c.propietarioId === propietarioId);
}

export function getConsignacionesForAgente(agenteId: string): Consignacion[] {
  return MOCK_CONSIGNACIONES.filter((c) => c.agenteId === agenteId);
}

export function getPipelineItemsForAgente(agenteId: string): PipelineItem[] {
  return MOCK_PIPELINE_ITEMS.filter((p) => p.agenteId === agenteId);
}

export function getPipelineItemsByStage(stage: PipelineItem['stage']): PipelineItem[] {
  return MOCK_PIPELINE_ITEMS.filter((p) => p.stage === stage);
}

export function getCobrosForMonth(month: string): Cobro[] {
  return MOCK_COBROS.filter((c) => c.month === month);
}

export function getCobrosForPropietario(propietarioId: string, month?: string): Cobro[] {
  return MOCK_COBROS.filter(
    (c) => c.propietarioId === propietarioId && (!month || c.month === month)
  );
}

export function getDispersionesForPropietario(propietarioId: string): Dispersion[] {
  return MOCK_DISPERSIONES.filter((d) => d.propietarioId === propietarioId);
}

export function getMantenimientosForConsignacion(consignacionId: string): SolicitudMantenimiento[] {
  return MOCK_MANTENIMIENTOS.filter((m) => m.consignacionId === consignacionId);
}

export function getMantenimientosPendientes(): SolicitudMantenimiento[] {
  return MOCK_MANTENIMIENTOS.filter(
    (m) => m.status !== 'completed' && m.status !== 'cancelled'
  );
}

export function calculateCobroSummary(month: string): CobroSummary {
  const cobros = getCobrosForMonth(month);
  const totalExpected = cobros.reduce((sum, c) => sum + c.totalWithFees, 0);
  const totalCollected = cobros.reduce((sum, c) => sum + c.paidAmount, 0);
  const totalPending = cobros.filter((c) => c.status === 'pending').reduce((sum, c) => sum + c.pendingAmount, 0);
  const totalLate = cobros.filter((c) => c.status === 'late').reduce((sum, c) => sum + c.pendingAmount, 0);

  return {
    month,
    totalExpected,
    totalCollected,
    totalPending,
    totalLate,
    collectionRate: totalExpected > 0 ? (totalCollected / totalExpected) * 100 : 0,
    cobrosPaid: cobros.filter((c) => c.status === 'paid').length,
    cobrosPending: cobros.filter((c) => c.status === 'pending').length,
    cobrosLate: cobros.filter((c) => c.status === 'late').length,
  };
}

export function calculateDispersionSummary(month: string): DispersionSummary {
  const dispersiones = MOCK_DISPERSIONES.filter((d) => d.month === month);

  return {
    month,
    totalToDisburse: dispersiones.reduce((sum, d) => sum + d.netToPropietario, 0),
    totalCommissions: dispersiones.reduce((sum, d) => sum + d.totalCommission, 0),
    dispersionsPending: dispersiones.filter((d) => d.status === 'pending').length,
    dispersionsCompleted: dispersiones.filter((d) => d.status === 'completed').length,
    dispersionsFailed: dispersiones.filter((d) => d.status === 'failed').length,
  };
}

export function generateCarteraReport(): CarteraReport {
  const lateItems = MOCK_COBROS.filter(
    (c) => c.status === 'late' || (c.status === 'pending' && c.daysLate > 0)
  );

  const items: CarteraItem[] = lateItems.map((c) => {
    const agente = getAgenteById(c.agenteId);
    const propietario = getPropietarioById(c.propietarioId);

    return {
      cobroId: c.id,
      propertyTitle: c.propertyTitle,
      propertyAddress: c.propertyAddress,
      tenantName: c.tenantName,
      tenantPhone: c.tenantPhone,
      propietarioName: propietario?.name || 'N/A',
      agenteId: c.agenteId,
      agenteName: agente?.name || 'N/A',
      month: c.month,
      totalAmount: c.totalWithFees,
      paidAmount: c.paidAmount,
      pendingAmount: c.pendingAmount,
      daysLate: c.daysLate,
      bucket:
        c.daysLate <= 30
          ? '0-30'
          : c.daysLate <= 60
          ? '31-60'
          : c.daysLate <= 90
          ? '61-90'
          : '90+',
    };
  });

  return {
    generatedAt: new Date().toISOString(),
    items,
    summary: {
      totalPending: items.reduce((sum, i) => sum + i.pendingAmount, 0),
      bucket0to30: items.filter((i) => i.bucket === '0-30').reduce((sum, i) => sum + i.pendingAmount, 0),
      bucket31to60: items.filter((i) => i.bucket === '31-60').reduce((sum, i) => sum + i.pendingAmount, 0),
      bucket61to90: items.filter((i) => i.bucket === '61-90').reduce((sum, i) => sum + i.pendingAmount, 0),
      bucket90plus: items.filter((i) => i.bucket === '90+').reduce((sum, i) => sum + i.pendingAmount, 0),
    },
  };
}

export function generateExtractoPropietario(
  propietarioId: string,
  month: string
): ExtractoPropietario | null {
  const propietario = getPropietarioById(propietarioId);
  if (!propietario) return null;

  const cobros = getCobrosForPropietario(propietarioId, month);
  const dispersion = MOCK_DISPERSIONES.find(
    (d) => d.propietarioId === propietarioId && d.month === month
  );

  return {
    propietarioId,
    propietarioName: propietario.name,
    month,
    generatedAt: new Date().toISOString(),
    properties: cobros.map((c) => {
      const consignacion = MOCK_CONSIGNACIONES.find((cons) => cons.id === c.consignacionId);
      const commissionPercent = consignacion?.commissionPercent || 10;
      const commissionAmount = Math.round(c.paidAmount * (commissionPercent / 100));

      return {
        propertyId: c.propertyId,
        propertyTitle: c.propertyTitle,
        propertyAddress: c.propertyAddress,
        tenantName: c.tenantName,
        rentAmount: c.rentAmount,
        adminAmount: c.adminAmount,
        totalCollected: c.paidAmount,
        commissionPercent,
        commissionAmount,
        netAmount: c.paidAmount - commissionAmount,
        paymentDate: c.paidDate,
        paymentStatus: c.status,
      };
    }),
    summary: {
      totalProperties: cobros.length,
      totalCollected: cobros.reduce((sum, c) => sum + c.paidAmount, 0),
      totalCommissions: dispersion?.totalCommission || 0,
      netToPropietario: dispersion?.netToPropietario || 0,
      paymentDate: dispersion?.processedAt,
      paymentReference: dispersion?.transferReference,
    },
  };
}

// Active agents only
export function getActiveAgentes(): Agente[] {
  return MOCK_AGENTES.filter((a) => a.status === 'active');
}

// Available properties (for rent)
export function getAvailableConsignaciones(): Consignacion[] {
  return MOCK_CONSIGNACIONES.filter(
    (c) => c.availability === 'available' && c.status === 'active'
  );
}

// Properties in pipeline (being processed)
export function getConsignacionesInProcess(): Consignacion[] {
  return MOCK_CONSIGNACIONES.filter(
    (c) => c.availability === 'in_process' && c.status === 'active'
  );
}

// ============================================================================
// Report Definitions (Centro de Reportes)
// ============================================================================

import type {
  ReportDefinition,
  ComisionesAgenteReport,
  ComisionAgente,
  OcupacionReport,
  OcupacionZone,
  VencimientosReport,
  VencimientoItem,
  FlujoCajaReport,
  FlujoCajaMonth,
} from '@/lib/types/inmobiliaria';

export const MOCK_REPORTS: ReportDefinition[] = [
  {
    id: 'extractos-propietarios',
    title: 'Extractos Propietarios',
    description: 'Extracto mensual detallado por propietario con cobros y comisiones',
    icon: 'FileText',
    category: 'financiero',
    format: 'pdf',
    frequency: 'monthly',
    lastGenerated: '2026-02-01',
    isFavorite: true,
  },
  {
    id: 'cartera-edades',
    title: 'Cartera por Edades',
    description: 'Analisis de mora segmentado por antiguedad (30/60/90+ dias)',
    icon: 'Clock',
    category: 'financiero',
    format: 'excel',
    frequency: 'weekly',
    lastGenerated: '2026-02-05',
    isFavorite: true,
  },
  {
    id: 'comisiones-agente',
    title: 'Comisiones por Agente',
    description: 'Desglose de comisiones generadas por cada agente',
    icon: 'Users',
    category: 'agentes',
    format: 'excel',
    frequency: 'monthly',
    lastGenerated: '2026-02-01',
  },
  {
    id: 'ocupacion-portafolio',
    title: 'Ocupacion del Portafolio',
    description: 'Porcentaje de ocupacion por zona y tipo de propiedad',
    icon: 'ChartPie',
    category: 'operativo',
    format: 'pdf',
    frequency: 'monthly',
    lastGenerated: '2026-02-01',
  },
  {
    id: 'vencimientos',
    title: 'Vencimientos de Contratos',
    description: 'Contratos proximos a vencer en los proximos 90 dias',
    icon: 'Calendar',
    category: 'operativo',
    format: 'excel',
    frequency: 'weekly',
    lastGenerated: '2026-02-03',
    isFavorite: true,
  },
  {
    id: 'rendimiento-agentes',
    title: 'Rendimiento de Agentes',
    description: 'KPIs comparativos de desempeno del equipo comercial',
    icon: 'ChartBar',
    category: 'agentes',
    format: 'pdf',
    frequency: 'monthly',
    lastGenerated: '2026-02-01',
  },
  {
    id: 'flujo-caja',
    title: 'Flujo de Caja',
    description: 'Ingresos vs dispersiones con proyeccion mensual',
    icon: 'CurrencyDollar',
    category: 'financiero',
    format: 'excel',
    frequency: 'monthly',
    lastGenerated: '2026-02-01',
  },
];

// Helper to generate mock agent commission report data
export function generateComisionesAgenteReport(
  period: string // '2026-02' or '2026-Q1'
): ComisionesAgenteReport {
  const activeAgentes = MOCK_AGENTES.filter((a) => a.status === 'active');

  const agentes: ComisionAgente[] = activeAgentes.map((agente) => {
    const assignedConsignaciones = MOCK_CONSIGNACIONES.filter(
      (c) => c.agenteId === agente.id
    );
    const topProperty = assignedConsignaciones.find(
      (c) => c.availability === 'rented'
    )?.propertyTitle;

    const previousCommission = Math.round(agente.metrics.commissionsThisMonth * 0.9);
    const trend: 'up' | 'down' | 'stable' =
      agente.metrics.commissionsThisMonth > previousCommission ? 'up' :
      agente.metrics.commissionsThisMonth < previousCommission ? 'down' : 'stable';

    return {
      agenteId: agente.id,
      agenteName: agente.name,
      agenteAvatar: agente.avatar,
      closedDeals: agente.metrics.closedThisMonth,
      totalCommission: agente.metrics.commissionsThisMonth,
      avgCommissionPerDeal:
        agente.metrics.closedThisMonth > 0
          ? Math.round(
              agente.metrics.commissionsThisMonth /
                agente.metrics.closedThisMonth
            )
          : 0,
      topPropertyTitle: topProperty,
      previousPeriodCommission: previousCommission,
      trend,
    };
  });

  const totalCommissions = agentes.reduce((sum, a) => sum + a.totalCommission, 0);
  const totalClosedDeals = agentes.reduce((sum, a) => sum + a.closedDeals, 0);
  const topAgent = agentes.reduce((top, a) =>
    a.totalCommission > (top?.totalCommission || 0) ? a : top, agentes[0]
  );

  return {
    generatedAt: new Date().toISOString(),
    period,
    totalCommissions,
    avgCommissionPerAgent: agentes.length > 0 ? Math.round(totalCommissions / agentes.length) : 0,
    totalClosedDeals,
    topAgentName: topAgent?.agenteName || 'N/A',
    agentes,
  };
}

// Helper to generate occupancy report data
export function generateOcupacionReport(): OcupacionReport {
  // Group consignaciones by zone
  const zoneMap = new Map<
    string,
    { total: number; occupied: number; available: number; inProcess: number }
  >();

  MOCK_CONSIGNACIONES.filter((c) => c.status === 'active').forEach((c) => {
    const zone = c.propertyZone;
    const existing = zoneMap.get(zone) || {
      total: 0,
      occupied: 0,
      available: 0,
      inProcess: 0,
    };

    existing.total++;
    if (c.availability === 'rented') existing.occupied++;
    else if (c.availability === 'available') existing.available++;
    else if (c.availability === 'in_process') existing.inProcess++;

    zoneMap.set(zone, existing);
  });

  const zones: OcupacionZone[] = Array.from(zoneMap.entries()).map(([zone, data]) => ({
    zone,
    totalProperties: data.total,
    occupied: data.occupied,
    available: data.available,
    inProcess: data.inProcess,
    occupancyRate:
      data.total > 0 ? Math.round((data.occupied / data.total) * 100) : 0,
  }));

  const totalProperties = zones.reduce((sum, z) => sum + z.totalProperties, 0);
  const totalOccupied = zones.reduce((sum, z) => sum + z.occupied, 0);
  const totalInProcess = zones.reduce((sum, z) => sum + z.inProcess, 0);
  const totalAvailable = zones.reduce((sum, z) => sum + z.available, 0);
  const overallOccupancyRate =
    totalProperties > 0
      ? Math.round((totalOccupied / totalProperties) * 100)
      : 0;

  return {
    generatedAt: new Date().toISOString(),
    totalProperties,
    totalOccupied,
    totalInProcess,
    totalAvailable,
    overallOccupancyRate,
    previousMonthOccupancyRate: overallOccupancyRate - 2, // Mock previous month
    zones,
  };
}

// Helper to generate lease expiration report data
export function generateVencimientosReport(): VencimientosReport {
  const today = new Date();

  const getBucket = (days: number): '0-30' | '31-60' | '61-90' | '90+' => {
    if (days <= 30) return '0-30';
    if (days <= 60) return '31-60';
    if (days <= 90) return '61-90';
    return '90+';
  };

  const items: VencimientoItem[] = MOCK_CONSIGNACIONES.filter(
    (c) => c.availability === 'rented' && c.leaseEndDate
  )
    .map((c) => {
      const leaseEnd = new Date(c.leaseEndDate!);
      const daysUntilExpiry = Math.ceil(
        (leaseEnd.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
      );
      const propietario = MOCK_PROPIETARIOS.find(
        (p) => p.id === c.propietarioId
      );

      return {
        consignacionId: c.id,
        propertyId: c.propertyId,
        propertyTitle: c.propertyTitle,
        propertyAddress: c.propertyAddress,
        tenantName: c.currentTenantName || 'N/A',
        tenantPhone: '+57 300 123 4567', // Mock phone
        propietarioName: propietario?.name || 'N/A',
        contractEndDate: c.leaseEndDate!,
        daysUntilExpiry,
        renewalStatus: 'pending' as const,
        bucket: getBucket(daysUntilExpiry),
      };
    })
    .filter((item) => item.daysUntilExpiry > 0 && item.daysUntilExpiry <= 120)
    .sort((a, b) => a.daysUntilExpiry - b.daysUntilExpiry);

  return {
    generatedAt: new Date().toISOString(),
    items,
    summary: {
      totalVencimientos: items.length,
      bucket0to30: items.filter((i) => i.bucket === '0-30').length,
      bucket31to60: items.filter((i) => i.bucket === '31-60').length,
      bucket61to90: items.filter((i) => i.bucket === '61-90').length,
      bucket90plus: items.filter((i) => i.bucket === '90+').length,
    },
  };
}

// Helper to generate cash flow report data
export function generateFlujoCajaReport(
  periodType: 'quarter' | 'semester' | 'year' = 'semester'
): FlujoCajaReport {
  // Generate months based on period
  const monthCount = periodType === 'quarter' ? 3 : periodType === 'semester' ? 6 : 12;
  const now = new Date();
  const baseIngresos = 85000000; // ~85M COP base

  const months: FlujoCajaMonth[] = [];
  for (let i = monthCount - 1; i >= 0; i--) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

    // Add some variance to make it realistic
    const variance = 1 + (Math.sin(i * 0.8) * 0.15);
    const ingresos = Math.round(baseIngresos * variance);
    const avgCommission = 0.095; // ~9.5% average commission
    const comisiones = Math.round(ingresos * avgCommission);
    const dispersiones = ingresos - comisiones;

    months.push({
      month: monthStr,
      ingresos,
      dispersiones,
      comisiones,
      balance: comisiones, // Net balance is the commission retained
    });
  }

  return {
    generatedAt: new Date().toISOString(),
    period: periodType,
    months,
    totals: {
      totalIngresos: months.reduce((sum, m) => sum + m.ingresos, 0),
      totalDispersiones: months.reduce((sum, m) => sum + m.dispersiones, 0),
      totalComisiones: months.reduce((sum, m) => sum + m.comisiones, 0),
      netBalance: months.reduce((sum, m) => sum + m.balance, 0),
    },
  };
}

// Get all available zones from consignaciones
export function getAvailableZones(): string[] {
  const zones = new Set<string>();
  MOCK_CONSIGNACIONES.forEach((c) => {
    if (c.propertyZone) zones.add(c.propertyZone);
  });
  return Array.from(zones).sort();
}

// ============================================================================
// IPC Historical Data (DANE Colombia)
// ============================================================================

export interface IPCRecord {
  year: number;
  month: number; // 1-12
  rate: number; // Annual IPC rate as of that month
  description: string;
}

// Historical IPC rates from DANE Colombia (mock data based on real patterns)
export const IPC_HISTORICAL: IPCRecord[] = [
  { year: 2024, month: 12, rate: 5.20, description: 'Diciembre 2024' },
  { year: 2024, month: 11, rate: 5.41, description: 'Noviembre 2024' },
  { year: 2024, month: 10, rate: 5.60, description: 'Octubre 2024' },
  { year: 2024, month: 9, rate: 5.80, description: 'Septiembre 2024' },
  { year: 2024, month: 8, rate: 6.12, description: 'Agosto 2024' },
  { year: 2024, month: 7, rate: 6.86, description: 'Julio 2024' },
  { year: 2024, month: 6, rate: 7.18, description: 'Junio 2024' },
  { year: 2024, month: 5, rate: 7.26, description: 'Mayo 2024' },
  { year: 2024, month: 4, rate: 7.16, description: 'Abril 2024' },
  { year: 2024, month: 3, rate: 7.36, description: 'Marzo 2024' },
  { year: 2024, month: 2, rate: 7.74, description: 'Febrero 2024' },
  { year: 2024, month: 1, rate: 8.35, description: 'Enero 2024' },
  { year: 2023, month: 12, rate: 9.28, description: 'Diciembre 2023' },
  { year: 2023, month: 11, rate: 10.15, description: 'Noviembre 2023' },
  { year: 2023, month: 10, rate: 10.48, description: 'Octubre 2023' },
  { year: 2023, month: 9, rate: 10.99, description: 'Septiembre 2023' },
  { year: 2023, month: 8, rate: 11.43, description: 'Agosto 2023' },
  { year: 2023, month: 7, rate: 11.78, description: 'Julio 2023' },
  { year: 2023, month: 6, rate: 12.13, description: 'Junio 2023' },
  { year: 2023, month: 5, rate: 12.36, description: 'Mayo 2023' },
  { year: 2023, month: 4, rate: 12.82, description: 'Abril 2023' },
  { year: 2023, month: 3, rate: 13.12, description: 'Marzo 2023' },
  { year: 2023, month: 2, rate: 13.28, description: 'Febrero 2023' },
  { year: 2023, month: 1, rate: 13.25, description: 'Enero 2023' },
];

export function getCurrentIPC(): IPCRecord {
  return IPC_HISTORICAL[0];
}

export function getIPCForDate(year: number, month: number): IPCRecord | undefined {
  return IPC_HISTORICAL.find((r) => r.year === year && r.month === month);
}

export function calculateNewRent(currentRent: number, ipcRate: number): number {
  return Math.round(currentRent * (1 + ipcRate / 100));
}
