'use client';

import { Crown, Sparkle, Shield, Lightning, SealCheck } from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import type { PlanId } from '@/lib/types/subscription';
import type { TenantSubscriptionTextT } from '@/lib/context/TenantProfileContext';

// ============================================================================
// TextTs
// ============================================================================

export interface SubscriptionBadgeProps {
  variant: 'tenant' | 'landlord';
  // For tenants
  tenantSubscription?: TenantSubscriptionTextT;
  // For landlords
  planId?: PlanId;
  // Display options
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  className?: string;
}

// ============================================================================
// Configuration
// ============================================================================

const TENANT_BADGES: Record<TenantSubscriptionTextT, {
  label: string;
  shortLabel: string;
  icon: typeof Sparkle;
  colors: {
    bg: string;
    text: string;
    border: string;
    iconBg: string;
  };
} | null> = {
  arriendo_pass: {
    label: 'Arriendo Pass',
    shortLabel: 'Pass',
    icon: SealCheck,
    colors: {
      bg: 'bg-gradient-to-r from-[#1A40FF]/10 to-[#6B6B6B]/10',
      text: 'text-[#1A40FF] dark:text-[#5570FF]',
      border: 'border-[#1A40FF]/30',
      iconBg: 'bg-[#1A40FF]',
    },
  },
  none: null,
};

/**
 * Plan tier badges keyed by canonical PlanId (matches backend SubscriptionPlan enum
 * lowercased: starter | pro | flex). Legacy keys `free` / `business` are aliases
 * that point to the same visual treatment as `starter` / `flex`.
 */
const LANDLORD_BADGES: Record<PlanId, {
  label: string;
  shortLabel: string;
  icon: typeof Crown;
  colors: {
    bg: string;
    text: string;
    border: string;
    iconBg: string;
  };
}> = {
  starter: {
    label: 'Plan Starter',
    shortLabel: 'Starter',
    icon: Lightning,
    colors: {
      bg: 'bg-neutral-100 dark:bg-neutral-800',
      text: 'text-neutral-600 dark:text-neutral-400',
      border: 'border-neutral-200 dark:border-neutral-700',
      iconBg: 'bg-neutral-400',
    },
  },
  pro: {
    label: 'Plan Pro',
    shortLabel: 'Pro',
    icon: Shield,
    colors: {
      bg: 'bg-gradient-to-r from-[#1A40FF]/10 to-[#1A40FF]/10',
      text: 'text-[#1A40FF] dark:text-[#5570FF]',
      border: 'border-[#1A40FF]/30',
      iconBg: 'bg-[#1A40FF]',
    },
  },
  flex: {
    label: 'Plan Flex',
    shortLabel: 'Flex',
    icon: Crown,
    colors: {
      bg: 'bg-gradient-to-r from-[#B7791F]/10 to-[#B7791F]/10',
      text: 'text-[#B7791F] dark:text-[#D2992F]',
      border: 'border-[#B7791F]/30',
      iconBg: 'bg-[#B7791F]',
    },
  },
};

const SIZE_CONFIG = {
  sm: {
    badge: 'h-5 text-[10px] gap-1 px-1.5',
    icon: 'w-3 h-3',
    iconWrapper: 'w-4 h-4',
  },
  md: {
    badge: 'h-6 text-[11px] gap-1.5 px-2',
    icon: 'w-3.5 h-3.5',
    iconWrapper: 'w-5 h-5',
  },
  lg: {
    badge: 'h-7 text-xs gap-2 px-2.5',
    icon: 'w-4 h-4',
    iconWrapper: 'w-6 h-6',
  },
};

// ============================================================================
// Component
// ============================================================================

