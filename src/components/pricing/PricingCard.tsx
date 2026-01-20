'use client';

import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/format';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, X, Sparkles } from 'lucide-react';
import type { Plan, BillingCycle, PlanId } from '@/lib/types/subscription';

export interface PricingCardProps {
  plan: Plan;
  billingCycle: BillingCycle;
  isCurrentPlan?: boolean;
  onSelect?: (planId: PlanId) => void;
  className?: string;
}

/**
 * PricingCard - Individual plan display card
 *
 * Features:
 * - Price display with monthly/yearly toggle
 * - Feature list with included/excluded indicators
 * - Highlighted state for recommended plan
 * - Current plan indication
 */
export function PricingCard({
  plan,
  billingCycle,
  isCurrentPlan = false,
  onSelect,
  className,
}: PricingCardProps) {
  const price = billingCycle === 'monthly' ? plan.price.monthly : plan.price.yearly;
  const monthlyEquivalent =
    billingCycle === 'yearly'
      ? Math.round(plan.price.yearly / 12)
      : plan.price.monthly;

  // Calculate yearly savings
  const yearlySavings =
    plan.price.monthly > 0
      ? Math.round(
          ((plan.price.monthly * 12 - plan.price.yearly) /
            (plan.price.monthly * 12)) *
            100
        )
      : 0;

  const handleSelect = () => {
    if (!isCurrentPlan && onSelect) {
      onSelect(plan.id);
    }
  };

  return (
    <div
      className={cn(
        'bg-white rounded-sm border p-6 flex flex-col transition-shadow',
        plan.highlighted
          ? 'border-primary shadow-md ring-1 ring-primary relative'
          : 'border-slate-200 hover:shadow-sm',
        className
      )}
    >
      {/* Popular badge - positioned absolutely */}
      {plan.badge && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <Badge className="bg-primary text-white hover:bg-primary shadow-sm">
            <Sparkles className="w-3 h-3 mr-1" />
            {plan.badge}
          </Badge>
        </div>
      )}

      {/* Header */}
      <div className="text-center mb-6 pt-2">
        <h3 className="text-xl font-semibold text-slate-900">{plan.name}</h3>
        <p className="text-sm text-slate-500 mt-1">{plan.description}</p>
      </div>

      {/* Price */}
      <div className="text-center mb-6">
        <div className="flex items-baseline justify-center gap-1">
          <span className="text-3xl font-bold text-slate-900">
            {price === 0 ? 'Gratis' : formatCurrency(monthlyEquivalent)}
          </span>
          {price > 0 && <span className="text-slate-500">/mes</span>}
        </div>

        {/* Yearly billing note */}
        {billingCycle === 'yearly' && price > 0 && (
          <p className="text-sm text-slate-500 mt-1">
            Facturado anualmente ({formatCurrency(plan.price.yearly)})
          </p>
        )}

        {/* Savings badge for yearly */}
        {billingCycle === 'yearly' && yearlySavings > 0 && (
          <Badge
            variant="secondary"
            className="mt-2 bg-emerald-50 text-emerald-700 hover:bg-emerald-50"
          >
            Ahorras {yearlySavings}%
          </Badge>
        )}
      </div>

      {/* Features list */}
      <ul className="space-y-3 mb-6 flex-1">
        {plan.features.map((feature) => (
          <li key={feature.id} className="flex items-start gap-3">
            {feature.included ? (
              <Check className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
            ) : (
              <X className="w-5 h-5 text-slate-300 shrink-0 mt-0.5" />
            )}
            <span
              className={cn(
                'text-sm',
                feature.included ? 'text-slate-700' : 'text-slate-400'
              )}
            >
              {feature.name}
              {feature.included && feature.limit && feature.limit !== 'unlimited' && (
                <span className="text-slate-400"> ({feature.limit})</span>
              )}
              {feature.included && feature.limit === 'unlimited' && (
                <span className="text-emerald-600 text-xs ml-1">(ilimitado)</span>
              )}
            </span>
          </li>
        ))}
      </ul>

      {/* CTA Button */}
      <Button
        variant={plan.highlighted ? 'default' : 'outline'}
        className={cn(
          'w-full',
          isCurrentPlan && 'cursor-default'
        )}
        onClick={handleSelect}
        disabled={isCurrentPlan}
      >
        {isCurrentPlan
          ? 'Plan actual'
          : plan.id === 'free'
          ? 'Comenzar gratis'
          : 'Elegir plan'}
      </Button>

      {/* Current plan indicator */}
      {isCurrentPlan && (
        <p className="text-xs text-center text-slate-500 mt-2">
          Este es tu plan actual
        </p>
      )}
    </div>
  );
}

export default PricingCard;
