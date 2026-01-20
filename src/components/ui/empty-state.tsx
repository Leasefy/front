import { LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { cn } from '@/lib/utils';

// ============================================================================
// Types
// ============================================================================

export interface EmptyStateAction {
  label: string;
  href: string;
}

export interface EmptyStateProps {
  /** Icon to display */
  icon: LucideIcon;
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
    <div
      className={cn(
        'flex flex-col items-center justify-center py-12 px-4 text-center',
        className
      )}
    >
      {/* Icon Container */}
      <div className="rounded-full bg-slate-100 p-4 mb-4">
        <Icon className="h-8 w-8 text-slate-400" />
      </div>

      {/* Title */}
      <h3 className="text-lg font-medium text-slate-900 mb-2">{title}</h3>

      {/* Description */}
      <p className="text-sm text-slate-500 mb-6 max-w-sm">{description}</p>

      {/* Optional CTA */}
      {action && (
        <Button asChild>
          <Link href={action.href}>{action.label}</Link>
        </Button>
      )}
    </div>
  );
}
