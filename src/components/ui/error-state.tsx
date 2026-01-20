import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

// ============================================================================
// Types
// ============================================================================

export interface ErrorStateProps {
  /** Error title */
  title?: string;
  /** Error description */
  description?: string;
  /** Optional retry callback */
  onRetry?: () => void;
  /** Additional CSS classes */
  className?: string;
}

// ============================================================================
// Component
// ============================================================================

/**
 * ErrorState - Reusable error state component with recovery action
 *
 * Features:
 * - Warning icon with destructive styling
 * - Customizable title and description
 * - Optional retry button
 * - Professional, non-alarming design
 */
export function ErrorState({
  title = 'Algo salio mal',
  description = 'No pudimos cargar esta pagina. Por favor intenta de nuevo.',
  onRetry,
  className,
}: ErrorStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center py-12 px-4 text-center',
        className
      )}
    >
      {/* Icon Container */}
      <div className="rounded-full bg-red-50 p-4 mb-4">
        <AlertTriangle className="h-8 w-8 text-red-500" />
      </div>

      {/* Title */}
      <h3 className="text-lg font-medium text-slate-900 mb-2">{title}</h3>

      {/* Description */}
      <p className="text-sm text-slate-500 mb-6 max-w-sm">{description}</p>

      {/* Retry Button */}
      {onRetry && (
        <Button onClick={onRetry} variant="outline">
          <RefreshCw className="h-4 w-4 mr-2" />
          Intentar de nuevo
        </Button>
      )}
    </div>
  );
}
