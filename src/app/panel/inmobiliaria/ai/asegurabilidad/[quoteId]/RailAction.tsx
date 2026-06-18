'use client'

/**
 * RailAction — asegurabilidad (ex-cotizador), zona DERECHA "Recomendación".
 *
 * Botón de acción rápida del rail: etiqueta a la izquierda, badge opcional a la
 * derecha. RBAC-gated (disabled + tooltip) por el padre. Espejo del RailAction
 * de estudio/cobranza — mismas clases base, mismos estados disabled.
 */

import { Button } from '@/components/ui/button'

interface RailActionProps {
  label: string
  disabled?: boolean
  disabledTooltip?: string
  badge?: string
  onClick: () => void
  testId?: string
}

export function RailAction({
  label,
  disabled = false,
  disabledTooltip,
  badge,
  onClick,
  testId,
}: RailActionProps) {
  return (
    <Button
      variant="outline"
      size="sm"
      hideArrow
      onClick={onClick}
      disabled={disabled}
      title={disabled ? disabledTooltip : undefined}
      data-testid={testId}
      className="w-full justify-between gap-2 text-left font-medium"
    >
      <span className="truncate">{label}</span>
      {badge && (
        <span className="shrink-0 rounded-full bg-warning-soft px-1.5 py-0.5 text-[10px] font-medium text-warning">
          {badge}
        </span>
      )}
    </Button>
  )
}
