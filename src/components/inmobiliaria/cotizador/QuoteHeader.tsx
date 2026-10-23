'use client'
// Phase 30 plan 30-06 | COTI-UI-03 | XR-05
// Sticky header for the cotizador streaming detail page.
// T-30-06-D: cedula is rendered masked only — raw cedula never present in mvp runtime (D-08).

import { formatCurrency } from '@/lib/types/inmobiliaria'
import { useI18n } from '@/lib/i18n'
import { relativeTime } from '@/lib/cartera'
import type * as React from 'react'
import { StatusBadge } from '@leasefy/cadence'
import { EncabezadoDePantalla } from '@/components/pantalla/EncabezadoDePantalla'
import { VolverALaLista } from '@/components/inmobiliaria/ai/VolverALaLista'
import { formatoDeCifras, localeDeLasCifras } from '@/lib/i18n/idioma-de-las-cifras'

interface QuoteHeaderProps {
  quoteId: string
  /** Already-masked string or cedula_hash[:8] — rendered as: first2•••last3 */
  cedula: string
  /** ISO timestamp of quote creation */
  timestamp: string
  canonCop: number | null
  ciudad: string | null
  tipo: string | null
  codeudores: number | null
  /** Growing live from agent.cost_recorded events — 🔴 en PESOS (04-10-2026). */
  totalCostCop: number
  isConnected: boolean
  /** QA-IA-95 (IA-A-11): la cotización ya tiene su veredicto final: no está «Desconectado», está completa. */
  terminada?: boolean
  /** COTIZ-18 (19-10-2026): el nombre del candidato, si se guardó. */
  nombre?: string | null
}

export function QuoteHeader({
  quoteId,
  cedula,
  timestamp,
  canonCop,
  ciudad,
  tipo,
  codeudores,
  totalCostCop,
  isConnected,
  terminada = false,
  nombre = null,
}: QuoteHeaderProps) {
  const { t, locale } = useI18n()

  const maskedCedula =
    cedula.length >= 5
      ? `${cedula.slice(0, 2)}•••${cedula.slice(-3)}`
      : `${cedula}•••`

  const canonFormatted = canonCop
    ? formatoDeCifras(localeDeLasCifras(), {
        style: 'currency',
        currency: 'COP',
        minimumFractionDigits: 0,
      }).format(canonCop)
    : '—'

  // Glow up 22-10 (la vara de Deuda del mes): el encabezado común. Antes era una
  // barra pegajosa con «Cotizador / Cotización #…» en mono chico y el costo en
  // una pastilla azul (un segundo azul en la pantalla). Ahora: la vuelta a la
  // lista, la sección, el nombre del candidato como título, UNA línea con lo que
  // se cotizó y el estado al lado del título; el costo de la consulta, en mono
  // y sin color, en esa misma línea.
  const estado = isConnected
    ? t('inmobiliaria.ai.cotizador.detail.header.liveLabel')
    : terminada
      ? locale === 'es' ? 'Completa' : 'Complete'
      : t('inmobiliaria.ai.cotizador.detail.header.disconnectedLabel')
  const tituloDelCaso =
    nombre ?? `${t('inmobiliaria.ai.cotizador.detail.header.breadcrumbQuote')} #${quoteId.slice(0, 8)}`

  const datos: React.ReactNode[] = [
    <span key="cedula" className="font-mono">{maskedCedula}</span>,
  ]
  if (canonCop !== null) {
    datos.push(
      <span key="canon">
        {t('inmobiliaria.ai.cotizador.detail.header.canon')} <span className="font-mono text-fg">{canonFormatted}</span>
      </span>,
    )
  }
  if (ciudad) datos.push(<span key="ciudad">{ciudad}</span>)
  if (tipo) datos.push(<span key="tipo">{tipo}</span>)
  if (codeudores !== null) {
    datos.push(
      <span key="codeudores">
        {t('inmobiliaria.ai.cotizador.detail.header.codeudores')}: <span className="font-mono">{codeudores}</span>
      </span>,
    )
  }
  datos.push(<span key="cuando">{relativeTime(timestamp, locale)}</span>)

  return (
    <div className="space-y-3" data-testid="quote-header">
      <VolverALaLista
        href="/panel/inmobiliaria/postulaciones/asegurabilidad"
        label={t('inmobiliaria.ai.nav.cotizador')}
      />
      <EncabezadoDePantalla
        seccion={t('inmobiliaria.ai.nav.cotizador')}
        titulo={<span data-testid={nombre ? 'quote-header-nombre' : undefined}>{tituloDelCaso}</span>}
        junto={
          <StatusBadge tone={isConnected ? 'info' : terminada ? 'success' : 'neutral'} pulse={isConnected}>
            {estado}
          </StatusBadge>
        }
        descripcion={
          <span className="flex flex-wrap items-center gap-x-2 gap-y-1 text-body-sm">
            {datos.map((d, i) => (
              <span key={i} className="inline-flex items-center gap-2">
                {i > 0 ? <span aria-hidden="true" className="text-fg-subtle">·</span> : null}
                {d}
              </span>
            ))}
            <span className="inline-flex items-center gap-2">
              <span aria-hidden="true" className="text-fg-subtle">·</span>
              <span>
                {t('inmobiliaria.ai.cotizador.detail.header.totalCost')}{' '}
                <span className="font-mono text-fg">{formatCurrency(totalCostCop)}</span>
              </span>
            </span>
          </span>
        }
      />
    </div>
  )
}
