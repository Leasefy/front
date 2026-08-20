/**
 * ReportCard.tsx — la tarjeta base de una sección del informe (el «ReportCard»
 * de la spec). Server Component: no tiene estado; lo que se hidrata son las
 * islas de adentro (gráficos, tabla expandible).
 *
 * Anatomía: cabecera = Eyebrow `#NN · SECTION-ID` + pastilla de estado a la
 * derecha, título `h3`; cuerpo = los bloques; relleno de dato real (si la fila
 * lo pide) pegado abajo; pie = nota legal en `Callout` + huecos como chips.
 * `h-full flex flex-col` SIEMPRE: la fila del bento la estira y dos hermanas
 * quedan a la misma altura.
 *
 * Tres decisiones de producto viven acá, no en el CSS:
 *
 *  1. **Plegado ≠ ausente.** Una sección plegada se renderiza dentro de un
 *     `<details>` sin `hidden`: sigue en el DOM, Ctrl-F la encuentra, un export
 *     la lleva y la hoja de impresión la abre (`report-print.css`). Nunca se
 *     omite del árbol.
 *  2. **El disclaimer de alcance nunca se pliega** (Ley 1673 de 2013). El
 *     tratamiento ya lo garantiza `resolveTreatment`, pero acá hay un segundo
 *     cerrojo por id: aunque alguien cambie el layout, esta sección no puede
 *     terminar dentro de un `<details>`. Se pinta como tarjeta de aviso
 *     (borde warning, pastilla «Siempre visible»).
 *  3. **Los huecos y las secciones restringidas tampoco se pliegan.** Un hueco
 *     es información y un bloqueo plegado es un llamado a la acción que nadie ve.
 *
 * Superficies ink: `docs/DESIGN.md` §10.6 dice «un gradiente por superficie;
 * nunca en cards/botones/data UI». Acá se cumple sin excepción: el héroe y la
 * tarjeta de `regimen-mercado` (variante `insight`) son ink PLANO —sin
 * gradiente, sin bloom, sin motivo, sin grano— y la jerarquía la hace sólo el
 * color del texto (`ink-fg` sobre ink ≥ 7:1 en los dos temas). Fue decisión del
 * dueño del producto (2026-08-18: «más minimalista») tras probar y descartar
 * un fondo construido de marca.
 */

import { CaretDown } from '@phosphor-icons/react/dist/ssr'
import { CopyButton, Eyebrow, StatusBadge } from '@leasefy/cadence'
import { cn } from '@/lib/utils'
import {
  fillerConsumes,
  type FillerData,
  type RenderedSection,
} from '@/lib/avaluo/reporte/landing-layout'
import {
  SCOPE_DISCLAIMER_SECTION_ID,
  type ReportSectionNode,
  type ReportViewMeta,
} from '@/lib/avaluo/reporte/report-model'
import { FillerView } from './charts/Fillers'
import { ReportBlockView, type BlockContext } from './ReportBlockView'
import { ProseBlockView } from './blocks/TextBlocks'

export type CardVariant = 'default' | 'alert' | 'insight' | 'footer'

export const CARD_TITLE = 'font-sans text-[17px] font-semibold leading-snug tracking-[-0.015em]'

export const CARD_SHELL =
  'group/card relative flex h-full min-w-0 flex-col overflow-hidden rounded-[20px] border bg-surface text-fg shadow-xs'

const SPAN_CLASS = {
  12: 'col-span-12',
  8: 'col-span-12 lg:col-span-8',
  7: 'col-span-12 md:col-span-7',
  6: 'col-span-12 md:col-span-6',
  5: 'col-span-12 md:col-span-5',
  4: 'col-span-12 sm:col-span-6 lg:col-span-4',
  3: 'col-span-12 sm:col-span-6 lg:col-span-3',
} as const

export function spanClass(span: keyof typeof SPAN_CLASS): string {
  return SPAN_CLASS[span]
}

// ---------------------------------------------------------------------------
// Estado de la sección → pastilla
// ---------------------------------------------------------------------------

