'use client'

/**
 * Fillers.tsx — las piezas de DATO REAL que rellenan una tarjeta para que dos
 * hermanas queden a la misma altura sin aire muerto (`landing-layout.ts`
 * decide cuál va en cada celda; `resolveFiller` deriva los números).
 *
 *   · VigenciaMeter    → `ProgressRing` de cadence: días transcurridos / 365.
 *   · SectorGauge      → medio arco 0–100 (calidad del entorno urbano).
 *   · ExposureMeter    → barra 0–240 d con la banda 60–90 marcada.
 *   · SplitDonut       → `DonutChart` de cadence: terreno / construcción.
 *   · DivergenceGauge  → medio arco con el umbral marcado (bps).
 *
 * El medio arco es propio (`ArcGauge`) y no el `Gauge` del DS porque ése trae
 * horneados una pista y unos rótulos de color literal claro — iguales en los
 * dos temas — y acá se pinta también en oscuro. `ArcGauge` usa sólo tokens
 * (`--border-faint`, `--primary`, `--warning`) y anima con `pathLength` +
 * spring, como pide la spec.
 *
 * Todas las figuras se anuncian con `role="img"` + `aria-label` con los
 * números; lo interior va `aria-hidden`.
 *
 * Reduced-motion: el marcado no cambia entre servidor y cliente (si cambiara,
 * la hidratación dejaría el estado inicial pegado); las transiciones duran 0.
 */

import { motion, useReducedMotion } from 'framer-motion'
import { DonutChart, ProgressRing } from '@leasefy/cadence'
import { cn } from '@/lib/utils'
import { formatCurrency, formatDate } from '@/lib/format'
import { formatBps, formatPct2 } from '@/lib/avaluo/reporte/report-format'
import type { FillerData } from '@/lib/avaluo/reporte/landing-layout'
import { REVEAL_EASE } from '../motion/ReportReveal'

// ---------------------------------------------------------------------------
// Piezas comunes
// ---------------------------------------------------------------------------

function Frame({
  label,
  children,
  className,
}: {
  label: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <figure
      role="img"
      aria-label={label}
      className={cn(
        // `flex-1`: el relleno crece con la tarjeta y su dibujo queda centrado,
        // así una tarjeta corta al lado de una alta no muestra aire muerto.
        'm-0 flex flex-1 flex-col justify-center rounded-md border border-border-faint bg-surface-muted px-4 py-4',
        className,
      )}
    >
      <div aria-hidden="true">{children}</div>
    </figure>
  )
}

