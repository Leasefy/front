import type { Icon } from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
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
    <Card className={cn('border border-dashed border-border bg-muted/50', className)}>
      <CardContent className="flex flex-col items-center justify-center py-16 px-6 text-center">
        {/* Icon Container - Premium gradient background */}
        <div className="relative mb-6">
          <div className="absolute inset-0 bg-[black]/10 rounded-sm blur-xl" />
          <div className="relative rounded-sm bg-gradient-to-br from-black/10 to-[black]/5 p-5 border border-[black]/10">
            <Icon className="h-8 w-8 text-[black]" />
          </div>
        </div>

        {/* Title */}
        <h3 className="text-lg font-semibold text-foreground mb-2">{title}</h3>

        {/* Description */}
        <p className="text-sm text-muted-foreground mb-8 max-w-sm leading-relaxed">{description}</p>

        {/* Optional CTA */}
        {action && (
          <Button asChild>
            <Link href={action.href}>{action.label}</Link>
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
