/**
 * TextBlocks.tsx — los arquetipos de texto del informe: prosa, listas y huecos.
 *
 * Son Server Components: no tienen estado ni handlers. Lo único que cruza a
 * cliente es lo que importan de `@leasefy/cadence` (su bundle publicado declara
 * `"use client"` en la primera línea), y eso hidrata solo.
 */

import Link from 'next/link'
import { Check, LockSimple, WarningCircle, X } from '@phosphor-icons/react/dist/ssr'
import { Callout, LockedFeatureOverlay } from '@leasefy/cadence'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type {
  BulletGroup,
  BulletListBlock,
  PlaceholderBlock,
  ProseBlock,
} from '@/lib/avaluo/reporte/report-model'

// ---------------------------------------------------------------------------
// Resaltado de cifras dentro de la prosa
// ---------------------------------------------------------------------------

/**
 * Plata, porcentajes y rangos de días salen en mono sobre `bg-primary-soft`,
 * como en la referencia. Sólo se parte el texto en spans: el `textContent`
 * queda idéntico (Ctrl-F, tests y export no notan la diferencia).
 */
const HIGHLIGHT =
  /(\$\s?[\d.]+(?:\s?\/m²)?|[+−-]?\d{1,3}(?:[.,]\d+)?\s?%|\d+\s?[–-]\s?\d+\s?días|\d{2,3}\s?m²)/g

export function highlightNumbers(text: string): React.ReactNode {
  const parts = text.split(HIGHLIGHT)
  if (parts.length === 1) return text
  return parts.map((part, index) =>
    index % 2 === 1 ? (
      <span
        key={index}
        className="rounded-[5px] bg-primary-soft px-1 font-mono text-[0.92em] font-semibold tabular-nums text-fg"
      >
        {part}
      </span>
    ) : (
      part
    ),
  )
}

// ---------------------------------------------------------------------------
// Prosa
// ---------------------------------------------------------------------------

/**
 * `emphasis` NO es estilo suelto: `disclaimer` tiene consecuencia legal. Un
 * párrafo marcado así se pinta con la barra de advertencia, sin atenuar, y
 * quien lo renderiza no puede meterlo dentro de un plegable (lo impide
 * `ReportCard`).
 */
