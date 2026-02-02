'use client';

import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/format';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, X, Sparkles } from 'lucide-react';
import type { Plan, BillingCycle, PlanId } from '@/lib/types/subscription';
import { cardStyles, borderRadius, transitions, shadows, borders, hoverEffects } from '@/lib/design-tokens';

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
        'p-6 flex flex-col',
        borderRadius.sm,
        transitions.standard,
        plan.highlighted
          ? cardStyles.highlighted
          : cn(cardStyles.base, hoverEffects.lift),
        'relative',
        className
      )}
    >
      {/* Popular badge - positioned absolutely */}
      {plan.badge && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <Badge variant="default">
            <Sparkles className="w-3 h-3 mr-1" />
            {plan.badge}
          </Badge>
        </div>
      )}

      {/* Header */}
      <div className="text-center mb-6 pt-2">
        <h3 className={cn('text-xl font-semibold', 'text-foreground')}>{plan.name}</h3>
        <p className={cn('text-sm mt-1', 'text-muted-foreground')}>{plan.description}</p>
      </div>

      {/* Price */}
      <div className="text-center mb-6">
        <div className="flex items-baseline justify-center gap-1">
          <span className={cn('text-3xl font-bold', 'text-foreground')}>
            {price === 0 ? 'Gratis' : formatCurrency(monthlyEquivalent)}
          </span>
          {price > 0 && <span className="text-muted-foreground">/mes</span>}
        </div>

        {/* Yearly billing note */}
        {billingCycle === 'yearly' && price > 0 && (
          <p className={cn('text-sm mt-1', 'text-muted-foreground')}>
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
                feature.included ? 'text-foreground' : 'text-muted-foreground/60'
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
        <p className={cn('text-xs text-center mt-2', 'text-muted-foreground')}>
          Este es tu plan actual
        </p>
      )}
    </div>
  );
}

export default PricingCard;
