'use client'

/**
 * EnlaceALaFuente — de un dato de Naira a la pantalla del panel donde se ve su fuente (Fase 13, plan 13-02; D13-7,
 * UI-02, UI-SPEC §6.2).
 *
 * La ruta sale SOLO de los mapas cerrados de 13-01 (`rutaDeLaMetrica` / `rutaDeLaFuente`): jamás un `href` que venga del
 * agente ni uno armado con su texto (el ANTI es PilotoCajon.tsx:498-518, que pintaba los enlaces del micro tal cual). La
 * etiqueta y el gate son los de la pantalla destino (`destinoDeLaRuta`): «Ver en Cartera» solo si el rol puede abrir
 * Cartera. En v1 el destino es el LISTADO de la fuente (U7).
 *
 * Nunca un enlace roto (docs/DESIGN.md §20): sin ruta, sin permiso o con datos de ejemplo se dice por qué, sin enlace.
 * La `fuente` cruda del contrato es un nombre interno de tabla: no es texto visible; solo va, si se pasa, como
 * «Referencia técnica» dentro de un popover (texto, nunca un destino).
 */

import type { JSX } from 'react'
import type { ReactNode } from 'react'
import Link from 'next/link'
import { ArrowSquareOut, Info } from '@phosphor-icons/react'

import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { usePermissionsContext } from '@/lib/context/PermissionsContext'
import { useI18n } from '@/lib/i18n'
import { destinoDeLaRuta } from '@/lib/naira/destinos-del-drill-down'
import { rutaDeLaFuente, rutaDeLaMetrica } from '@/lib/naira/fuente-a-ruta'

import { useOrigenDeNaira } from './OrigenDeNaira'

export type FuenteDelDato =
  | { readonly kind: 'metrica'; readonly metricId: string }
  | { readonly kind: 'fuente'; readonly fuente: string }

export interface EnlaceALaFuenteProps {
  readonly de: FuenteDelDato
  /** La `fuente` cruda (nombre de tabla) SOLO para el popover. */
  readonly referenciaTecnica?: string
}

type EstadoDelEnlace = 'activo' | 'sin-permiso' | 'sin-ruta' | 'inactivo-ejemplo'

export function EnlaceALaFuente({ de, referenciaTecnica }: EnlaceALaFuenteProps): JSX.Element {
  const { t } = useI18n()
  const { canAccess, isAdmin, agencyRole } = usePermissionsContext()
  const esEjemplo = useOrigenDeNaira() === 'ejemplo'
  const ruta = de.kind === 'metrica' ? rutaDeLaMetrica(de.metricId) : rutaDeLaFuente(de.fuente)
  const destino = ruta === null ? null : destinoDeLaRuta(ruta)

  let estado: EstadoDelEnlace
  let contenido: ReactNode
  if (esEjemplo) {
    estado = 'inactivo-ejemplo'
    contenido = <span className="text-sm text-fg-muted">{t('inmobiliaria.ai.naira.fuente.inactivoEjemplo')}</span>
  } else if (ruta === null || destino === null) {
    estado = 'sin-ruta'
    contenido = <span className="text-sm text-fg-muted">{t('inmobiliaria.ai.naira.fuente.sinPantalla')}</span>
  } else if (
    !canAccess(destino.modulo, 'view') ||
    // La misma puerta por rol que la fila del panel (`pasaGateDeFila`): el administrador pasa; si no, su rol.
    (destino.roles !== undefined && destino.roles.length > 0 && !isAdmin && (agencyRole === null || !destino.roles.includes(agencyRole)))
  ) {
    estado = 'sin-permiso'
    contenido = (
      <span className="text-sm text-fg-muted">
        {t('inmobiliaria.ai.naira.fuente.rolSinAcceso', { modulo: t(destino.etiquetaKey) })}
      </span>
    )
  } else {
    estado = 'activo'
    contenido = (
      <Link
        href={ruta}
        className="inline-flex items-center gap-1 text-sm text-fg-muted underline underline-offset-2 hover:text-primary"
      >
        {t('inmobiliaria.ai.naira.fuente.verEn', { modulo: t(destino.etiquetaKey) })}
        <ArrowSquareOut className="h-4 w-4" aria-hidden="true" />
      </Link>
    )
  }

  return (
    <span data-naira-enlace={estado} className="inline-flex flex-wrap items-center gap-2">
      {contenido}
      {referenciaTecnica ? (
        <Popover>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-11 w-11 lg:h-9 lg:w-9"
              aria-label={t('inmobiliaria.ai.naira.fuente.verReferenciaTecnica')}
            >
              <Info className="h-4 w-4" aria-hidden="true" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="max-w-xs space-y-1">
            <p className="text-overline text-fg-muted">{t('inmobiliaria.ai.naira.fuente.referenciaTecnica')}</p>
            <p className="break-all font-mono text-caption text-fg">{referenciaTecnica}</p>
          </PopoverContent>
        </Popover>
      ) : null}
    </span>
  )
}
