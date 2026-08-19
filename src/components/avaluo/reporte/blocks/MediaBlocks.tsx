/**
 * MediaBlocks.tsx — anexo fotográfico y figuras. (El sello vive en `SealBlock.tsx`.)
 *
 * Las figuras despachan a los gráficos de `../charts/*` (islas de cliente con
 * framer-motion): la banda de valor, la dona terreno/construcción, el medidor
 * de exposición, el medio arco de divergencia y la tira de dispersión. Todas
 * se anuncian con `role="img"` + `aria-label`: quien usa lector de pantalla
 * recibe la frase completa, no una lista de rectángulos.
 */

import {
  Bathtub,
  Bed,
  Buildings,
  Car,
  CookingPot,
  Couch,
  ImageSquare,
} from '@phosphor-icons/react/dist/ssr'
import { ImageGallery, type GalleryImage } from '@leasefy/cadence'
import { cn } from '@/lib/utils'
import { formatScalar } from '@/lib/avaluo/reporte/report-format'
import type { FigureBlock, MediaBlock } from '@/lib/avaluo/reporte/report-model'
import { ValueBandChart } from '../charts/ValueBandChart'
import { DivergenceGauge, ExposureMeter, SplitDonut } from '../charts/Fillers'
import { formatCurrency } from '@/lib/format'

// ---------------------------------------------------------------------------
// Anexo fotográfico
// ---------------------------------------------------------------------------

const PLACEHOLDER_ROOMS = [
  { label: 'Fachada', Icon: Buildings },
  { label: 'Sala', Icon: Couch },
  { label: 'Cocina', Icon: CookingPot },
  { label: 'Alcoba principal', Icon: Bed },
  { label: 'Baño', Icon: Bathtub },
  { label: 'Parqueadero', Icon: Car },
] as const

/**
 * La ganancia más grande de la web sobre el papel: el documento firmado no
 * incrusta imágenes (se mantiene determinista para que su huella sea
 * reproducible), la landing sí las muestra.
 *
 * `items[].src` ya viene firmado por quien sirve la vista. Acá nunca llega una
 * key de almacenamiento.
 *
 * Sin fotos: en la muestra se pintan marcos vectoriales con el chip MUESTRA
 * (uno por imagen declarada, hasta seis); con datos reales, una nota honesta.
 *
 * Nota de scroll: `ImageGallery` monta su visor a pantalla completa sobre un
 * `Dialog` de Radix. El proveedor de scroll suave de este repo ya frena Lenis
 * mirando `[data-state="open"][role="dialog"]` en el DOM, así que este overlay
 * queda cubierto sin `useLenis().stop()` explícito.
 */
