/**
 * ReportChapter.tsx — un capítulo del panel: cabecera (pill numerada + título +
 * subtítulo + chips derivados) y su bento de filas.
 *
 * La rejilla es `grid grid-cols-12 gap-5 items-stretch` y cada celda lleva
 * `h-full`: dos tarjetas que comparten fila SIEMPRE quedan a la misma altura.
 * Qué va en cada fila y con qué ancho lo decide `landing-layout.ts`, no este
 * componente.
 *
 * El contenedor del capítulo es un `<div id="bN">`, no un `<section>`: la hoja
 * de impresión evita partir `section` (una tarjeta) y un capítulo entero no
 * cabe en una hoja.
 */

import { StatusBadge } from '@leasefy/cadence'
import { cn } from '@/lib/utils'
import type { LandingView, RenderedChapter } from '@/lib/avaluo/reporte/landing-layout'
import { ReportReveal } from './motion/ReportReveal'
import { ReportCard, ReportGroupCard, spanClass } from './ReportCard'
import { ReportHero } from './ReportHero'
import type { BlockContext } from './ReportBlockView'

export interface ReportChapterProps {
  chapter: RenderedChapter
  index: number
  view: LandingView
  ctx: Omit<BlockContext, 'sectionId' | 'insight' | 'compact'>
}

export function ReportChapter({ chapter, index, view, ctx }: ReportChapterProps) {
  const number = String(index + 1).padStart(2, '0')
  const isHeroChapter = chapter.rows[0]?.cells[0]?.kind === 'hero'

  return (
    <div id={chapter.id} data-chapter className="scroll-mt-24 space-y-5">
      {/* El primer capítulo abre con el héroe y no lleva cabecera propia (como
          la referencia): el héroe ES la cabecera de «Cuánto vale». */}
      {!isHeroChapter && (
        <ReportReveal>
          <ChapterHeader chapter={chapter} number={number} />
        </ReportReveal>
      )}

      {chapter.rows.map((row, rowIndex) => {
        const single = row.cells.length === 1 && row.cells[0]?.kind === 'hero'
        return (
          <div key={rowIndex} className={cn(!single && 'grid grid-cols-12 items-stretch gap-5')}>
            {row.cells.map((cell, cellIndex) => {
              if (cell.kind === 'hero') {
                const [docHeader, valor] = cell.sections
                if (docHeader === undefined || valor === undefined) return null
                return (
                  <ReportHero
                    key="hero"
                    docHeader={docHeader}
                    valor={valor}
                    meta={view.meta}
                    paid={view.paid}
                    sample={view.sample}
                    paywallHref={view.meta.paywallCtaHref}
                    heroStats={view.heroStats}
                    heroBand={view.heroBand}
                  />
                )
              }
              if (cell.kind === 'stack') {
                return (
                  <ReportReveal
                    key={`stack-${cellIndex}`}
                    order={cellIndex}
                    className={cn(spanClass(cell.span), 'flex h-full min-w-0 flex-col gap-5')}
                  >
                    {/* `h-auto flex-auto` (1 1 auto), no `h-full flex-1`: cada
                        tarjeta conserva su altura natural y el aire sobrante se
                        reparte por igual; con `flex-1` + `h-full` una insight de
                        una palabra medía lo mismo que una tarjeta con figura. */}
                    {cell.sections.map((section) => (
                      <ReportCard
                        key={section.node.id}
                        section={section}
                        ctx={ctx}
                        paid={view.paid}
                        meta={view.meta}
                        className="h-auto flex-auto"
                      />
                    ))}
                  </ReportReveal>
                )
              }
              if (cell.kind === 'group') {
                return (
                  <ReportReveal
                    key={`group-${cellIndex}`}
                    order={cellIndex}
                    className={cn(spanClass(cell.span), 'h-full min-w-0')}
                  >
                    <ReportGroupCard
                      title={cell.title}
                      lead={cell.lead}
                      sections={cell.sections}
                      ctx={ctx}
                      paid={view.paid}
                    />
                  </ReportReveal>
                )
              }
              return (
                <ReportReveal
                  key={cell.section.node.id}
                  order={cellIndex}
                  className={cn(spanClass(cell.span), 'h-full min-w-0')}
                >
                  <ReportCard
                    section={cell.section}
                    ctx={ctx}
                    filler={cell.filler}
                    paid={view.paid}
                    meta={view.meta}
                    compact={cell.span <= 4}
                  />
                </ReportReveal>
              )
            })}
          </div>
        )
      })}
    </div>
  )
}

function ChapterHeader({ chapter, number }: { chapter: RenderedChapter; number: string }) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3 border-b border-border-faint pb-4 pt-2">
      <div className="flex min-w-0 items-start gap-3">
        <span
          aria-hidden="true"
          className="mt-1 inline-flex shrink-0 items-center rounded-[6px] bg-primary px-2 py-0.5 font-mono text-[11px] font-bold tabular-nums tracking-[0.08em] text-primary-fg"
        >
          {number}
        </span>
        <div className="min-w-0">
          <h2 className="text-h4 text-fg">{chapter.title}</h2>
          {chapter.lead !== null && (
            <p className="mt-1 max-w-[74ch] text-[14.5px] leading-relaxed text-fg-muted">{chapter.lead}</p>
          )}
        </div>
      </div>
      {chapter.chips.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          {chapter.chips.map((chip) => (
            <StatusBadge key={chip.label} tone={chip.tone} className="px-2.5 py-1">
              {chip.label}
            </StatusBadge>
          ))}
        </div>
      )}
    </header>
  )
}
