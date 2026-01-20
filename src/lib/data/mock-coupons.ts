/**
 * Mock coupons for testing the coupon system
 * @module lib/data/mock-coupons
 */

import type { Coupon } from '@/lib/types/coupon';

/**
 * Mock coupons covering all coupon types
 */
export const MOCK_COUPONS: Coupon[] = [
  // PERCENTAGE - 100% off first month (launch promo)
  {
    id: 'coupon-1',
    code: 'LAUNCH100',
    type: 'PERCENTAGE',
    value: 100,
    validFrom: '2026-01-01',
    validUntil: '2026-03-31',
    maxUses: 1000,
    currentUses: 150,
    applicablePlans: ['pro'],
    description: 'Primer mes gratis - Lanzamiento',
    createdAt: '2026-01-01',
  },
  // PERCENTAGE - 20% seasonal discount
  {
    id: 'coupon-2',
    code: 'VERANO20',
    type: 'PERCENTAGE',
    value: 20,
    validFrom: '2026-01-01',
    validUntil: '2026-02-28',
    maxUses: null, // unlimited
    currentUses: 0,
    applicablePlans: 'all',
    description: '20% de descuento - Temporada de verano',
    createdAt: '2026-01-01',
  },
  // PERCENTAGE - 50% half-off promo
  {
    id: 'coupon-3',
    code: 'MITAD50',
    type: 'PERCENTAGE',
    value: 50,
    validFrom: '2026-01-01',
    validUntil: '2026-06-30',
    maxUses: 200,
    currentUses: 45,
    applicablePlans: ['pro', 'business'],
    description: '50% de descuento - Oferta especial',
    createdAt: '2026-01-01',
  },
  // FULL_ACCESS - Partner deal (180 days = 6 months)
  {
    id: 'coupon-4',
    code: 'PARTNER2026',
    type: 'FULL_ACCESS',
    value: 180, // 180 days = 6 months
    validFrom: '2026-01-01',
    validUntil: '2026-12-31',
    maxUses: 50,
    currentUses: 5,
    applicablePlans: ['pro', 'business'],
    description: 'Acceso completo 6 meses - Partners',
    createdAt: '2026-01-01',
  },
  // FIXED_AMOUNT - $10,000 COP off
  {
    id: 'coupon-5',
    code: 'PROMO10K',
    type: 'FIXED_AMOUNT',
    value: 10000, // $10,000 COP off
    validFrom: '2026-01-01',
    validUntil: '2026-06-30',
    maxUses: 500,
    currentUses: 100,
    applicablePlans: ['pro', 'business'],
    minimumPurchase: 49900,
    description: '$10,000 de descuento',
    createdAt: '2026-01-01',
  },
  // FIXED_AMOUNT - $25,000 COP off for business
  {
    id: 'coupon-6',
    code: 'BIZ25K',
    type: 'FIXED_AMOUNT',
    value: 25000, // $25,000 COP off
    validFrom: '2026-01-01',
    validUntil: '2026-12-31',
    maxUses: 100,
    currentUses: 20,
    applicablePlans: ['business'],
    minimumPurchase: 100000,
    description: '$25,000 de descuento - Plan Business',
    createdAt: '2026-01-01',
  },
  // FREE_MONTHS - 3 months free (early adopters)
  {
    id: 'coupon-7',
    code: 'GRATIS3',
    type: 'FREE_MONTHS',
    value: 3, // 3 months free
    validFrom: '2026-01-01',
    validUntil: '2026-12-31',
    maxUses: 100,
    currentUses: 10,
    applicablePlans: ['pro'],
    description: '3 meses gratis - Early adopters',
    createdAt: '2026-01-01',
  },
  // FREE_MONTHS - 1 month free (referral)
  {
    id: 'coupon-8',
    code: 'REFERIDO1',
    type: 'FREE_MONTHS',
    value: 1, // 1 month free
    validFrom: '2026-01-01',
    validUntil: '2026-12-31',
    maxUses: null, // unlimited
    currentUses: 0,
    applicablePlans: 'all',
    description: '1 mes gratis - Programa de referidos',
    createdAt: '2026-01-01',
  },
  // PERCENTAGE - 10% loyal customer discount
  {
    id: 'coupon-9',
    code: 'LEAL10',
    type: 'PERCENTAGE',
    value: 10,
    validFrom: '2026-01-01',
    validUntil: '2026-12-31',
    maxUses: null,
    currentUses: 0,
    applicablePlans: 'all',
    description: '10% de descuento - Clientes leales',
    createdAt: '2026-01-01',
  },
  // EXPIRED coupon for testing expiration handling
  {
    id: 'coupon-10',
    code: 'VENCIDO',
    type: 'PERCENTAGE',
    value: 30,
    validFrom: '2025-01-01',
    validUntil: '2025-12-31', // Expired
    maxUses: 100,
    currentUses: 50,
    applicablePlans: 'all',
    description: 'Cupon vencido - Para pruebas',
    createdAt: '2025-01-01',
  },
  // MAXED OUT coupon for testing usage limits
  {
    id: 'coupon-11',
    code: 'AGOTADO',
    type: 'PERCENTAGE',
    value: 40,
    validFrom: '2026-01-01',
    validUntil: '2026-12-31',
    maxUses: 10,
    currentUses: 10, // Maxed out
    applicablePlans: 'all',
    description: 'Cupon agotado - Para pruebas',
    createdAt: '2026-01-01',
  },
];

/**
 * Find coupon by code (case-insensitive)
 */
export function getCouponByCode(code: string): Coupon | undefined {
  return MOCK_COUPONS.find(
    (c) => c.code.toLowerCase() === code.toLowerCase()
  );
}

/**
 * Get all active coupons
 */
export function getActiveCoupons(): Coupon[] {
  const now = new Date();
  return MOCK_COUPONS.filter((c) => {
    const validFrom = new Date(c.validFrom);
    const validUntil = new Date(c.validUntil);
    const notExpired = now >= validFrom && now <= validUntil;
    const hasUsesLeft = c.maxUses === null || c.currentUses < c.maxUses;
    return notExpired && hasUsesLeft;
  });
}

/**
 * Get coupons applicable to a specific plan
 */
export function getCouponsForPlan(planId: 'free' | 'pro' | 'business'): Coupon[] {
  return getActiveCoupons().filter(
    (c) => c.applicablePlans === 'all' || c.applicablePlans.includes(planId)
  );
}