function StateBadge({ node, paid }: { node: ReportSectionNode; paid: boolean }) {
  if (node.id === SCOPE_DISCLAIMER_SECTION_ID) {
    return <StatusBadge tone="warning">Siempre visible</StatusBadge>
  }
  if (node.state === 'partial') {
    const n = node.gaps.length
    return (
      <StatusBadge tone="warning">
        Parcial{n > 0 ? ` · ${n} ${n === 1 ? 'campo' : 'campos'}` : ''}
      </StatusBadge>
    )
  }
  if (node.state === 'degraded') {
    const placeholder = node.blocks.find((b) => b.kind === 'placeholder')
    const severity = placeholder?.kind === 'placeholder' ? placeholder.severity : 'no_data'
    if (severity === 'restricted') return <StatusBadge tone="info">Pago</StatusBadge>
    if (severity === 'not_applicable') return <StatusBadge tone="neutral">No aplica</StatusBadge>
    return <StatusBadge tone="critical">Sin datos</StatusBadge>
  }
  if (node.visibility === 'paid' && paid) {
    return <StatusBadge tone="info">Sección de pago</StatusBadge>
  }
  return <StatusBadge tone="success">OK</StatusBadge>
}

// ---------------------------------------------------------------------------
// Piezas
// ---------------------------------------------------------------------------

function CardHeader({
  section,
  paid,
  variant,
  collapsible,
  hint,
  headingId,
  compact,
}: {
  section: RenderedSection
  paid: boolean
  variant: CardVariant
  collapsible: boolean
  hint: string | null
  headingId: string
  compact: boolean
}) {
  const { node } = section
  const insight = variant === 'insight'
  return (
    <div className="px-5 pt-4">
      {/* Eyebrow + estado en la misma fila; el título abajo, a todo el ancho. */}
      <div className="flex items-start justify-between gap-3">
        <Eyebrow
          className={cn(
            'min-w-0 items-start [&>span:first-child]:mt-[5px] [&>span:last-child]:break-words',
            compact && '[&>span:last-child]:text-[10px] [&>span:last-child]:tracking-[0.05em]',
            insight && '[&>span:last-child]:text-ink-fg-subtle [&>span:first-child]:bg-indigo-300',
          )}
        >
          #{String(section.index).padStart(2, '0')} · {node.id}
        </Eyebrow>
        <div className="flex shrink-0 items-center gap-2">
          <StateBadge node={node} paid={paid} />
          {collapsible && (
            <span className="inline-flex items-center gap-1.5 font-mono text-[10.5px] font-medium uppercase tracking-[0.08em] text-primary">
              {hint !== null && hint.length <= 24 && (
                <span className="hidden text-fg-subtle sm:inline">{hint}</span>
              )}
              <span className="group-open/details:hidden">Ver</span>
              <span className="hidden group-open/details:inline">Ocultar</span>
              <CaretDown
                aria-hidden="true"
                className="size-3.5 transition-transform duration-200 group-open/details:rotate-180"
              />
            </span>
          )}
        </div>
      </div>
      {node.title !== null && (
        <h3 id={headingId} className={cn(CARD_TITLE, 'mt-2', insight ? 'text-ink-fg' : 'text-fg')}>
          {node.title}
        </h3>
      )}
    </div>
  )
}

function Gaps({ node }: { node: ReportSectionNode }) {
  if (node.gaps.length === 0) return null
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="font-mono text-[10.5px] font-medium uppercase tracking-[0.08em] text-fg-subtle">
        Sin dato
      </span>
      {node.gaps.map((gap) => (
        <span
          key={gap.field}
          className="inline-flex items-center rounded-full border border-warning bg-warning-soft px-2 py-0.5 font-mono text-[10.5px] text-fg"
        >
          {gap.field}
        </span>
      ))}
    </div>
  )
}

function CardBody({
  section,
  ctx,
  filler,
  variant,
}: {
  section: RenderedSection
  ctx: BlockContext
  filler: FillerData | null
  variant: CardVariant
}) {
  const { node } = section
  const consumed = filler === null ? null : fillerConsumes(filler.kind)
  const blocks = node.blocks.filter(
    (block) => !(filler !== null && block.kind === 'figure' && block.figure.type === consumed),
  )
  const insight = variant === 'insight'

  return (
    <>
      <div className="flex flex-1 flex-col gap-4 px-5 pb-5 pt-3">
        {blocks.map((block, index) => (
          <ReportBlockView key={`${node.id}-${index}`} block={block} ctx={ctx} />
        ))}
        {filler !== null && <FillerView data={filler} />}
        {!insight && <Gaps node={node} />}
      </div>

      {node.legalNote !== null && (
        <div className={cn('mt-auto border-t px-5 py-3', insight ? 'border-ink-border' : 'border-border-faint bg-surface-muted')}>
          <p className="mb-1 font-mono text-[10px] font-medium uppercase tracking-[0.1em] text-fg-subtle">
            Nota legal
          </p>
          <div className="[&_p]:text-[12.5px] [&_p]:leading-relaxed [&_p]:text-fg-muted">
            <ProseBlockView block={{ ...node.legalNote, emphasis: 'plain' }} compact />
          </div>
        </div>
      )}
    </>
  )
}

