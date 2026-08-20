/**
 * DataBlocks.tsx — los arquetipos de datos: clave-valor, tabla, cifra,
 * veredicto y cadena estadística.
 *
 * Nota sobre `CurrencyDisplay` del DS: **no se usa acá, a propósito**. Su
 * `formatCOP` imprime `$519.853.230` (sin espacio) mientras `formatCurrency()`
 * de `@/lib/format` — el formateador que manda en este repo por
 * `docs/DESIGN.md:38` y que usa el resto de la app — imprime `$ 519.853.230`.
 * Mezclarlos pondría el mismo importe escrito de dos formas en la misma página:
 * una en el titular y otra en el texto alternativo de la figura. Un solo
 * formateador, `report-format.ts`, y de ahí no se sale.
 *
 * Nota sobre `KeyValueList` del DS: fuerza `shrink-0` + mono en el valor, y un
 * informe trae valores de texto largos (la nomenclatura del predio). La lista
 * clave-valor de acá es propia —hairlines, valor a la derecha, mono sólo en lo
 * numérico, procedencia en caption— para que nada se salga de la tarjeta.
 */

import { StatusBadge } from '@leasefy/cadence'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { cn } from '@/lib/utils'
import { formatScalar, isNumericFormat } from '@/lib/avaluo/reporte/report-format'
import type {
  BandSpec,
  HeadlineBlock,
  KeyValuesBlock,
  Scalar,
  StatChainBlock,
  TableBlock,
  VerdictBlock,
} from '@/lib/avaluo/reporte/report-model'
import { ExpandableTable } from './ExpandableTable'

// ---------------------------------------------------------------------------
// Escalar
// ---------------------------------------------------------------------------

/**
 * Un escalar pintado. Tres reglas duras del repo se aplican acá y en un solo
 * lugar: números en mono tabular (`docs/DESIGN.md:38,198`), un número NUNCA se
 * parte («$ 519.853.230» lleva un espacio que es punto de quiebre: si falta
 * sitio se parte la etiqueta, no la cifra ⇒ `whitespace-nowrap`), y PII marcada
 * con `data-pii-field`, que `globals.css:1209-1215` ya esconde al imprimir.
 */
export function ScalarValue({ scalar, className }: { scalar: Scalar; className?: string }) {
  const text = formatScalar(scalar)
  const numeric = isNumericFormat(scalar.format) && !scalar.missing

  return (
    <span
      {...(scalar.pii ? { 'data-pii-field': '' } : {})}
      className={cn(
        numeric && 'whitespace-nowrap font-mono tabular-nums',
        scalar.missing && 'font-mono text-[11px] uppercase tracking-[0.06em] text-warning',
        className,
      )}
    >
      {text}
    </span>
  )
}

// ---------------------------------------------------------------------------
// Clave-valor
// ---------------------------------------------------------------------------

/**
 * La columna de procedencia es lo que hace honesta a la tabla: distingue
 * «me lo dijiste» de «lo verifiqué». Va debajo del valor, en minúscula y
 * atenuada, para que se lea sin competir con el dato.
 */
export function KeyValuesBlockView({ block, compact = false }: { block: KeyValuesBlock; compact?: boolean }) {
  return (
    <dl className="w-full">
      {block.rows.map((row, index) => (
        <div
          key={`${row.label}-${index}`}
          className={cn(
            'flex items-baseline justify-between gap-4 border-b border-border-faint last:border-b-0',
            compact ? 'py-2' : 'py-2.5',
          )}
        >
          <dt className="min-w-0 text-[13.5px] leading-snug text-fg-muted">{row.label}</dt>
          <dd
            className={cn(
              'min-w-0 text-right',
              isNumericFormat(row.value.format) && !row.value.missing ? 'shrink-0' : 'max-w-[62%]',
            )}
          >
            <ScalarValue
              scalar={row.value}
              className={cn(
                'block text-[13.5px] font-medium leading-snug text-fg',
                isNumericFormat(row.value.format) && !row.value.missing
                  ? 'whitespace-nowrap font-mono tabular-nums'
                  : 'break-words',
              )}
            />
            {row.provenance !== null && (
              <span className="mt-0.5 block font-mono text-[10px] uppercase tracking-[0.06em] text-fg-subtle">
                {row.provenance}
              </span>
            )}
          </dd>
        </div>
      ))}
    </dl>
  )
}

