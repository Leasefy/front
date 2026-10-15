'use client'

/**
 * CifraDeNaira — el ÚNICO modo de pintar un número de Naira (Fase 13, plan 13-02; D13-8, UI-02, UI-SPEC §6.1 y §7.1).
 *
 * Valor + su corte (`MarcaDeCorte`) + el camino a su fuente (`EnlaceALaFuente`) en UN contenedor: el `asOf` vive pegado a
 * su número (FG13-5), nunca en un pie de página ni solo en un tooltip.
 *
 * El valor lo escribe `formatearValorDeNaira` (la misma fórmula del agente), nunca un parseo propio del front; si el
 * contrato trae `valorRenderizado` (E13-13, D13-23), ese texto del agente es el que se pinta, tal cual.
 *
 * Orden (P10), cada paso corta:
 *   1. corte inválido o ilegible ⇒ «Dato sin corte: no lo mostramos» (sin número) y un aviso de consola sin valores,
 *      solo fuera de producción;
 *   2. unidad conocida y valor ilegible ⇒ «No pude leer este dato» (jamás un 0, un guion ni un vacío);
 *   3. unidad desconocida ⇒ el valor crudo en mono y la unidad al lado, sin adivinar el formato;
 *   4. número + marca + enlace.
 */

import type { JSX } from 'react'
import { useState } from 'react'

import { METRIC_UNITS } from '@/lib/api/naira/contrato'
import { useI18n } from '@/lib/i18n'
import { formatearCorte, formatearValorDeNaira } from '@/lib/naira/formato'

import { EnlaceALaFuente, type FuenteDelDato } from './EnlaceALaFuente'
import { MarcaDeCorte } from './MarcaDeCorte'
import { useOrigenDeNaira } from './OrigenDeNaira'

export interface CifraDeNairaProps {
  /** Decimal en string, del contrato. */
  readonly valor: string
  /** METRIC_UNITS ⇒ formatearValorDeNaira; otra ⇒ valor crudo en mono + la unidad en text-fg-muted. */
  readonly unidad: string
  readonly asOf: string
  readonly de: FuenteDelDato
  readonly referenciaTecnica?: string
  readonly ahora?: Date
  /** El valor que ya formateó el agente (E13-13, D13-23); si viene no vacío se pinta TAL CUAL. */
  readonly valorRenderizado?: string
}

type UnidadDeNaira = (typeof METRIC_UNITS)[number]

function esUnidadDeNaira(unidad: string): unidad is UnidadDeNaira {
  return METRIC_UNITS.some((u) => u === unidad)
}

export function CifraDeNaira({
  valor,
  unidad,
  asOf,
  de,
  referenciaTecnica,
  ahora,
  valorRenderizado,
}: CifraDeNairaProps): JSX.Element {
  const { t } = useI18n()
  const esEjemplo = useOrigenDeNaira() === 'ejemplo'
  const [ahoraDeLaCifra] = useState(() => ahora ?? new Date())

  if (formatearCorte(asOf, ahoraDeLaCifra) === null) {
    if (process.env.NODE_ENV !== 'production') console.warn('Naira: cifra sin corte valido; no se pinta (D13-8)')
    return <span className="text-sm text-fg-muted">{t('inmobiliaria.ai.naira.corte.sinCorte')}</span>
  }

  const delAgente = valorRenderizado !== undefined && valorRenderizado.trim() !== '' ? valorRenderizado : null
  let texto: string | null
  let unidadCruda: string | null = null
  if (delAgente !== null) {
    texto = delAgente
  } else if (esUnidadDeNaira(unidad)) {
    texto = formatearValorDeNaira(valor, unidad)
  } else {
    texto = valor
    unidadCruda = unidad
  }

  if (texto === null) {
    return <span className="text-sm text-fg-muted">{t('inmobiliaria.ai.naira.cifra.noLeida')}</span>
  }

  return (
    <div data-naira-cifra="" className="flex min-w-0 flex-col gap-1 md:flex-row md:flex-wrap md:items-baseline md:gap-3">
      <span className="inline-flex items-baseline gap-1">
        <data
          value={valor}
          data-naira-numero=""
          data-naira-ejemplo={esEjemplo ? 'true' : undefined}
          className="whitespace-nowrap font-mono text-base font-semibold tabular-nums text-fg"
        >
          {texto}
        </data>
        {unidadCruda !== null ? <span className="text-sm text-fg-muted">{unidadCruda}</span> : null}
      </span>
      <MarcaDeCorte asOf={asOf} ahora={ahoraDeLaCifra} />
      <EnlaceALaFuente de={de} referenciaTecnica={referenciaTecnica} />
    </div>
  )
}
