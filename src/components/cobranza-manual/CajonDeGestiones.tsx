'use client'

/**
 * El cajón de las gestiones de una fila de Cartera (COBRANZA-MANUAL,
 * 04-10-2026): el historial de la persona (lo del equipo y lo del agente) y
 * «Registrar gestión», sin salir de la Cartera.
 */
import * as React from 'react'

import { Cajon, CajonCabecera, CajonCuerpo } from '@/components/ui/cajon'
import type { QuienEs } from '@/lib/api/cobranza-manual.types'
import { GestionesDeLaPersona } from './GestionesDeLaPersona'

export function CajonDeGestiones({
  abierto,
  onCerrar,
  quien,
  nombre,
  detalle,
}: {
  abierto: boolean
  onCerrar: () => void
  quien: QuienEs
  nombre: string | null
  /** El inmueble y el mes de la fila, para saber de qué se habla. */
  detalle?: string | null
}) {
  return (
    <Cajon abierto={abierto} onOpenChange={(a) => !a && onCerrar()} tamano="md" data-testid="cajon-de-gestiones">
      <CajonCabecera titulo={nombre ?? 'Gestiones de cobro'} descripcion={detalle ?? undefined} />
      <CajonCuerpo>
        {abierto ? <GestionesDeLaPersona quien={quien} nombre={nombre} /> : null}
      </CajonCuerpo>
    </Cajon>
  )
}

void React