/** Medio arco 0–max con aguja spring y un tick de umbral opcional. */
function ArcGauge({
  value,
  max,
  threshold,
  tone,
  display,
  unit,
  caption,
  minLabel,
  maxLabel,
}: {
  value: number
  max: number
  threshold?: number
  tone: 'primary' | 'success' | 'warning' | 'danger'
  display: string
  unit?: string
  caption?: string
  minLabel?: string
  maxLabel?: string
}) {
  const reduced = useReducedMotion()
  const fill = Math.min(1, Math.max(0, value / max))
  const R = 80
  const arc = `M20,96 A${R},${R} 0 0,1 180,96`
  const point = (f: number) => {
    const a = Math.PI * Math.min(1, Math.max(0, f))
    return { x: 100 - R * Math.cos(a), y: 96 - R * Math.sin(a) }
  }
  const tip = point(fill)
  const tick = threshold === undefined ? null : point(Math.min(1, threshold / max))
  // En este repo `--primary` es un triplete HSL (mvp), no un color: como valor
  // crudo de `stroke` no pinta. Los tokens de feedback sí son colores literales.
  const stroke = tone === 'primary' ? 'hsl(var(--primary))' : `var(--${tone})`

  return (
    <div className="mx-auto flex w-full max-w-[200px] flex-col items-center">
      <div className="relative w-full">
        <svg viewBox="0 0 200 110" className="block h-auto w-full overflow-visible">
          <path d={arc} fill="none" stroke="var(--border)" strokeWidth={14} strokeLinecap="round" />
          <motion.path
            d={arc}
            fill="none"
            stroke={stroke}
            strokeWidth={14}
            strokeLinecap="round"
            initial={{ pathLength: 0 }}
            whileInView={{ pathLength: fill }}
            viewport={{ once: true }}
            transition={reduced ? { duration: 0 } : { duration: 1, ease: [...REVEAL_EASE] }}
          />
          {tick !== null && (
            <line
              x1={tick.x}
              y1={tick.y}
              x2={100 + (tick.x - 100) * 0.84}
              y2={96 + (tick.y - 96) * 0.84}
              stroke="var(--fg)"
              strokeWidth={2}
              strokeDasharray="2 3"
            />
          )}
          <motion.circle
            cx={tip.x}
            cy={tip.y}
            r={7}
            fill="var(--surface)"
            stroke={stroke}
            strokeWidth={3}
            data-reveal=""
            initial={{ scale: 0, opacity: 0 }}
            whileInView={{ scale: 1, opacity: 1 }}
            viewport={{ once: true }}
            transition={reduced ? { duration: 0 } : { delay: 0.9, type: 'spring', stiffness: 260, damping: 18 }}
            style={{ transformOrigin: `${tip.x}px ${tip.y}px` }}
          />
        </svg>
        <div className="pointer-events-none absolute inset-x-0 bottom-0 text-center">
          <div className="font-mono text-[30px] font-semibold leading-none tracking-[-0.03em] text-fg tabular-nums">
            {display}
            {unit !== undefined && (
              <span className="ml-0.5 text-[15px] font-medium text-fg-muted">{unit}</span>
            )}
          </div>
          {caption !== undefined && (
            <div className="mt-1 text-[11.5px] leading-tight text-fg-muted">{caption}</div>
          )}
        </div>
        {minLabel !== undefined && (
          <span className="absolute -bottom-4 left-0 font-mono text-[10px] text-fg-subtle tabular-nums">
            {minLabel}
          </span>
        )}
        {maxLabel !== undefined && (
          <span className="absolute -bottom-4 right-0 font-mono text-[10px] text-fg-subtle tabular-nums">
            {maxLabel}
          </span>
        )}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Los cinco rellenos
// ---------------------------------------------------------------------------

export function VigenciaMeter({ data }: { data: Extract<FillerData, { kind: 'vigencia-meter' }> }) {
  const label = `Vigencia: quedan ${data.daysLeft} de ${data.totalDays} días, hasta el ${formatDate(data.untilIso)}. Transcurrido el ${data.elapsedPct} %.`
  return (
    <Frame label={label}>
      <div className="flex items-center gap-5">
        {/* `ProgressRing` pinta el arco con `var(--primary)` crudo, que en este
            repo es un triplete HSL y no un color: se le da un `--primary`
            resuelto en el scope del anillo (adentro no hay clases `bg-primary`). */}
        <ProgressRing
          value={data.elapsedPct}
          size={92}
          color={data.daysLeft <= 30 ? 'warning' : 'primary'}
          strokeWidth={8}
          style={{ '--primary': 'hsl(var(--indigo-500))' } as React.CSSProperties}
          label={
            <span className="flex flex-col items-center leading-none">
              <span className="font-mono text-[20px] font-semibold tabular-nums text-fg">
                {data.daysLeft}
              </span>
              <span className="mt-1 font-mono text-[9.5px] uppercase tracking-[0.08em] text-fg-subtle">
                días
              </span>
            </span>
          }
        />
        <div className="min-w-0 space-y-1">
          <p className="font-mono text-[11px] font-medium uppercase tracking-[0.08em] text-fg-subtle">
            Restantes de {data.totalDays}
          </p>
          <p className="text-body-sm text-fg">
            Hasta el <span className="font-mono tabular-nums">{formatDate(data.untilIso)}</span>
          </p>
          <p className="text-caption text-fg-muted">
            <span className="font-mono tabular-nums">{data.elapsedPct} %</span> de la vigencia
            transcurrido
          </p>
        </div>
      </div>
    </Frame>
  )
}

export function SectorGauge({ data }: { data: Extract<FillerData, { kind: 'sector-gauge' }> }) {
  return (
    <Frame label={`${data.label}: ${data.score} de ${data.max}.`} className="pb-8">
      <ArcGauge
        value={data.score}
        max={data.max}
        tone={data.score >= 75 ? 'success' : data.score >= 50 ? 'primary' : 'warning'}
        display={String(data.score)}
        unit={`/${data.max}`}
        caption="calidad del entorno urbano"
        minLabel="0"
        maxLabel={String(data.max)}
      />
    </Frame>
  )
}

export function ExposureMeter({ data }: { data: Extract<FillerData, { kind: 'exposure-meter' }> }) {
  const reduced = useReducedMotion()
  const pct = (v: number) => (v / data.max) * 100
  const marks = [0, 60, 120, 180, 240].filter((m) => m <= data.max)
  return (
    <Frame label={`Tiempo de exposición estimado: entre ${data.low} y ${data.high} días, sobre un eje de 0 a ${data.max} días.`}>
      <div className="relative h-[92px]">
        {marks.map((m) => (
          <span
            key={m}
            className="absolute top-2 h-[52px] w-px bg-border"
            style={{ left: `${pct(m)}%` }}
          />
        ))}
        <span className="absolute left-0 right-0 top-[38px] h-px bg-border-strong" />
        <motion.div
          className="absolute rounded-[3px] border-x border-primary"
          style={{
            left: `${pct(data.low)}%`,
            width: `${pct(data.high) - pct(data.low)}%`,
            top: 20,
            height: 36,
            background: 'linear-gradient(180deg, var(--accent-soft), transparent)',
            transformOrigin: '50% 50%',
          }}
          data-reveal=""
          initial={{ scaleX: 0 }}
          whileInView={{ scaleX: 1 }}
          viewport={{ once: true }}
          transition={reduced ? { duration: 0 } : { duration: 0.8, ease: [...REVEAL_EASE] }}
        />
        <motion.span
          className="absolute -translate-x-1/2 whitespace-nowrap rounded-full border border-primary bg-surface px-2 py-0.5 font-mono text-[11px] font-semibold tabular-nums text-fg"
          style={{ left: `${(pct(data.low) + pct(data.high)) / 2}%`, top: -2 }}
          data-reveal=""
          initial={{ opacity: 0, y: 4 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={reduced ? { duration: 0 } : { delay: 0.5, duration: 0.3 }}
        >
          {data.low}–{data.high} d
        </motion.span>
        {marks.map((m) => (
          <span
            key={`l-${m}`}
            className={cn(
              'absolute bottom-0 whitespace-nowrap font-mono text-[10px] tabular-nums text-fg-subtle',
              m === 0 ? '' : m === data.max ? '-translate-x-full' : '-translate-x-1/2',
            )}
            style={{ left: `${pct(m)}%` }}
          >
            {m} d
          </span>
        ))}
      </div>
    </Frame>
  )
}

export function SplitDonut({ data }: { data: Extract<FillerData, { kind: 'split-donut' }> }) {
  const reduced = useReducedMotion()
  const label = `Reparto del valor: ${data.parts
    .map((p) => `${p.label} ${formatPct2((p.value / data.total) * 100)} (${formatCurrency(p.value)})`)
    .join(', ')}.`
  const segments = data.parts.map((p, i) => ({
    label: p.label,
    value: p.value,
    color: i === 0 ? 'hsl(var(--primary))' : 'hsl(var(--indigo-200))',
  }))
  const lead = data.parts[0]
  return (
    <Frame label={label}>
      <motion.div
        data-reveal=""
        initial={{ opacity: 0, scale: 0.92, rotate: -12 }}
        whileInView={{ opacity: 1, scale: 1, rotate: 0 }}
        viewport={{ once: true }}
        transition={reduced ? { duration: 0 } : { duration: 0.7, ease: [...REVEAL_EASE] }}
        className="flex flex-col gap-4 sm:flex-row sm:items-center"
      >
        <DonutChart
          data={segments}
          size={128}
          innerRatio={0.66}
          legend={false}
          centerLabel={lead?.label}
          centerValue={lead === undefined ? undefined : formatPct2((lead.value / data.total) * 100)}
        />
        <ul className="min-w-0 flex-1 space-y-2">
          {data.parts.map((p, i) => (
            <li key={p.label} className="flex items-center gap-2.5 text-[13px]">
              <span
                className="inline-block h-2.5 w-2.5 shrink-0 rounded-[3px]"
                style={{ background: segments[i]?.color }}
              />
              <span className="min-w-0 flex-1 truncate text-fg-muted">{p.label}</span>
              <span className="font-mono text-[12.5px] font-semibold tabular-nums text-fg">
                {formatPct2((p.value / data.total) * 100)}
              </span>
            </li>
          ))}
        </ul>
      </motion.div>
    </Frame>
  )
}

export function DivergenceGauge({
  data,
}: {
  data: Extract<FillerData, { kind: 'divergence-gauge' }> }) {
  const abs = Math.abs(data.bps)
  const max = Math.max(data.thresholdBps * 1.15, abs * 1.15, 1)
  const inside = abs <= data.thresholdBps
  return (
    <Frame
      label={`Divergencia de ${formatBps(data.bps)} frente a un umbral de ${formatBps(data.thresholdBps)}: ${
        inside ? 'dentro del umbral' : 'fuera del umbral'
      }.`}
      className="pb-8"
    >
      <ArcGauge
        value={abs}
        max={max}
        threshold={data.thresholdBps}
        tone={inside ? 'success' : 'danger'}
        display={formatBps(data.bps)}
        caption={`umbral ${formatBps(data.thresholdBps).replace(/^\+/, '')}`}
        minLabel="0"
        maxLabel={formatBps(max).replace(/^\+/, '')}
      />
    </Frame>
  )
}

export function FillerView({ data }: { data: FillerData }) {
  switch (data.kind) {
    case 'vigencia-meter':
      return <VigenciaMeter data={data} />
    case 'sector-gauge':
      return <SectorGauge data={data} />
    case 'exposure-meter':
      return <ExposureMeter data={data} />
    case 'split-donut':
      return <SplitDonut data={data} />
    case 'divergence-gauge':
      return <DivergenceGauge data={data} />
  }
}
