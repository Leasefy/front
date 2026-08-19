'use client'

/**
 * ReportRail.tsx — el índice lateral persistente con scrollspy y progreso.
 *
 * Es UNA isla de cliente. El DS no tiene scrollspy ni tabla de contenidos, así
 * que está escrito a mano sobre `IntersectionObserver` + un listener de scroll
 * en rAF para la barra de progreso de lectura.
 *
 * Decisiones:
 *
 *  1. **Lista los 6 capítulos** (`01`–`06`); el activo se expande y lista sus
 *     secciones (anclas). Un índice de 39 entradas siempre abierto es la tabla
 *     de contenidos del papel con scrollspy encima.
 *  2. **`sticky`, no `fixed`.** Toda página de este repo va envuelta en la
 *     animación de `PageTransition`, que deja un `transform` en un ancestro y
 *     lo vuelve *containing block* de cualquier `position: fixed` descendiente.
 *  3. **Un solo `<nav>`** para todos los anchos: en móvil es un scroller
 *     horizontal de chips bajo la barra; en `lg` es la columna. Así el DOM no
 *     duplica enlaces.
 *  4. **Enlace profundo a una sección plegada**: se abre su `<details>` y se
 *     salta a ella. Sin esto, compartir `#niif13` deja al lector mirando un
 *     título cerrado.
 *
 * El indicador del capítulo activo se mueve con `layoutId` de framer; con
 * `prefers-reduced-motion` salta sin animar.
 */

import { useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { StatusBadge } from '@leasefy/cadence'
import { cn } from '@/lib/utils'
import type { ReportCompleteness } from '@/lib/avaluo/reporte/report-model'

export interface RailSection {
  readonly id: string
  readonly title: string
}

export interface RailChapter {
  readonly id: string
  readonly title: string
  readonly sections: readonly RailSection[]
}

export interface ReportRailProps {
  chapters: readonly RailChapter[]
  completeness: ReportCompleteness
  /** id del `<article>` cuyo alto mide la barra de progreso. */
  articleId: string
  className?: string
}

export function ReportRail({ chapters, completeness, articleId, className }: ReportRailProps) {
  const reduced = useReducedMotion()
  const [activeChapter, setActiveChapter] = useState<string>(chapters[0]?.id ?? '')
  const [activeSection, setActiveSection] = useState<string | null>(null)
  const [progress, setProgress] = useState(0)
  const chapterKey = chapters.map((c) => c.id).join('|')
  const sectionKey = useMemo(
    () => chapters.flatMap((c) => c.sections.map((s) => s.id)).join('|'),
    [chapters],
  )
  const ticking = useRef(false)

  // Scrollspy por posición: el capítulo/sección más alto cuyo borde superior
  // ya pasó la línea de lectura (barra + margen). Más estable que contar
  // intersecciones cuando las tarjetas son altas.
  useEffect(() => {
    if (typeof window === 'undefined') return
    const chapterEls = chapterKey
      .split('|')
      .map((id) => document.getElementById(id))
      .filter((el): el is HTMLElement => el !== null)
    const sectionEls = sectionKey
      .split('|')
      .map((id) => document.getElementById(id))
      .filter((el): el is HTMLElement => el !== null)
    const article = document.getElementById(articleId)
    if (chapterEls.length === 0) return

    const topmost = (els: HTMLElement[]): HTMLElement | null => {
      const line = 140
      let chosen: HTMLElement | null = els[0] ?? null
      for (const el of els) {
        if (el.getBoundingClientRect().top - line <= 0) chosen = el
        else break
      }
      return chosen
    }

    const spy = () => {
      ticking.current = false
      if (article !== null) {
        const rect = article.getBoundingClientRect()
        const total = Math.max(1, rect.height - window.innerHeight)
        setProgress(Math.min(1, Math.max(0, -rect.top / total)))
      }
      const chapter = topmost(chapterEls)
      if (chapter === null) return
      setActiveChapter(chapter.id)
      const own = sectionEls.filter((el) => chapter.contains(el))
      const section = topmost(own)
      setActiveSection(section?.id ?? null)
    }

    const onScroll = () => {
      if (ticking.current) return
      ticking.current = true
      window.requestAnimationFrame(spy)
    }

    spy()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
    }
  }, [chapterKey, sectionKey, articleId])

  // Enlace profundo a una sección plegada.
  useEffect(() => {
    if (typeof document === 'undefined') return
    const reveal = () => {
      const hash = window.location.hash.slice(1)
      if (hash === '') return
      const target = document.getElementById(hash)
      if (target === null) return
      // El ancla es el `<section>` y su `<details>` cuelga DE ÉL, así que hay
      // que abrir hacia ADENTRO. Sólo el plegable propio de la sección:
      // `:scope >` deja cerrados los plegables interiores, que son otra decisión
      // de lectura. `closest` se conserva por si el ancla apunta a un nodo interior.
      target.closest('details')?.setAttribute('open', '')
      target.querySelector(':scope > details')?.setAttribute('open', '')
      target.scrollIntoView()
    }
    reveal()
    window.addEventListener('hashchange', reveal)
    return () => window.removeEventListener('hashchange', reveal)
  }, [])

  const activeIndex = Math.max(
    0,
    chapters.findIndex((c) => c.id === activeChapter),
  )
  const pad = (n: number) => String(n).padStart(2, '0')

  return (
    <nav
      aria-label="Índice del informe"
      data-report-nav
      className={cn(
        // Móvil: scroller de chips pegado bajo la barra. Escritorio: columna
        // sticky (`self-start` en la rejilla para que tenga recorrido).
        'sticky top-14 z-20 -mx-4 border-b border-border bg-bg/95 backdrop-blur-sm',
        'lg:top-[5.25rem] lg:mx-0 lg:self-start lg:border-b-0 lg:bg-transparent lg:pr-3 lg:pt-8 lg:backdrop-blur-none',
        className,
      )}
    >
      {/* Cabecera del índice: sólo escritorio */}
      <div className="hidden items-center justify-between lg:flex">
        <span className="font-mono text-[11px] font-medium uppercase tracking-[0.1em] text-fg-subtle">
          Índice
        </span>
        <span className="font-mono text-[11px] tabular-nums text-fg-subtle" aria-live="polite">
          {pad(activeIndex + 1)} / {pad(chapters.length)}
        </span>
      </div>
      <div
        aria-hidden="true"
        className="mb-4 mt-3 hidden h-[3px] overflow-hidden rounded-full bg-border-faint lg:block"
      >
        <div
          className="h-full rounded-full bg-primary transition-[width] duration-100 ease-linear motion-reduce:transition-none"
          style={{ width: `${(progress * 100).toFixed(1)}%` }}
        />
      </div>

      <ol className="flex gap-1.5 overflow-x-auto px-4 py-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden lg:flex-col lg:gap-0.5 lg:overflow-visible lg:px-0 lg:py-0">
        {chapters.map((chapter, index) => {
          const isActive = chapter.id === activeChapter
          return (
            <li key={chapter.id} className="relative shrink-0 lg:shrink">
              <a
                href={`#${chapter.id}`}
                data-chapter-link
                aria-current={isActive ? 'true' : undefined}
                className={cn(
                  'relative flex items-center gap-2.5 whitespace-nowrap rounded-sm px-2.5 py-1.5 text-[13.5px] font-medium transition-colors',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
                  isActive ? 'text-fg' : 'text-fg-muted hover:bg-surface-hover hover:text-fg',
                )}
              >
                {isActive && (
                  <motion.span
                    layoutId={reduced ? undefined : 'rail-active'}
                    aria-hidden="true"
                    className="absolute inset-0 rounded-sm border border-primary/25 bg-primary-soft"
                    transition={{ type: 'spring', stiffness: 380, damping: 32 }}
                  />
                )}
                <span
                  className={cn(
                    'relative rounded-[5px] border px-1.5 py-px font-mono text-[10.5px] font-semibold tabular-nums tracking-[0.06em]',
                    isActive ? 'border-primary/50 text-primary' : 'border-border text-fg-subtle',
                  )}
                >
                  {pad(index + 1)}
                </span>
                <span className="relative">{chapter.title}</span>
              </a>

              <AnimatePresence initial={false}>
                {isActive && chapter.sections.length > 0 && (
                  <motion.div
                    key="sub"
                    initial={reduced ? false : { height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={reduced ? { opacity: 0 } : { height: 0, opacity: 0 }}
                    transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                    className="hidden overflow-hidden lg:block"
                  >
                    <ol className="my-1 ml-4 border-l border-border pl-3">
                      {chapter.sections.map((section) => {
                        const current = section.id === activeSection
                        return (
                          <li key={section.id}>
                            <a
                              href={`#${section.id}`}
                              aria-current={current ? 'location' : undefined}
                              className={cn(
                                'block rounded-[6px] px-2 py-1 text-[12.5px] leading-[1.35] transition-colors',
                                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
                                current
                                  ? 'font-semibold text-primary'
                                  : 'text-fg-subtle hover:bg-surface-hover hover:text-fg',
                              )}
                            >
                              {section.title}
                            </a>
                          </li>
                        )
                      })}
                    </ol>
                  </motion.div>
                )}
              </AnimatePresence>
            </li>
          )
        })}
      </ol>

      {/* Completitud + nota: sólo escritorio */}
      <div className="mt-5 hidden border-t border-border-faint pt-4 lg:block">
        <div className="flex flex-wrap gap-1.5">
          <StatusBadge tone="success" dot={false}>
            {completeness.ok} completas
          </StatusBadge>
          <StatusBadge tone="warning" dot={false}>
            {completeness.partial} parciales
          </StatusBadge>
          <StatusBadge tone="critical" dot={false}>
            {completeness.degraded} sin datos
          </StatusBadge>
        </div>
        <p className="mt-3 text-[11.5px] leading-[1.6] text-fg-subtle">
          {completeness.total} secciones del modelo en {chapters.length} bloques de
          presentación. El orden del PDF no cambia: esto es una partición de la vista.
        </p>
      </div>
    </nav>
  )
}
