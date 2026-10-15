'use client'

/**
 * NairaApagada — Naira no está habilitada para la agencia (Fase 13, plan 13-02; UI-SPEC §8.3).
 *
 * Llega como `apagada` desde el cliente (13-01: un 404 con `reason: 'naira_no_habilitada'`, o el `si404` de la lectura
 * principal). Es el estado correcto mientras el servicio de agentes no publique los endpoints de Naira: no hay datos que
 * mostrar. Sin CTA: no hay nada que la persona pueda hacer desde acá.
 */

import type { JSX } from 'react'
import { Power } from '@phosphor-icons/react'

import { EmptyState } from '@/components/ui/empty-state'
import { useI18n } from '@/lib/i18n'

export function NairaApagada(): JSX.Element {
  const { t } = useI18n()
  return (
    <div data-testid="naira-apagada">
      <EmptyState
        icon={Power}
        title={t('inmobiliaria.ai.naira.estados.apagadaTitulo')}
        description={t('inmobiliaria.ai.naira.estados.apagadaDescripcion')}
      />
    </div>
  )
}