// ---------------------------------------------------------------------------
// La tarjeta
// ---------------------------------------------------------------------------

export interface ReportCardProps {
  section: RenderedSection
  ctx: Omit<BlockContext, 'sectionId' | 'insight' | 'compact'>
  filler?: FillerData | null
  paid: boolean
  meta: ReportViewMeta
  /** true ⇒ tres por fila: tipografía compacta. */
  compact?: boolean
  className?: string
}

function variantOf(node: ReportSectionNode): CardVariant {
  if (node.id === SCOPE_DISCLAIMER_SECTION_ID) return 'alert'
  if (node.id === 'doc-footer') return 'footer'
  if (node.id === 'regimen-mercado' && node.state === 'ok' && node.blocks.some((b) => b.kind === 'verdict')) {
    return 'insight'
  }
  return 'default'
}


export function ReportCard({
  section,
  ctx,
  filler = null,
  paid,
  meta,
  compact = false,
  className,
}: ReportCardProps) {
  const { node } = section
  const headingId = `${node.anchor}-titulo`
  const variant = variantOf(node)
  const blockCtx: BlockContext = {
    ...ctx,
    sectionId: node.id,
    insight: variant === 'insight',
    compact,
  }

  // Segundo cerrojo de INV-07: por id, no por confianza en quien arme el layout.
  const collapsible = section.collapsible && node.id !== SCOPE_DISCLAIMER_SECTION_ID

  const shell = cn(
    CARD_SHELL,
    'scroll-mt-28',
    variant === 'default' && 'border-border',
    variant === 'alert' && 'border-warning shadow-sm',
    variant === 'footer' && 'border-dashed border-border-strong bg-surface-muted shadow-none',
    variant === 'insight' && 'border-ink-border bg-ink text-ink-fg',
    collapsible && 'transition-[transform,box-shadow] duration-200 hover:-translate-y-0.5 hover:shadow-md',
    className,
  )

  // El pie del documento: la tira final con URL, ID y versiones, y «Copiar».
  if (variant === 'footer') {
    return (
      <section id={node.anchor} aria-label="Pie del documento" className={shell}>
        <div className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0 space-y-1 font-mono text-[11.5px] leading-relaxed text-fg-muted">
            {node.blocks.map((block, index) =>
              block.kind === 'prose' ? (
                block.paragraphs.map((paragraph, pi) => (
                  <p key={`${index}-${pi}`} className="break-words">
                    {paragraph}
                  </p>
                ))
              ) : (
                <ReportBlockView key={index} block={block} ctx={blockCtx} />
              ),
            )}
            <p className="break-words">
              ID <span className="text-fg">{meta.slug}</span> · secciones{' '}
              <span className="text-fg">
                {meta.certSectionsVersion} / {meta.certSectionsV2Version}
              </span>{' '}
              · política <span className="text-fg">{meta.policyVersion}</span>
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap gap-2 print:hidden">
            <CopyButton
              text={meta.verifyUrl}
              label="Copiar el enlace"
              copiedLabel="Copiado"
              variant="secondary"
              size="sm"
            />
            <CopyButton text={meta.slug} label="Copiar el ID" copiedLabel="Copiado" variant="ghost" size="sm" />
          </div>
        </div>
      </section>
    )
  }

  const header = (
    <CardHeader
      section={section}
      paid={paid}
      variant={variant}
      collapsible={collapsible}
      hint={section.collapsedHint}
      headingId={headingId}
      compact={compact}
    />
  )
  const body = (
    <CardBody section={section} ctx={blockCtx} filler={filler} variant={variant} />
  )

  /* La insight es ink plano, como el héroe: la jerarquía la hace el color del
     texto, no un fondo. (Antes llevaba bloom + anillos + grano; se retiró por
     pedido de Nico —«más minimalista»—.) */
  const insightLayers = null

  if (node.title === null) {
    // `doc-header` fuera del héroe no debería pasar por acá, pero si pasa se
    // pinta como sección sin título.
    return (
      <section id={node.anchor} aria-label="Datos del documento" className={shell}>
        {insightLayers}
        <div className="relative flex h-full flex-col">
          {header}
          {body}
        </div>
      </section>
    )
  }

  if (collapsible) {
    return (
      <section id={node.anchor} aria-labelledby={headingId} className={shell} data-card-variant={variant}>
        <details className="group/details flex h-full flex-col">
          <summary className="cursor-pointer list-none rounded-[20px] pb-4 transition-colors hover:bg-surface-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary [&::-webkit-details-marker]:hidden">
            {header}
          </summary>
          <div className="report-details-body flex flex-1 flex-col">{body}</div>
        </details>
      </section>
    )
  }

  return (
    <section id={node.anchor} aria-labelledby={headingId} className={shell} data-card-variant={variant}>
      {insightLayers}
      <div className="relative flex h-full flex-col">
        {header}
        {body}
      </div>
    </section>
  )
}

