'use client'

/**
 * ValueBandChart.tsx — la banda de valor: eje, banda de confianza, valor
 * adoptado y (si viajan) los comparables ajustados llevados al área del sujeto.
 *
 * Es HTML posicionado en porcentajes y no un `<svg>` con texto: así los números
 * salen en JetBrains Mono con los tokens de color del tema y no en fuentes de
 * SVG. La figura entera se anuncia con `role="img"` + `aria-label` (la frase
 * completa) y todo lo interior va `aria-hidden`.
 *
 * Motion (framer, respeta `useReducedMotion`): la banda «crece» desde el
 * centro (`scaleX`, 0.9 s), el marcador aparece después con un spring, los
 * ticks entran en stagger. Con reduced-motion el marcado es el mismo (si no,
 * la hidratación dejaría el estado inicial pegado) y las transiciones duran 0.
 *
 * Dos tamaños: `hero` (sobre ink, mínimo: sin retícula, banda plana de una sola
 * tinta, marcador sin brillo) y `compact` (dentro de una tarjeta).
 */

import { motion, useReducedMotion, type Transition } from 'framer-motion'
import { Tooltip } from '@leasefy/cadence'
import { cn } from '@/lib/utils'
import { formatCurrency } from '@/lib/format'
import { formatCoverage } from '@/lib/avaluo/reporte/report-format'
import { REVEAL_EASE } from '../motion/ReportReveal'

export interface ValueBandChartProps {
  low: number
  high: number
  point: number | null
  coverageBps: number
  ticks?: readonly number[]
  subjectArea?: number | null
  altText: string
  size?: 'hero' | 'compact'
  className?: string
}

/** Redondea el eje a un múltiplo «bonito» (10 M para valores en cientos de M). */
function niceStep(span: number): number {
  const raw = span / 6
  const mag = 10 ** Math.floor(Math.log10(raw))
  const norm = raw / mag
  const step = norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 5 ? 5 : 10
  return step * mag
}

function shortMillions(v: number): string {
  const m = v / 1_000_000
  const text = m >= 100 ? Math.round(m).toString() : m.toFixed(1).replace('.', ',')
  return `$${text} M`
}