// ---------------------------------------------------------------------------
// Tabla
// ---------------------------------------------------------------------------

function StaticTable({ block }: { block: TableBlock }) {
  return (
    <div
      data-lenis-prevent
      style={{ overscrollBehavior: 'contain' }}
      className="overflow-x-auto rounded-md border border-border"
    >
      <Table>
        <TableHeader>
          <TableRow>
            {block.columns.map((column) => (
              <TableHead
                key={column.key}
                scope="col"
                numeric={column.align === 'right'}
                className={cn('whitespace-nowrap', column.align === 'right' && 'text-right')}
              >
                {column.header}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {block.rows.map((row) => (
            <TableRow key={row.key}>
              {block.columns.map((column) => {
                const cell = row.cells[column.key]
                return (
                  <TableCell
                    key={column.key}
                    numeric={column.align === 'right'}
                    className={cn(
                      column.align === 'right' && 'whitespace-nowrap text-right',
                      cell !== undefined && isNumericFormat(cell.format) && 'whitespace-nowrap',
                    )}
                  >
                    {cell === undefined ? '—' : <ScalarValue scalar={cell} />}
                  </TableCell>
                )
              })}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

/**
 * La tabla es el producto: es donde la web supera al papel. Si alguna fila
 * trae desglose (los factores de ajuste), la tabla es expandible por fila y
 * debajo va la tira de dispersión crudos → ajustados; si no, es una tabla
 * estática. En los dos casos el contenedor lleva `data-lenis-prevent` +
 * `overscrollBehavior: 'contain'` (`docs/DESIGN.md` §8).
 */
export function TableBlockView({ block }: { block: TableBlock }) {
  if (block.rows.length === 0) {
    return <p className="text-body-sm text-fg-muted">{block.emptyText}</p>
  }

  const expandable = block.rows.some((row) => row.detail !== null)
  if (!expandable) {
    return (
      <div className="space-y-2">
        <StaticTable block={block} />
        {block.caption !== null && <p className="text-caption text-fg-muted">{block.caption}</p>}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <ExpandableTable block={block} />
    </div>
  )
}

// ---------------------------------------------------------------------------
// Cifra (fuera del héroe: el resumen ejecutivo)
// ---------------------------------------------------------------------------

function BandLine({ band }: { band: BandSpec }) {
  return (
    <p className="text-body-sm text-fg-muted">
      Banda ({formatScalar(band.coverage)}):{' '}
      <ScalarValue scalar={band.low} className="text-fg" /> —{' '}
      <ScalarValue scalar={band.high} className="text-fg" />
    </p>
  )
}

/**
 * La cifra grande. El número sin su rango es propaganda, así que el rango va
 * pegado y nunca en otra sección. (En el héroe la pinta `ReportHero`; esta
 * versión compacta es para el resumen ejecutivo plegado.)
 */
export function HeadlineBlockView({ block }: { block: HeadlineBlock }) {
  return (
    <div className="space-y-2">
      <p className="font-mono text-[11px] font-medium uppercase tracking-[0.1em] text-fg-subtle">
        {block.caption}
      </p>
      <p className="font-mono text-[28px] font-semibold leading-none tracking-[-0.03em] text-fg tabular-nums">
        <ScalarValue scalar={block.value} />
      </p>
      {block.words !== null && <p className="text-body-sm text-fg-muted">{block.words}</p>}
      {block.band !== null ? (
        <BandLine band={block.band} />
      ) : block.bandFallbackText !== null ? (
        <p className="text-body-sm text-fg-muted">{block.bandFallbackText}</p>
      ) : null}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Veredicto
// ---------------------------------------------------------------------------

const VERDICT_TONE = {
  positive: 'success',
  neutral: 'info',
  negative: 'critical',
} as const

/**
 * Veredicto: pastilla grande del sistema (`StatusBadge`), lead, copy y la
 * métrica que lo sustenta en mono. `variant="insight"` es la tarjeta ink
 * (`regimen-mercado`): texto blanco y el veredicto en display.
 *
 * Si el micro manda un `lead` que es la misma palabra que el `label`
 * («competitivo» bajo «COMPETITIVO»), el lead no se repite: no informa nada y
 * en la insight quedaba como un eco.
 */
function leadRepeatsLabel(block: VerdictBlock): boolean {
  return block.lead.trim().toLocaleLowerCase('es') === block.label.trim().toLocaleLowerCase('es')
}
export function VerdictBlockView({
  block,
  variant = 'default',
}: {
  block: VerdictBlock
  variant?: 'default' | 'insight'
}) {
  if (variant === 'insight') {
    return (
      <div className="space-y-4">
        <p className="font-mono text-[clamp(2rem,3.2vw,2.75rem)] font-semibold uppercase leading-none tracking-[-0.03em] text-ink-fg">
          {block.label}
        </p>
        {!leadRepeatsLabel(block) && (
          <p className="max-w-[40ch] text-[16px] leading-relaxed text-ink-fg">{block.lead}</p>
        )}
        {block.copy.map((paragraph, index) => (
          <p key={index} className="max-w-[48ch] text-body-sm leading-relaxed text-ink-fg-muted">
            {paragraph}
          </p>
        ))}
        {(block.metric !== null || block.caps.length > 0) && (
          <div className="flex flex-wrap items-center gap-2 pt-1">
            {block.metric !== null && (
              <span className="inline-flex items-center whitespace-nowrap rounded-full border border-ink-border bg-white/[0.06] px-3 py-1 font-mono text-[12px] tabular-nums text-ink-fg">
                {formatScalar(block.metric)}
              </span>
            )}
            {block.caps.map((cap) => (
              <span
                key={cap.code}
                className="inline-flex items-center rounded-full border border-ink-border px-3 py-1 text-caption text-ink-fg-muted"
              >
                {cap.label}
              </span>
            ))}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <StatusBadge tone={VERDICT_TONE[block.tone]} className="px-3 py-1 text-[12px]">
          {block.label}
        </StatusBadge>
        {block.metric !== null && (
          <span className="inline-flex items-center whitespace-nowrap rounded-full border border-border bg-surface px-2.5 py-0.5 font-mono text-[11.5px] tabular-nums text-fg-muted">
            {formatScalar(block.metric)}
          </span>
        )}
        {block.caps.map((cap) => (
          <span
            key={cap.code}
            className="inline-flex items-center rounded-full border border-border px-2.5 py-0.5 text-caption text-fg-muted"
          >
            {cap.label}
          </span>
        ))}
      </div>

      {!leadRepeatsLabel(block) && <p className="text-[15px] leading-relaxed text-fg">{block.lead}</p>}

      {block.copy.map((paragraph, index) => (
        <p key={index} className="max-w-[74ch] text-[14px] leading-[1.65] text-fg-muted">
          {paragraph}
        </p>
      ))}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Cadena estadística
// ---------------------------------------------------------------------------

/**
 * Los pasos de estadística. Tiene que estar COMPLETO — es el corazón
 * metodológico — pero se pinta como pasos numerados con un riel, no como un
 * párrafo: el lector que audita salta al paso que le interesa.
 */
export function StatChainBlockView({ block }: { block: StatChainBlock }) {
  return (
    <ol className="relative space-y-0 border-l border-border-faint pl-0">
      {block.steps.map((step, index) => (
        <li
          key={`${step.label}-${index}`}
          className="relative grid gap-1 py-2.5 pl-11 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-baseline sm:gap-4"
        >
          <span
            aria-hidden="true"
            className="absolute -left-[13px] top-2.5 grid h-[24px] w-[26px] place-items-center rounded-[6px] border border-border bg-surface font-mono text-[10px] tabular-nums text-fg-subtle"
          >
            {String(index + 1).padStart(2, '0')}
          </span>
          <div className="min-w-0 space-y-0.5">
            <p className="text-[13.5px] font-medium text-fg">{step.label}</p>
            {step.expression !== null && (
              <p className="font-mono text-[11px] text-fg-subtle">{step.expression}</p>
            )}
            {step.note !== null && (
              <p className="whitespace-pre-wrap text-[13px] leading-relaxed text-fg-muted">
                {step.note}
              </p>
            )}
          </div>

          {step.value !== null && (
            <ScalarValue
              scalar={step.value}
              className="text-[13.5px] font-semibold text-fg sm:text-right"
            />
          )}
        </li>
      ))}
    </ol>
  )
}
