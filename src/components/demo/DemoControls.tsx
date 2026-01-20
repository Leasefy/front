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
        'rounded-sm border border-slate-200 bg-white p-4 space-y-4',
        className
      )}
    >
      {/* Variant Selection */}
      <div className="space-y-2">
        <Label className="text-sm font-medium text-slate-700">Variante</Label>
        <div className="flex flex-wrap gap-2">
          {variants.map((v) => (
            <button
              key={v.value}
              type="button"
              onClick={() => onVariantChange(v.value)}
              className={cn(
                'flex flex-col items-start px-3 py-2 rounded-sm border text-left transition-colors',
                variant === v.value
                  ? 'border-primary bg-primary/5 text-primary'
                  : 'border-slate-200 hover:border-slate-300 text-slate-700'
              )}
            >
              <span className="text-sm font-medium">{v.label}</span>
              <span className="text-xs text-muted-foreground">{v.description}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Animation Controls */}
      <div className="flex items-center justify-between border-t border-slate-100 pt-4">
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={animationEnabled}
              onChange={onAnimationToggle}
              className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary"
            />
            <span className="text-sm text-slate-700">Animacion</span>
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
