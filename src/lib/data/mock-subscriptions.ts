/**
 * Mock subscription data for pricing and plans
 * @module lib/data/mock-subscriptions
 */

import type {
  Plan,
  PlanFeature,
  PlanId,
  Subscription,
  PlanComparisonRow,
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
};

/**
 * Available subscription plans
 * Prices in COP (Colombian Peso)
 */
export const PLANS: Plan[] = [
  {
    id: 'free',
    name: 'Gratis',
    description: 'Perfecto para empezar a arrendar',
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
    name: 'Pro',
    description: 'Para propietarios serios',
    price: {
      monthly: 49900,
      yearly: 479000, // ~20% discount
    },
    features: [
      { ...PLAN_FEATURES.property_listing, included: true, limit: 5 },
      { ...PLAN_FEATURES.basic_search, included: true },
      { ...PLAN_FEATURES.unlimited_contracts, included: true, limit: 'unlimited' },
      { ...PLAN_FEATURES.ai_scoring, included: true },
      { ...PLAN_FEATURES.document_verification, included: true },
      { ...PLAN_FEATURES.background_check, included: true },
      { ...PLAN_FEATURES.priority_support, included: true },
      { ...PLAN_FEATURES.advanced_analytics, included: false },
      { ...PLAN_FEATURES.api_access, included: false },
    ],
    highlighted: true,
    badge: 'Mas popular',
  },
  {
    id: 'business',
    name: 'Business',
    description: 'Para administradores de propiedades',
    price: {
      monthly: 149900,
      yearly: 1439000, // ~20% discount
    },
    features: [
      { ...PLAN_FEATURES.property_listing, included: true, limit: 'unlimited' },
      { ...PLAN_FEATURES.basic_search, included: true },
      { ...PLAN_FEATURES.unlimited_contracts, included: true, limit: 'unlimited' },
      { ...PLAN_FEATURES.ai_scoring, included: true },
      { ...PLAN_FEATURES.document_verification, included: true },
      { ...PLAN_FEATURES.background_check, included: true },
      { ...PLAN_FEATURES.priority_support, included: true },
      { ...PLAN_FEATURES.advanced_analytics, included: true },
      { ...PLAN_FEATURES.api_access, included: true },
      { ...PLAN_FEATURES.multi_property, included: true, limit: 'unlimited' },
    ],
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
    pro: '5',
    business: 'Ilimitadas',
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
    pro: false,
    business: true,
  },
  {
    feature: 'Acceso API',
    description: 'Integra con tus sistemas',
    free: false,
    pro: false,
    business: true,
  },
];

/**
 * Mock user subscription (free tier by default)
 */
export const MOCK_SUBSCRIPTION: Subscription = {
  id: 'sub-001',
  userId: 'user-001',
  planId: 'free',
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
