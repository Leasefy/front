'use client'

/**
 * PilotoBandeja — la pieza central del Piloto automático: UNA lista priorizada
 * de todo lo que espera una decisión humana, agrupada alta → media → baja.
 *
 * Cada tarjeta: chip del agente + prioridad + edad, título, resumen, monto si
 * viene, y SIEMPRE el link «Ver caso» (`href`). El botón primario existe SOLO
 * cuando el item trae `accion` — método + path + body los declara el micro y
 * se ejecutan verbatim vía agent-fetch (regla: cero botones muertos).
 *
 * Fail-soft: error propio dentro del widget — nunca tumba la página.
 */

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import { CaretRight, CheckCircle, Clock, Tray } from '@phosphor-icons/react'

import { StatusBadge, type SemanticTone } from '@leasefy/cadence'

import { runInboxAccion, type InboxItem, type PilotoPrioridad } from '@/lib/api/piloto'
import { useI18n } from '@/lib/i18n'
import { formatCurrency } from '@/lib/format'
import { Button } from '@/components/ui/button'
import { relativeTime, workspaceVocab } from '@/components/inmobiliaria/ai/ColaHumana'

const NS = 'inmobiliaria.piloto.bandeja'

const PRIORIDADES: PilotoPrioridad[] = ['alta', 'media', 'baja']

/** Prioridad → tono del StatusBadge de Cadence (mismo mapa que ColaHumana). */
const PRIORIDAD_TONE: Record<PilotoPrioridad, SemanticTone> = {
  alta: 'critical',
  media: 'warning',
  baja: 'success',
}

export interface PilotoBandejaProps {
  items: InboxItem[]
  isLoading?: boolean
  error?: string | null
  /** Se llama tras una acción exitosa para refrescar bandeja (y feed). */
  onRefetch: () => Promise<void>
}

function BandejaCard({
  item,
  onRefetch,
}: {
  item: InboxItem
  onRefetch: () => Promise<void>
}) {
  const { t } = useI18n()
  const [busy, setBusy] = useState(false)

  async function ejecutar() {
    if (!item.accion || busy) return
    setBusy(true)
    const res = await runInboxAccion(item.accion)
    setBusy(false)
    if (res.ok) {
      toast.success(t(`${NS}.toastOk`, { label: item.accion.label }))
      await onRefetch()
    } else {
      toast.error(t(`${NS}.toastFail`, { error: res.error ?? 'error' }))
    }
  }

  return (
    <div
      className="rounded-xl border border-border bg-card p-3.5 space-y-2"
      data-testid={`piloto-inbox-${item.id}`}
    >
      {/* Chips: prioridad + agente + edad */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-1.5 flex-wrap">
          <StatusBadge tone={PRIORIDAD_TONE[item.prioridad] ?? 'warning'}>
            {t(`${NS}.prioridad.${item.prioridad}`)}
          </StatusBadge>
          <span className="inline-flex items-center text-[11px] text-muted-foreground px-2 py-0.5 rounded-full ring-1 ring-border bg-muted">
            {workspaceVocab(t, 'agente', item.agente)}
          </span>
        </div>
        <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground tabular-nums">
          <Clock className="w-3 h-3" aria-hidden="true" />
          {relativeTime(item.desde, t)}
        </span>
      </div>

      {/* Cuerpo */}
      <div className="space-y-1">
        <p className="text-base font-semibold text-foreground leading-snug">{item.titulo}</p>
        <p className="text-sm text-muted-foreground leading-relaxed">{item.resumen}</p>
        {typeof item.montoCop === 'number' && (
          <p className="text-sm text-foreground">
            <span className="font-mono tabular-nums whitespace-nowrap font-medium">
              {formatCurrency(item.montoCop)}
            </span>
          </p>
        )}
      </div>

      {/* Acciones: SIEMPRE el link; el botón SOLO si el micro declaró `accion`. */}
      <div className="flex flex-wrap items-center gap-2 pt-1">
        {item.accion && (
          <Button
            type="button"
            size="sm"
            hideArrow
            isLoading={busy}
            disabled={busy}
            onClick={() => void ejecutar()}
          >
            {!busy && <CheckCircle className="w-3.5 h-3.5" aria-hidden="true" />}
            {item.accion.label}
          </Button>
        )}
        <Link
          href={item.href}
          className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
          data-testid={`piloto-inbox-ver-${item.id}`}
        >
          {t(`${NS}.verCaso`)}
          <CaretRight className="w-3.5 h-3.5" aria-hidden="true" />
        </Link>
      </div>
    </div>
  )
}

export function PilotoBandeja({ items, isLoading, error, onRefetch }: PilotoBandejaProps) {
  const { t } = useI18n()

  const grupos = useMemo(() => {
    const porPrioridad: Record<PilotoPrioridad, InboxItem[]> = { alta: [], media: [], baja: [] }
    for (const item of items) {
      // Prioridad fuera del contrato → al fondo, jamás se descarta trabajo.
      ;(porPrioridad[item.prioridad] ?? porPrioridad.baja).push(item)
    }
    return porPrioridad
  }, [items])

  return (
    <section
      className="rounded-xl border border-border bg-card p-4 lg:p-5 space-y-4"
      data-testid="piloto-bandeja"
    >
      <h2 className="text-sm font-semibold text-foreground">{t(`${NS}.titulo`)}</h2>

      {isLoading ? (
        <div className="space-y-2" data-testid="piloto-bandeja-loading">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-28 rounded-xl border border-border bg-muted/40 animate-pulse" />
          ))}
        </div>
      ) : error ? (
        <div
          className="rounded-lg border border-danger/30 bg-danger-soft p-3 text-sm text-danger"
          data-testid="piloto-bandeja-error"
        >
          {t(`${NS}.error`, { error })}
        </div>
      ) : items.length === 0 ? (
        <div
          role="status"
          className="flex flex-col items-center gap-3 px-6 py-14 text-center"
          data-testid="piloto-bandeja-empty"
        >
          <div className="flex items-center justify-center w-12 h-12 rounded-2xl bg-surface-muted">
            <Tray weight="duotone" className="h-5 w-5 text-fg-subtle" aria-hidden="true" />
          </div>
          <div className="space-y-1">
            <p className="text-[15px] font-semibold text-fg">{t(`${NS}.vacia`)}</p>
            <p className="text-sm text-fg-subtle max-w-sm leading-relaxed">
              {t(`${NS}.vaciaHint`)}
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {PRIORIDADES.map((prioridad) => {
            const grupo = grupos[prioridad]
            if (grupo.length === 0) return null
            return (
              <div key={prioridad} className="space-y-2" data-testid={`piloto-bandeja-${prioridad}`}>
                <p className="text-[11px] font-mono uppercase tracking-widest text-fg-subtle">
                  {t(`${NS}.prioridad.${prioridad}`)}
                  <span className="ml-1.5 tabular-nums">({grupo.length})</span>
                </p>
                {grupo.map((item) => (
                  <BandejaCard key={item.id} item={item} onRefetch={onRefetch} />
                ))}
              </div>
            )
          })}
        </div>
      )}
    </section>
  )
}
