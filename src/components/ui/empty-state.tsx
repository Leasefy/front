import type { Icon } from '@phosphor-icons/react';
import Link from 'next/link';
import { EmptyState as DSEmptyState } from '@leasefy/ui';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

/**
 * EmptyState — ADAPTER fino sobre el EmptyState de @leasefy/ui que preserva
 * la API local:
 * - icon: componente Phosphor (el DS espera un nodo) → se instancia duotone.
 * - action: { label, href } (el DS espera un nodo) → Button asChild + Link.
 * - Se conserva el contenedor con fondo del mvp (incl. dark:) — el DS
 *   renderiza el estado "flotante" sin canvas propio.
 * El interior (icono 40px primary sobre el dome de BrandMotif + tipografía)
 * es el brand moment del DS (§5 del brand contract).
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
    <div className={cn('rounded-xl bg-neutral-50/80 dark:bg-white/[0.03]', className)}>
      <DSEmptyState
        icon={<IconComponent weight="duotone" />}
        title={title}
        description={description}
        action={
          action ? (
            <Button asChild>
              <Link href={action.href}>{action.label}</Link>
            </Button>
          ) : undefined
        }
      />
    </div>
  );
}
