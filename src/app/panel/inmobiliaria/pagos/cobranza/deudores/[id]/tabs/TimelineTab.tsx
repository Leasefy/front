'use client'

/**
 * TimelineTab — Phase 31 plan 31-09.
 *
 * Lista cronológica (cambio de etapa / llamada / pago / nota del micro, y las
 * gestiones del equipo del back), cada una en palabras (`lineaDeTiempo`). Una
 * llamada del agente abre /cobranza/llamadas/[callId].
 *
 * QA-AGENTES 16-10: el cambio de etapa se abría como JSON crudo, la nota no
 * traía su texto y las gestiones del equipo no salían («Sin eventos
 * registrados» con una llamada y una promesa registradas).
 *
 * NOTE: long histories (>200 events) — swap react-virtual in a later phase.
 */

import * as React from 'react'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

import { useI18n } from '@/lib/i18n'
import { useDebtorTimeline } from '@/lib/hooks/cobranza/use-debtor-timeline'
import { relativeTime } from '@/lib/cartera'
import {
  ArrowsLeftRight,
  PhoneCall,
  CheckCircle,
  NotePencil,
  ClipboardText,
  type Icon,
} from '@phosphor-icons/react'
import { CrossFade, Stagger, StaggerItem } from '@leasefy/cadence'
import { Button } from '@/components/ui'
import { cobranzaManualApi } from '@/lib/api/cobranza-manual.service'
import type { EntradaDelHistorial } from '@/lib/api/cobranza-manual.types'
import { lineaDeTiempo, type TipoDeEvento } from '@/lib/cobranza/linea-de-tiempo'

void React

interface TimelineTabProps {
  debtorId: string
  /** Bump from parent (Phase 31 plan 31-11 realtime) to force a refetch. */
  refetchKey?: number
}

/*
 * 🔴 19-09: acá había emojis (⇄ 📞 ✅ 📝). Un emoji se pinta con la fuente del
 * sistema: cambia de forma en cada plataforma, no hereda `currentColor` —así
 * que en tema oscuro queda de otro color que el texto que acompaña— y no
 * escala con el resto de la tipografía. El panel marca todo lo demás con
 * iconos de Phosphor; esta línea de tiempo era la excepción.
 */
const EVENT_ICON: Record<TipoDeEvento, Icon> = {
  etapa: ArrowsLeftRight,
  llamada: PhoneCall,
  pago: CheckCircle,
  nota: NotePencil,
  gestion: ClipboardText,
}

export function TimelineTab({ debtorId, refetchKey = 0 }: TimelineTabProps) {
  const { t, locale } = useI18n()
  const router = useRouter()
  const { data, isLoading, error, refetch } = useDebtorTimeline({ debtorId })
  // Lo que registró el equipo vive en el back (como en Compromisos); si falla,
  // queda lo del micro.
  const [gestiones, setGestiones] = useState<EntradaDelHistorial[]>([])
  useEffect(() => {
    let vivo = true
    cobranzaManualApi
      .historial({ deudorId: debtorId })
      .then((h) => {
        if (vivo) setGestiones(h.historial)
      })
      .catch(() => {
        if (vivo) setGestiones([])
      })
    return () => {
      vivo = false
    }
  }, [debtorId, refetchKey])

  // Realtime-driven refetch (D-31-18 single refetch per event).
  useEffect(() => {
    if (refetchKey > 0) void refetch()
  }, [refetchKey, refetch])

  // Movimiento: cada salida en un `CrossFade` con su clave (cargando →
  // eventos, → fallo, → vacío).
  if (isLoading && !data) {
    return (
      <CrossFade swapKey="cargando">
      <div className="space-y-2">
        {Array.from({ length: 5 }, (_, i) => (
          <div
            key={i}
            className="h-14 bg-surface-muted rounded-sm animate-pulse"
          />
        ))}
      </div>
      </CrossFade>
    )
  }

  if (error) {
    return (
      <CrossFade swapKey="fallo">
      <div className="rounded-md border border-danger/30 bg-danger-soft p-4 flex items-center justify-between gap-4">
        <p className="text-sm text-danger">
          {t('inmobiliaria.ai.cobranza.detail.timeline.error')}: {error}
        </p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => void refetch()}
          hideArrow
        >
          {t('inmobiliaria.ai.cobranza.detail.timeline.errorRetry')}
        </Button>
      </div>
      </CrossFade>
    )
  }

  const eventos = lineaDeTiempo(data?.events ?? [], gestiones, locale)
  if (eventos.length === 0) {
    return (
      <CrossFade swapKey="vacio">
      <div className="rounded-md border border-dashed border-border p-8 text-center">
        <p className="text-sm text-fg-muted">
          {t('inmobiliaria.ai.cobranza.detail.timeline.empty')}
        </p>
      </div>
      </CrossFade>
    )
  }

  // El evento que llega en vivo entra arriba bajando a su lugar; la primera
  // vez la lista entra escalonada (techo 320 ms). Sin `layout`: una historia
  // larga mediría cada fila en cada cambio.
  return (
    <CrossFade swapKey="eventos">
    <Stagger as="ol" direction="down" layout={false} className="space-y-2">
      {eventos.map((ev) => {
        const Icono = EVENT_ICON[ev.tipo]
        const contenido = (
          <>
            <span aria-hidden="true" className="mt-0.5 shrink-0 text-fg-muted">
              <Icono className="h-4 w-4" weight="duotone" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-medium text-fg">{ev.titulo}</span>
              {ev.detalle && (
                <span className="block text-sm text-fg-muted mt-0.5 break-words">{ev.detalle}</span>
              )}
              <span
                className="block text-xs text-fg-muted mt-0.5"
                title={new Date(ev.cuando).toLocaleString(locale)}
              >
                {[ev.quien, relativeTime(ev.cuando, locale)].filter(Boolean).join(' · ')}
              </span>
            </span>
          </>
        )
        return (
          <StaggerItem
            as="li"
            key={ev.clave}
            className="rounded-sm border border-border bg-surface"
          >
            {ev.tipo === 'llamada' && ev.callId ? (
              <button
                type="button"
                onClick={() => router.push(`/panel/inmobiliaria/pagos/cobranza/llamadas/${ev.callId}`)}
                className="w-full text-left px-3 py-2 flex items-start gap-3 hover:bg-surface-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-sm"
              >
                {contenido}
              </button>
            ) : (
              <div className="px-3 py-2 flex items-start gap-3">{contenido}</div>
            )}
          </StaggerItem>
        )
      })}
    </Stagger>
    </CrossFade>
  )
}
