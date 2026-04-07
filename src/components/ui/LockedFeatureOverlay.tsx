'use client';

import { Lock, ArrowUpRight } from '@phosphor-icons/react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

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
 * Overlay for features locked behind a subscription plan.
 * Wraps content with blur effect and shows upgrade CTA.
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
    <div className={cn('relative', className)}>
      {/* Blurred content behind */}
      {children && variant === 'blur' && (
        <div className="blur-[6px] select-none pointer-events-none opacity-50" aria-hidden>
          {children}
        </div>
      )}

      {/* Overlay */}
      <div
        className={cn(
          'flex flex-col items-center justify-center text-center px-6 py-8',
          variant === 'blur' ? 'absolute inset-0 z-10' : ''
        )}
      >
        <div className="w-12 h-12 rounded-2xl bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center mb-3">
          <Lock className="w-6 h-6 text-neutral-400 dark:text-neutral-500" />
        </div>
        <p className="text-sm font-semibold text-foreground mb-1">{title}</p>
        <p className="text-xs text-muted-foreground max-w-xs mb-4">{description}</p>
        <Link
          href={upgradeHref}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-mono uppercase tracking-wide hover:bg-primary/85 transition-colors"
        >
          {upgradeLabel}
          <ArrowUpRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    </div>
  );
}

/**
 * Small inline lock badge for table cells and compact UI elements
 */
export function LockedBadge({ label }: { label?: string }) {
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-500 dark:text-neutral-400 text-[10px] font-medium">
      <Lock className="w-3 h-3" />
      {label || 'Pro'}
    </span>
  );
}
