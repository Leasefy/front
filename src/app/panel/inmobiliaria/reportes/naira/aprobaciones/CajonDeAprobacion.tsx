'use client'

/**
 * CajonDeAprobacion — el detalle de una fila de la tabla de Aprobaciones (Nico, 18-10-2026: «todo en una tabla»,
 * «Desde el cajón»). Una propuesta de acción abre su FICHA de siempre (`PropuestaClient` en modo cajón: recién al abrir se
 * pide el detalle, D13-14, y la decisión va con la huella que se ve); un cambio de modo abre `DetalleDelCambioDeModo`.
 * Al cerrarse, la tabla vuelve a leer lo que haya cambiado.
 */

import type { JSX } from 'react'

import { Cajon, CajonCabecera, CajonCuerpo } from '@/components/ui/cajon'
import { useI18n } from '@/lib/i18n'
import { DetalleDelCambioDeModo, tituloDelCambioDeModo } from '@/components/inmobiliaria/naira/DetalleDelCambioDeModo'
import { paraDeLaAccion, type FilaDeAprobacion } from '@/lib/naira/filas-de-aprobaciones'
import { CLAVE_DEL_TIPO_DE_ACCION } from '@/lib/naira/vocabulario-de-aprobaciones'

import { PropuestaClient } from './[proposalId]/PropuestaClient'

export interface CajonDeAprobacionProps {
  readonly fila: FilaDeAprobacion | null
  readonly onCerrar: () => void
  /** Algo se decidió adentro: la tabla vuelve a leer. */
  readonly onDecidido: () => void
}

function Cabecera({ fila }: { readonly fila: FilaDeAprobacion }): JSX.Element {
  const { t } = useI18n()
  if (fila.kind === 'modo') {
    return <CajonCabecera titulo={tituloDelCambioDeModo(t, fila.cambio)} descripcion={t('inmobiliaria.ai.naira.aprobaciones.tabla.cambioDeModo')} />
  }
  return <CajonCabecera titulo={t(CLAVE_DEL_TIPO_DE_ACCION[fila.accion.tipo])} descripcion={paraDeLaAccion(t, fila.accion)} />
}

export function CajonDeAprobacion({ fila, onCerrar, onDecidido }: CajonDeAprobacionProps): JSX.Element {
  return (
    <Cajon
      abierto={fila !== null}
      onOpenChange={(abierto) => {
        if (!abierto) onCerrar()
      }}
      tamano="lg"
      data-naira-cajon-de-aprobacion={fila?.kind ?? ''}
    >
      {fila === null ? null : (
        <>
          <Cabecera fila={fila} />
          {fila.kind === 'modo' ? (
            <DetalleDelCambioDeModo key={fila.cambio.id} cambio={fila.cambio} onDecidido={onDecidido} />
          ) : (
            <CajonCuerpo>
              <PropuestaClient key={fila.accion.proposalId} proposalId={fila.accion.proposalId} enCajon />
            </CajonCuerpo>
          )}
        </>
      )}
    </Cajon>
  )
}
