'use client';

import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/format';
import { Check, Shield, ShieldCheck, ShieldSlash, Wrench, Scales, Clock, Sparkle } from '@phosphor-icons/react';
import { INSURANCE_POLICIES } from '@/lib/constants/insurance-policies';
import type { SelectedInsurance } from '@/lib/types/insurance';

// ============================================================================
// TextTs
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
  none: ShieldSlash,
  basic: Shield,
  premium: ShieldCheck,
} as const;

const tierConfig = {
  none: {
    iconBg: 'bg-surface-muted',
    iconColor: 'text-fg-muted',
    selectedBg: 'bg-surface-muted dark:bg-ink/50',
    selectedBorder: 'border-border dark:border-border-strong',
    gradient: '',
  },
  basic: {
    iconBg: 'bg-primary-soft',
    iconColor: 'text-primary',
    selectedBg: 'bg-primary-soft',
    selectedBorder: 'border-primary/30',
    gradient: 'from-primary to-primary',
  },
  premium: {
    iconBg: 'bg-success-soft',
    iconColor: 'text-success',
    selectedBg: 'bg-success-soft',
    selectedBorder: 'border-success/30',
    gradient: 'from-success to-success',
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
    <div className={cn('space-y-4', className)}>
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary-soft flex items-center justify-center">
          <Shield className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h3 className="font-semibold text-fg">
            Protección del arriendo
          </h3>
          <p className="text-xs text-fg-muted">
            Protege tu inversión con seguro
          </p>
        </div>
      </div>

      {/* Policy Cards */}
      <div className="space-y-3">
        {INSURANCE_POLICIES.map((policy) => {
          const Icon = tierIcons[policy.tier];
          const config = tierConfig[policy.tier];
          const isSelected = selected.policyId === policy.id;
          const isNotNone = policy.tier !== 'none';
          const isPremium = policy.tier === 'premium';

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
                'relative w-full rounded-xl border text-left transition-all overflow-hidden',
                isSelected
                  ? `${config.selectedBorder} ${config.selectedBg} ring-2 ring-offset-2 ring-offset-bg`
                  : 'border-border hover:border-border-strong bg-surface',
                isSelected && policy.tier === 'basic' && 'ring-primary/30',
                isSelected && policy.tier === 'premium' && 'ring-success/30',
                isSelected && policy.tier === 'none' && 'ring-border/50 dark:ring-neutral-600/50'
              )}
            >
              {/* Popular/Best Value Badge */}
              {policy.recommended && (
                <div className="absolute top-0 right-0">
                  <div className="bg-gradient-to-r from-primary to-primary text-white text-[10px] font-semibold px-3 py-1 rounded-bl-md">
                    Popular
                  </div>
                </div>
              )}
              {isPremium && (
                <div className="absolute top-0 right-0">
                  <div className="bg-gradient-to-r from-success to-success text-white text-[10px] font-semibold px-3 py-1 rounded-bl-md flex items-center gap-1">
                    <Sparkle className="w-3 h-3" />
                    Mejor valor
                  </div>
                </div>
              )}

              {/* Main Row */}
              <div className="flex items-center gap-4 p-4">
                {/* Icon */}
                <div
                  className={cn(
                    'w-12 h-12 rounded-xl flex items-center justify-center shrink-0',
                    config.iconBg
                  )}
                >
                  <Icon className={cn('w-6 h-6', config.iconColor)} />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <h4 className="font-semibold text-fg">
                    {policy.name}
                  </h4>
                  <p className="text-sm text-fg-muted mt-0.5">
                    {policy.description}
                  </p>
                </div>

                {/* Price & Selection */}
                <div className="flex items-center gap-3 shrink-0">
                  <div className="text-right">
                    <p className={cn(
                      'text-lg font-bold',
                      policy.tier === 'none'
                        ? 'text-fg-muted dark:text-fg-subtle'
                        : policy.tier === 'basic'
                          ? 'text-primary'
                          : 'text-success'
                    )}>
                      {calculatedPremium === 0
                        ? 'Gratis'
                        : formatCurrency(calculatedPremium)}
                    </p>
                    {calculatedPremium > 0 && (
                      <p className="text-xs text-fg-muted">
                        {policy.percentageRate}% /mes
                      </p>
                    )}
                  </div>
                  <div
                    className={cn(
                      'w-6 h-6 rounded-full flex items-center justify-center transition-all shrink-0 border-2',
                      isSelected
                        ? policy.tier === 'basic'
                          ? 'bg-primary border-primary/30'
                          : policy.tier === 'premium'
                            ? 'bg-success border-success/30'
                            : 'bg-surface-muted border-border-strong'
                        : 'border-border dark:border-border-strong'
                    )}
                  >
                    {isSelected && <Check className="w-3.5 h-3.5 text-white" />}
                  </div>
                </div>
              </div>

              {/* Benefits Preview - Show for non-none tiers */}
              {isNotNone && (
                <div className={cn(
                  'border-t px-4 py-3',
                  isSelected
                    ? 'border-border/50 dark:border-border-strong/50 bg-surface-muted/50 dark:bg-ink/30'
                    : 'border-border'
                )}>
                  <div className="flex flex-wrap gap-x-4 gap-y-2">
                    {/* Property Damage */}
                    <div className="flex items-center gap-2">
                      <div className={cn(
                        'w-5 h-5 rounded-sm flex items-center justify-center',
                        policy.tier === 'basic'
                          ? 'bg-primary-soft'
                          : 'bg-success-soft'
                      )}>
                        <Shield className={cn(
                          'w-3 h-3',
                          policy.tier === 'basic'
                            ? 'text-primary'
                            : 'text-success'
                        )} />
                      </div>
                      <span className="text-xs text-fg-muted dark:text-fg-subtle">
                        Daños hasta{' '}
                        <span className="font-semibold text-fg">
                          {formatCurrency(policy.coverage.propertyDamage)}
                        </span>
                      </span>
                    </div>
                    {/* Rent Default */}
                    <div className="flex items-center gap-2">
                      <div className={cn(
                        'w-5 h-5 rounded-sm flex items-center justify-center',
                        policy.tier === 'basic'
                          ? 'bg-primary-soft'
                          : 'bg-success-soft'
                      )}>
                        <Clock className={cn(
                          'w-3 h-3',
                          policy.tier === 'basic'
                            ? 'text-primary'
                            : 'text-success'
                        )} />
                      </div>
                      <span className="text-xs text-fg-muted dark:text-fg-subtle">
                        <span className="font-semibold text-fg">
                          {policy.coverage.rentDefault} meses
                        </span>{' '}
                        de renta
                      </span>
                    </div>
                    {/* Emergency Repairs */}
                    {policy.coverage.emergencyRepairs && (
                      <div className="flex items-center gap-2">
                        <div className={cn(
                          'w-5 h-5 rounded-sm flex items-center justify-center',
                          policy.tier === 'basic'
                            ? 'bg-primary-soft'
                            : 'bg-success-soft'
                        )}>
                          <Wrench className={cn(
                            'w-3 h-3',
                            policy.tier === 'basic'
                              ? 'text-primary'
                              : 'text-success'
                          )} />
                        </div>
                        <span className="text-xs text-fg-muted dark:text-fg-subtle">Urgencias 24/7</span>
                      </div>
                    )}
                    {/* Legal Assistance */}
                    {policy.coverage.legalAssistance && (
                      <div className="flex items-center gap-2">
                        <div className="w-5 h-5 rounded-sm flex items-center justify-center bg-success-soft">
                          <Scales className="w-3 h-3 text-success" />
                        </div>
                        <span className="text-xs text-fg-muted dark:text-fg-subtle">Asistencia legal</span>
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
        <div className={cn(
          'rounded-xl border p-4',
          selected.tier === 'basic'
            ? 'border-primary/30 bg-primary-soft'
            : 'border-success/30 bg-success-soft'
        )}>
          <div className="flex items-center gap-2 mb-3">
            <Check className={cn(
              'w-4 h-4',
              selected.tier === 'basic'
                ? 'text-primary'
                : 'text-success'
            )} />
            <p className={cn(
              'text-xs font-semibold uppercase tracking-wider',
              selected.tier === 'basic'
                ? 'text-primary'
                : 'text-success'
            )}>
              Tu póliza incluye
            </p>
          </div>
          <ul className="space-y-2">
            {INSURANCE_POLICIES.find((p) => p.tier === selected.tier)?.features.map(
              (feature, i) => (
                <li
                  key={i}
                  className="flex items-start gap-2 text-sm text-fg"
                >
                  <Check className={cn(
                    'w-4 h-4 mt-0.5 shrink-0',
                    selected.tier === 'basic'
                      ? 'text-primary'
                      : 'text-success'
                  )} />
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
