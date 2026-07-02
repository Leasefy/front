'use client';

import Link from 'next/link';
import {
  LockedFeatureOverlay as CadenceLockedFeatureOverlay,
  LockedBadge as CadenceLockedBadge,
} from '@leasefy/cadence';
import { Button } from '@/components/ui/button';

interface LockedFeatureOverlayProps {
  title: string;
  description: string;
  upgradeHref: string;
  upgradeLabel: string;
  /** "blur" blurs child content, "solid" shows a solid overlay */
  variant?: 'blur' | 'solid';
  children?: React.ReactNode;
  className?: string;
}

/**
 * Overlay for features locked behind a subscription plan — thin wrapper over
 * the Cadence `LockedFeatureOverlay` (warm card, neutral lock tile + duotone
 * LockSimple, frosted veil on the `blur` variant). The upgrade CTA is rendered
 * into the DS `action` slot as a Cadence primary pill `Button` (cobalt +
 * auto ArrowUpRight) that navigates via next/link.
 *
 * Public API (title/description/upgradeHref/upgradeLabel/variant/children/
 * className) is preserved.
 */
export function LockedFeatureOverlay({
  title,
  description,
  upgradeHref,
  upgradeLabel,
  variant = 'blur',
  children,
  className,
}: LockedFeatureOverlayProps) {
  return (
    <CadenceLockedFeatureOverlay
      title={title}
      description={description}
      variant={variant}
      className={className}
      action={
        <Button asChild size="sm">
          <Link href={upgradeHref}>{upgradeLabel}</Link>
        </Button>
      }
    >
      {children}
    </CadenceLockedFeatureOverlay>
  );
}

/**
 * Small inline lock badge for table cells and compact UI elements.
 * Wraps the Cadence `LockedBadge` (mono uppercase neutral tag); keeps the
 * legacy default label of "Pro".
 */
export function LockedBadge({ label }: { label?: string }) {
  return <CadenceLockedBadge label={label || 'Pro'} />;
}
