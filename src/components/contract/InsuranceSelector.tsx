'use client';

import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/format';
import { Check, Shield, ShieldCheck, ShieldOff, Wrench, Scale, Clock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { INSURANCE_POLICIES } from '@/lib/data/mock-insurance';
import type { SelectedInsurance } from '@/lib/types/insurance';

// ============================================================================
// Types
// ============================================================================

export interface InsuranceSelectorProps {
  /** Currently selected insurance */
  selected: SelectedInsurance;
  /** Callback when insurance selection changes */
  onSelect: (insurance: SelectedInsurance) => void;
  /** Monthly rent amount in COP to calculate premium */
  monthlyRent?: number;
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

const tierColors = {
  none: {
    icon: 'text-muted-foreground',
    bg: 'bg-muted',
    border: 'border-border',
    selectedBorder: 'border-border',
  },
  basic: {
    icon: 'text-blue-600',
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    selectedBorder: 'border-blue-500',
  },
  premium: {
    icon: 'text-emerald-600',
    bg: 'bg-emerald-50',
    border: 'border-emerald-200',
    selectedBorder: 'border-emerald-500',
  },
} as const;

// ============================================================================
// Component
// ============================================================================

/**
 * InsuranceSelector - Policy selection cards for contract signing
 *
 * Features:
 * - 3 insurance tiers: none, basic (2%), premium (3.5%)
 * - Percentage-based pricing calculated from monthly rent
 * - 12-24 months rent coverage (industry standard)
 * - Visual selection with checkmarks
 * - Recommended badge on basic tier
 */
export function InsuranceSelector({
  selected,
  onSelect,
  monthlyRent = 2000000, // Default $2M COP for preview
  className,
}: InsuranceSelectorProps) {
  // Calculate premium based on percentage rate
  const calculatePremium = (percentageRate: number | undefined): number => {
    if (!percentageRate) return 0;
    return Math.round((monthlyRent * percentageRate) / 100);
  };
  return (
    <div className={cn('space-y-3', className)}>
      {/* Header */}
      <div>
        <h3 className="font-semibold text-foreground">Protección del arriendo</h3>
        <p className="text-xs text-muted-foreground mt-0.5">
          Protege tu inversión con una póliza de seguro
        </p>
      </div>

      {/* Policy Cards */}
      <div className="space-y-2">
        {INSURANCE_POLICIES.map((policy) => {
          const Icon = tierIcons[policy.tier];
          const colors = tierColors[policy.tier];
          const isSelected = selected.policyId === policy.id;
          const isNotNone = policy.tier !== 'none';

          const calculatedPremium = calculatePremium(policy.percentageRate);

          return (
            <button
              key={policy.id}
              type="button"
              onClick={() =>
                onSelect({
                  policyId: policy.id,
                  tier: policy.tier,
                  monthlyPremium: calculatedPremium,
                })
              }
              className={cn(
                'relative w-full rounded-sm border text-left transition-all',
                isSelected
                  ? `${colors.selectedBorder} ring-1 ring-current ${colors.bg}`
                  : `${colors.border} hover:border-border bg-card`,
                policy.tier === 'none' && 'opacity-80'
              )}
            >
              {/* Main Row */}
              <div className="flex items-center gap-2.5 p-2.5">
                {/* Icon */}
                <div
                  className={cn(
                    'w-8 h-8 rounded-sm flex items-center justify-center shrink-0',
                    isSelected ? colors.bg : 'bg-muted'
                  )}
                >
                  <Icon className={cn('w-4 h-4', colors.icon)} />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h4 className="font-medium text-sm text-foreground">
                      {policy.name}
                    </h4>
                    {policy.recommended && (
                      <Badge variant="success" className="text-[10px] px-1.5 py-0">
                        Popular
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {policy.description}
                  </p>
                </div>

                {/* Price & Selection */}
                <div className="flex items-center gap-2 shrink-0">
                  <div className="text-right">
                    <p className={cn(
                      'text-sm font-semibold',
                      isSelected ? 'text-foreground' : 'text-foreground'
                    )}>
                      {calculatedPremium === 0
                        ? 'Gratis'
                        : formatCurrency(calculatedPremium)}
                    </p>
                    {calculatedPremium > 0 && (
                      <p className="text-[10px] text-muted-foreground">
                        {policy.percentageRate}% /mes
                      </p>
                    )}
                  </div>
                  <div
                    className={cn(
                      'w-5 h-5 rounded-full flex items-center justify-center transition-all shrink-0',
                      isSelected
                        ? 'bg-primary'
                        : 'border-2 border-border'
                    )}
                  >
                    {isSelected && <Check className="w-3 h-3 text-white" />}
                  </div>
                </div>
              </div>

              {/* Benefits Preview - Show for non-none tiers */}
              {isNotNone && (
                <div className={cn(
                  'border-t px-2.5 py-2',
                  isSelected ? 'border-current/20' : 'border-border'
                )}>
                  <div className="flex flex-wrap gap-x-3 gap-y-1">
                    {/* Property Damage */}
                    <div className="flex items-center gap-1.5 text-xs">
                      <Shield className="w-3 h-3 text-muted-foreground" />
                      <span className="text-muted-foreground">
                        Daños hasta{' '}
                        <span className="font-medium text-foreground">
                          {formatCurrency(policy.coverage.propertyDamage)}
                        </span>
                      </span>
                    </div>
                    {/* Rent Default */}
                    <div className="flex items-center gap-1.5 text-xs">
                      <Clock className="w-3 h-3 text-muted-foreground" />
                      <span className="text-muted-foreground">
                        <span className="font-medium text-foreground">
                          {policy.coverage.rentDefault} meses
                        </span>{' '}
                        de renta
                      </span>
                    </div>
                    {/* Emergency Repairs */}
                    {policy.coverage.emergencyRepairs && (
                      <div className="flex items-center gap-1.5 text-xs">
                        <Wrench className="w-3 h-3 text-muted-foreground" />
                        <span className="text-muted-foreground">Urgencias 24/7</span>
                      </div>
                    )}
                    {/* Legal Assistance */}
                    {policy.coverage.legalAssistance && (
                      <div className="flex items-center gap-1.5 text-xs">
                        <Scale className="w-3 h-3 text-muted-foreground" />
                        <span className="text-muted-foreground">Asistencia legal</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Selected Benefits Detail */}
      {selected.tier !== 'none' && (
        <div className="rounded-sm border border-border bg-muted p-3">
          <p className="text-[10px] font-normal text-muted-foreground font-mono uppercase tracking-wide mb-2">
            Tu póliza incluye
          </p>
          <ul className="space-y-1.5">
            {INSURANCE_POLICIES.find((p) => p.tier === selected.tier)?.features.map(
              (feature, i) => (
                <li
                  key={i}
                  className="flex items-start gap-2 text-xs text-foreground"
                >
                  <Check className="w-3.5 h-3.5 text-emerald-500 mt-0.5 shrink-0" />
                  <span>{feature}</span>
                </li>
              )
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
