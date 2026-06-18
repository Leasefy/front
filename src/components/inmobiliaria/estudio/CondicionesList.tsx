'use client'

/**
 * CondicionesList — estudio de inquilino.
 *
 * Renders the derived "condiciones" (what would unlock / improve viability):
 * each row = an icon per `tipo` + the `detalle` text. Empty list → null.
 *
 * Icons are duotone phosphor, aria-hidden, brand-amber (these are conditions to
 * resolve, i.e. caution, not failures).
 */

import {
  UserPlus,
  FileText,
  Wallet,
  IdentificationCard,
  WarningCircle,
  type Icon,
} from '@phosphor-icons/react'

import type { EstudioCondition, EstudioConditionTipo } from '@/lib/estudio/decision'
import { useI18n } from '@/lib/i18n'
import { cn } from '@/lib/utils'

const TIPO_ICON: Record<EstudioConditionTipo, Icon> = {
  agregar_codeudor: UserPlus,
  cargar_documento: FileText,
  mejorar_soporte_ingresos: Wallet,
  confirmar_laboral: IdentificationCard,
  revisar_inconsistencia: WarningCircle,
}

export interface CondicionesListProps {
  condiciones: EstudioCondition[]
  className?: string
}

export function CondicionesList({ condiciones, className }: CondicionesListProps) {
  const { t } = useI18n()

  if (!condiciones || condiciones.length === 0) return null

  return (
    <ul role="list" className={cn('space-y-2', className)} data-testid="condiciones-list">
      {condiciones.map((cond, i) => {
        const Ico = TIPO_ICON[cond.tipo] ?? WarningCircle
        const key = `inmobiliaria.ai.estudio.condiciones.${cond.tipo}`
        const resolved = t(key)
        const tipoLabel = resolved === key ? null : resolved

        return (
          <li
            key={`${cond.tipo}-${i}`}
            className={cn(
              'flex items-start gap-2.5 rounded-lg border border-warning/30 bg-warning-soft px-3 py-2',
              cond.resuelta && 'opacity-60',
            )}
            data-tipo={cond.tipo}
          >
            <Ico
              className="w-4 h-4 mt-0.5 shrink-0 text-warning-700"
              weight="duotone"
              aria-hidden="true"
            />
            <div className="min-w-0 space-y-0.5">
              {tipoLabel && (
                <p className="text-xs font-medium uppercase tracking-wide text-warning-700">
                  {tipoLabel}
                </p>
              )}
              <p
                className={cn(
                  'text-sm leading-snug text-fg',
                  cond.resuelta && 'line-through',
                )}
              >
                {cond.detalle}
              </p>
            </div>
          </li>
        )
      })}
    </ul>
  )
}
