'use client'

/**
 * ReportTopbar.tsx — la barra superior del panel (sticky).
 *
 * Izquierda: la marca en tile ink + «Portofino · Avalúo Nest» / eyebrow
 * «Panel del documento». Derecha: el estado del documento (`StatusBadge` con
 * pulso sólo si está VIGENTE), el chip del sello (ancla a `#sello-verificacion`),
 * «Descargar el PDF» (deshabilitado con tooltip en la muestra), el menú
 * «Exportar» (Imprimir → `window.print()`; Descargar PDF) y el toggle de tema
 * (`next-themes`).
 *
 * `downloadHref` llega por props desde la página (que es quien tiene el token):
 * este componente NUNCA lee la URL en cliente.
 *
 * `bg-surface/95 backdrop-blur` es la única superficie con blur de la página
 * (`docs/DESIGN.md` §10.1 lo permite en la barra de navegación).
 *
 * En móvil las acciones se pliegan en un menú.
 */

import { useEffect, useState } from 'react'
import { useTheme } from 'next-themes'
import {
  DotsThreeVertical,
  DownloadSimple,
  Moon,
  Printer,
  SealCheck,
  Sun,
} from '@phosphor-icons/react'
import { BrandMark, StatusBadge, Tooltip } from '@leasefy/cadence'
import { Button } from '@/components/ui/button'
import {
  DropdownList,
  DropdownListContent,
  DropdownListItem,
  DropdownListSeparator,
  DropdownListTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'
import type { DocStatus } from '@/lib/avaluo/reporte/landing-layout'

export interface ReportTopbarProps {
  issuerLabel: string
  status: DocStatus
  hashShort: string | null
  /** true ⇒ el verificador dijo «alterado»: el chip del sello lo grita en rojo. */
  sealAltered?: boolean
  downloadHref: string | null
  sample: boolean
}

function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  const dark = mounted && resolvedTheme === 'dark'
  const Icon = dark ? Sun : Moon
  const label = dark ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro'
  return (
    <button
      type="button"
      onClick={() => setTheme(dark ? 'light' : 'dark')}
      aria-label={label}
      title={label}
      className="grid size-9 place-items-center rounded-full border border-border bg-surface text-fg-muted transition-colors hover:bg-surface-hover hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary active:scale-[0.98]"
    >
      <Icon className="size-[18px]" aria-hidden="true" />
    </button>
  )
}

