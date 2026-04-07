import type { Icon } from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { cn } from '@/lib/utils';

// ============================================================================
// TextTs
// ============================================================================

export interface EmptyStateAction {
  label: string;
  href: string;
}

export interface EmptyStateProps {
  /** Icon to display */
  icon: Icon;
  /** Main title text */
  title: string;
  /** Description text */
  description: string;
  /** Optional CTA button */
  action?: EmptyStateAction;
  /** Additional CSS classes */
  className?: string;
}

// ============================================================================
// Component
// ============================================================================

/**
 * EmptyState - Reusable empty state component for lists and pages
 *
 * Features:
 * - Centered icon with muted background
 * - Title and description text
 * - Optional call-to-action button
 * - Consistent styling across the app
 */
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div className={cn('rounded-2xl bg-neutral-50/80 dark:bg-white/[0.03]', className)}>
      <div className="flex flex-col items-center justify-center py-14 px-6 text-center">
        {/* Icon */}
        <div className="w-14 h-14 rounded-2xl bg-white dark:bg-white/[0.06] flex items-center justify-center mb-5 shadow-sm dark:shadow-none">
          <Icon className="h-6 w-6 text-neutral-400 dark:text-neutral-500" />
        </div>

        {/* Title */}
        <h3 className="text-base font-semibold text-foreground mb-1.5">{title}</h3>

        {/* Description */}
        <p className="text-sm text-muted-foreground max-w-sm leading-relaxed mb-6">{description}</p>

        {/* Optional CTA */}
        {action && (
          <Button asChild>
            <Link href={action.href}>{action.label}</Link>
          </Button>
        )}
      </div>
    </div>
  );
}
