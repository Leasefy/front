/**
 * Mock subscription data for pricing and plans
 * @module lib/data/mock-subscriptions
 *
 * Modelo híbrido:
 * - Propietarios DIY: Suscripción mensual
 * - Propietarios Hands-off: % del arriendo (administración)
 * - Inmobiliarias: Suscripción + API
 */

import type {
  Plan,
  PlanFeature,
  PlanId,
  Subscription,
  PlanComparisonRow,
  AgencyPlan,
} from '@/lib/types/subscription';

/**
 * Feature definitions shared across plans
 */
export const PLAN_FEATURES: Record<string, Omit<PlanFeature, 'included'>> = {
  property_listing: {
    id: 'property_listing',
    name: 'Publicar propiedades',
    description: 'Publicar propiedades en el marketplace',
  },
  basic_search: {
    id: 'basic_search',
    name: 'Busqueda basica',
    description: 'Filtros basicos de busqueda',
  },
  ai_scoring: {
    id: 'ai_scoring',
    name: 'Analisis AI de candidatos',
    description: 'Puntuacion inteligente con explicaciones detalladas',
  },
  unlimited_contracts: {
    id: 'unlimited_contracts',
    name: 'Contratos digitales',
    description: 'Genera contratos digitales listos para firmar',
  },
  priority_support: {
    id: 'priority_support',
    name: 'Soporte prioritario',
    description: 'Respuesta garantizada en menos de 24 horas',
  },
  api_access: {
    id: 'api_access',
    name: 'Acceso API',
    description: 'Integra con tus sistemas existentes',
  },
  multi_property: {
    id: 'multi_property',
    name: 'Multi-propiedad',
    description: 'Gestiona multiples propiedades desde un panel',
  },
  advanced_analytics: {
    id: 'advanced_analytics',
    name: 'Analiticas avanzadas',
    description: 'Reportes detallados de candidatos y conversion',
  },
  document_verification: {
    id: 'document_verification',
    name: 'Verificacion de documentos',
    description: 'Validacion automatica de documentos de identidad',
  },
  background_check: {
    id: 'background_check',
    name: 'Verificacion de antecedentes',
    description: 'Consulta en bases de datos oficiales',
  },
  rent_collection: {
    id: 'rent_collection',
    name: 'Cobro de arriendos',
    description: 'Recibimos el pago y te transferimos',
  },
  tenant_communication: {
    id: 'tenant_communication',
    name: 'Comunicacion con inquilino',
    description: 'Gestionamos toda la comunicacion',
  },
  monthly_reports: {
    id: 'monthly_reports',
    name: 'Reportes mensuales',
    description: 'Estado de tu propiedad cada mes',
  },
  maintenance_coord: {
    id: 'maintenance_coord',
    name: 'Coordinacion de mantenimiento',
    description: 'Gestionamos reparaciones y mantenimiento',
  },
  insurance_included: {
    id: 'insurance_included',
    name: 'Poliza de arriendo',
    description: 'Proteccion contra impago incluida',
  },
};

/**
 * Available subscription plans for DIY owners
 * Prices in COP (Colombian Peso)
 */
export const PLANS: Plan[] = [
  {
    id: 'free',
    name: 'Gratis',
    description: 'Perfecto para empezar',
    price: {
      monthly: 0,
      yearly: 0,
    },
    features: [
      { ...PLAN_FEATURES.property_listing, included: true, limit: 1 },
      { ...PLAN_FEATURES.basic_search, included: true },
      { ...PLAN_FEATURES.unlimited_contracts, included: true, limit: 1 },
      { ...PLAN_FEATURES.ai_scoring, included: false },
      { ...PLAN_FEATURES.document_verification, included: false },
      { ...PLAN_FEATURES.priority_support, included: false },
    ],
  },
  {
    id: 'pro',
    name: 'Propietario',
    description: 'Tu administras, nosotros te damos las herramientas',
    price: {
      monthly: 149900,
      yearly: 1439000, // ~20% discount
    },
    features: [
      { ...PLAN_FEATURES.property_listing, included: true, limit: 10 },
      { ...PLAN_FEATURES.basic_search, included: true },
      { ...PLAN_FEATURES.unlimited_contracts, included: true, limit: 'unlimited' },
      { ...PLAN_FEATURES.ai_scoring, included: true },
      { ...PLAN_FEATURES.document_verification, included: true },
      { ...PLAN_FEATURES.background_check, included: true },
      { ...PLAN_FEATURES.priority_support, included: true },
      { ...PLAN_FEATURES.advanced_analytics, included: true },
      { ...PLAN_FEATURES.api_access, included: false },
    ],
    highlighted: true,
    badge: 'Mas popular',
  },
  {
    id: 'business',
    name: 'Inversionista',
    description: 'Para propietarios con múltiples inmuebles',
    price: {
      monthly: 299900,
      yearly: 2879000, // ~20% discount
    },
    features: [
      { ...PLAN_FEATURES.property_listing, included: true, limit: 25 },
      { ...PLAN_FEATURES.basic_search, included: true },
      { ...PLAN_FEATURES.unlimited_contracts, included: true, limit: 'unlimited' },
      { ...PLAN_FEATURES.ai_scoring, included: true },
      { ...PLAN_FEATURES.document_verification, included: true },
      { ...PLAN_FEATURES.background_check, included: true },
      { ...PLAN_FEATURES.priority_support, included: true },
      { ...PLAN_FEATURES.advanced_analytics, included: true },
      { ...PLAN_FEATURES.multi_property, included: true, limit: 25 },
    ],
  },
];