export function ReportTopbar({
  issuerLabel,
  status,
  hashShort,
  sealAltered = false,
  downloadHref,
  sample,
}: ReportTopbarProps) {
  const canDownload = downloadHref !== null
  const downloadTip = sample ? 'Sin documento emitido en la muestra' : 'Sin documento emitido'

  const download = canDownload ? (
    <Button asChild size="sm" hideArrow className="shadow-glow">
      <a href={downloadHref} download>
        <DownloadSimple className="size-4" aria-hidden="true" />
        Descargar el PDF
      </a>
    </Button>
  ) : (
    <Tooltip content={downloadTip}>
      <span className="inline-flex" tabIndex={0} aria-label={`Descargar el PDF: ${downloadTip}`}>
        <Button size="sm" disabled hideArrow aria-disabled="true" className="pointer-events-none">
          Descargar el PDF
        </Button>
      </span>
    </Tooltip>
  )

  return (
    <header
      className="sticky top-0 z-30 border-b border-border bg-surface/95 backdrop-blur"
      data-report-topbar
    >
      <div className="mx-auto flex h-14 max-w-[1520px] items-center gap-3 px-4 md:px-6">
        {/* Marca */}
        <a
          href="#main-content"
          className="flex min-w-0 items-center gap-3 rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          <span
            aria-hidden="true"
            className="grid size-9 shrink-0 place-items-center rounded-[10px] bg-ink shadow-glow"
          >
            <BrandMark size={20} variant="bare" className="[&_svg]:text-indigo-300" />
          </span>
          <span className="min-w-0 leading-tight">
            <span className="block truncate text-[15px] font-semibold tracking-[-0.01em] text-fg">
              {issuerLabel} · Avalúo Nest
            </span>
            <span className="hidden font-mono text-[10.5px] uppercase tracking-[0.08em] text-fg-subtle sm:block">
              Panel del documento
            </span>
          </span>
        </a>

        <div className="ml-auto flex items-center gap-2">
          {/* Estado + sello: siempre visibles desde sm */}
          <StatusBadge
            tone={status.tone}
            pulse={status.chain === 'VIGENTE'}
            className="hidden px-2.5 py-1 sm:inline-flex"
            data-doc-status={status.chain}
          >
            {status.label}
          </StatusBadge>
          {hashShort !== null && (
            <a
              href="#sello-verificacion"
              data-seal-chip={sealAltered ? 'altered' : 'ok'}
              className={cn(
                'hidden items-center gap-1.5 rounded-full border px-2.5 py-1 font-mono text-[10.5px] font-medium uppercase tracking-[0.08em] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary md:inline-flex',
                sealAltered
                  ? 'border-danger bg-danger-soft text-danger hover:opacity-90'
                  : 'border-border bg-surface-muted text-fg hover:bg-surface-pressed',
              )}
            >
              <SealCheck aria-hidden="true" className={cn('size-3.5', sealAltered ? 'text-danger' : 'text-fg-muted')} weight="duotone" />
              Sello {hashShort}
              {sealAltered && ' · alterado'}
            </a>
          )}

          {/* Acciones de escritorio */}
          <div className="hidden items-center gap-2 md:flex">
            {download}
            <DropdownList>
              <DropdownListTrigger asChild>
                <Button variant="outline" size="sm" hideArrow>
                  Exportar
                </Button>
              </DropdownListTrigger>
              <DropdownListContent align="end" className="min-w-[220px]">
                <DropdownListItem onSelect={() => window.print()}>
                  <Printer className="mr-2 size-4" aria-hidden="true" />
                  Imprimir
                </DropdownListItem>
                <DropdownListItem
                  disabled={!canDownload}
                  onSelect={() => {
                    if (downloadHref !== null) window.open(downloadHref, '_blank', 'noopener,noreferrer')
                  }}
                >
                  <DownloadSimple className="mr-2 size-4" aria-hidden="true" />
                  Descargar PDF
                </DropdownListItem>
              </DropdownListContent>
            </DropdownList>
            <ThemeToggle />
          </div>

          {/* Acciones plegadas en móvil */}
          <div className="flex items-center gap-2 md:hidden">
            <ThemeToggle />
            <DropdownList>
              <DropdownListTrigger asChild>
                <button
                  type="button"
                  aria-label="Más acciones"
                  className="grid size-9 place-items-center rounded-full border border-border bg-surface text-fg-muted hover:bg-surface-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                  <DotsThreeVertical className="size-5" weight="bold" aria-hidden="true" />
                </button>
              </DropdownListTrigger>
              <DropdownListContent align="end" className="min-w-[240px]">
                <div className="px-2 py-1.5">
                  <StatusBadge tone={status.tone} pulse={status.chain === 'VIGENTE'}>
                    {status.label}
                  </StatusBadge>
                </div>
                <DropdownListSeparator />
                <DropdownListItem
                  disabled={!canDownload}
                  onSelect={() => {
                    if (downloadHref !== null) window.open(downloadHref, '_blank', 'noopener,noreferrer')
                  }}
                >
                  <DownloadSimple className="mr-2 size-4" aria-hidden="true" />
                  {canDownload ? 'Descargar el PDF' : `Descargar el PDF — ${downloadTip.toLowerCase()}`}
                </DropdownListItem>
                <DropdownListItem onSelect={() => window.print()}>
                  <Printer className="mr-2 size-4" aria-hidden="true" />
                  Imprimir
                </DropdownListItem>
                {hashShort !== null && (
                  <DropdownListItem asChild>
                    <a href="#sello-verificacion" className={cn('flex items-center')}>
                      <SealCheck className="mr-2 size-4" aria-hidden="true" weight="duotone" />
                      Ir al sello {hashShort}
                    </a>
                  </DropdownListItem>
                )}
              </DropdownListContent>
            </DropdownList>
          </div>
        </div>
      </div>
    </header>
  )
}
