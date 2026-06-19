'use client'

/**
 * BadgeFuente — la etiqueta de PROCEDENCIA de un resultado de asegurabilidad.
 *
 * Regla dura de honestidad: hoy TODO el backend de aseguradoras es stub (no
 * hay portales reales). Por eso cada resultado debe ir etiquetado como
 * "Estimado · Prevalidación Leasefy", NUNCA como "Confirmado por la
 * aseguradora". El flag `stub_mode` del stream manda: true → estimado.
 * Cuando algún día `stub_mode` sea false (portal real conectado), el badge
 * pasa a "Confirmado por la aseguradora" (verde).
 *
 * Formas de uso (W1/W2):
 *   <BadgeFuente stubMode={carrier.stub_mode} />   // deriva estimado|confirmado
 *   <BadgeFuente fuente="manual" />                 // forzar revisión manual
 *
 * Estilo (brand-pass 2026-06-16): badge sutil tipo pill. Estimado = neutro con
 * un toque ámbar muy desaturado (señal "guía, no veredicto"); Confirmado =
 * verde desaturado (señal real positiva); Manual = neutro mudo. El azul de
 * marca #1A40FF NO se usa aquí — no es un CTA, es una etiqueta de estado.
 * Tooltip Radix (hover/focus) explica la diferencia entre estimado y confirmado.
 */

import * as React from 'react'
import { SealCheck, Sparkle, UserFocus } from '@phosphor-icons/react'
import type { Icon } from '@phosphor-icons/react'
import { useI18n } from '@/lib/i18n'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

const NS = 'inmobiliaria.ai.cotizador.detalle.fuente'

export type FuenteVariant = 'estimado' | 'confirmado' | 'manual'

export interface BadgeFuenteProps {
  /**
   * Flag `stub_mode` del stream. true → "estimado", false → "confirmado".
   * Se ignora si se pasa `fuente` explícito.
   */
  stubMode?: boolean
  /** Variante explícita; tiene prioridad sobre `stubMode`. */
  fuente?: FuenteVariant
  /** Oculta el ícono (útil en filas densas / matriz). */
  hideIcon?: boolean
  className?: string
}

interface VariantMeta {
  /** Clave i18n del label. */
  labelKey: string
  /** Clave i18n del tooltip (undefined → sin tooltip, p. ej. manual). */
  tooltipKey?: string
  Icon: Icon
  /** Clases del pill (borde + fondo + texto), con dark mode. */
  cls: string
}

const VARIANT_META: Record<FuenteVariant, VariantMeta> = {
  // Neutro con ámbar muy desaturado — "guía, todavía no es veredicto".
  estimado: {
    labelKey: 'estimado',
    tooltipKey: 'estimadoTooltip',
    Icon: Sparkle,
    cls:
      'border-[#B7791F]/25 dark:border-[#B7791F]/35 ' +
      'bg-[#FBF4E6] dark:bg-[#B7791F]/15 ' +
      'text-[#8A5A12] dark:text-[#E0B560]',
  },
  // Verde desaturado — señal real positiva.
  confirmado: {
    labelKey: 'confirmado',
    tooltipKey: 'confirmadoTooltip',
    Icon: SealCheck,
    cls:
      'border-[#2C7A53]/30 dark:border-[#2C7A53]/40 ' +
      'bg-[#E8F3EC] dark:bg-[#2C7A53]/15 ' +
      'text-[#2C7A53] dark:text-[#3EAE70]',
  },
  // Neutro mudo — sin tooltip (es autoexplicativo).
  manual: {
    labelKey: 'manual',
    Icon: UserFocus,
    cls:
      'border-neutral-200 dark:border-neutral-700 ' +
      'bg-neutral-100 dark:bg-neutral-800/60 ' +
      'text-neutral-600 dark:text-neutral-300',
  },
}

/** Deriva la variante: `fuente` explícito gana; si no, stub_mode → estimado/confirmado. */
export function resolveFuenteVariant(props: Pick<BadgeFuenteProps, 'fuente' | 'stubMode'>): FuenteVariant {
  if (props.fuente) return props.fuente
  // stub_mode === true → estimado (default seguro cuando es undefined: estimado).
  return props.stubMode === false ? 'confirmado' : 'estimado'
}

export function BadgeFuente({ stubMode, fuente, hideIcon = false, className }: BadgeFuenteProps) {
  const { t } = useI18n()
  const variant = resolveFuenteVariant({ fuente, stubMode })
  const meta = VARIANT_META[variant]
  const label = t(`${NS}.${meta.labelKey}`)

  const pill = (
    <span
      className={[
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5',
        'text-[11px] font-medium leading-none whitespace-nowrap',
        meta.cls,
        className ?? '',
      ]
        .join(' ')
        .trim()}
    >
      {!hideIcon && <meta.Icon weight="fill" className="h-3 w-3 shrink-0" aria-hidden="true" />}
      {label}
    </span>
  )

  // Manual no lleva tooltip — es autoexplicativo.
  if (!meta.tooltipKey) {
    return pill
  }

  return (
    <TooltipProvider>
      <Tooltip>
        {/* asChild + tabIndex hace el badge enfocable por teclado para abrir el tooltip. */}
        <TooltipTrigger asChild>
          <span tabIndex={0} className="cursor-help outline-none focus-visible:ring-2 focus-visible:ring-[#1A40FF]/40 rounded-full">
            {pill}
          </span>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs text-xs leading-relaxed">
          {t(`${NS}.${meta.tooltipKey}`)}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
