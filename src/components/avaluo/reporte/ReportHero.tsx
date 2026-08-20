'use client'

/**
 * ReportHero.tsx — el héroe del panel, en su versión mínima: una superficie
 * ink plana (sin blooms, sin estrías, sin retícula, sin grano), la cifra en
 * blanco, la banda como instrumento de una sola tinta y la tira de métricas
 * como hairlines. Toda la jerarquía la hacen el tamaño y el color del texto —
 * ningún elemento decorativo compite con el dato.
 *
 * Contiene DOS secciones del modelo —`doc-header` y `valor-estimado`— cada una
 * con su `<section id>` y su ancla, más el gráfico de banda y la tira de
 * métricas (chrome del panel, no sección).
 *
 * Motion (framer, todo bajo `useReducedMotion`): stagger título → metadatos →
 * cifra (count-up) → letras → banda → tira. Con reduced-motion todo aparece en
 * su estado final.
 */

import Link from 'next/link'
import { motion, useReducedMotion, type Variants } from 'framer-motion'
import { Eyebrow, LockedFeatureOverlay, Stat, StatStrip } from '@leasefy/cadence'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { formatScalar } from '@/lib/avaluo/reporte/report-format'
import type { HeroBand, HeroStat, RenderedSection } from '@/lib/avaluo/reporte/landing-layout'
import type {
  HeadlineBlock,
  KeyValuesBlock,
  PlaceholderBlock,
  ReportViewMeta,
} from '@/lib/avaluo/reporte/report-model'
import { AnimatedAmount } from './charts/AnimatedAmount'
import { ValueBandChart } from './charts/ValueBandChart'
import { REVEAL_EASE } from './motion/ReportReveal'

/**
 * Los tokens `fg`/`border-faint` remapeados a sus parejas ink, para que `Stat`
 * y `StatStrip` del sistema (que hablan `text-fg`, `border-border-faint`) se
 * pinten bien sobre la superficie oscura en los dos temas. Es un remapeo de
 * tokens, no un color nuevo.
 *
 * `--border` NO se remapea: en este repo `border-border` resuelve a
 * `hsl(var(--border))` (tailwind.config.ts) y meterle un `rgba()` lo invalida
 * ⇒ el borde caía a `currentColor` (blanco puro sobre el héroe). El borde
 * superior de la tira se declara explícito con `border-t-ink-border`.
 */
const INK_SCOPE = {
  '--fg': 'var(--ink-fg)',
  '--fg-muted': 'var(--ink-fg-muted)',
  '--fg-subtle': 'var(--ink-fg-subtle)',
  '--border-faint': 'var(--ink-border)',
} as React.CSSProperties

/**
 * Reduced-motion: el marcado no cambia entre servidor y cliente (si cambiara,
 * la hidratación dejaría el `opacity:0` del servidor pegado); cambian sólo las
 * duraciones, que pasan a 0.
 */
function heroVariants(reduced: boolean): { container: Variants; item: Variants } {
  return {
    container: {
      hidden: {},
      show: {
        transition: reduced ? { staggerChildren: 0, delayChildren: 0 } : { staggerChildren: 0.08, delayChildren: 0.05 },
      },
    },
    item: {
      hidden: { opacity: 0, y: 12 },
      show: {
        opacity: 1,
        y: 0,
        transition: reduced ? { duration: 0 } : { duration: 0.55, ease: [...REVEAL_EASE] },
      },
    },
  }
}

export interface ReportHeroProps {
  docHeader: RenderedSection
  valor: RenderedSection
  meta: ReportViewMeta
  paid: boolean
  sample: boolean
  paywallHref: string | null
  heroStats: readonly HeroStat[]
  heroBand: HeroBand | null
}

function shortId(id: string): string {
  return id.length > 16 ? `${id.slice(0, 8)}…${id.slice(-4)}` : id
}

