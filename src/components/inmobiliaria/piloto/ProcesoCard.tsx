'use client'

/**
 * ProcesoCard.tsx — UN proceso del Piloto, contado.
 *
 * La tarjeta lee de arriba a abajo como una historia corta en primera
 * persona: qué detecté / a quién llamé (título) → qué pasó (resumen) →
 * quién e inmueble, cuándo, cuánto (meta) → el riel de pasos. El riel es
 * el «process view» propiamente dicho: tres o cuatro puntos con su estado
 * —hecho, en curso, pendiente, fallo— que dicen de un vistazo por dónde va
 * el proceso sin abrir nada. Expandir muestra cada paso con su hora y su
 * detalle, y en WhatsApp los mensajes como burbujas.
 *
 * Nada acá es inventado: cada frase y cada punto vienen de una fila real
 * (`piloto/procesos.ts` del micro). El título abre el cajón del caso.
 */

import { useState } from 'react'
import {
  ArrowUpRight,
  Bank,
  CaretDown,
  Check,
  Phone,
  WhatsappLogo,
  X,
} from '@phosphor-icons/react'

import { relativeTime } from '@/components/inmobiliaria/ai/ColaHumana'
import { formatCurrency } from '@/lib/format'
import { useI18n } from '@/lib/i18n'
import { cn } from '@/lib/utils'
import type { EstadoDeProceso, EstadoDelPaso, Proceso, TipoDeProceso } from '@/lib/api/piloto'

const ICONO_TIPO: Record<TipoDeProceso, typeof Bank> = {
  deposito: Bank,
  llamada: Phone,
  whatsapp: WhatsappLogo,
}

/** El color del ícono de tipo. Semántico: cada tipo tiene su tinta. */
const TINTA_TIPO: Record<TipoDeProceso, string> = {
  deposito: 'bg-success-soft text-success',
  llamada: 'bg-primary-soft text-primary',
  whatsapp: 'bg-success-soft text-success',
}

/** El chip de estado. El color dice qué hacer: verde nada, ámbar te toca, azul espera. */
const CHIP_ESTADO: Record<EstadoDeProceso, string> = {
  en_curso: 'bg-primary-soft text-primary',
  esperando: 'bg-warning-soft text-warning',
  hecho: 'bg-success-soft text-success',
  sin_resultado: 'bg-surface-muted text-fg-muted',
}

/** El punto de cada paso en el riel. */
const PUNTO_PASO: Record<EstadoDelPaso, string> = {
  hecho: 'bg-success border-success',
  en_curso: 'bg-primary border-primary',
  pendiente: 'bg-surface border-border-strong',
  fallo: 'bg-danger border-danger',
}