export function MediaBlockView({ block, sample }: { block: MediaBlock; sample: boolean }) {
  const declared = typeof block.count.raw === 'number' ? block.count.raw : block.items.length

  // La muestra nunca enseña algo que pueda confundirse con una foto: aunque la
  // fixture traiga marcadores de posición, acá se pintan marcos vectoriales
  // con el chip MUESTRA y el pie de cada imagen declarada.
  if (sample) {
    const captions =
      block.items.length > 0
        ? block.items.map((item) => item.caption ?? item.alt)
        : PLACEHOLDER_ROOMS.slice(0, Math.max(1, Math.min(6, declared))).map((r) => r.label)
    return (
      <div className="space-y-2">
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {captions.map((label, index) => {
            const room = PLACEHOLDER_ROOMS.find((r) => r.label === label) ?? PLACEHOLDER_ROOMS[index % PLACEHOLDER_ROOMS.length]
            const Icon = room?.Icon ?? ImageSquare
            return (
              <li key={`${label}-${index}`} className="overflow-hidden rounded-md border border-border bg-surface-muted">
                <div
                  className="relative grid aspect-[4/3] place-items-center text-fg-subtle"
                  style={{
                    background: 'linear-gradient(150deg, var(--accent-soft) 0%, var(--surface-muted) 72%)',
                  }}
                >
                  <span className="absolute left-2 top-2 rounded-full border border-border bg-surface px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.12em] text-fg-subtle">
                    Muestra
                  </span>
                  <Icon aria-hidden="true" weight="thin" className="size-12 opacity-80" />
                </div>
                <div className="flex items-center justify-between gap-2 border-t border-border-faint bg-surface px-2.5 py-2 text-[12px] text-fg">
                  <span className="truncate">{label}</span>
                  <span className="font-mono text-[10px] tabular-nums text-fg-subtle">
                    {String(index + 1).padStart(2, '0')}/{String(captions.length).padStart(2, '0')}
                  </span>
                </div>
              </li>
            )
          })}
        </ul>
        <p className="text-caption text-fg-muted">
          {formatScalar(block.count)} {declared === 1 ? 'imagen declarada' : 'imágenes declaradas'} ·
          marcos vectoriales de muestra, sin fotografías reales.
        </p>
      </div>
    )
  }

  if (block.items.length === 0) {
    return (
      <div className="rounded-md border border-dashed border-border-strong bg-surface-muted px-4 py-6 text-center">
        <ImageSquare aria-hidden="true" weight="duotone" className="mx-auto size-6 text-fg-subtle" />
        <p className="mt-2 text-body-sm text-fg-muted">
          {declared > 0
            ? `${formatScalar(block.count)} ${declared === 1 ? 'imagen declarada' : 'imágenes declaradas'} en el expediente; no están disponibles en esta vista.`
            : 'Sin imágenes.'}
        </p>
      </div>
    )
  }

  const images: GalleryImage[] = block.items.map((item) => ({
    src: item.src,
    alt: item.alt,
    ...(item.caption !== null ? { caption: item.caption } : {}),
  }))

  return (
    <div className="space-y-2">
      <ImageGallery images={images} columns={4} aspectRatio="photo" />
      <p className="text-caption text-fg-muted">
        {formatScalar(block.count)} {block.count.raw === 1 ? 'imagen' : 'imágenes'}. Tocá una para
        ampliarla.
      </p>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Figuras
// ---------------------------------------------------------------------------

/** Nube de $/m² de los comparables con el sujeto marcado (un solo riel). */
function PricePointsStrip({
  points,
  subject,
  altText,
}: {
  points: readonly { readonly id: string; readonly value: number }[]
  subject: number | null
  altText: string
}) {
  const values = points.map((p) => p.value).concat(subject === null ? [] : [subject])
  const min = Math.min(...values) * 0.97
  const max = Math.max(...values) * 1.03
  const pct = (v: number) => (max <= min ? 50 : ((v - min) / (max - min)) * 100)
  return (
    <figure
      role="img"
      aria-label={altText}
      className="m-0 rounded-md border border-border-faint bg-surface-muted px-4 py-4"
    >
      <div aria-hidden="true" className="relative h-10">
        <span className="absolute left-0 right-0 top-1/2 h-px bg-border" />
        {points.map((point) => (
          <span
            key={point.id}
            className="absolute top-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-[1.5px] border-border-strong bg-surface"
            style={{ left: `${pct(point.value)}%` }}
          />
        ))}
        {subject !== null && (
          <span
            className="absolute top-1/2 h-5 w-[2px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary"
            style={{ left: `${pct(subject)}%` }}
          />
        )}
      </div>
      <figcaption aria-hidden="true" className="mt-1 flex justify-between font-mono text-[10.5px] tabular-nums text-fg-subtle">
        <span className="whitespace-nowrap">{formatCurrency(Math.round(min))}/m²</span>
        <span className="whitespace-nowrap">{formatCurrency(Math.round(max))}/m²</span>
      </figcaption>
    </figure>
  )
}

export function FigureBlockView({
  block,
  className,
}: {
  block: FigureBlock
  className?: string
}) {
  const spec = block.figure

  switch (spec.type) {
    case 'valueBand': {
      if (spec.low === null || spec.high === null) return null
      return (
        <ValueBandChart
          low={spec.low}
          high={spec.high}
          point={spec.point}
          coverageBps={spec.coverageBps}
          altText={block.altText}
          size="compact"
          className={cn('rounded-md border border-border-faint bg-surface-muted px-4 pb-3 pt-4', className)}
        />
      )
    }
    case 'rangeDays':
      return (
        <ExposureMeter
          data={{ kind: 'exposure-meter', low: spec.low, high: spec.high, max: Math.max(240, spec.high * 1.5) }}
        />
      )
    case 'split': {
      const total = spec.parts.reduce((acc, part) => acc + part.value, 0)
      if (total <= 0) return null
      return <SplitDonut data={{ kind: 'split-donut', parts: spec.parts, total }} />
    }
    case 'pricePerM2': {
      if (spec.points.length === 0) return null
      return <PricePointsStrip points={spec.points} subject={spec.subject} altText={block.altText} />
    }
    case 'divergence':
      return (
        <DivergenceGauge
          data={{ kind: 'divergence-gauge', bps: spec.bps, thresholdBps: spec.thresholdBps }}
        />
      )
  }
}
