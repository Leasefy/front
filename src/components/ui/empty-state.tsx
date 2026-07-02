import type { Icon } from '@phosphor-icons/react';
import Link from 'next/link';
import { EmptyState as CadenceEmptyState } from '@leasefy/cadence';
import { Button } from '@/components/ui/button';

/**
 * EmptyState — thin wrapper over the Cadence `EmptyState`.
 *
 * Renders the Cadence brand moment: a white Phosphor icon on the signature
 * grainy cobalt→cyan gradient tile, ink title + muted description, and an
 * optional CTA as a Cadence pill `Button` (secondary white pill, next/link).
 *
 * The local prop API is preserved exactly so the 27 importers keep working:
 *   - `icon` is still a Phosphor `Icon` component (rendered as a node here).
 *   - `action` is still `{ label, href }` (mapped to the DS `action` slot).
 */

// ============================================================================
// Types (API local intacta)
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

export function EmptyState({
  icon: IconComponent,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <CadenceEmptyState
      icon={<IconComponent aria-hidden="true" />}
      title={title}
      description={description}
      className={className}
      action={
        action ? (
          <Button asChild variant="secondary" size="sm">
            <Link href={action.href}>{action.label}</Link>
          </Button>
        ) : undefined
      }
    />
  );
}
