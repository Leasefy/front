'use client'

/**
 * RailAction — estudio de inquilino, zona DERECHA "Recomendación".
 *
 * Botón de acción rápida del rail: etiqueta a la izquierda, badge opcional a la
 * derecha. RBAC-gated (disabled + tooltip) por el rail. Espejo del RailAction de
 * cobranza (DebtorActionRail) — mismas clases base, mismos estados disabled.
 */

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
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={disabled ? disabledTooltip : undefined}
      data-testid={testId}
      className="w-full flex items-center justify-between gap-2 rounded-md border border-border bg-surface px-3 py-2 text-left transition-colors hover:bg-surface-hover disabled:opacity-50 disabled:cursor-not-allowed motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <span className="text-sm font-medium text-fg">
        {label}
      </span>
      {badge && (
        <span className="shrink-0 text-xs px-1.5 py-0.5 rounded-full bg-warning-soft text-warning-700">
          {badge}
        </span>
      )}
    </button>
  )
}