export function SubscriptionBadge({
  variant,
  tenantSubscription = 'none',
  planId = 'starter',
  size = 'sm',
  showLabel = true,
  className,
}: SubscriptionBadgeProps) {
  // Get badge config based on variant
  const badgeConfig = variant === 'tenant'
    ? TENANT_BADGES[tenantSubscription]
    : LANDLORD_BADGES[planId];

  // Don't render if no badge (e.g., tenant without Arriendo Pass)
  if (!badgeConfig) {
    return null;
  }

  const { label, shortLabel, icon: Icon, colors } = badgeConfig;
  const sizeConfig = SIZE_CONFIG[size];

  return (
    <div
      className={cn(
        'inline-flex items-center rounded-full border font-medium',
        colors.bg,
        colors.text,
        colors.border,
        sizeConfig.badge,
        className
      )}
      title={label}
    >
      <div
        className={cn(
          'flex items-center justify-center rounded-full',
          colors.iconBg,
          sizeConfig.iconWrapper
        )}
      >
        <Icon className={cn('text-white', sizeConfig.icon)} />
      </div>
      {showLabel && (
        <span className="pr-0.5">{size === 'sm' ? shortLabel : label}</span>
      )}
    </div>
  );
}

// ============================================================================
// Compact Avatar Badge (for header)
// ============================================================================

export interface AvatarSubscriptionIndicatorProps {
  variant: 'tenant' | 'landlord';
  tenantSubscription?: TenantSubscriptionTextT;
  planId?: PlanId;
  className?: string;
}

/**
 * Small indicator to show next to avatar in header
 */
export function AvatarSubscriptionIndicator({
  variant,
  tenantSubscription = 'none',
  planId = 'starter',
  className,
}: AvatarSubscriptionIndicatorProps) {
  // Get badge config based on variant
  const badgeConfig = variant === 'tenant'
    ? TENANT_BADGES[tenantSubscription]
    : LANDLORD_BADGES[planId];

  // Don't render for free tier landlords or tenants without pass
  if (!badgeConfig) {
    return null;
  }

  // For base tier landlords, only show if explicitly requested
  if (variant === 'landlord' && planId === 'starter') {
    return null;
  }

  const { icon: Icon, colors, shortLabel } = badgeConfig;

  return (
    <div
      className={cn(
        'flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium',
        colors.bg,
        colors.text,
        colors.border,
        'border',
        className
      )}
      title={badgeConfig.label}
    >
      <Icon className="w-3 h-3" />
      <span>{shortLabel}</span>
    </div>
  );
}

// ============================================================================
// User Avatar with Badge
// ============================================================================

export interface UserAvatarWithBadgeProps {
  name: string;
  avatar?: string;
  variant: 'tenant' | 'landlord';
  tenantSubscription?: TenantSubscriptionTextT;
  planId?: PlanId;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const AVATAR_SIZE_CONFIG = {
  sm: 'w-8 h-8 text-sm',
  md: 'w-10 h-10 text-base',
  lg: 'w-12 h-12 text-lg',
};

export function UserAvatarWithBadge({
  name,
  variant,
  tenantSubscription = 'none',
  planId = 'starter',
  size = 'md',
  className,
}: UserAvatarWithBadgeProps) {
  const initial = name?.charAt(0).toUpperCase() || 'U';

  // Get badge config (hide for base tier)
  const badgeConfig = variant === 'tenant'
    ? TENANT_BADGES[tenantSubscription]
    : (planId === 'starter' ? null : LANDLORD_BADGES[planId]);

  const hasBadge = !!badgeConfig;

  return (
    <div className={cn('relative inline-flex', className)}>
      {/* Avatar */}
      <div
        className={cn(
          'rounded-full bg-muted flex items-center justify-center font-medium text-plan-secondary',
          AVATAR_SIZE_CONFIG[size]
        )}
      >
        {initial}
      </div>

      {/* Badge indicator dot */}
      {hasBadge && (
        <div
          className={cn(
            'absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full flex items-center justify-center ring-2 ring-white dark:ring-card',
            badgeConfig.colors.iconBg
          )}
          title={badgeConfig.label}
        >
          <badgeConfig.icon className="w-2.5 h-2.5 text-white" />
        </div>
      )}
    </div>
  );
}
