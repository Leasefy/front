'use client'

/**
 * CarrierLabelChips — visión #12.
 *
 * Small DS chips that surface the comparative "etiquetas" derived (purely)
 * in `src/lib/cotizador/carrier-labels.ts`. Rendered per matriz row so the
 * operator can scan "más rápida / menor costo / requiere codeudor" at a glance
 * without opening each carrier.
 *
 * UI-DS-CONTRACT §3: usa el <Chip> del DS (rounded-md), no pills hechas a mano.
 * Estas etiquetas son comparativas (no interactivas) → el chip se renderiza en
 * estado `selected` (relleno primary-soft) y los tints semánticos (verde =
 * comparativa positiva, ámbar = requiere algo, rojo = negativa) se aplican vía
 * tokens del DS (success/warning/danger), sin hex inline.
 *
 * t()-with-fallback: every label has a hardcoded es-CO fallback so a missing
 * key never renders raw.
 */

import * as React from 'react'
import { Chip } from '@leasefy/ui'
import { useI18n } from '@/lib/i18n'
import { cn } from '@/lib/utils'
import type { CarrierLabel } from '@/lib/cotizador/carrier-labels'

interface LabelMeta {
  /** i18n key suffix under inmobiliaria.ai.cotizador.labels.* */
  key: string
  /** es-CO fallback so a missing key never shows raw. */
  fallback: string
  /** semantic token tint (overrides the default primary-soft selected fill). */
  cls: string
}

const LABEL_META: Record<CarrierLabel, LabelMeta> = {
  mas_rapida: {
    key: 'mas_rapida',
    fallback: 'Más rápida',
    cls: 'bg-success-soft text-success',
  },
  menor_costo: {
    key: 'menor_costo',
    fallback: 'Menor costo',
    cls: 'bg-success-soft text-success',
  },
  mejor_cobertura: {
    key: 'mejor_cobertura',
    fallback: 'Mejor cobertura',
    cls: 'bg-primary-soft text-primary',
  },
  menor_friccion: {
    key: 'menor_friccion',
    fallback: 'Menor fricción',
    cls: 'bg-primary-soft text-primary',
  },
  requiere_codeudor: {
    key: 'requiere_codeudor',
    fallback: 'Requiere codeudor',
    cls: 'bg-warning-soft text-warning',
  },
  no_recomendada: {
    key: 'no_recomendada',
    fallback: 'No recomendada',
    cls: 'bg-danger-soft text-danger',
  },
}

interface CarrierLabelChipsProps {
  labels: CarrierLabel[]
  className?: string
}

export function CarrierLabelChips({ labels, className }: CarrierLabelChipsProps) {
  const { t } = useI18n()
  const tf = (k: string, fb: string) => {
    const r = t(k)
    return r === k ? fb : r
  }

  if (!labels || labels.length === 0) return null

  return (
    <div className={cn('flex flex-wrap items-center gap-1.5', className)}>
      {labels.map(label => {
        const meta = LABEL_META[label]
        if (!meta) return null
        return (
          <Chip
            key={label}
            size="sm"
            selected
            // Display-only comparative label (no toggling). Override the default
            // primary-soft selected fill with the semantic token tint.
            tabIndex={-1}
            className={cn('cursor-default pointer-events-none', meta.cls)}
          >
            {tf(`inmobiliaria.ai.cotizador.labels.${meta.key}`, meta.fallback)}
          </Chip>
        )
      })}
    </div>
  )
}
