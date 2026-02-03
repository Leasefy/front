'use client';

import { RefreshCw } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

// ============================================================================
// Types
// ============================================================================

export type DisplayVariant = 'compact' | 'full' | 'embedded';

export interface DemoControlsProps {
  /** Current display variant */
  variant: DisplayVariant;
  /** Callback when variant changes */
  onVariantChange: (variant: DisplayVariant) => void;
  /** Whether animation is enabled */
  animationEnabled: boolean;
  /** Callback when animation toggle changes */
  onAnimationToggle: () => void;
  /** Callback to replay animation */
  onReplayAnimation: () => void;
  /** Additional CSS classes */
  className?: string;
}

// ============================================================================
// Component
// ============================================================================

/**
 * DemoControls - Configuration controls for testing risk score display
 *
 * Provides:
 * - Radio buttons for variant selection (compact/full/embedded)
 * - Checkbox for animation enable/disable
 * - Button to replay animation
 *
 * Used in demo/testing pages for developer-friendly testing.
 */
export function DemoControls({
  variant,
  onVariantChange,
  animationEnabled,
  onAnimationToggle,
  onReplayAnimation,
  className,
}: DemoControlsProps) {
  const variants: { value: DisplayVariant; label: string; description: string }[] = [
    { value: 'full', label: 'Completo', description: 'Todas las secciones' },
    { value: 'compact', label: 'Compacto', description: 'Solo badge y score' },
    { value: 'embedded', label: 'Embebido', description: 'Sin borde exterior' },
  ];

  return (
    <div
      className={cn(
        'rounded-sm border border-border bg-card p-4 space-y-4',
        className
      )}
    >
      {/* Variant Selection */}
      <div className="space-y-2">
        <Label className="text-sm font-medium text-foreground">Variante</Label>
        <div className="grid grid-cols-3 gap-2">
          {variants.map((v) => (
            <button
              key={v.value}
              type="button"
              onClick={() => onVariantChange(v.value)}
              className={cn(
                'flex flex-col items-start px-3 py-2 rounded-sm border text-left transition-colors min-w-0',
                variant === v.value
                  ? 'border-primary bg-primary/5 text-primary'
                  : 'border-border hover:border-border text-foreground'
              )}
            >
              <span className="text-sm font-medium truncate w-full">{v.label}</span>
              <span className="text-xs text-muted-foreground truncate w-full hidden sm:block">{v.description}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Animation Controls */}
      <div className="flex items-center justify-between border-t border-border pt-4">
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={animationEnabled}
              onChange={onAnimationToggle}
              className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
            />
            <span className="text-sm text-foreground">Animacion</span>
          </label>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={onReplayAnimation}
          disabled={!animationEnabled}
          className="gap-2"
        >
          <RefreshCw className="h-3 w-3" />
          Repetir
        </Button>
      </div>
    </div>
  );
}
