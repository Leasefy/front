'use client';

import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/format';
import { Check, Shield, ShieldCheck, ShieldOff } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { INSURANCE_POLICIES } from '@/lib/data/mock-insurance';
import type { InsuranceTier, SelectedInsurance } from '@/lib/types/insurance';

// ============================================================================
// Types
// ============================================================================

export interface InsuranceSelectorProps {
  /** Currently selected insurance */
  selected: SelectedInsurance;
  /** Callback when insurance selection changes */
  onSelect: (insurance: SelectedInsurance) => void;
  /** Additional CSS classes */
  className?: string;
}

// ============================================================================
// Constants
// ============================================================================

const tierIcons = {
  none: ShieldOff,
  basic: Shield,
  premium: ShieldCheck,
} as const;

const tierIconColors = {
  none: 'text-slate-400',
  basic: 'text-blue-600',
  premium: 'text-emerald-600',
} as const;

const tierBgColors = {
  none: 'bg-slate-100',
  basic: 'bg-blue-100',
  premium: 'bg-emerald-100',
} as const;

// ============================================================================
// Component
// ============================================================================

/**
 * InsuranceSelector - Policy selection cards for contract signing
 *
 * Features:
 * - 3 insurance tiers: none, basic ($45k), premium ($89k)
 * - Visual selection with checkmarks
 * - Recommended badge on basic tier
 * - Feature list with truncation
 */
export function InsuranceSelector({
  selected,
  onSelect,
  className,
}: InsuranceSelectorProps) {
  return (
    <div className={cn('space-y-4', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-slate-900">Proteccion opcional</h3>
        <p className="text-sm text-slate-500">Recomendado para tu tranquilidad</p>
      </div>

      {/* Policy Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {INSURANCE_POLICIES.map((policy) => {
          const Icon = tierIcons[policy.tier];
          const isSelected = selected.policyId === policy.id;

          return (
            <button
              key={policy.id}
              type="button"
              onClick={() =>
                onSelect({
                  policyId: policy.id,
                  tier: policy.tier,
                  monthlyPremium: policy.monthlyPremium,
                })
              }
              className={cn(
                'relative flex flex-col p-4 rounded-sm border text-left transition-all',
                isSelected
                  ? 'border-primary bg-primary/5 ring-1 ring-primary'
                  : 'border-slate-200 hover:border-slate-300',
                policy.tier === 'none' && 'opacity-75'
              )}
            >
              {/* Recommended Badge */}
              {policy.recommended && (
                <Badge className="absolute -top-2 left-4 bg-emerald-500 hover:bg-emerald-500">
                  Recomendado
                </Badge>
              )}

              {/* Header with Icon and Selection Indicator */}
              <div className="flex items-start justify-between mb-3">
                <div
                  className={cn(
                    'w-10 h-10 rounded-sm flex items-center justify-center',
                    tierBgColors[policy.tier]
                  )}
                >
                  <Icon className={cn('w-5 h-5', tierIconColors[policy.tier])} />
                </div>
                {isSelected && (
                  <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                    <Check className="w-3 h-3 text-white" />
                  </div>
                )}
              </div>

              {/* Name and Description */}
              <h4 className="font-medium text-slate-900">{policy.name}</h4>
              <p className="text-sm text-slate-500 mb-3">{policy.description}</p>

              {/* Price */}
              <div className="mt-auto">
                <p className="text-lg font-semibold text-slate-900">
                  {policy.monthlyPremium === 0
                    ? 'Gratis'
                    : formatCurrency(policy.monthlyPremium)}
                  {policy.monthlyPremium > 0 && (
                    <span className="text-sm text-slate-400 font-normal">/mes</span>
                  )}
                </p>
              </div>

              {/* Features List */}
              {policy.features.length > 0 && (
                <ul className="mt-3 pt-3 border-t border-slate-100 space-y-1.5">
                  {policy.features.slice(0, 3).map((feature, i) => (
                    <li
                      key={i}
                      className="flex items-start gap-2 text-xs text-slate-600"
                    >
                      <Check className="w-3 h-3 text-emerald-500 mt-0.5 shrink-0" />
                      {feature}
                    </li>
                  ))}
                  {policy.features.length > 3 && (
                    <li className="text-xs text-slate-400">
                      +{policy.features.length - 3} mas
                    </li>
                  )}
                </ul>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
