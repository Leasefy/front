'use client'

/**
 * MatrizActionBar — asegurabilidad (ex-cotizador), barra de acciones (visión #8/#21).
 *
 * Fila de botones que se monta justo debajo de la matriz comparativa:
 *   Avanzar con recomendada · Comparar opciones · Solicitar codeudor · Descargar ·
 *   Compartir · Enviar a contrato · Reintentar.
 *
 * Cableado honesto:
 *  - Re-cotizar / Resolver condiciones / Reconectar → handlers existentes del padre.
 *  - Descargar → callback del padre (reusa el path de PDF de StreamCompleteBanner).
 *  - Acciones aún sin backend (contrato / compartir / codeudor / avanzar / comparar)
 *    → onAction(code); el padre muestra el aviso "Próximamente" (patrón de honestidad).
 *
 * UX-only: NO inventa endpoints. Cada botón sin backend queda explícitamente
 * etiquetado como próximamente por el padre.
 */

import {
  ArrowRight,
  Scales,
  UsersThree,
  DownloadSimple,
  ShareNetwork,
  FileText,
  ArrowClockwise,
} from '@phosphor-icons/react'

import { useI18n } from '@/lib/i18n'
import { Button } from '@/components/ui/button'
import type { CarrierState } from '@/lib/hooks/cotizador/use-quote-stream'

const NS = 'inmobiliaria.ai.cotizador'

/** Códigos de acción de la barra (catálogo cerrado). */
export type MatrizActionCode =
  | 'avanzar'
  | 'comparar'
  | 'codeudor'
  | 'descargar'
  | 'compartir'
  | 'contrato'
  | 'reintentar'

interface MatrizActionBarProps {
  carriers: CarrierState[]
  /** Re-cotizar con cambios (handler existente del padre). */
  onReQuote: () => void
  /** Resolver condiciones / pedir explicación (handler existente del padre). */
  onResolver: () => void
  /** Reconectar el stream (reconnect del hook). */
  onReconnect: () => void
  /** Descargar PDF (path existente de StreamCompleteBanner). */
  onDownload?: () => void
  /** Acciones sin destino natural todavía → el padre decide (próximamente). */
  onAction: (code: MatrizActionCode) => void
}

export function MatrizActionBar({
  carriers,
  onReQuote,
  onResolver,
  onReconnect,
  onDownload,
  onAction,
}: MatrizActionBarProps) {
  const { t } = useI18n()

  /** i18n con fallback — nunca muestra la clave cruda. */
  const tf = (key: string, fallback: string): string => {
    const r = t(key)
    return r === key ? fallback : r
  }

  // Hay al menos una aseguradora asegurable (aprobada o condicional) → habilita
  // "avanzar"/"comparar"; si todas están rechazadas/error → solo recovery.
  const hasAsegurable = carriers.some(
    (c) => c.status === 'approved' || c.status === 'conditional',
  )
  const hasConditional = carriers.some((c) => c.status === 'conditional')
  const allFailed =
    carriers.length > 0 &&
    carriers.every((c) => c.status === 'rejected' || c.status === 'error')

  return (
    <div
      role="toolbar"
      aria-label={tf(`${NS}.detail.acciones.barLabel`, 'Acciones del caso')}
      data-testid="matriz-action-bar"
      className="flex flex-wrap items-center gap-2"
    >
      {/* Avanzar con recomendada — única acción primaria; sólo si hay aseguradora viable */}
      <Button
        size="sm"
        hideArrow
        disabled={!hasAsegurable}
        onClick={() => onAction('avanzar')}
        data-action="avanzar"
      >
        <ArrowRight className="w-4 h-4" weight="bold" aria-hidden="true" />
        {tf(`${NS}.detail.acciones.avanzar`, 'Avanzar con la recomendada')}
      </Button>

      {/* Comparar opciones */}
      <Button
        variant="secondary"
        size="sm"
        hideArrow
        disabled={!hasAsegurable}
        onClick={() => onAction('comparar')}
        data-action="comparar"
      >
        <Scales className="w-4 h-4" weight="duotone" aria-hidden="true" />
        {tf(`${NS}.detail.acciones.comparar`, 'Comparar opciones')}
      </Button>

      {/* Solicitar codeudor — relevante cuando hay condicionadas */}
      <Button
        variant="secondary"
        size="sm"
        hideArrow
        onClick={() => (hasConditional ? onResolver() : onAction('codeudor'))}
        data-action="codeudor"
      >
        <UsersThree className="w-4 h-4" weight="duotone" aria-hidden="true" />
        {tf(`${NS}.detail.acciones.codeudor`, 'Solicitar codeudor')}
      </Button>

      {/* Descargar — reusa el path de PDF del banner cuando está disponible */}
      <Button
        variant="secondary"
        size="sm"
        hideArrow
        onClick={() => (onDownload ? onDownload() : onAction('descargar'))}
        data-action="descargar"
      >
        <DownloadSimple className="w-4 h-4" weight="duotone" aria-hidden="true" />
        {tf(`${NS}.detail.acciones.descargar`, 'Descargar')}
      </Button>

      {/* Compartir — sin backend todavía → próximamente */}
      <Button
        variant="secondary"
        size="sm"
        hideArrow
        onClick={() => onAction('compartir')}
        data-action="compartir"
      >
        <ShareNetwork className="w-4 h-4" weight="duotone" aria-hidden="true" />
        {tf(`${NS}.detail.acciones.compartir`, 'Compartir')}
      </Button>

      {/* Enviar a contrato — sin backend todavía → próximamente */}
      <Button
        variant="secondary"
        size="sm"
        hideArrow
        disabled={!hasAsegurable}
        onClick={() => onAction('contrato')}
        data-action="contrato"
      >
        <FileText className="w-4 h-4" weight="duotone" aria-hidden="true" />
        {tf(`${NS}.detail.acciones.contrato`, 'Enviar a contrato')}
      </Button>

      {/* Reintentar — re-cotizar si todo falló, reconectar en caso contrario */}
      <Button
        variant="secondary"
        size="sm"
        hideArrow
        onClick={() => (allFailed ? onReQuote() : onReconnect())}
        data-action="reintentar"
      >
        <ArrowClockwise className="w-4 h-4" weight="bold" aria-hidden="true" />
        {tf(`${NS}.detail.acciones.reintentar`, 'Reintentar')}
      </Button>
    </div>
  )
}
