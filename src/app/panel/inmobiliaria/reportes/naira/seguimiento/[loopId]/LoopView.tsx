'use client'

/**
 * LoopView.tsx — lo que pinta un `ok` de la ficha de un loop de Naira (Fase 13, plan 13-04; UI-SPEC §7.4, §11.1): un `h1`
 * y la bitácora. No importa ningún hook: recibe el detalle del ok por props.
 */

import type { JSX } from 'react'

import { BitacoraDelLoop } from '@/components/inmobiliaria/naira/BitacoraDelLoop'
import type { NairaOpenLoopDetail } from '@/lib/api/naira/contrato'
import { useI18n } from '@/lib/i18n'

export interface LoopViewProps {
  readonly detalle: NairaOpenLoopDetail
  /** `null` ⇒ sin «Ver la señal». */
  readonly hrefDeLaSenal: string | null
}

export function LoopView({ detalle, hrefDeLaSenal }: LoopViewProps): JSX.Element {
  const { t } = useI18n()
  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight leading-tight text-fg">{t('inmobiliaria.ai.naira.bitacora.titulo')}</h1>
      </header>
      <BitacoraDelLoop detalle={detalle} hrefDeLaSenal={hrefDeLaSenal} />
    </div>
  )
}
