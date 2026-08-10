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

/**
 * La acción del estado vacío: o lleva a algún lado, o hace algo acá.
 *
 * El `onClick` existe por un caso concreto: cuando la lista está vacía **porque
 * la consulta falló**, lo que corresponde ofrecer es reintentar, no navegar a
 * otra parte. Antes sólo había `href`, así que esas pantallas terminaban
 * diciendo «no hay nada» sin salida.
 */
export type EmptyStateAction =
  | { label: string; href: string; onClick?: never }
  | { label: string; onClick: () => void; href?: never };

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
        !action ? undefined : action.href ? (
          <Button asChild variant="secondary" size="sm">
            <Link href={action.href}>{action.label}</Link>
          </Button>
        ) : (
          <Button variant="secondary" size="sm" onClick={action.onClick}>
            {action.label}
          </Button>
        )
      }
    />
  );
}
