'use client'

/**
 * PilotoBriefing — la tarjeta del briefing que escribe el Gerente cada mañana.
 *
 * Render DEFENSIVO contra el shape del contrato (§4, ajuste 2026-08-30):
 * `{fecha, saludo, resumen[], necesitanDeTi[{titulo,href}], numeros, narrativa?}`.
 * Todo campo es opcional; lo que no venga con la forma esperada no se pinta.
 * Sin nada que mostrar (o 404) → estado vacío «El Gerente escribe el briefing
 * cada mañana».
 */

import Link from 'next/link'
import { ArrowUpRight, Newspaper } from '@phosphor-icons/react'

import type { PilotoBriefing as Briefing } from '@/lib/api/piloto'
import { useI18n } from '@/lib/i18n'

const NS = 'inmobiliaria.piloto.briefing'

export interface PilotoBriefingProps {
  data: Briefing | null
  isLoading?: boolean
  error?: string | null
}

/** true si el briefing trae ALGO renderizable. */
function tieneContenido(data: Briefing | null): boolean {
  if (!data) return false
  return (
    (Array.isArray(data.resumen) && data.resumen.length > 0) ||
    (Array.isArray(data.necesitanDeTi) && data.necesitanDeTi.length > 0) ||
    (Array.isArray(data.narrativa) && data.narrativa.length > 0) ||
    typeof data.saludo === 'string'
  )
}

export function PilotoBriefing({ data, isLoading, error }: PilotoBriefingProps) {
  const { t } = useI18n()

  return (
    <section
      className="rounded-xl border border-border bg-card p-4 lg:p-5 space-y-3"
      data-testid="piloto-briefing"
    >
      <h2 className="text-sm font-semibold text-foreground">{t(`${NS}.titulo`)}</h2>

      {isLoading ? (
        <div className="space-y-2" data-testid="piloto-briefing-loading">
          <div className="h-4 w-2/3 rounded bg-muted/40 animate-pulse" />
          <div className="h-4 w-full rounded bg-muted/40 animate-pulse" />
          <div className="h-4 w-5/6 rounded bg-muted/40 animate-pulse" />
        </div>
      ) : error ? (
        <div
          className="rounded-lg border border-danger/30 bg-danger-soft p-3 text-sm text-danger"
          data-testid="piloto-briefing-error"
        >
          {t(`${NS}.error`, { error })}
        </div>
      ) : !tieneContenido(data) ? (
        <div
          role="status"
          className="flex flex-col items-center gap-3 px-4 py-10 text-center"
          data-testid="piloto-briefing-empty"
        >
          <div className="flex items-center justify-center w-12 h-12 rounded-2xl bg-surface-muted">
            <Newspaper weight="duotone" className="h-5 w-5 text-fg-subtle" aria-hidden="true" />
          </div>
          <div className="space-y-1">
            <p className="text-[15px] font-semibold text-fg">{t(`${NS}.vacio`)}</p>
            <p className="text-sm text-fg-subtle">{t(`${NS}.vacioHint`)}</p>
          </div>
        </div>
      ) : (
        <div className="space-y-4" data-testid="piloto-briefing-contenido">
          {typeof data?.saludo === 'string' && data.saludo.length > 0 && (
            <p className="text-base text-foreground leading-relaxed">{data.saludo}</p>
          )}

          {Array.isArray(data?.resumen) && data.resumen.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide font-mono">
                {t(`${NS}.resumen`)}
              </p>
              <ul className="space-y-1.5">
                {data.resumen
                  .filter((linea): linea is string => typeof linea === 'string')
                  .map((linea, i) => (
                    <li key={i} className="flex gap-2 text-base text-foreground leading-relaxed">
                      <span
                        aria-hidden="true"
                        className="mt-[9px] h-1.5 w-1.5 shrink-0 rounded-full bg-primary"
                      />
                      {linea}
                    </li>
                  ))}
              </ul>
            </div>
          )}

          {Array.isArray(data?.necesitanDeTi) && data.necesitanDeTi.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide font-mono">
                {t(`${NS}.necesitanDeTi`)}
              </p>
              <ul className="space-y-1">
                {data.necesitanDeTi
                  .filter(
                    (item): item is { titulo: string; href: string } =>
                      typeof item?.titulo === 'string' && typeof item?.href === 'string',
                  )
                  .map((item, i) => (
                    <li key={i}>
                      <Link
                        href={item.href}
                        className="group inline-flex items-start gap-1.5 text-base text-foreground hover:text-primary leading-relaxed"
                      >
                        {item.titulo}
                        <ArrowUpRight
                          className="w-3.5 h-3.5 mt-1 shrink-0 text-muted-foreground group-hover:text-primary"
                          aria-hidden="true"
                        />
                      </Link>
                    </li>
                  ))}
              </ul>
            </div>
          )}

          {Array.isArray(data?.narrativa) && data.narrativa.length > 0 && (
            <div className="space-y-1.5 border-t border-border pt-3">
              {data.narrativa
                .filter((p): p is string => typeof p === 'string')
                .map((parrafo, i) => (
                  <p key={i} className="text-sm text-muted-foreground leading-relaxed">
                    {parrafo}
                  </p>
                ))}
            </div>
          )}
        </div>
      )}
    </section>
  )
}
