'use client';

import { type ReactNode, useState } from 'react';
import { Lock, Sparkle, ArrowRight } from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import { useI18n } from '@/lib/i18n';
import { useAgencyPlan } from '@/lib/hooks/useAgencyPlan';
import { AgencyPricingModal } from '@/components/inmobiliaria/AgencyPricingModal';
import type { FeatureName } from '@/lib/constants/feature-gates';

/* -------------------------------------------------------------------------- */
/*  UpgradePrompt — shows an upgrade message for a locked feature             */
/* -------------------------------------------------------------------------- */

interface UpgradePromptProps {
  featureName: FeatureName;
  /** Override the default "Disponible en [plan]" title */
  title?: string;
  /** Override the default feature description */
  description?: string;
  /** Additional className for the outer wrapper */
  className?: string;
}

export function UpgradePrompt({
  featureName,
  title,
  description,
  className,
}: UpgradePromptProps) {
  const { locale } = useI18n();
  const { getUpgradeReason } = useAgencyPlan();
  const [modalOpen, setModalOpen] = useState(false);

  const reason = getUpgradeReason(featureName);

  // If the feature is actually accessible, render nothing
  if (!reason) return null;

  const isFlexOnly = reason.requiredPlan.toLowerCase().includes('flex');

  const resolvedTitle =
    title ??
    (locale === 'es'
      ? `Disponible en ${reason.requiredPlan}`
      : `Available on ${reason.requiredPlan}`);

  const resolvedDescription =
    description ??
    (locale === 'es' ? reason.labelEs : reason.labelEn);

  return (
    <>
      <div
        className={cn(
          'flex flex-col items-center justify-center rounded-xl px-6 py-10 text-center',
          'bg-neutral-50',
          className,
        )}
        style={{ border: '1px solid rgba(0,0,0,0.06)' }}
      >
        {/* Lock icon */}
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-neutral-100">
          <Lock weight="duotone" className="h-5 w-5 text-neutral-400" />
        </div>

        {/* Title */}
        <h3 className="text-[15px] font-semibold text-neutral-900">
          {resolvedTitle}
        </h3>

        {/* Description */}
        <p className="mt-1.5 max-w-sm text-[13px] leading-relaxed text-neutral-500">
          {resolvedDescription}
        </p>

        {/* Flex-only callout */}
        {isFlexOnly && (
          <p className="mt-2.5 flex items-center gap-1.5 text-[12px] font-medium text-indigo-600">
            <Sparkle weight="fill" className="h-3.5 w-3.5" />
            {locale === 'es'
              ? 'Incluido en planes Flex'
              : 'Included in Flex plans'}
          </p>
        )}

        {/* CTA button */}
        <button
          onClick={() => setModalOpen(true)}
          className={cn(
            'mt-5 inline-flex items-center gap-2 rounded-xl px-5 py-2.5',
            'bg-neutral-900 text-white text-[13px] font-medium',
            'transition-colors hover:bg-neutral-800',
          )}
        >
          {locale === 'es' ? 'Ver planes' : 'View plans'}
          <ArrowRight weight="bold" className="h-3.5 w-3.5" />
        </button>
      </div>

      <AgencyPricingModal open={modalOpen} onClose={() => setModalOpen(false)} />
    </>
  );
}

/* -------------------------------------------------------------------------- */
/*  FeatureGate — wrapper that shows children or UpgradePrompt                */
/* -------------------------------------------------------------------------- */

interface FeatureGateProps {
  feature: FeatureName;
  children: ReactNode;
  /** Custom fallback instead of the default UpgradePrompt */
  fallback?: ReactNode;
  /** Additional className passed to the default UpgradePrompt */
  className?: string;
}

/**
 * Conditionally renders children when the current agency plan
 * has access to the specified feature.
 *
 * When access is denied, renders the fallback (or a default UpgradePrompt).
 */
export function FeatureGate({
  feature,
  children,
  fallback,
  className,
}: FeatureGateProps) {
  const { hasFeature } = useAgencyPlan();

  if (hasFeature(feature)) {
    return <>{children}</>;
  }

  if (fallback !== undefined) {
    return <>{fallback}</>;
  }

  return <UpgradePrompt featureName={feature} className={className} />;
}
