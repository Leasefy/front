'use client';

import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/format';
import type { Plan, BillingCycle } from '@/lib/types/subscription';
import type { AppliedCoupon } from '@/lib/types/coupon';
import { Gift, Calendar, Info } from '@phosphor-icons/react';

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
    switch (appliedCoupon.type) {
      case 'PERCENTAGE':
        finalPrice = Math.max(0, Math.round(originalPrice - originalPrice * (appliedCoupon.discount / 100)));
        break;
      case 'FIXED_AMOUNT':
        finalPrice = Math.max(0, originalPrice - appliedCoupon.discount);
        break;
      case 'FREE_MONTHS':
      case 'FULL_ACCESS':
        finalPrice = 0;
        break;
    }
    savings = originalPrice - finalPrice;
    isTrial = appliedCoupon.type === 'FREE_MONTHS' ||
      appliedCoupon.type === 'FULL_ACCESS' ||
      (appliedCoupon.type === 'PERCENTAGE' && appliedCoupon.discount === 100);
    if (appliedCoupon.type === 'FREE_MONTHS') trialDays = appliedCoupon.discount * 30;
    else if (appliedCoupon.type === 'FULL_ACCESS') trialDays = appliedCoupon.discount;
    else if (appliedCoupon.type === 'PERCENTAGE' && appliedCoupon.discount === 100) trialDays = 30;
  }

  const isFree = finalPrice === 0;
  const billingLabel = billingCycle === 'monthly' ? 'mes' : 'ano';

  return (
    <div className={cn('bg-muted rounded-sm p-4', className)}>
      <h4 className="font-medium text-foreground mb-4 flex items-center gap-2">
        Resumen
        {appliedCoupon && (
          <Gift className="w-4 h-4 text-[#2C7A53]" />
        )}
      </h4>

      <div className="space-y-3 text-sm">
        {/* Plan line */}
        <div className="flex justify-between items-center">
          <span className="text-muted-foreground">Plan {plan.name}</span>
          <span className={cn(
            'font-medium',
            appliedCoupon && savings > 0 && 'line-through text-muted-foreground'
          )}>
            {formatCurrency(originalPrice)}/{billingLabel}
          </span>
        </div>

        {/* Discount line */}
        {appliedCoupon && savings > 0 && (
          <div className="flex justify-between items-center text-[#2C7A53]">
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#2C7A53]" />
              {appliedCoupon.description}
            </span>
            <span className="font-medium">-{formatCurrency(savings)}</span>
          </div>
        )}

        {/* Free period notice */}
        {isTrial && (
          <div className="bg-[#E8F3EC] border border-[#2C7A53]/30 rounded-sm p-3">
            <div className="flex items-start gap-2">
              <Calendar className="w-4 h-4 text-[#2C7A53] shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-[#2C7A53]">
                  {appliedCoupon?.description}
                </p>
                <p className="text-xs text-[#2C7A53] mt-0.5">
                  {trialDays > 30
                    ? `Después de ${Math.round(trialDays / 30)} meses se cobrará el precio normal.`
                    : trialDays === 30
                    ? 'Después se cobrará el precio normal.'
                    : `Después de ${trialDays} días se cobrará el precio normal.`}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Divider */}
        <div className="border-t border-border my-3" />

        {/* Total */}
        <div className="flex justify-between items-baseline">
          <span className="font-medium text-foreground">
            {isFree ? 'A pagar hoy' : 'Total'}
          </span>
          <div className="text-right">
            <span className="text-xl font-bold text-foreground">
              {isFree ? 'Gratis' : formatCurrency(finalPrice)}
            </span>
            {!isFree && (
              <span className="text-muted-foreground text-sm ml-1">
                /{billingLabel}
              </span>
            )}
          </div>
        </div>

        {/* Billing cycle note */}
        {billingCycle === 'yearly' && !isFree && (
          <p className="text-xs text-muted-foreground text-right">
            Facturado anualmente
          </p>
        )}

        {/* Savings summary */}
        {savings > 0 && !isTrial && (
          <div className="flex items-center justify-center gap-1.5 pt-2 text-[#2C7A53]">
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