export function ValueBandChart({
  low,
  high,
  point,
  coverageBps,
  ticks = [],
  subjectArea = null,
  altText,
  size = 'compact',
  className,
}: ValueBandChartProps) {
  const reduced = useReducedMotion()
  const span = Math.max(1, high - low)
  const step = niceStep(span * 1.4)
  const axisMin = Math.floor((low - span * 0.18) / step) * step
  const axisMax = Math.ceil((high + span * 0.18) / step) * step
  const pct = (v: number) => ((v - axisMin) / (axisMax - axisMin)) * 100
  const left = pct(low)
  const right = pct(high)
  const hero = size === 'hero'
  const inkText = hero ? 'text-ink-fg' : 'text-fg'
  const mutedText = hero ? 'text-ink-fg-muted' : 'text-fg-muted'
  const subtleText = hero ? 'text-ink-fg-subtle' : 'text-fg-subtle'
  const hairline = hero ? 'bg-ink-border' : 'bg-border'

  const gridLines = []
  for (let v = axisMin; v <= axisMax; v += step) gridLines.push(v)

  /** Transición o salto instantáneo, según la preferencia del sistema. */
  const tr = (spec: Transition): Transition => (reduced ? { duration: 0 } : spec)

  return (
    <figure
      role="img"
      aria-label={altText}
      className={cn('m-0', className)}
      data-chart="value-band"
    >
      <div aria-hidden="true" className={cn('relative', hero ? 'h-[136px]' : 'h-[112px]')}>
        {/* Rejilla de instrumento (sólo en compacto; el héroe va limpio) */}
        {!hero && gridLines.map((v) => (
          <span
            key={v}
            className={cn('absolute inset-y-0 w-px', hairline)}
            style={{ left: `${pct(v)}%`, opacity: 0.7 }}
          />
        ))}
        {/* Eje */}
        <span
          className={cn('absolute left-0 right-0 h-px', hero ? 'bg-ink-fg-subtle opacity-70' : 'bg-border-strong')}
          style={{ top: hero ? 76 : 60 }}
        />

        {/* Banda de confianza */}
        <motion.div
          className={cn(
            'absolute',
            hero ? 'rounded-[2px] bg-indigo-300/[0.14]' : 'rounded-[3px] border-x border-primary',
          )}
          style={{
            left: `${left}%`,
            width: `${right - left}%`,
            top: hero ? 48 : 30,
            height: hero ? 56 : 60,
            transformOrigin: '50% 50%',
            background: hero
              ? undefined
              : 'linear-gradient(180deg, var(--accent-soft) 0%, transparent 100%)',
            boxShadow: hero ? undefined : 'inset 0 0 32px -10px var(--accent-soft)',
          }}
          initial={{ scaleX: 0, opacity: 0 }}
          animate={{ scaleX: 1, opacity: 1 }}
          transition={tr({ duration: 0.9, ease: [...REVEAL_EASE] })}
        />
        {/* Extremos de la banda */}
        {[low, high].map((v, i) => (
          <motion.span
            key={i}
            className={cn('absolute w-px', hero ? 'bg-indigo-300' : 'bg-primary')}
            style={{ left: `${pct(v)}%`, top: hero ? 44 : 24, height: hero ? 64 : 72 }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={tr({ delay: 0.5, duration: 0.3 })}
          >
            {!hero && (
              <span className="absolute -left-[3px] -top-[3px] h-[7px] w-[7px] rounded-full bg-primary" />
            )}
          </motion.span>
        ))}

        {/* Ticks: los comparables ajustados llevados al área del sujeto */}
        {ticks.map((t, i) => (
          <motion.span
            key={`${t}-${i}`}
            className={cn('absolute w-px', hero ? 'bg-indigo-200' : 'bg-fg-muted')}
            style={{ left: `${pct(t)}%`, top: hero ? 80 : 66, height: hero ? 12 : 12 }}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={tr({ delay: 0.7 + i * 0.05, duration: 0.3 })}
          >
            <span
              className={cn(
                'absolute -bottom-1 -left-[1.5px] h-1 w-1 rounded-full',
                hero ? 'bg-indigo-200' : 'bg-fg-muted',
              )}
            />
          </motion.span>
        ))}

        {/* Valor adoptado */}
        {point !== null && (
          <motion.div
            className="absolute"
            style={{ left: `${pct(point)}%`, top: hero ? 14 : 8, height: hero ? 108 : 96 }}
            initial={{ opacity: 0, scaleY: 0.4 }}
            animate={{ opacity: 1, scaleY: 1 }}
            transition={tr({ delay: 0.55, type: 'spring', stiffness: 220, damping: 20 })}
          >
            <span
              className={cn(
                'absolute inset-y-0 -left-px rounded-full',
                hero ? 'w-px bg-ink-fg' : 'w-[2px] bg-primary',
              )}
            />
            <span
              className={cn(
                'absolute rounded-full',
                hero ? '-left-[3px] h-[7px] w-[7px] bg-ink-fg' : '-left-[5px] h-[10px] w-[10px] bg-primary',
              )}
              style={{
                top: hero ? 59 : 52,
                boxShadow: hero ? '0 0 0 3px var(--ink)' : '0 0 0 4px var(--accent-soft)',
              }}
            />
            <Tooltip
              content={`Valor adoptado: ${formatCurrency(point)}`}
              side="top"
            >
              <button
                type="button"
                tabIndex={-1}
                aria-hidden="true"
                className={cn(
                  'absolute -translate-x-1/2 whitespace-nowrap font-mono text-[11px] font-semibold tabular-nums',
                  hero
                    ? '-top-2 text-ink-fg'
                    : '-top-1 rounded-full border border-primary bg-surface px-2.5 py-0.5 text-fg',
                )}
              >
                {formatCurrency(point)}
              </button>
            </Tooltip>
          </motion.div>
        )}

        {/* Etiquetas del eje. En el héroe los extremos van ARRIBA (nunca chocan con
            los límites de la banda); en compacto van abajo y ceden el sitio si la
            banda casi los toca. */}
        {(hero || left > 18) && (
          <span
            className={cn(
              'absolute left-0 font-mono text-[10.5px] tabular-nums',
              hero ? 'top-0' : 'bottom-0',
              subtleText,
            )}
          >
            {shortMillions(axisMin)}
          </span>
        )}
        {(hero || right < 82) && (
          <span
            className={cn(
              'absolute right-0 font-mono text-[10.5px] tabular-nums',
              hero ? 'top-0' : 'bottom-0',
              subtleText,
            )}
          >
            {shortMillions(axisMax)}
          </span>
        )}
        <span
          className={cn(
            'absolute bottom-0 -translate-x-1/2 whitespace-nowrap font-mono text-[11px] tabular-nums',
            mutedText,
            left < 12 && 'translate-x-0',
          )}
          style={{ left: `${left}%` }}
        >
          {formatCurrency(low)}
        </span>
        <span
          className={cn(
            'absolute bottom-0 -translate-x-1/2 whitespace-nowrap font-mono text-[11px] tabular-nums',
            mutedText,
            right > 88 && '-translate-x-full',
          )}
          style={{ left: `${right}%` }}
        >
          {formatCurrency(high)}
        </span>
      </div>

      {/* Leyenda */}
      <figcaption
        aria-hidden="true"
        className={cn(
          'mt-3 flex flex-wrap items-center gap-x-5 gap-y-1.5 text-[12px]',
          subtleText,
        )}
      >
        <span className="inline-flex items-center gap-2">
          <i
            className={cn(
              'inline-block h-2 w-4 rounded-[2px]',
              hero ? 'bg-indigo-300/[0.3]' : 'border border-primary',
            )}
            style={{ background: hero ? undefined : 'var(--accent-soft)' }}
          />
          Banda <b className={cn('font-mono font-semibold tabular-nums', inkText)}>{formatCoverage(coverageBps)}</b>
        </span>
        {point !== null && (
          <span className="inline-flex items-center gap-2">
            <i className={cn('inline-block h-3 rounded-full', hero ? 'w-px bg-ink-fg' : 'w-[2px] bg-primary')} />
            Valor adoptado
          </span>
        )}
        {ticks.length > 0 && (
          <span className="inline-flex items-center gap-2">
            <i className={cn('inline-block h-2.5 w-px', hero ? 'bg-indigo-200' : 'bg-fg-muted')} />
            Los <b className={cn('font-mono font-semibold tabular-nums', inkText)}>{ticks.length}</b> comparables
            ajustados
            {subjectArea !== null && (
              <>
                , llevados a{' '}
                <b className={cn('font-mono font-semibold tabular-nums', inkText)}>{subjectArea} m²</b>
              </>
            )}
          </span>
        )}
      </figcaption>
    </figure>
  )
}
