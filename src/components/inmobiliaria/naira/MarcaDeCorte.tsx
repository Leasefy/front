'use client'

/**
 * MarcaDeCorte — la ÚNICA forma de pintar el corte (`asOf`) de un dato de Naira (Fase 13, plan 13-02; D13-8, UI-02,
 * UI-SPEC §6.1).
 *
 * La zona es fija (America/Bogota) porque el corte lo escribe `formatearCorte` de src/lib/naira/formato.ts; el
 * `formatDateTime` de src/lib/format.ts no fija zona y la del navegador no cuenta. El absoluto se pinta TAL CUAL lo da
 * `formatearCorte` (en mayúsculas solo por CSS): una sola forma de escribir un corte.
 *
 * La marca no decide si un dato está rancio (eso lo declara el servidor, FRESH-01): muestra la fecha y la edad para que
 * la persona juzgue. El reloj se fija al montar (`ahora` inyectable para los tests) y la edad no se refresca sola (P9).
 *
 * Fail-closed: un `asOf` inválido no tiene marca con fecha (sin `data-naira-asof`) y lo dice. Con datos de ejemplo no
 * hay fecha: dice «DATO DE EJEMPLO» (UI-SPEC §8.6 capa 2).
 */

import type { JSX } from 'react'
import { useState } from 'react'

import { useI18n } from '@/lib/i18n'
import { formatearCorte } from '@/lib/naira/formato'

import { useOrigenDeNaira } from './OrigenDeNaira'

export interface MarcaDeCorteProps {
  readonly asOf: string
  /** Reloj inyectable (tests); por defecto, el del montaje. */
  readonly ahora?: Date
}

const MINUTO_MS = 60_000
const HORA_MS = 60 * MINUTO_MS
const DIA_MS = 24 * HORA_MS

export function MarcaDeCorte({ asOf, ahora }: MarcaDeCorteProps): JSX.Element {
  const { t } = useI18n()
  const origen = useOrigenDeNaira()
  const [ahoraDeLaMarca] = useState(() => ahora ?? new Date())
  const corte = formatearCorte(asOf, ahoraDeLaMarca)

  if (origen === 'ejemplo') {
    return (
      <span
        data-naira-asof={asOf}
        data-naira-ejemplo="true"
        className="inline-flex items-baseline whitespace-nowrap text-overline tabular-nums text-fg-muted"
      >
        {t('inmobiliaria.ai.naira.corte.datoDeEjemplo')}
      </span>
    )
  }

  if (corte === null) {
    return <span className="text-sm text-fg-muted">{t('inmobiliaria.ai.naira.corte.sinCorte')}</span>
  }

  const edad = edadDelCorte(corte.edadMs, t)
  return (
    <span
      data-naira-asof={asOf}
      className="inline-flex items-baseline gap-1 whitespace-nowrap text-overline tabular-nums text-fg-muted"
    >
      <span className="uppercase tracking-widest">{t('inmobiliaria.ai.naira.corte.prefijo')}</span>
      <time
        dateTime={asOf}
        aria-label={t('inmobiliaria.ai.naira.corte.descripcion', { fecha: corte.absoluto, edad })}
        className="uppercase"
      >
        {corte.absoluto} · {edad}
      </time>
    </span>
  )
}

/** P9: menos de 1 min; minutos; horas; días (siempre hacia abajo). */
function edadDelCorte(edadMs: number, t: (clave: string, params?: Record<string, string | number>) => string): string {
  if (edadMs < MINUTO_MS) return t('inmobiliaria.ai.naira.corte.edadAhora')
  if (edadMs < HORA_MS) return t('inmobiliaria.ai.naira.corte.edadMinutos', { n: Math.floor(edadMs / MINUTO_MS) })
  if (edadMs < DIA_MS) return t('inmobiliaria.ai.naira.corte.edadHoras', { n: Math.floor(edadMs / HORA_MS) })
  return t('inmobiliaria.ai.naira.corte.edadDias', { n: Math.floor(edadMs / DIA_MS) })
}
