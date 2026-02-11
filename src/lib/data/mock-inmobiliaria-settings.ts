/** Agency settings: Integrations, Billing, Users */
import type {
  AgencyIntegration,
  AgencyBilling,
  BillingInvoice,
  AgencyUser,
} from '@/lib/types/inmobiliaria';

// ============================================================================
// Integrations (Third-party services)
// ============================================================================

export const MOCK_INTEGRATIONS: AgencyIntegration[] = [
  {
    id: 'int-pse',
    name: 'PSE',
    description: 'Pagos en linea via debito bancario',
    category: 'payments',
    icon: 'Bank',
    status: 'active',
    isEnabled: true,
    lastSyncAt: new Date().toISOString(),
  },
  {
    id: 'int-wompi',
    name: 'Wompi',
    description: 'Pagos con tarjeta de credito y debito',
    category: 'payments',
    icon: 'CreditCard',
    status: 'active',
    isEnabled: true,
    apiKeyConfigured: true,
    lastSyncAt: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'int-nequi',
    name: 'Nequi',
    description: 'Pagos via billetera digital Nequi',
    category: 'payments',
    icon: 'Wallet',
    status: 'inactive',
    isEnabled: false,
  },
  {
    id: 'int-siigo',
    name: 'Siigo',
    description: 'Integracion contable con Siigo',
    category: 'accounting',
    icon: 'Calculator',
    status: 'pending',
    isEnabled: true,
    apiKeyConfigured: false,
  },
  {
    id: 'int-alegra',
    name: 'Alegra',
    description: 'Facturacion electronica con Alegra',
    category: 'accounting',
    icon: 'Receipt',
    status: 'inactive',
    isEnabled: false,
  },
  {
    id: 'int-whatsapp',
    name: 'WhatsApp Business',
    description: 'Notificaciones via WhatsApp',
    category: 'communications',
    icon: 'WhatsappLogo',
    status: 'active',
    isEnabled: true,
    lastSyncAt: new Date().toISOString(),
  },
  {
    id: 'int-email',
    name: 'SendGrid',
    description: 'Envio de emails transaccionales',
    category: 'communications',
    icon: 'EnvelopeSimple',
    status: 'error',
    isEnabled: true,
    errorMessage: 'API key expirada',
  },
  {
    id: 'int-s3',
    name: 'AWS S3',
    description: 'Almacenamiento de documentos',
    category: 'storage',
    icon: 'Cloud',
    status: 'active',
    isEnabled: true,
    lastSyncAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
  },
];

// ============================================================================
// Billing (Subscription & Invoices)
// ============================================================================

export const MOCK_BILLING: AgencyBilling = {
  plan: 'professional',
  cycle: 'monthly',
  pricePerMonth: 299000,
  nextBillingDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
  paymentMethod: {
    type: 'card',
    last4: '4242',
    brand: 'Visa',
  },
  usage: {
    properties: 45,
    users: 5,
    agents: 3,
  },
  limits: {
    maxProperties: 100,
    maxUsers: 10,
    maxAgents: 5,
    includesReports: true,
    includesAnalytics: true,
    includesIntegrations: true,
    includesApi: false,
    supportLevel: 'priority',
  },
};

export const MOCK_INVOICES: BillingInvoice[] = [
  {
    id: 'inv-001',
    date: '2026-02-01',
    amount: 299000,
    status: 'paid',
    pdfUrl: '#',
  },
  {
    id: 'inv-002',
    date: '2026-01-01',
    amount: 299000,
    status: 'paid',
    pdfUrl: '#',
  },
  {
    id: 'inv-003',
    date: '2025-12-01',
    amount: 299000,
    status: 'paid',
    pdfUrl: '#',
  },
  {
    id: 'inv-004',
    date: '2025-11-01',
    amount: 199000,
    status: 'paid',
    pdfUrl: '#',
  },
];

// ============================================================================
// Agency Users
// ============================================================================

export const MOCK_AGENCY_USERS: AgencyUser[] = [
  {
    id: 'user-001',
    email: 'admin@arriendospremium.co',
    name: 'Juan Carlos Restrepo',
    role: 'admin',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=juan',
    phone: '+57 310 555 1234',
    status: 'active',
    lastLoginAt: new Date().toISOString(),
    createdAt: '2024-01-15T10:00:00Z',
  },
  {
    id: 'user-002',
    email: 'carolina.mendoza@arriendospremium.co',
    name: 'Carolina Mendoza Rios',
    role: 'agente',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=carolina',
    phone: '+57 320 111 2222',
    status: 'active',
    lastLoginAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
    createdAt: '2024-02-01T10:00:00Z',
  },
  {
    id: 'user-003',
    email: 'andres.vargas@arriendospremium.co',
    name: 'Andres Felipe Vargas Lopez',
    role: 'agente',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=andres',
    phone: '+57 321 222 3333',
    status: 'active',
    lastLoginAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(), // 1 day ago
    createdAt: '2024-02-15T10:00:00Z',
  },
  {
    id: 'user-004',
    email: 'valentina.torres@arriendospremium.co',
    name: 'Valentina Torres Guzman',
    role: 'agente',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=valentina',
    phone: '+57 322 333 4444',
    status: 'active',
    lastLoginAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(), // 30 min ago
    createdAt: '2024-03-01T10:00:00Z',
  },
  {
    id: 'user-005',
    email: 'contabilidad@arriendospremium.co',
    name: 'Carlos Alberto Gomez',
    role: 'contador',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=carlos',
    phone: '+57 312 555 3456',
    status: 'active',
    lastLoginAt: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(), // 4 hours ago
    createdAt: '2024-03-15T10:00:00Z',
  },
  {
    id: 'user-006',
    email: 'diego.ruiz@arriendospremium.co',
    name: 'Diego Alejandro Ruiz Pineda',
    role: 'agente',
    phone: '+57 323 444 5555',
    status: 'active',
    lastLoginAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 days ago
    createdAt: '2024-04-01T10:00:00Z',
  },
  {
    id: 'user-007',
    email: 'nuevo.agente@arriendospremium.co',
    name: 'Nuevo Agente',
    role: 'agente',
    status: 'invited',
    invitedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 days ago
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'user-008',
    email: 'asistente@arriendospremium.co',
    name: 'Paula Andrea Martinez',
    role: 'viewer',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=paula',
    phone: '+57 314 666 7777',
    status: 'active',
    lastLoginAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(), // 5 days ago
    createdAt: '2024-05-01T10:00:00Z',
  },
  {
    id: 'user-009',
    email: 'antiguo.usuario@arriendospremium.co',
    name: 'Usuario Inactivo',
    role: 'agente',
    status: 'inactive',
    createdAt: '2023-06-01T10:00:00Z',
  },
  {
    id: 'user-010',
    email: 'natalia.gomez@arriendospremium.co',
    name: 'Natalia Andrea Gomez Herrera',
    role: 'agente',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=natalia',
    phone: '+57 324 555 6666',
    status: 'active',
    lastLoginAt: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(), // 6 hours ago
    createdAt: '2024-06-01T10:00:00Z',
  },
];
