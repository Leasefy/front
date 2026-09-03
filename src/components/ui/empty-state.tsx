import type { Icon } from '@phosphor-icons/react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

/**
 * EmptyState — el estado vacío del panel.
 *
 * Antes delegaba en el `EmptyState` de cadence, que pinta el icono sobre una
 * loseta con gradiente cobalto→cian. Nico (2026-09-03): «hay unos gradientes
 * horribles en esos empty states… todo lo de empty states manejalo en grises
 * como lo hemos hecho para otras opciones, y siempre todo encerrado en
 * círculos». Como este wrapper es el único que importan las ~130 pantallas,
 * el cambio de cara se hace acá una sola vez: icono en un círculo gris
 * (`bg-surface-muted`), título en tinta, descripción apagada, CTA secundaria.
 *
 * La API de props se conserva tal cual:
 *   - `icon` sigue siendo un `Icon` de Phosphor.
 *   - `action` sigue siendo `{ label, href }` o `{ label, onClick }`.
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
    <div
      className={cn('flex flex-col items-center justify-center px-6 py-12 text-center', className)}
      data-testid="empty-state"
    >
      <span
        className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-surface-muted text-fg-muted"
        aria-hidden="true"
      >
        <IconComponent className="h-6 w-6" weight="duotone" />
      </span>
      <p className="text-[15px] font-semibold text-fg">{title}</p>
      <p className="mx-auto mt-1 max-w-sm text-sm leading-relaxed text-fg-muted">{description}</p>
      {action && (
        <div className="mt-5">
          {action.href ? (
            <Button asChild variant="secondary" size="sm">
              <Link href={action.href}>{action.label}</Link>
            </Button>
          ) : (
            <Button variant="secondary" size="sm" onClick={action.onClick}>
              {action.label}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
