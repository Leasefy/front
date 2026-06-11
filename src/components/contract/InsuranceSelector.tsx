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
    iconBg: 'bg-neutral-100 dark:bg-neutral-800',
    iconColor: 'text-neutral-500 dark:text-neutral-400',
    selectedBg: 'bg-neutral-50 dark:bg-neutral-800/50',
    selectedBorder: 'border-neutral-300 dark:border-neutral-600',
    gradient: '',
  },
  basic: {
    iconBg: 'bg-[#EEF1FF] dark:bg-[#1A40FF]/15',
    iconColor: 'text-[#1A40FF] dark:text-[#5570FF]',
    selectedBg: 'bg-[#EEF1FF] dark:bg-[#1A40FF]/15',
    selectedBorder: 'border-[#1A40FF]/30 dark:border-[#1A40FF]/40',
    gradient: 'from-[#1A40FF] to-[#1A40FF]',
  },
  premium: {
    iconBg: 'bg-[#E8F3EC] dark:bg-[#2C7A53]/15',
    iconColor: 'text-[#2C7A53] dark:text-[#3EAE70]',
    selectedBg: 'bg-[#E8F3EC] dark:bg-[#2C7A53]/15',
    selectedBorder: 'border-[#2C7A53]/30 dark:border-[#2C7A53]/40',
    gradient: 'from-[#2C7A53] to-[#6B6B6B]',
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
        <div className="w-10 h-10 rounded-xl bg-[#EEF1FF] dark:bg-[#1A40FF]/15 flex items-center justify-center">
          <Shield className="w-5 h-5 text-[#1A40FF] dark:text-[#5570FF]" />
        </div>
        <div>
          <h3 className="font-semibold text-neutral-900 dark:text-white">
            Protección del arriendo
          </h3>
          <p className="text-xs text-neutral-500 dark:text-neutral-400">
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
                  ? `${config.selectedBorder} ${config.selectedBg} ring-2 ring-offset-2 ring-offset-white dark:ring-offset-[#222224]`
                  : 'border-neutral-200 dark:border-neutral-700 hover:border-neutral-300 dark:hover:border-neutral-600 bg-white dark:bg-[#222224]',
                isSelected && policy.tier === 'basic' && 'ring-[#1A40FF]/30',
                isSelected && policy.tier === 'premium' && 'ring-[#2C7A53]/30',
                isSelected && policy.tier === 'none' && 'ring-neutral-300/50 dark:ring-neutral-600/50'
              )}
            >
              {/* Popular/Best Value Badge */}
              {policy.recommended && (
                <div className="absolute top-0 right-0">
                  <div className="bg-gradient-to-r from-[#1A40FF] to-[#1A40FF] text-white text-[10px] font-semibold px-3 py-1 rounded-bl-md">
                    Popular
                  </div>
                </div>
              )}
              {isPremium && (
                <div className="absolute top-0 right-0">
                  <div className="bg-gradient-to-r from-[#2C7A53] to-[#6B6B6B] text-white text-[10px] font-semibold px-3 py-1 rounded-bl-md flex items-center gap-1">
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
                  <h4 className="font-semibold text-neutral-900 dark:text-white">
                    {policy.name}
                  </h4>
                  <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-0.5">
                    {policy.description}
                  </p>
                </div>

                {/* Price & Selection */}
                <div className="flex items-center gap-3 shrink-0">
                  <div className="text-right">
                    <p className={cn(
                      'text-lg font-bold',
                      policy.tier === 'none'
                        ? 'text-neutral-600 dark:text-neutral-300'
                        : policy.tier === 'basic'
                          ? 'text-[#1A40FF] dark:text-[#5570FF]'
                          : 'text-[#2C7A53] dark:text-[#3EAE70]'
                    )}>
                      {calculatedPremium === 0
                        ? 'Gratis'
                        : formatCurrency(calculatedPremium)}
                    </p>
                    {calculatedPremium > 0 && (
                      <p className="text-xs text-neutral-500 dark:text-neutral-400">
                        {policy.percentageRate}% /mes
                      </p>
                    )}
                  </div>
                  <div
                    className={cn(
                      'w-6 h-6 rounded-full flex items-center justify-center transition-all shrink-0 border-2',
                      isSelected
                        ? policy.tier === 'basic'
                          ? 'bg-[#1A40FF] border-[#1A40FF]/30'
                          : policy.tier === 'premium'
                            ? 'bg-[#2C7A53] border-[#2C7A53]/30'
                            : 'bg-neutral-600 border-neutral-600'
                        : 'border-neutral-300 dark:border-neutral-600'
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
                    ? 'border-neutral-200/50 dark:border-neutral-700/50 bg-neutral-50/50 dark:bg-neutral-800/30'
                    : 'border-neutral-100 dark:border-neutral-800'
                )}>
                  <div className="flex flex-wrap gap-x-4 gap-y-2">
                    {/* Property Damage */}
                    <div className="flex items-center gap-2">
                      <div className={cn(
                        'w-5 h-5 rounded-sm flex items-center justify-center',
                        policy.tier === 'basic'
                          ? 'bg-[#EEF1FF] dark:bg-[#1A40FF]/15'
                          : 'bg-[#E8F3EC] dark:bg-[#2C7A53]/15'
                      )}>
                        <Shield className={cn(
                          'w-3 h-3',
                          policy.tier === 'basic'
                            ? 'text-[#1A40FF] dark:text-[#5570FF]'
                            : 'text-[#2C7A53] dark:text-[#3EAE70]'
                        )} />
                      </div>
                      <span className="text-xs text-neutral-600 dark:text-neutral-300">
                        Daños hasta{' '}
                        <span className="font-semibold text-neutral-900 dark:text-white">
                          {formatCurrency(policy.coverage.propertyDamage)}
                        </span>
                      </span>
                    </div>
                    {/* Rent Default */}
                    <div className="flex items-center gap-2">
                      <div className={cn(
                        'w-5 h-5 rounded-sm flex items-center justify-center',
                        policy.tier === 'basic'
                          ? 'bg-[#EEF1FF] dark:bg-[#1A40FF]/15'
                          : 'bg-[#E8F3EC] dark:bg-[#2C7A53]/15'
                      )}>
                        <Clock className={cn(
                          'w-3 h-3',
                          policy.tier === 'basic'
                            ? 'text-[#1A40FF] dark:text-[#5570FF]'
                            : 'text-[#2C7A53] dark:text-[#3EAE70]'
                        )} />
                      </div>
                      <span className="text-xs text-neutral-600 dark:text-neutral-300">
                        <span className="font-semibold text-neutral-900 dark:text-white">
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
                            ? 'bg-[#EEF1FF] dark:bg-[#1A40FF]/15'
                            : 'bg-[#E8F3EC] dark:bg-[#2C7A53]/15'
                        )}>
                          <Wrench className={cn(
                            'w-3 h-3',
                            policy.tier === 'basic'
                              ? 'text-[#1A40FF] dark:text-[#5570FF]'
                              : 'text-[#2C7A53] dark:text-[#3EAE70]'
                          )} />
                        </div>
                        <span className="text-xs text-neutral-600 dark:text-neutral-300">Urgencias 24/7</span>
                      </div>
                    )}
                    {/* Legal Assistance */}
                    {policy.coverage.legalAssistance && (
                      <div className="flex items-center gap-2">
                        <div className="w-5 h-5 rounded-sm flex items-center justify-center bg-[#E8F3EC] dark:bg-[#2C7A53]/15">
                          <Scales className="w-3 h-3 text-[#2C7A53] dark:text-[#3EAE70]" />
                        </div>
                        <span className="text-xs text-neutral-600 dark:text-neutral-300">Asistencia legal</span>
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
            ? 'border-[#1A40FF]/30 dark:border-[#1A40FF]/40 bg-[#EEF1FF] dark:bg-[#1A40FF]/15'
            : 'border-[#2C7A53]/30 dark:border-[#2C7A53]/40 bg-[#E8F3EC] dark:bg-[#2C7A53]/15'
        )}>
          <div className="flex items-center gap-2 mb-3">
            <Check className={cn(
              'w-4 h-4',
              selected.tier === 'basic'
                ? 'text-[#1A40FF] dark:text-[#5570FF]'
                : 'text-[#2C7A53] dark:text-[#3EAE70]'
            )} />
            <p className={cn(
              'text-xs font-semibold uppercase tracking-wider',
              selected.tier === 'basic'
                ? 'text-[#1A40FF] dark:text-[#5570FF]'
                : 'text-[#2C7A53] dark:text-[#3EAE70]'
            )}>
              Tu póliza incluye
            </p>
          </div>
          <ul className="space-y-2">
            {INSURANCE_POLICIES.find((p) => p.tier === selected.tier)?.features.map(
              (feature, i) => (
                <li
                  key={i}
                  className="flex items-start gap-2 text-sm text-neutral-700 dark:text-neutral-300"
                >
                  <Check className={cn(
                    'w-4 h-4 mt-0.5 shrink-0',
                    selected.tier === 'basic'
                      ? 'text-[#1A40FF] dark:text-[#5570FF]'
                      : 'text-[#2C7A53] dark:text-[#3EAE70]'
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