export function ProseBlockView({ block, compact = false }: { block: ProseBlock; compact?: boolean }) {
  if (block.emphasis === 'note') {
    return (
      <Callout className="items-start">
        <div className="space-y-2">
          {block.paragraphs.map((paragraph, index) => (
            <p key={index}>{paragraph}</p>
          ))}
          {block.legalRef !== null && (
            <p className="font-mono text-[10.5px] uppercase tracking-[0.08em] text-fg-subtle">
              {block.legalRef}
            </p>
          )}
        </div>
      </Callout>
    )
  }

  if (block.emphasis === 'warning') {
    return (
      <Callout
        title="Advertencia"
        icon={<WarningCircle weight="duotone" className="mt-px size-4 shrink-0 text-warning" />}
        className="items-start border border-warning bg-warning-soft"
      >
        <div className="space-y-2 text-fg">
          {block.paragraphs.map((paragraph, index) => (
            <p key={index}>{paragraph}</p>
          ))}
        </div>
      </Callout>
    )
  }

  if (block.emphasis === 'disclaimer') {
    return (
      <div className="space-y-3 border-l-[3px] border-warning pl-4">
        {block.paragraphs.map((paragraph, index) => (
          <p key={index} className="max-w-[82ch] text-[15px] leading-[1.62] text-fg">
            {highlightNumbers(paragraph)}
          </p>
        ))}
        {block.legalRef !== null && (
          <p className="font-mono text-[10.5px] uppercase tracking-[0.08em] text-fg-subtle">
            {block.legalRef}
          </p>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-2.5">
      {block.paragraphs.map((paragraph, index) => (
        <p
          key={index}
          className={cn(
            'max-w-[74ch] leading-[1.65] text-fg-muted',
            compact ? 'text-[13.5px]' : 'text-[14.5px]',
          )}
        >
          {highlightNumbers(paragraph)}
        </p>
      ))}
      {block.legalRef !== null && (
        <p className="font-mono text-[10.5px] uppercase tracking-[0.08em] text-fg-subtle">
          {block.legalRef}
        </p>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Listas
// ---------------------------------------------------------------------------

function MarkerTile({ marker }: { marker: 'affirm' | 'deny' }) {
  const affirm = marker === 'affirm'
  const Icon = affirm ? Check : X
  return (
    <span
      aria-hidden="true"
      className={cn(
        'mt-0.5 grid size-5 shrink-0 place-items-center rounded-[6px]',
        affirm ? 'bg-success-soft text-success' : 'bg-danger-soft text-danger',
      )}
    >
      <Icon weight="bold" className="size-3" />
    </span>
  )
}

function BulletGroupView({ group, strong }: { group: BulletGroup; strong: boolean }) {
  const isAffirm = group.marker === 'affirm'
  const isDeny = group.marker === 'deny'
  const tinted = strong && (isAffirm || isDeny)

  return (
    <div
      className={cn(
        'space-y-2.5',
        tinted && 'rounded-md border p-4',
        tinted && isAffirm && 'border-success bg-success-soft',
        tinted && isDeny && 'border-danger bg-danger-soft',
      )}
    >
      {group.heading !== null && (
        <h4
          className={cn(
            'font-mono text-[11px] font-medium uppercase tracking-[0.1em]',
            isAffirm ? 'text-success' : isDeny ? 'text-danger' : 'text-fg-subtle',
          )}
        >
          {group.heading}
        </h4>
      )}

      {group.items.length === 0 ? (
        <p className="text-body-sm text-fg-muted">{group.emptyText ?? '—'}</p>
      ) : (
        <ul className="space-y-2">
          {group.items.map((item, index) => (
            <li
              key={index}
              className={cn(
                'text-[14px] leading-[1.55] text-fg',
                isAffirm || isDeny ? 'flex items-start gap-2.5' : 'relative pl-4',
              )}
            >
              {isAffirm && <MarkerTile marker="affirm" />}
              {isDeny && <MarkerTile marker="deny" />}
              {group.marker === 'bullet' && (
                <span
                  aria-hidden="true"
                  className="absolute left-0 top-[0.62em] h-[5px] w-[5px] rounded-[2px] bg-primary opacity-80"
                />
              )}
              <span>{item}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export function BulletListBlockView({ block }: { block: BulletListBlock }) {
  const twoUp = block.groups.length === 2
  // La tabla SÍ/NO (dos grupos affirm/deny) es el momento visual del capítulo
  // legal: dos paneles tintados enfrentados. Un solo grupo va plano.
  const strong =
    twoUp &&
    block.emphasis === 'disclaimer' &&
    block.groups.every((g) => g.marker === 'affirm' || g.marker === 'deny')

  return (
    <div
      className={cn(
        twoUp ? 'grid gap-4 sm:grid-cols-2' : 'space-y-5',
        block.emphasis === 'disclaimer' && !strong && 'border-l-[3px] border-warning pl-4',
      )}
    >
      {block.groups.map((group, index) => (
        <BulletGroupView key={group.heading ?? index} group={group} strong={strong} />
      ))}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Hueco
// ---------------------------------------------------------------------------

/**
 * El hueco es información, no una ausencia. Por eso se pinta la tarjeta «qué
 * falta» con la lista de campos y no un «datos no disponibles» mudo: quien lee
 * necesita saber QUÉ le falta al documento, no sólo que le falta algo.
 *
 * `text` es el texto exacto que emite el servicio y es contrato: la web puede
 * cambiar la caja, jamás el texto.
 *
 *  · `restricted` → tarjeta bloqueada del sistema (`LockedFeatureOverlay`,
 *    variante sólida) con el CTA de pago. Nunca un error.
 *  · `no_data` / `not_computable` → panel de advertencia con «qué falta».
 *  · `not_applicable` → nota neutra.
 */
export function PlaceholderBlockView({
  block,
  paywallHref,
}: {
  block: PlaceholderBlock
  paywallHref: string | null
}) {
  if (block.severity === 'restricted') {
    return (
      <LockedFeatureOverlay
        variant="solid"
        title={block.text}
        description={
          block.missing.length > 0
            ? `Incluye: ${block.missing.join(' · ')}.`
            : 'Se abre al completar el pago del informe.'
        }
        icon={<LockSimple className="size-5" weight="duotone" />}
        action={
          paywallHref !== null ? (
            <Button asChild size="sm">
              <Link href={paywallHref}>Completar el pago</Link>
            </Button>
          ) : undefined
        }
        // `font-display` del DS resuelve en este repo a la pila del admin
        // (Satoshi), que no está cargada fuera de /admin: se fuerza la sans.
        className="mt-auto [&_p]:font-sans"
      />
    )
  }

  if (block.severity === 'not_applicable') {
    return (
      <div className="rounded-md border border-dashed border-border-strong bg-surface-muted px-4 py-3">
        <p className="text-body-sm text-fg-muted">
          <span className="font-medium text-fg">No aplica.</span> {block.text}
        </p>
      </div>
    )
  }

  return (
    <div className="rounded-md border border-dashed border-warning bg-warning-soft px-4 py-4">
      <div className="flex items-center gap-2 text-warning">
        <WarningCircle weight="duotone" aria-hidden="true" className="size-4 shrink-0" />
        <span className="font-mono text-[11px] font-medium uppercase tracking-[0.08em]">
          {block.text}
        </span>
      </div>
      <p className="mt-2 text-body-sm text-fg">
        La sección existe y está vacía por una razón declarada. Se muestra el hueco, no se
        esconde.
      </p>
      {block.missing.length > 0 && (
        <div className="mt-3">
          <h4 className="font-mono text-[10.5px] font-medium uppercase tracking-[0.08em] text-fg-subtle">
            Qué falta
          </h4>
          <ul className="mt-1.5 flex flex-wrap gap-1.5">
            {block.missing.map((item) => (
              <li
                key={item}
                className="inline-flex items-center rounded-full border border-warning bg-surface px-2.5 py-0.5 text-[12px] text-fg"
              >
                {item}
              </li>
            ))}
          </ul>
        </div>
      )}
      <p className="mt-3 text-[12px] leading-relaxed text-fg-muted">
        En el PDF esta sección imprime exactamente{' '}
        <span className="font-mono text-fg">«{block.text}»</span>. El panel conserva ese contrato
        y agrega la lista de lo que falta.
      </p>
    </div>
  )
}
