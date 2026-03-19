/**
 * Coupon types and validation interfaces
 * @module lib/types/coupon
 */

// Coupon type definitions
export type CouponType = 'PERCENTAGE' | 'FIXED_AMOUNT' | 'FREE_MONTHS' | 'FULL_ACCESS';

// Coupon lifecycle states
export type CouponStatus = 'active' | 'expired' | 'used' | 'invalid';

/**
 * Coupon definition with restrictions and metadata
 */
export interface Coupon {
  id: string;
  code: string;
  type: CouponType;

  /**
   * Value interpretation depends on type:
   * - PERCENTAGE: 0-100 (percentage off)
   * - FIXED_AMOUNT: amount in COP to discount
   * - FREE_MONTHS: number of months free
   * - FULL_ACCESS: number of days of full access
   */
  value: number;

  // Validity period
  validFrom: string; // ISO date string
  validUntil: string; // ISO date string

  // Usage limits
  maxUses: number | null; // null = unlimited
  currentUses: number;

  // Plan restrictions
  applicablePlans: ('free' | 'pro' | 'business')[] | 'all';

  // Minimum purchase requirement in COP
  minimumPurchase?: number;

  // Display information
  description: string;

  // Tracking
  createdAt: string; // ISO date string
}

/**
 * Calculated discount information
 */
export interface CouponDiscount {
  type: 'percentage' | 'fixed' | 'free_period';
  /** Original value (percentage, COP amount, or days/months) */
  value: number;
  /** Human-readable description */
  description: string;
}

/**
 * Result of coupon validation
 */
export interface CouponValidationResult {
  valid: boolean;
  coupon?: Coupon;
  error?: string;
  discount?: CouponDiscount;
}

/**
 * Coupon that has been successfully applied to a purchase
 */
export interface AppliedCoupon {
  code: string;
  type: CouponType;
  /** Calculated discount amount in COP (or 0 for free period) */
  discount: number;
  /** Human-readable description */
  description: string;
}

/**
 * Coupon application context for checkout
 */
export interface CouponContext {
  appliedCoupon: AppliedCoupon | null;
  isValidating: boolean;
  validationError: string | null;
  applyCoupon: (code: string) => Promise<boolean>;
  removeCoupon: () => void;
}
