import { House } from '@phosphor-icons/react';
import { EmptyState } from './empty-state';
import { cn } from '@/lib/utils';

// ============================================================================
// TextTs
// ============================================================================

export interface NotFoundProps {
  /** Custom title (defaults to property not found) */
  title?: string;
  /** Custom description */
  description?: string;
  /** Custom action (defaults to view all properties) */
  action?: {
    label: string;
    href: string;
  };
  /** Additional CSS classes */
  className?: string;
}

// ============================================================================
// Component
// ============================================================================

/**
 * NotFound - 404 state component for missing resources
 *
 * Features:
 * - House icon indicating navigation
 * - Customizable title and description
 * - Default action to return to properties
 * - Built on EmptyState for consistency
 */
export function NotFound({
  title = 'Propiedad no encontrada',
  description = 'Esta propiedad ya no está disponible o la URL es incorrecta.',
  action = { label: 'Ver todas las propiedades', href: '/propiedades' },
  className,
}: NotFoundProps) {
  return (
    <div className={cn('min-h-[400px] flex items-center justify-center', className)}>
      <EmptyState
        icon={House}
        title={title}
        description={description}
        action={action}
      />
    </div>
  );
}