/**
 * La cifra NUNCA se parte. El tamaño es el menor entre el fluido del diseño
 * (`--amount-fluid`: `clamp(2rem, 10.5vw, 6rem)` en móvil, `clamp(2.25rem,
 * 6.5vw, 6rem)` desde `sm`) y el que cabe en el ancho del contenedor para ESTE
 * número de caracteres: JetBrains Mono avanza 0,6 em por glifo y el tracking
 * de −0,045 em lo deja en ≈0,555 em; se usa 0,58 em como margen. El
 * contenedor de consulta es el `Item` de la cifra (`container-type:
 * inline-size`), así que `100cqi` es exactamente el ancho disponible.
 */
const AMOUNT_EM_PER_CHAR = 0.58
const AMOUNT_CONTAINER = { containerType: 'inline-size' } as React.CSSProperties

function amountStyle(text: string): React.CSSProperties {
  const chars = text.replace(/\s/g, '').length
  return {
    '--amount-size': `min(var(--amount-fluid), calc(100cqi / ${(chars * AMOUNT_EM_PER_CHAR).toFixed(2)}))`,
  } as React.CSSProperties
}

/**
 * Bordes de la tira según la rejilla real: 2 columnas (< sm), 3 (sm) y 5
 * (lg). La última celda ocupa la fila entera cuando queda sola (5 celdas en 2
 * columnas ⇒ `col-span-2`): la fila huérfana pasa a ser intencional.
 */
function stripCellClasses(index: number, total: number): string {
  const lastAlone = index === total - 1 && total % 2 === 1
  return cn(
    // < sm: 2 columnas
    index % 2 === 1 ? 'border-l' : 'border-l-0',
    index >= 2 ? 'border-t' : 'border-t-0',
    lastAlone && 'col-span-2',
    // sm: 3 columnas
    index % 3 === 0 ? 'sm:border-l-0' : 'sm:border-l',
    index >= 3 ? 'sm:border-t' : 'sm:border-t-0',
    lastAlone && 'sm:col-span-1',
    // lg: una fila
    index === 0 ? 'lg:border-l-0' : 'lg:border-l',
    'lg:border-t-0',
  )
}

