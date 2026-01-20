import { Home } from 'lucide-react';
import { EmptyState } from './empty-state';
import { cn } from '@/lib/utils';

// ============================================================================
// Types
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
 * - Home icon indicating navigation
 * - Customizable title and description
 * - Default action to return to properties
 * - Built on EmptyState for consistency
 */
export function NotFound({
  title = 'Propiedad no encontrada',
  description = 'Esta propiedad ya no esta disponible o la URL es incorrecta.',
  action = { label: 'Ver todas las propiedades', href: '/propiedades' },
  className,
}: NotFoundProps) {
  return (
    <div className={cn('min-h-[400px] flex items-center justify-center', className)}>
      <EmptyState
        icon={Home}
        title={title}
        description={description}
        action={action}
      />
    </div>
  );
}