/**
 * Available subscription plans for real estate agencies
 * Prices in COP (Colombian Peso)
 */
export const AGENCY_PLANS: AgencyPlan[] = [
  {
    id: 'starter',
    name: 'Starter',
    description: 'Para inmobiliarias pequeñas',
    price: { monthly: 149000 },
    limits: { properties: 20, users: 3 },
    features: [
      'CRM de candidatos',
      'Publicación en portales',
      'Contratos digitales',
      'Scoring de arrendatarios',
      'Soporte por email',
    ],
  },
  {
    id: 'growth',
    name: 'Growth',
    description: 'Para inmobiliarias en crecimiento',
    price: { monthly: 399000 },
    limits: { properties: 100, users: 10 },
    features: [
      'Todo en Starter',
      'API REST básica',
      'Reportes avanzados',
      'Recordatorios automáticos',
      'Soporte prioritario',
    ],
    highlighted: true,
    badge: 'Popular',
  },
  {
    id: 'agency-business',
    name: 'Business',
    description: 'Para operaciones grandes',
    price: { monthly: 899000 },
    limits: { properties: 300, users: 25 },
    features: [
      'Todo en Growth',
      'API REST completa',
      'Webhooks en tiempo real',
      'Multi-sucursal',
      'Gerente de cuenta dedicado',
    ],
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    description: '500+ propiedades',
    price: { monthly: null },
    limits: { properties: null, users: null },
    features: [
      'Todo en Business',
      'Propiedades ilimitadas',
      'Usuarios ilimitados',
      'White-label completo',
      'SLA garantizado 99.9%',
      'Onboarding personalizado',
    ],
  },
];

/**
 * Property management service tiers
 * Fee is percentage of monthly rent
 */
export interface ManagementTier {
  id: string;
  name: string;
  description: string;
  feePercentage: number;
  features: string[];
  highlighted?: boolean;
  badge?: string;
}

export const MANAGEMENT_TIERS: ManagementTier[] = [
  {
    id: 'basic',
    name: 'Administracion Basica',
    description: 'Cobro y pago de arriendos',
    feePercentage: 5,
    features: [
      'Cobro de arriendos (PSE, tarjeta, efectivo)',
      'Transferencia mensual a tu cuenta',
      'Comunicacion basica con inquilino',
      'Reporte mensual de pagos',
      'Soporte por WhatsApp',
    ],
  },
  {
    id: 'complete',
    name: 'Administracion Completa',
    description: 'Nos encargamos de todo',
    feePercentage: 6,
    features: [
      'Todo lo del plan Basico',
      'Busqueda y seleccion de inquilinos (AI)',
      'Verificacion de antecedentes incluida',
      'Contratos digitales incluidos',
      'Coordinacion de mantenimiento',
      'Visitas de inspeccion semestral',
      'Gestion de servicios publicos',
      'Soporte prioritario 24/7',
    ],
    highlighted: true,
    badge: 'Recomendado',
  },
];

/**
 * Add-on services
 */
export interface AddOn {
  id: string;
  name: string;
  description: string;
  price: number;
  priceType: 'one-time' | 'monthly' | 'percentage';
  icon: string;
}

