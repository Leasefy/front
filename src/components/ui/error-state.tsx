import { ArrowsClockwise } from '@phosphor-icons/react';
import { ErrorState as DSErrorState } from '@leasefy/ui';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

/**
 * ErrorState — ADAPTER fino sobre el ErrorState de @leasefy/ui que preserva
 * la API local (title/description/onRetry, todos opcionales con defaults en
 * español):
 * - description → prop `message` del DS.
 * - Se conserva el canvas del mvp (Card con tinte danger) — el DS renderiza
 *   el estado "flotante" sin contenedor.
 * - El CTA de retry se pasa como `action` para conservar el botón outline
 *   con icono y el label "Intentar de nuevo" del mvp.
 * El interior (icono duotone sobre BrandMotif + tipografía) es del DS.
 */

// ============================================================================
// Types (API local intacta)
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

export function ErrorState({
  title = 'Algo salió mal',
  description = 'No pudimos cargar esta página. Por favor intenta de nuevo.',
  onRetry,
  className,
}: ErrorStateProps) {
  return (
    <Card className={cn('border border-[#C4503B]/30 bg-[#F8EAE7]/30', className)}>
      <CardContent className="p-0">
        <DSErrorState
          title={title}
          message={description}
          className="py-16 px-6"
          action={
            onRetry ? (
              <Button onClick={onRetry} variant="outline" className="gap-2">
                <ArrowsClockwise className="h-4 w-4" />
                Intentar de nuevo
              </Button>
            ) : undefined
          }
        />
      </CardContent>
    </Card>
  );
}
