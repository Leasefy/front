/**
 * Subscription plans and pricing constants
 * Extracted from mock-subscriptions.ts - these are static product configuration, not mock data.
 *
 * Modelo hibrido:
 * - Propietarios DIY: Suscripcion mensual
 * - Propietarios Hands-off: % del arriendo (administracion)
 * - Inmobiliarias: Suscripcion + API
 */

import type {
  Plan,
  PlanFeature,
  PlanId,
  PlanComparisonRow,
  AgencyPlan,
  AgencyPlanId,
} from '@/lib/types/subscription';

// ============================================================================
// Feature definitions shared across plans
// ============================================================================

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

// ============================================================================
// DIY owner plans (Prices in COP)
// ============================================================================

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
      yearly: 1439000,
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
      yearly: 2879000,
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

// ============================================================================
// Agency plans (Prices in COP)
// ============================================================================

/** Base evaluation price in COP (~$10 USD) */
export const BASE_EVALUATION_PRICE_COP = 42000;

export const AGENCY_PLANS: AgencyPlan[] = [
  {
    id: 'starter',
    name: 'Starter',
    description: 'Probar la plataforma',
    pricingModel: 'free',
    price: { monthly: 0, yearly: 0 },
    evaluation: {
      price: BASE_EVALUATION_PRICE_COP, // $42,000 COP (~$10 USD)
      discount: 0,
      limit: null, // pay-per-use, no monthly cap
    },
    limits: { properties: 10, users: 2 },
    features: [
      'Scoring básico de arrendatarios',
      'Dashboard limitado',
      'Evaluaciones AI a $42,000 COP c/u',
      'Soporte por email',
    ],
  },
  {
    id: 'pro',
    name: 'Pro',
    description: 'Scoring + Matching + Reportes para tu inmobiliaria',
    pricingModel: 'flat',
    price: { monthly: 149000, yearly: 1439000 },
    evaluation: {
      price: 21000, // 50% discount → $21,000 COP (~$5 USD)
      discount: 50,
      limit: 30, // 30 evaluaciones/mes
    },
    limits: { properties: 100, users: 10 },
    features: [
      'Todo en Starter',
      'Scoring + Matching + Reportes',
      'Dashboard completo',
      'Evaluaciones AI con 50% descuento ($21,000 COP c/u)',
      'Hasta 30 evaluaciones/mes',
      'Hasta 100 propiedades',
      'Hasta 10 usuarios',
      'Soporte prioritario',
    ],
    highlighted: true,
    badge: 'Más popular',
  },
  {
    id: 'flex',
    name: 'Flex',
    description: '1% del canon administrado — todos los agentes AI incluidos',
    pricingModel: 'percentage',
    price: { monthly: null, yearly: null },
    canonPercentage: 1,
    evaluation: {
      price: 0, // Included — unlimited and free
      discount: 100,
      limit: null, // unlimited
    },
    limits: { properties: null, users: null },
    features: [
      'Todo en Pro',
      'TODOS los 19 agentes AI',
      'Evaluaciones AI ilimitadas y gratis',
      'Propiedades ilimitadas',
      'Usuarios ilimitados',
      'Sin límites de evaluaciones',
      'Soporte prioritario dedicado',
    ],
    badge: 'Todo incluido',
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    description: '500+ unidades o necesidades especiales',
    pricingModel: 'custom',
    price: { monthly: null, yearly: null },
    evaluation: {
      price: 0, // Custom — included
      discount: 100,
      limit: null,
    },
    limits: { properties: null, users: null },
    features: [
      'Todo en Flex',
      'Propiedades ilimitadas',
      'Usuarios ilimitados',
      'White-label completo',
      'SLA garantizado 99.9%',
      'Onboarding personalizado',
      'Integraciones a medida',
    ],
  },
];

/**
 * Get an agency plan by its ID.
 */
export function getAgencyPlanById(id: AgencyPlanId): AgencyPlan {
  return AGENCY_PLANS.find((p) => p.id === id) || AGENCY_PLANS[0];
}

/**
 * Calculate the evaluation price for a given agency plan.
 * Returns the per-evaluation cost in COP.
 */
export function getEvaluationPrice(planId: AgencyPlanId): number {
  const plan = getAgencyPlanById(planId);
  return plan.evaluation.price;
}

/**
 * Calculate estimated monthly cost for a Flex plan.
 * @param totalMonthlyCanon - Total monthly canon administered in COP
 * @returns Monthly fee in COP
 */
export function calculateFlexMonthlyFee(totalMonthlyCanon: number): number {
  const flexPlan = getAgencyPlanById('flex');
  return Math.round(totalMonthlyCanon * (flexPlan.canonPercentage ?? 1) / 100);
}

// ============================================================================
// Management tiers (fee % of monthly rent)
// ============================================================================

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

// ============================================================================
// Add-on services
// ============================================================================

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

// ============================================================================
// Plan comparison table
// ============================================================================

export const PLAN_COMPARISON: PlanComparisonRow[] = [
  { feature: 'Propiedades', description: 'Numero de propiedades que puedes publicar', free: '1', pro: '10', business: '25' },
  { feature: 'Contratos digitales', description: 'Genera contratos listos para firmar', free: '1/mes', pro: 'Ilimitados', business: 'Ilimitados' },
  { feature: 'Analisis AI', description: 'Puntuacion y analisis inteligente de candidatos', free: false, pro: true, business: true },
  { feature: 'Verificacion de documentos', description: 'Validacion automatica de identidad', free: false, pro: true, business: true },
  { feature: 'Verificacion de antecedentes', description: 'Consulta en bases de datos oficiales', free: false, pro: true, business: true },
  { feature: 'Soporte prioritario', description: 'Respuesta en menos de 24 horas', free: false, pro: true, business: true },
  { feature: 'Analiticas avanzadas', description: 'Reportes de conversion y candidatos', free: false, pro: true, business: true },
  { feature: 'Multi-propiedad', description: 'Panel unificado para todas tus propiedades', free: false, pro: false, business: true },
];

// ============================================================================
// Utility functions
// ============================================================================

export function getPlanById(id: PlanId): Plan {
  return PLANS.find((p) => p.id === id) || PLANS[0];
}

export function getPlanFeature(planId: PlanId, featureId: string): PlanFeature | undefined {
  const plan = getPlanById(planId);
  return plan.features.find((f) => f.id === featureId);
}

export function canPlanAccessFeature(planId: PlanId, featureId: string): boolean {
  const feature = getPlanFeature(planId, featureId);
  return feature?.included ?? false;
}

export function getYearlySavings(plan: Plan): number {
  if (plan.price.monthly === 0) return 0;
  const monthlyTotal = plan.price.monthly * 12;
  const savings = ((monthlyTotal - plan.price.yearly) / monthlyTotal) * 100;
  return Math.round(savings);
}

export function daysUntil(dateString: string): number {
  const target = new Date(dateString);
  const now = new Date();
  const diffMs = target.getTime() - now.getTime();
  return Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
}
