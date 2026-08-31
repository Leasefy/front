'use client'

/**
 * PilotoFeed — la actividad en vivo del Piloto automático.
 *
 * Timeline vertical: icono de dominio por `tipo` (Phosphor — la librería del
 * repo, DESIGN.md §5), título + detalle, chip del agente, hora relativa y
 * enlace opcional. El contenido (titulo/detalle) viene del backend en
 * español; el chrome vive bajo `inmobiliaria.piloto.feed.*`.
 *
 * Fail-soft: error propio dentro del widget — nunca tumba la página.
 */

import Link from 'next/link'
import type { Icon } from '@phosphor-icons/react'
import {
  ArrowUpRight,
  Bell,
  ChatCircleText,
  CurrencyDollar,
  Envelope,
  FileText,
  Handshake,
  Lightning,
  PhoneCall,
  Robot,
  Siren,
  Warning,
} from '@phosphor-icons/react'

import type { ActivityItem } from '@/lib/api/piloto'
import { useI18n } from '@/lib/i18n'
import { relativeTime, workspaceVocab } from '@/components/inmobiliaria/ai/ColaHumana'

const NS = 'inmobiliaria.piloto.feed'

/**
 * Icono por `tipo` — mapa por palabra clave, con Lightning de respaldo:
 * el contrato no cierra el vocabulario de tipos, así que un tipo nuevo
 * jamás puede romper el feed (mapa finito ⇒ fallback SIEMPRE).
 */
const TIPO_ICONS: Array<{ match: RegExp; icon: Icon }> = [
  { match: /llamada|voz|call/, icon: PhoneCall },
  { match: /whatsapp|mensaje|chat/, icon: ChatCircleText },
  { match: /pago|cobro|billing/, icon: CurrencyDollar },
  { match: /promesa|acuerdo|plan/, icon: Handshake },
  { match: /escala/, icon: Warning },
  { match: /carta|correo|email/, icon: Envelope },
  { match: /siniestro/, icon: Siren },
  { match: /gerente|briefing/, icon: Robot },
  { match: /notific/, icon: Bell },
  { match: /documento|contrato/, icon: FileText },
]

function tipoIcon(tipo: string): Icon {
  const t = tipo.toLowerCase()
  return TIPO_ICONS.find((e) => e.match.test(t))?.icon ?? Lightning
}

export interface PilotoFeedProps {
  items: ActivityItem[]
  isLoading?: boolean
  error?: string | null
}

export function PilotoFeed({ items, isLoading, error }: PilotoFeedProps) {
  const { t } = useI18n()

  return (
    <section
      className="rounded-xl border border-border bg-card p-4 lg:p-5 space-y-3"
      data-testid="piloto-feed"
    >
      <h2 className="text-sm font-semibold text-foreground">{t(`${NS}.titulo`)}</h2>

      {isLoading ? (
        <div className="space-y-2" data-testid="piloto-feed-loading">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-12 rounded-lg bg-muted/40 animate-pulse" />
          ))}
        </div>
      ) : error ? (
        <div
          className="rounded-lg border border-danger/30 bg-danger-soft p-3 text-sm text-danger"
          data-testid="piloto-feed-error"
        >
          {t(`${NS}.error`, { error })}
        </div>
      ) : items.length === 0 ? (
        <div
          role="status"
          className="flex flex-col items-center gap-3 px-6 py-12 text-center"
          data-testid="piloto-feed-empty"
        >
          <div className="flex items-center justify-center w-12 h-12 rounded-2xl bg-surface-muted">
            <Lightning weight="duotone" className="h-5 w-5 text-fg-subtle" aria-hidden="true" />
          </div>
          <div className="space-y-1">
            <p className="text-[15px] font-semibold text-fg">{t(`${NS}.vacio`)}</p>
            <p className="text-sm text-fg-subtle">{t(`${NS}.vacioHint`)}</p>
          </div>
        </div>
      ) : (
        <ol className="relative space-y-0" data-testid="piloto-feed-lista">
          {items.map((item, i) => {
            const TipoIcon = tipoIcon(item.tipo)
            const agenteLabel = workspaceVocab(t, 'agente', item.agente)
            return (
              <li key={item.id} className="relative flex gap-3 pb-4 last:pb-0">
                {/* Riel vertical del timeline */}
                {i < items.length - 1 && (
                  <span
                    aria-hidden="true"
                    className="absolute left-[15px] top-8 bottom-0 w-px bg-border"
                  />
                )}
                <span className="relative flex items-center justify-center w-8 h-8 shrink-0 rounded-full bg-surface-muted ring-1 ring-border mt-0.5">
                  <TipoIcon className="w-4 h-4 text-fg-muted" aria-hidden="true" />
                </span>
                <div className="flex-1 min-w-0 pt-0.5">
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-base text-foreground leading-snug">
                      {item.titulo}
                    </p>
                    <span className="text-[11px] text-muted-foreground tabular-nums shrink-0 mt-0.5">
                      {relativeTime(item.at, t)}
                    </span>
                  </div>
                  {item.detalle && (
                    <p className="text-sm text-muted-foreground mt-0.5 leading-relaxed">
                      {item.detalle}
                    </p>
                  )}
                  <div className="flex items-center gap-2 mt-1.5">
                    <span className="inline-flex items-center text-[11px] text-muted-foreground px-2 py-0.5 rounded-full ring-1 ring-border bg-muted">
                      {agenteLabel}
                    </span>
                    {item.href && (
                      <Link
                        href={item.href}
                        className="inline-flex items-center gap-0.5 text-xs font-medium text-primary hover:underline"
                      >
                        {t(`${NS}.ver`)}
                        <ArrowUpRight className="w-3 h-3" aria-hidden="true" />
                      </Link>
                    )}
                  </div>
                </div>
              </li>
            )
          })}
        </ol>
      )}
    </section>
  )
}