function horaCorta(iso: string): string {
  return new Date(iso).toLocaleString('es-CO', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

/** Barras de onda para una llamada en curso. Puro CSS; se aquieta con `prefers-reduced-motion`. */
export function OndaEnVivo({ className }: { className?: string }) {
  return (
    <span className={cn('inline-flex h-4 items-end gap-[2px]', className)} aria-hidden="true">
      {[0.4, 0.8, 1, 0.6, 0.9, 0.5, 0.7].map((h, i) => (
        <span
          key={i}
          className="w-[3px] rounded-full bg-current motion-safe:animate-onda"
          style={{ height: `${Math.round(h * 100)}%`, animationDelay: `${i * 90}ms` }}
        />
      ))}
    </span>
  )
}

export interface ProcesoCardProps {
  proceso: Proceso
  onAbrir?: (id: string) => void
  /** Empieza expandida (p. ej. lo que está en vivo). */
  expandida?: boolean
}

export function ProcesoCard({ proceso: p, onAbrir, expandida = false }: ProcesoCardProps) {
  const { t, locale } = useI18n()
  const [abierta, setAbierta] = useState(expandida)
  const Icono = ICONO_TIPO[p.tipo]
  const meta = [
    p.quien?.nombre,
    p.quien?.inmueble,
    p.montoCop !== null && p.tipo !== 'deposito' ? formatCurrency(p.montoCop, locale) : null,
  ].filter((x): x is string => Boolean(x))

  return (
    <article
      data-testid={`proceso-${p.id}`}
      data-estado={p.estado}
      className={cn(
        'relative rounded-lg border bg-surface transition-colors',
        p.enVivo ? 'border-primary/40 shadow-[0_0_0_3px_hsl(var(--primary)/0.08)]' : 'border-border',
      )}
    >
      <div className="flex items-start gap-3 p-4 sm:gap-4 sm:px-5">
        <span
          className={cn('mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full', TINTA_TIPO[p.tipo])}
          aria-hidden="true"
        >
          {p.enVivo && p.tipo === 'llamada' ? <OndaEnVivo /> : <Icono weight="duotone" className="h-[18px] w-[18px]" />}
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1">
            <h3 className="min-w-0 text-body font-semibold leading-snug text-fg">
              {onAbrir ? (
                <button
                  type="button"
                  onClick={() => onAbrir(p.id)}
                  className="rounded text-left hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                  data-testid={`proceso-abrir-${p.id}`}
                >
                  {p.titulo}
                </button>
              ) : (
                p.titulo
              )}
            </h3>
            <span className="flex shrink-0 items-center gap-2">
              {p.resultado && (
                <span
                  data-testid="proceso-resultado"
                  className={cn(
                    'inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-caption font-medium',
                    CHIP_ESTADO[p.estado],
                  )}
                >
                  {p.enVivo && (
                    <span className="relative flex h-1.5 w-1.5" aria-hidden="true">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-current opacity-70" />
                      <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-current" />
                    </span>
                  )}
                  {p.resultado}
                </span>
              )}
              <span className="font-mono text-caption tabular-nums text-fg-subtle">{relativeTime(p.ultimoAt, t)}</span>
            </span>
          </div>

          {p.resumen && <p className="mt-1 text-body-sm text-fg-muted">{p.resumen}</p>}

          {meta.length > 0 && (
            <p className="mt-1.5 truncate text-caption text-fg-subtle">{meta.join(' · ')}</p>
          )}

          {/* El riel: el proceso de un vistazo */}
          <ol className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 sm:gap-x-0" aria-label={t('inmobiliaria.piloto.procesos.verPasos')}>
            {p.pasos.map((paso, i) => (
              <li key={`${paso.titulo}-${i}`} className="flex min-w-0 items-center">
                <span className="flex items-center gap-1.5">
                  <span
                    className={cn(
                      'flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2',
                      PUNTO_PASO[paso.estado],
                      paso.estado === 'en_curso' && 'motion-safe:animate-pulse',
                    )}
                    aria-hidden="true"
                  >
                    {paso.estado === 'hecho' && <Check weight="bold" className="h-2.5 w-2.5 text-primary-fg" />}
                    {paso.estado === 'fallo' && <X weight="bold" className="h-2.5 w-2.5 text-primary-fg" />}
                  </span>
                  <span
                    className={cn(
                      'max-w-[220px] truncate text-caption',
                      paso.estado === 'pendiente' ? 'text-fg-subtle' : 'text-fg',
                    )}
                  >
                    {paso.titulo}
                  </span>
                </span>
                {i < p.pasos.length - 1 && (
                  <span
                    className={cn(
                      // En angosto el riel se apila y el conector queda colgando: se esconde.
                      'mx-2 hidden h-px w-6 shrink-0 sm:block',
                      paso.estado === 'hecho' ? 'bg-success/60' : 'bg-border',
                    )}
                    aria-hidden="true"
                  />
                )}
              </li>
            ))}
          </ol>

          <div className="mt-2 flex items-center gap-3">
            <button
              type="button"
              onClick={() => setAbierta((v) => !v)}
              aria-expanded={abierta}
              className="inline-flex items-center gap-1 rounded text-caption font-medium text-fg-muted hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
              data-testid={`proceso-pasos-${p.id}`}
            >
              <CaretDown className={cn('h-3 w-3 transition-transform', abierta && 'rotate-180')} aria-hidden="true" />
              {t(abierta ? 'inmobiliaria.piloto.procesos.ocultarPasos' : 'inmobiliaria.piloto.procesos.verPasos')}
            </button>
            {p.enlace && (
              <a
                href={p.enlace.href}
                className="inline-flex items-center gap-0.5 text-caption text-fg-subtle hover:text-fg hover:underline"
              >
                {p.enlace.label}
                <ArrowUpRight weight="bold" className="h-3 w-3" aria-hidden="true" />
              </a>
            )}
          </div>

          {abierta && (
            <div className="mt-3 border-t border-faint pt-3" data-testid={`proceso-detalle-${p.id}`}>
              <ol className="space-y-2.5">
                {p.pasos.map((paso, i) => (
                  <li key={`${paso.titulo}-d-${i}`} className="flex items-start gap-3">
                    <span
                      className={cn('mt-1.5 h-2 w-2 shrink-0 rounded-full border', PUNTO_PASO[paso.estado])}
                      aria-hidden="true"
                    />
                    <div className="min-w-0 flex-1">
                      <p className={cn('text-body-sm', paso.estado === 'pendiente' ? 'text-fg-muted' : 'text-fg')}>
                        {paso.titulo}
                        {paso.at && (
                          <span className="ml-2 font-mono text-caption tabular-nums text-fg-subtle">{horaCorta(paso.at)}</span>
                        )}
                      </p>
                      {paso.detalle && <p className="text-caption text-fg-muted">{paso.detalle}</p>}
                    </div>
                  </li>
                ))}
              </ol>

              {p.mensajes && p.mensajes.length > 0 && (
                <div className="mt-3 space-y-1.5" data-testid="proceso-mensajes">
                  {p.mensajes.map((m, i) => (
                    <div key={`${m.at}-${i}`} className={cn('flex', m.de === 'yo' ? 'justify-end' : 'justify-start')}>
                      <div
                        className={cn(
                          'max-w-[85%] rounded-2xl px-3 py-1.5 text-body-sm',
                          m.de === 'yo'
                            ? 'rounded-br-sm bg-primary-soft text-fg'
                            : 'rounded-bl-sm bg-surface-muted text-fg',
                        )}
                      >
                        <span className="mr-1.5 text-label uppercase tracking-wide text-fg-subtle">
                          {t(m.de === 'yo' ? 'inmobiliaria.piloto.procesos.yo' : 'inmobiliaria.piloto.procesos.ellos')}
                        </span>
                        {m.texto}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </article>
  )
}