export const ADD_ONS: AddOn[] = [
  {
    id: 'insurance',
    name: 'Poliza de Arriendo',
    description: 'Proteccion contra impago (12-24 meses) + daños a propiedad + servicios',
    price: 2,
    priceType: 'percentage',
    icon: 'shield',
  },
  {
    id: 'photos',
    name: 'Fotos Profesionales',
    description: 'Sesion fotografica profesional de tu propiedad',
    price: 150000,
    priceType: 'one-time',
    icon: 'camera',
  },
  {
    id: 'featured',
    name: 'Publicacion Destacada',
    description: 'Tu propiedad aparece primero en busquedas',
    price: 50000,
    priceType: 'monthly',
    icon: 'star',
  },
  {
    id: 'maintenance',
    name: 'Mantenimiento Coordinado',
    description: 'Gestionamos reparaciones con proveedores verificados',
    price: 10,
    priceType: 'percentage',
    icon: 'wrench',
  },
];

/**
 * Get plan by ID
 */
export function getPlanById(id: PlanId): Plan {
  return PLANS.find((p) => p.id === id) || PLANS[0];
}

/**
 * Get feature access for a plan
 */
export function getPlanFeature(planId: PlanId, featureId: string): PlanFeature | undefined {
  const plan = getPlanById(planId);
  return plan.features.find((f) => f.id === featureId);
}

/**
 * Check if plan can access a feature
 */
export function canPlanAccessFeature(planId: PlanId, featureId: string): boolean {
  const feature = getPlanFeature(planId, featureId);
  return feature?.included ?? false;
}

/**
 * Get yearly savings percentage
 */
export function getYearlySavings(plan: Plan): number {
  if (plan.price.monthly === 0) return 0;
  const monthlyTotal = plan.price.monthly * 12;
  const savings = ((monthlyTotal - plan.price.yearly) / monthlyTotal) * 100;
  return Math.round(savings);
}

/**
 * Plan comparison data for feature table
 */
export const PLAN_COMPARISON: PlanComparisonRow[] = [
  {
    feature: 'Propiedades',
    description: 'Numero de propiedades que puedes publicar',
    free: '1',
    pro: '10',
    business: '25',
  },
  {
    feature: 'Contratos digitales',
    description: 'Genera contratos listos para firmar',
    free: '1/mes',
    pro: 'Ilimitados',
    business: 'Ilimitados',
  },
  {
    feature: 'Analisis AI',
    description: 'Puntuacion y analisis inteligente de candidatos',
    free: false,
    pro: true,
    business: true,
  },
  {
    feature: 'Verificacion de documentos',
    description: 'Validacion automatica de identidad',
    free: false,
    pro: true,
    business: true,
  },
  {
    feature: 'Verificacion de antecedentes',
    description: 'Consulta en bases de datos oficiales',
    free: false,
    pro: true,
    business: true,
  },
  {
    feature: 'Soporte prioritario',
    description: 'Respuesta en menos de 24 horas',
    free: false,
    pro: true,
    business: true,
  },
  {
    feature: 'Analiticas avanzadas',
    description: 'Reportes de conversion y candidatos',
    free: false,
    pro: true,
    business: true,
  },
  {
    feature: 'Multi-propiedad',
    description: 'Panel unificado para todas tus propiedades',
    free: false,
    pro: false,
    business: true,
  },
];

/**
 * Mock user subscription (pro tier for demo purposes)
 */
export const MOCK_SUBSCRIPTION: Subscription = {
  id: 'sub-001',
  userId: 'user-001',
  planId: 'pro',
  status: 'active',
  billingCycle: 'monthly',
  currentPeriodStart: '2026-01-01T00:00:00Z',
  currentPeriodEnd: '2026-02-01T00:00:00Z',
  cancelAtPeriodEnd: false,
};

/**
 * Mock pro subscription for testing upgrade flows
 */
export const MOCK_PRO_SUBSCRIPTION: Subscription = {
  id: 'sub-002',
  userId: 'user-002',
  planId: 'pro',
  status: 'active',
  billingCycle: 'yearly',
  currentPeriodStart: '2026-01-01T00:00:00Z',
  currentPeriodEnd: '2027-01-01T00:00:00Z',
  cancelAtPeriodEnd: false,
};

/**
 * Mock trialing subscription for testing trial flows
 */
export const MOCK_TRIAL_SUBSCRIPTION: Subscription = {
  id: 'sub-003',
  userId: 'user-003',
  planId: 'pro',
  status: 'trialing',
  billingCycle: 'monthly',
  currentPeriodStart: '2026-01-15T00:00:00Z',
  currentPeriodEnd: '2026-02-15T00:00:00Z',
  cancelAtPeriodEnd: false,
  trialEndsAt: '2026-01-29T00:00:00Z',
};

/**
 * Calculate days until a date
 */
export function daysUntil(dateString: string): number {
  const target = new Date(dateString);
  const now = new Date();
  const diffMs = target.getTime() - now.getTime();
  return Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
}
