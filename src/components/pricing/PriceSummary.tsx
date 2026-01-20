'use client';

import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/format';
import type { Plan, BillingCycle } from '@/lib/types/subscription';
import type { AppliedCoupon } from '@/lib/types/coupon';
import { calculateDiscountedPrice, isTrialCoupon, getTrialDuration } from '@/lib/utils/coupon-validation';
import { getCouponByCode } from '@/lib/data/mock-coupons';
import { Gift, Calendar, Info } from 'lucide-react';

export interface PriceSummaryProps {
  /** Selected plan */
  plan: Plan;
  /** Billing frequency */
  billingCycle: BillingCycle;
  /** Applied coupon (if any) */
  appliedCoupon: AppliedCoupon | null;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Price summary component showing original price, discount, and final total
 * Handles percentage, fixed amount, and free period discounts
 */
export function PriceSummary({
  plan,
  billingCycle,
  appliedCoupon,
  className,
}: PriceSummaryProps) {
  // Get price based on billing cycle
  const originalPrice = billingCycle === 'monthly'
    ? plan.price.monthly
    : plan.price.yearly;

  // Calculate final price and savings
  let finalPrice = originalPrice;
  let savings = 0;
  let isTrial = false;
  let trialDays = 0;

  if (appliedCoupon) {
    const coupon = getCouponByCode(appliedCoupon.code);
    if (coupon) {
      finalPrice = calculateDiscountedPrice(originalPrice, coupon);
      savings = originalPrice - finalPrice;
      isTrial = isTrialCoupon(coupon);
      trialDays = getTrialDuration(coupon);
    }
  }

  const isFree = finalPrice === 0;
  const billingLabel = billingCycle === 'monthly' ? 'mes' : 'ano';

  return (
    <div className={cn('bg-slate-50 rounded-sm p-4', className)}>
      <h4 className="font-medium text-slate-900 mb-4 flex items-center gap-2">
        Resumen
        {appliedCoupon && (
          <Gift className="w-4 h-4 text-emerald-500" />
        )}
      </h4>

      <div className="space-y-3 text-sm">
        {/* Plan line */}
        <div className="flex justify-between items-center">
          <span className="text-slate-600">Plan {plan.name}</span>
          <span className={cn(
            'font-medium',
            appliedCoupon && savings > 0 && 'line-through text-slate-400'
          )}>
            {formatCurrency(originalPrice)}/{billingLabel}
          </span>
        </div>

        {/* Discount line */}
        {appliedCoupon && savings > 0 && (
          <div className="flex justify-between items-center text-emerald-600">
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              {appliedCoupon.description}
            </span>
            <span className="font-medium">-{formatCurrency(savings)}</span>
          </div>
        )}

        {/* Free period notice */}
        {isTrial && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-sm p-3">
            <div className="flex items-start gap-2">
              <Calendar className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-emerald-800">
                  {appliedCoupon?.description}
                </p>
                <p className="text-xs text-emerald-600 mt-0.5">
                  {trialDays > 30
                    ? `Despues de ${Math.round(trialDays / 30)} meses se cobrara el precio normal.`
                    : trialDays === 30
                    ? 'Despues se cobrara el precio normal.'
                    : `Despues de ${trialDays} dias se cobrara el precio normal.`}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Divider */}
        <div className="border-t border-slate-200 my-3" />

        {/* Total */}
        <div className="flex justify-between items-baseline">
          <span className="font-medium text-slate-900">
            {isFree ? 'A pagar hoy' : 'Total'}
          </span>
          <div className="text-right">
            <span className="text-xl font-bold text-slate-900">
              {isFree ? 'Gratis' : formatCurrency(finalPrice)}
            </span>
            {!isFree && (
              <span className="text-slate-500 text-sm ml-1">
                /{billingLabel}
              </span>
            )}
          </div>
        </div>

        {/* Billing cycle note */}
        {billingCycle === 'yearly' && !isFree && (
          <p className="text-xs text-slate-500 text-right">
            Facturado anualmente
          </p>
        )}

        {/* Savings summary */}
        {savings > 0 && !isTrial && (
          <div className="flex items-center justify-center gap-1.5 pt-2 text-emerald-600">
            <Info className="w-3.5 h-3.5" />
            <span className="text-xs font-medium">
              Ahorras {formatCurrency(savings)} con este cupon
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

export default PriceSummary;