export function ReportHero({
  docHeader,
  valor,
  meta,
  paid,
  sample,
  paywallHref,
  heroStats,
  heroBand,
}: ReportHeroProps) {
  const reduced = useReducedMotion()

  const kv = docHeader.node.blocks.find((b): b is KeyValuesBlock => b.kind === 'keyValues') ?? null
  const docRow = kv?.rows.find((r) => /^documento$/i.test(r.label)) ?? null
  const docTitle =
    docRow !== null && !docRow.value.missing && typeof docRow.value.raw === 'string'
      ? docRow.value.raw
      : meta.subtitle
  const facts = (kv?.rows ?? [])
    .filter((r) => r !== docRow)
    .map((r) => ({
      label: r.label,
      value:
        /referencia/i.test(r.label) && typeof r.value.raw === 'string'
          ? shortId(r.value.raw)
          : formatScalar(r.value),
      title: typeof r.value.raw === 'string' ? r.value.raw : undefined,
    }))
  if (docRow?.provenance) facts.unshift({ label: 'Generado por', value: docRow.provenance.replace(/^generado por\s+/i, ''), title: undefined })
  facts.push({
    label: 'Secciones',
    value: `${meta.certSectionsVersion.replace(/^secciones-/, '')} · ${meta.certSectionsV2Version.replace(/^secciones-/, '')}`,
    title: `${meta.certSectionsVersion} / ${meta.certSectionsV2Version}`,
  })

  const headline = valor.node.blocks.find((b): b is HeadlineBlock => b.kind === 'headline') ?? null
  const placeholder = valor.node.blocks.find((b): b is PlaceholderBlock => b.kind === 'placeholder') ?? null
  const amount = headline !== null && !headline.value.missing && typeof headline.value.raw === 'number' ? headline.value.raw : null
  const amountText = headline === null ? null : formatScalar(headline.value)
  const paidSection = valor.node.visibility === 'paid'

  const { container, item } = heroVariants(reduced === true)
  const Wrapper = motion.div
  const wrapperProps = { variants: container, initial: 'hidden', animate: 'show' } as const
  const Item = motion.div
  const itemProps = { variants: item }
  const bandAlt =
    valor.node.blocks.find((b): b is Extract<typeof b, { kind: 'figure' }> => b.kind === 'figure')
      ?.altText ?? `Banda de confianza de ${formatScalar({ raw: heroBand?.coverageBps ?? 0, format: 'coverage', origin: 'calculado', missing: false, missingText: null, pii: false })}.`

  return (
    <div
      className="relative overflow-hidden rounded-[24px] border border-ink-border bg-ink text-ink-fg"
      data-hero
    >
      <Wrapper {...wrapperProps} className="relative">
        <div className="px-6 pt-7 md:px-10 md:pt-9">
          {/* #00 · doc-header */}
          <section id={docHeader.node.anchor} aria-label="Encabezado del documento" className="scroll-mt-28">
            <Item {...itemProps}>
              <Eyebrow className="[&>span:first-child]:bg-indigo-300 [&>span:last-child]:text-ink-fg-subtle">
                #{String(docHeader.index).padStart(2, '0')} · {docHeader.node.id}
              </Eyebrow>
              <h1 className="mt-3 max-w-[26ch] font-sans text-[clamp(1.5rem,2.4vw,2.05rem)] font-semibold leading-[1.15] tracking-[-0.02em] text-ink-fg">
                {docTitle}
              </h1>
              <p className="mt-2 text-[16px] text-ink-fg-muted">{meta.title}</p>
            </Item>
            {/* Metadatos del documento: una sola línea de texto, sin píldoras ni
                separadores (un «·» al partir la línea quedaría huérfano); el
                espacio entre pares es el separador. */}
            <Item {...itemProps}>
              <dl className="mt-5 flex flex-wrap items-baseline gap-x-6 gap-y-1 font-mono text-[11px] uppercase tracking-[0.06em] text-ink-fg-subtle">
                {facts.map((fact) => (
                  <div
                    key={fact.label}
                    title={fact.title}
                    className="inline-flex min-w-0 max-w-full items-baseline gap-1.5"
                  >
                    <dt className="shrink-0">{fact.label}</dt>
                    <dd className="truncate text-ink-fg-muted">{fact.value}</dd>
                  </div>
                ))}
              </dl>
            </Item>
          </section>

          {/* #14 · valor-estimado */}
          <section
            id={valor.node.anchor}
            aria-labelledby={`${valor.node.anchor}-titulo`}
            className="mt-10 scroll-mt-28"
          >
            {headline !== null && amount !== null && amountText !== null ? (
              <>
                <Item {...itemProps}>
                  <h2 id={`${valor.node.anchor}-titulo`} className="sr-only">
                    {valor.node.title}
                  </h2>
                  <p className="font-mono text-[11px] font-medium uppercase tracking-[0.1em] text-ink-fg-subtle">
                    {headline.caption}
                  </p>
                </Item>
                <Item {...itemProps} className="mt-3" style={AMOUNT_CONTAINER}>
                  <p
                    className="whitespace-nowrap font-mono text-[length:var(--amount-size)] font-medium leading-[0.95] tracking-[-0.045em] text-ink-fg tabular-nums [--amount-fluid:clamp(2rem,10.5vw,6rem)] sm:[--amount-fluid:clamp(2.25rem,6.5vw,6rem)]"
                    style={amountStyle(amountText)}
                  >
                    <AnimatedAmount value={amount} text={amountText} />
                  </p>
                </Item>
                {headline.words !== null && (
                  <Item {...itemProps}>
                    <p className="mt-4 max-w-[64ch] text-[12.5px] leading-relaxed text-ink-fg-subtle">
                      {headline.words}
                    </p>
                  </Item>
                )}
                <Item
                  {...itemProps}
                  className="mt-4 flex flex-wrap items-baseline gap-x-5 gap-y-1 font-mono text-[11px] uppercase tracking-[0.08em] text-ink-fg-subtle"
                >
                  {headline.band !== null && (
                    <span className="inline-flex flex-wrap items-baseline gap-x-2">
                      <span className="whitespace-nowrap">Banda {formatScalar(headline.band.coverage)}</span>
                      <span className="whitespace-nowrap normal-case tabular-nums text-ink-fg-muted">
                        {formatScalar(headline.band.low)} — {formatScalar(headline.band.high)}
                      </span>
                    </span>
                  )}
                  {paidSection && paid && (
                    <span className="inline-flex items-center gap-2 whitespace-nowrap">
                      <i aria-hidden="true" className="size-1.5 rounded-full bg-indigo-300" />
                      Sección de pago desbloqueada{sample ? ' en esta muestra' : ''}
                    </span>
                  )}
                </Item>
              </>
            ) : (
              <Item {...itemProps} className="max-w-xl">
                <h2 id={`${valor.node.anchor}-titulo`} className={cn('font-sans text-[20px] font-semibold text-ink-fg')}>
                  {valor.node.title}
                </h2>
                {placeholder !== null ? (
                  <LockedFeatureOverlay
                    variant="solid"
                    title={placeholder.text}
                    description={
                      placeholder.missing.length > 0
                        ? `Incluye: ${placeholder.missing.join(' · ')}.`
                        : 'Se abre al completar el pago del informe.'
                    }
                    action={
                      paywallHref !== null ? (
                        <Button asChild size="sm">
                          <Link href={paywallHref}>Completar el pago</Link>
                        </Button>
                      ) : undefined
                    }
                    className="mt-3 [&_p]:font-sans"
                  />
                ) : (
                  headline !== null &&
                  headline.bandFallbackText !== null && (
                    <p className="mt-2 text-body-sm text-ink-fg-muted">{headline.bandFallbackText}</p>
                  )
                )}
              </Item>
            )}
          </section>
        </div>

        {/* El instrumento: la banda de valor */}
        {heroBand !== null && (
          <Item {...itemProps} className="mt-9 px-6 md:px-10">
            <ValueBandChart
              low={heroBand.low}
              high={heroBand.high}
              point={heroBand.point}
              coverageBps={heroBand.coverageBps}
              ticks={heroBand.ticks}
              subjectArea={heroBand.subjectArea}
              altText={bandAlt}
              size="hero"
              className="border-t border-ink-border pt-6"
            />
          </Item>
        )}

        {/* La tira de métricas: chrome del panel, cada celda ancla a su sección */}
        <Item {...itemProps} className={cn('mt-8', heroBand === null && 'mt-10')} style={INK_SCOPE}>
          <StatStrip className="grid grid-cols-2 border-b-0 border-t-ink-border sm:grid-cols-3 lg:grid-cols-5">
            {heroStats.map((stat, index) => (
              <a
                key={stat.id}
                href={`#${stat.anchor}`}
                className={cn(
                  // El padding vive en el <a>, no en el Stat: el Stat del sistema
                  // trae `first:pl-0.5` (es el único hijo del <a> ⇒ siempre «first»)
                  // y ese variant gana a cualquier `px-*` que se le pase.
                  'group/stat block border-ink-border px-6 py-5 transition-colors hover:bg-white/[0.04] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-indigo-300 md:px-8',
                  index === 0 && 'md:pl-10',
                  stripCellClasses(index, heroStats.length),
                )}
              >
                <Stat
                  label={stat.label}
                  value={stat.value ?? '—'}
                  delta={stat.caption ?? (stat.value === null ? 'no disponible en esta vista' : undefined)}
                  compact
                  className={cn(
                    'border-l-0 p-0 first:pl-0',
                    '[&>div:first-child]:text-ink-fg-subtle [&>div:nth-child(2)]:text-[18px] [&>div:nth-child(2)]:font-medium [&>div:nth-child(2)]:tracking-[-0.01em] [&>div:nth-child(3)]:line-clamp-1 [&>div:nth-child(3)]:text-ink-fg-subtle',
                  )}
                />
              </a>
            ))}
          </StatStrip>
        </Item>
      </Wrapper>
    </div>
  )
}
