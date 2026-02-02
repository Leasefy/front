import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Card, CardContent } from '@/components/ui/card';
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
    <Card className={cn('border border-red-100 bg-red-50/30', className)}>
      <CardContent className="flex flex-col items-center justify-center py-16 px-6 text-center">
        {/* Icon Container - Soft error styling */}
        <div className="relative mb-6">
          <div className="absolute inset-0 bg-red-500/10 rounded-2xl blur-xl" />
          <div className="relative rounded-2xl bg-gradient-to-br from-red-100 to-red-50 p-5 border border-red-200/50">
            <AlertTriangle className="h-8 w-8 text-red-500" />
          </div>
        </div>

        {/* Title */}
        <h3 className="text-lg font-semibold text-foreground mb-2">{title}</h3>

        {/* Description */}
        <p className="text-sm text-muted-foreground mb-8 max-w-sm leading-relaxed">{description}</p>

        {/* Retry Button */}
        {onRetry && (
          <Button onClick={onRetry} variant="outline" className="gap-2">
            <RefreshCw className="h-4 w-4" />
            Intentar de nuevo
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
