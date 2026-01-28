import { LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
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
    <Card className={cn('border-0 shadow-none', className)}>
      <CardContent className="flex flex-col items-center justify-center py-12 px-4 text-center">
        {/* Icon Container */}
        <div className="rounded-full bg-muted p-4 mb-4">
          <Icon className="h-8 w-8 text-muted-foreground" />
        </div>

        {/* Title */}
        <h3 className={cn('text-lg font-medium mb-2', 'text-foreground')}>{title}</h3>

        {/* Description */}
        <p className={cn('text-sm mb-6 max-w-sm', 'text-muted-foreground')}>{description}</p>

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