// ---------------------------------------------------------------------------
// La tarjeta-grupo: varias secciones plegadas como filas de acordeón
// ---------------------------------------------------------------------------

export interface ReportGroupCardProps {
  title: string
  lead: string
  sections: readonly RenderedSection[]
  ctx: Omit<BlockContext, 'sectionId' | 'insight' | 'compact'>
  paid: boolean
  className?: string
}

/**
 * «Marco legal»: UNA tarjeta con siete secciones como filas de acordeón. Cada
 * fila es su propio `<section id>` (el ancla sigue funcionando y el enlace
 * profundo la abre) con un `<details>` nativo adentro. Los `<details>` de acá
 * son plegables de LECTURA: la hoja de impresión los abre y Ctrl-F los
 * encuentra. El disclaimer de alcance jamás entra en un grupo (test de layout).
 */
export function ReportGroupCard({ title, lead, sections, ctx, paid, className }: ReportGroupCardProps) {
  const headingId = `grupo-${sections[0]?.node.id ?? 'legal'}-titulo`
  return (
    <div className={cn(CARD_SHELL, 'border-border', className)} aria-labelledby={headingId} role="group">
      <div className="px-5 pt-4">
        <Eyebrow>
          {sections.length} secciones · #{String(sections[0]?.index ?? 0).padStart(2, '0')}–#
          {String(sections[sections.length - 1]?.index ?? 0).padStart(2, '0')}
        </Eyebrow>
        <h3 id={headingId} className={cn(CARD_TITLE, 'mt-1.5 text-fg')}>
          {title}
        </h3>
        <p className="mt-1 text-[13px] text-fg-muted">{lead}</p>
      </div>
      <ol className="mt-3 flex flex-1 flex-col divide-y divide-border-faint border-t border-border-faint">
        {sections.map((section) => {
          const { node } = section
          const rowHeadingId = `${node.anchor}-titulo`
          const blockCtx: BlockContext = { ...ctx, sectionId: node.id, compact: true }
          const collapsible = section.collapsible && node.id !== SCOPE_DISCLAIMER_SECTION_ID
          const rowHeader = (
            <div className="flex items-center justify-between gap-3 px-5 py-3">
              <div className="min-w-0">
                <span className="block font-mono text-[10px] font-medium uppercase tracking-[0.1em] text-fg-subtle">
                  #{String(section.index).padStart(2, '0')} · {node.id}
                </span>
                <h4 id={rowHeadingId} className="mt-0.5 text-[14.5px] font-semibold leading-snug text-fg">
                  {node.title}
                </h4>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                {section.collapsedHint !== null && (
                  <span className="hidden font-mono text-[10.5px] tabular-nums text-fg-subtle sm:inline">
                    {section.collapsedHint}
                  </span>
                )}
                {collapsible && (
                  <span
                    aria-hidden="true"
                    className="grid size-7 place-items-center rounded-sm border border-border text-fg-subtle transition-transform duration-200 group-open/row:rotate-180 group-open/row:border-primary group-open/row:text-primary"
                  >
                    <CaretDown className="size-3.5" />
                  </span>
                )}
              </div>
            </div>
          )
          const rowBody = (
            <div className="flex flex-col gap-3 px-5 pb-4">
              {node.blocks.map((block, index) => (
                <ReportBlockView key={`${node.id}-${index}`} block={block} ctx={blockCtx} />
              ))}
              {node.legalNote !== null && (
                <ProseBlockView block={{ ...node.legalNote, emphasis: 'note' }} compact />
              )}
            </div>
          )
          return (
            <li key={node.id} className="min-w-0">
              <section id={node.anchor} aria-labelledby={rowHeadingId} className="scroll-mt-28">
                {collapsible ? (
                  <details className="group/row">
                    <summary className="cursor-pointer list-none transition-colors hover:bg-surface-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary group-open/row:bg-surface-selected [&::-webkit-details-marker]:hidden">
                      {rowHeader}
                    </summary>
                    <div className="report-details-body">{rowBody}</div>
                  </details>
                ) : (
                  <>
                    {rowHeader}
                    {rowBody}
                  </>
                )}
              </section>
            </li>
          )
        })}
      </ol>
    </div>
  )
}
