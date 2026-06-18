'use client'

/**
 * CasoSidebar — asegurabilidad (ex-cotizador), vista de caso (zona IZQUIERDA "Caso").
 *
 * Espejo de EstudioSidebar (estudio de inquilino): aside con eyebrow de zona +
 * el contexto que el flujo YA produce sobre el quote:
 *   - candidato (metadata.cedulaHashPrefix8, enmascarado — NUNCA cédula cruda)
 *   - inmueble (canon / ciudad / tipo)
 *   - estado general (finalVerdict.asegurabilidad → badge)
 *   - fecha (metadata.createdAt)
 *
 * UX-only: NO ejecuta nada; solo presenta el contexto derivado del stream +
 * metadata. Degrada con "—" cuando un campo falta. i18n con fallback para que
 * una clave faltante nunca muestre la clave cruda.
 */

import { useI18n } from '@/lib/i18n'
import type { QuoteMetadata } from '@/lib/hooks/cotizador/use-quote-metadata'
import type { FinalVerdict } from '@/lib/cotizador/verdict-derive'

const NS = 'inmobiliaria.ai.cotizador'

interface CasoSidebarProps {
  metadata: QuoteMetadata | null
  finalVerdict: FinalVerdict | null
  isConnected: boolean
}

/** Mapa asegurabilidad → clases de badge (tokens semánticos del DS). */
const ASEG_BADGE: Record<'yes' | 'partial' | 'no', string> = {
  yes: 'bg-success-soft text-success border-success/30',
  partial: 'bg-warning-soft text-warning border-warning/30',
  no: 'bg-danger-soft text-danger border-danger/30',
}

export function CasoSidebar({ metadata, finalVerdict, isConnected }: CasoSidebarProps) {
  const { t, locale } = useI18n()

  /** i18n con fallback — nunca muestra la clave cruda. */
  const tf = (key: string, fallback: string): string => {
    const r = t(key)
    return r === key ? fallback : r
  }

  const aseg = finalVerdict?.asegurabilidad ?? null
  const estadoLabel = aseg
    ? tf(`${NS}.caso.estado.${aseg}`, aseg === 'yes' ? 'Asegurable' : aseg === 'partial' ? 'Parcial' : 'No asegurable')
    : isConnected
      ? tf(`${NS}.caso.estado.enProceso`, 'En proceso')
      : tf(`${NS}.caso.estado.sinResultado`, 'Sin resultado')

  const fecha = (() => {
    const iso = metadata?.createdAt
    if (!iso) return '—'
    const d = new Date(iso)
    if (Number.isNaN(d.getTime())) return '—'
    return d.toLocaleDateString(locale === 'es' ? 'es-CO' : 'en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  })()

  const canon =
    metadata?.canonCop != null
      ? new Intl.NumberFormat('es-CO', {
          style: 'currency',
          currency: 'COP',
          minimumFractionDigits: 0,
        }).format(metadata.canonCop)
      : '—'

  return (
    <aside className="rounded-xl border border-border bg-card p-4 space-y-4">
      {/* Zone eyebrow */}
      <h2 className="flex items-center gap-2.5">
        <span aria-hidden="true" className="w-1.5 h-1.5 rounded-[2px] bg-primary shrink-0" />
        <span className="text-xs font-medium uppercase tracking-wide text-fg-muted">
          {tf(`${NS}.caso.eyebrow`, 'Caso')}
        </span>
      </h2>

      {/* Estado general — badge asegurabilidad */}
      <div>
        <p className="text-xs font-medium text-fg-muted">
          {tf(`${NS}.caso.estadoLabel`, 'Estado general')}
        </p>
        <span
          className={
            'mt-1.5 inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ' +
            (aseg ? ASEG_BADGE[aseg] : 'bg-surface-muted text-fg-muted border-border')
          }
        >
          {estadoLabel}
        </span>
      </div>

      {/* Candidato — cédula enmascarada (hash prefijo, NUNCA cédula cruda) */}
      <div className="pt-2 border-t border-border">
        <p className="text-xs font-medium text-fg-muted">
          {tf(`${NS}.caso.candidato`, 'Candidato')}
        </p>
        <p className="mt-0.5 text-sm font-mono font-medium text-fg">
          {metadata?.cedulaHashPrefix8 ? `••• ${metadata.cedulaHashPrefix8}` : '—'}
        </p>
      </div>

      {/* Inmueble — canon / ciudad / tipo */}
      <div className="pt-2 border-t border-border space-y-2">
        <p className="text-xs font-medium text-fg-muted">
          {tf(`${NS}.caso.inmueble`, 'Inmueble')}
        </p>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <p className="text-xs text-fg-muted">
              {tf(`${NS}.caso.canon`, 'Canon')}
            </p>
            <p className="mt-0.5 text-sm font-semibold text-fg tabular-nums">
              {canon}
            </p>
          </div>
          <div>
            <p className="text-xs text-fg-muted">
              {tf(`${NS}.caso.ciudad`, 'Ciudad')}
            </p>
            <p className="mt-0.5 text-sm font-medium text-fg">
              {metadata?.ciudad || '—'}
            </p>
          </div>
        </div>
        <div>
          <p className="text-xs text-fg-muted">
            {tf(`${NS}.caso.tipo`, 'Tipo de inmueble')}
          </p>
          <p className="mt-0.5 text-sm font-medium text-fg capitalize">
            {metadata?.tipoInmueble || '—'}
          </p>
        </div>
      </div>

      {/* Fecha */}
      <div className="pt-2 border-t border-border">
        <p className="text-xs font-medium text-fg-muted">
          {tf(`${NS}.caso.fecha`, 'Fecha de consulta')}
        </p>
        <p className="mt-0.5 text-sm font-medium text-fg tabular-nums">
          {fecha}
        </p>
      </div>
    </aside>
  )
}
