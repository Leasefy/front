/**
 * Coupon validation and discount calculation utilities
 * @module lib/utils/coupon-validation
 */

import type { Coupon, CouponValidationResult, CouponDiscount } from '@/lib/types/coupon';
import type { PlanId } from '@/lib/types/subscription';
import { getCouponByCode } from '@/lib/data/mock-coupons';

/**
 * Validate a coupon code against plan and price
 */
export function validateCoupon(
  code: string,
  planId: PlanId,
  price: number
): CouponValidationResult {
  // Trim and check empty
  const trimmedCode = code.trim();
  if (!trimmedCode) {
    return {
      valid: false,
      error: 'Ingresa un codigo de cupon',
    };
  }

  // Check if coupon exists
  const coupon = getCouponByCode(trimmedCode);

  if (!coupon) {
    return {
      valid: false,
      error: 'Cupon no valido',
    };
  }

  // Check if expired
  const now = new Date();
  const validFrom = new Date(coupon.validFrom);
  const validUntil = new Date(coupon.validUntil);

  if (now < validFrom) {
    return {
      valid: false,
      error: 'Este cupon aun no esta activo',
    };
  }

  if (now > validUntil) {
    return {
      valid: false,
      error: 'Este cupon ha expirado',
    };
  }

  // Check max uses
  if (coupon.maxUses !== null && coupon.currentUses >= coupon.maxUses) {
    return {
      valid: false,
      error: 'Este cupon ha alcanzado su limite de uso',
    };
  }

  // Check applicable plans
  if (coupon.applicablePlans !== 'all' && !coupon.applicablePlans.includes(planId)) {
    const planNames: Record<PlanId, string> = {
      free: 'Gratis',
      pro: 'Pro',
      business: 'Business',
    };
    return {
      valid: false,
      error: `Este cupon no aplica para el plan ${planNames[planId]}`,
    };
  }

  // Check minimum purchase
  if (coupon.minimumPurchase && price < coupon.minimumPurchase) {
    return {
      valid: false,
      error: `Compra minima de $${coupon.minimumPurchase.toLocaleString('es-CO')} requerida`,
    };
  }

  // Calculate discount
  const discount = calculateDiscount(coupon);

  return {
    valid: true,
    coupon,
    discount,
  };
}

/**
 * Calculate discount information from coupon
 */
function calculateDiscount(coupon: Coupon): CouponDiscount {
  switch (coupon.type) {
    case 'PERCENTAGE':
      return {
        type: 'percentage',
        value: coupon.value,
        description: coupon.value === 100
          ? 'Primer mes gratis'
          : `${coupon.value}% de descuento`,
      };

    case 'FIXED_AMOUNT':
      return {
        type: 'fixed',
        value: coupon.value,
        description: `$${coupon.value.toLocaleString('es-CO')} de descuento`,
      };

    case 'FREE_MONTHS':
      return {
        type: 'free_period',
        value: coupon.value,
        description: `${coupon.value} ${coupon.value === 1 ? 'mes' : 'meses'} gratis`,
      };

    case 'FULL_ACCESS':
      const months = Math.round(coupon.value / 30);
      return {
        type: 'free_period',
        value: coupon.value,
        description: months > 0
          ? `Acceso completo por ${months} ${months === 1 ? 'mes' : 'meses'}`
          : `Acceso completo por ${coupon.value} dias`,
      };

    default:
      return {
        type: 'percentage',
        value: 0,
        description: 'Descuento aplicado',
      };
  }
}

/**
 * Calculate the discounted price after applying a coupon
 */
export function calculateDiscountedPrice(
  originalPrice: number,
  coupon: Coupon
): number {
  switch (coupon.type) {
    case 'PERCENTAGE':
      // Apply percentage discount
      const percentageDiscount = originalPrice * (coupon.value / 100);
      return Math.max(0, Math.round(originalPrice - percentageDiscount));

    case 'FIXED_AMOUNT':
      // Subtract fixed amount
      return Math.max(0, originalPrice - coupon.value);

    case 'FREE_MONTHS':
    case 'FULL_ACCESS':
      // First period is free
      return 0;

    default:
      return originalPrice;
  }
}

/**
 * Get the savings amount from applying a coupon
 */
export function calculateSavings(
  originalPrice: number,
  coupon: Coupon
): number {
  const discountedPrice = calculateDiscountedPrice(originalPrice, coupon);
  return originalPrice - discountedPrice;
}

/**
 * Format discount for display
 */
export function formatDiscountDisplay(coupon: Coupon, originalPrice: number): string {
  switch (coupon.type) {
    case 'PERCENTAGE':
      if (coupon.value === 100) {
        return 'Gratis';
      }
      const savings = calculateSavings(originalPrice, coupon);
      return `-$${savings.toLocaleString('es-CO')}`;

    case 'FIXED_AMOUNT':
      return `-$${coupon.value.toLocaleString('es-CO')}`;

    case 'FREE_MONTHS':
    case 'FULL_ACCESS':
      return 'Gratis';

    default:
      return '';
  }
}

/**
 * Check if coupon provides a free trial period
 */
export function isTrialCoupon(coupon: Coupon): boolean {
  return coupon.type === 'FREE_MONTHS' ||
         coupon.type === 'FULL_ACCESS' ||
         (coupon.type === 'PERCENTAGE' && coupon.value === 100);
}

/**
 * Get trial duration in days
 */
export function getTrialDuration(coupon: Coupon): number {
  switch (coupon.type) {
    case 'FREE_MONTHS':
      return coupon.value * 30;
    case 'FULL_ACCESS':
      return coupon.value;
    case 'PERCENTAGE':
      // 100% off = 1 month free
      return coupon.value === 100 ? 30 : 0;
    default:
      return 0;
  }
}
