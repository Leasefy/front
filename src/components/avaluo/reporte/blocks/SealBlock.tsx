/**
 * SealBlock.tsx — la tarjeta del sello de verificación.
 *
 * El sello lleva peso propio: la web es el entregable principal, así que esto no
 * es un pie de página. Lo que pinta sale de `resolveSealPresentation()`, que
 * traduce el veredicto REAL del servidor (`render.seal.state`, el mismo que
 * responde el verificador público) a copy y tono; acá no hay lógica de
 * verificación, sólo marcado.
 *
 * Tres estados y una muestra:
 *   · `valid`    → positivo: «Verificado: el documento servido coincide…».
 *   · `altered`  → negativo, y NO se esconde: «Alterado: los bytes servidos NO…».
 *   · otro       → neutral: «Verificación no disponible…», sin decir cuál falló.
 *   · sin render → la muestra: «Sin verificación real», enlace inerte, nota.
 *
 * El estado nunca se comunica sólo con color: icono + texto en cada caso
 * (`docs/DESIGN.md` §7). El QR se dibuja acá desde la matriz (`QrMatrix`) y el
 * enlace al verificador abre en pestaña nueva con `rel="noopener noreferrer"`.
 * «Copiar» copia el hash COMPLETO; en pantalla va el corto.
 *
 * Restilizado para el panel (v2): mismo marcado semántico y mismos atributos
 * `data-seal-*` que verifica `SealBlock.test.tsx`; cambia la caja, no el sello.
 */

import { ArrowSquareOut, SealCheck, SealQuestion, SealWarning } from '@phosphor-icons/react/dist/ssr'
import { cn } from '@/lib/utils'
import { formatScalar, formatSealTimestamp } from '@/lib/avaluo/reporte/report-format'
import type { ReportRender, SealBlock, VerdictTone } from '@/lib/avaluo/reporte/report-model'
import {
  resolveSealPresentation,
  type SealChainPresentation,
  type SealChainTone,
} from '@/lib/avaluo/reporte/seal-presentation'
import { CopyHashButton } from './CopyHashButton'
import { QrMatrix } from './QrMatrix'

/** Lo que el sello necesita saber de la vista, además de su bloque. */
export interface SealContext {
  readonly slug: string
  readonly render: ReportRender | null
  /**
   * `delivery.canVerify` resuelto (T-0007, `resolveDelivery`). `false` ⇒ el
   * veredicto y los datos del sello siguen visibles (leerlos no se gatea),
   * pero NINGUNA acción de verificación se ofrece: ni el enlace, ni «Copiar»,
   * ni el hash completo, ni el QR. El enlace además queda gateado por su
   * propio `verifyUrlEnabled` del wire — esto es la segunda cerradura,
   * independiente de lo que el productor haya mandado.
   */
  readonly canVerify: boolean
}

// ---------------------------------------------------------------------------
// Tonos (feedback tokens de cadence — pareja oscura incluida)
// ---------------------------------------------------------------------------

const TONE_BOX: Readonly<Record<VerdictTone, string>> = {
  positive: 'border-success bg-success-soft',
  negative: 'border-danger bg-danger-soft',
  neutral: 'border-border bg-surface-muted',
}

const TONE_TEXT: Readonly<Record<VerdictTone, string>> = {
  positive: 'text-success',
  negative: 'text-danger',
  neutral: 'text-fg',
}

const TONE_TILE: Readonly<Record<VerdictTone, string>> = {
  positive: 'bg-success text-primary-fg',
  negative: 'bg-danger text-primary-fg',
  neutral: 'bg-surface text-fg-muted border border-border',
}

const TONE_ICON = {
  positive: SealCheck,
  negative: SealWarning,
  neutral: SealQuestion,
} as const

const CHAIN_CHIP: Readonly<Record<SealChainTone, string>> = {
  positive: 'border-success bg-surface text-success',
  warning: 'border-warning bg-surface text-warning',
  neutral: 'border-border-strong bg-surface text-fg-muted',
}

// ---------------------------------------------------------------------------
// Piezas
// ---------------------------------------------------------------------------

function ChainChip({ chain }: { chain: SealChainPresentation }) {
  return (
    <div className="flex shrink-0 flex-col items-start gap-1 sm:items-end">
      <span
        data-seal-chain={chain.status}
        className={cn(
          'inline-flex items-center gap-1.5 rounded-full border px-3 py-1 font-mono text-[10.5px] font-medium uppercase tracking-[0.08em]',
          CHAIN_CHIP[chain.tone],
        )}
      >
        <span aria-hidden="true" className="inline-block h-1.5 w-1.5 rounded-full bg-current" />
        <span className="sr-only">Vigencia: </span>
        {chain.status}
      </span>
      {chain.supersededBy !== null &&
        (chain.supersededVerifyUrl !== null ? (
          <a
            href={chain.supersededVerifyUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-caption text-fg-muted underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            Ver el documento que lo reemplaza ↗
          </a>
        ) : (
          <span className="text-caption text-fg-muted">
            Reemplazado por{' '}
            <span className="font-mono tabular-nums">{chain.supersededBy}</span>
          </span>
        ))}
    </div>
  )
}

function Field({
  label,
  children,
  pii = false,
  className,
}: {
  label: string
  children: React.ReactNode
  pii?: boolean
  className?: string
}) {
  return (
    <div className={cn('min-w-0 border-b border-border-faint py-2.5', className)}>
      <dt className="font-mono text-[10px] font-medium uppercase tracking-[0.08em] text-fg-subtle">
        {label}
      </dt>
      <dd {...(pii ? { 'data-pii-field': '' } : {})} className="mt-0.5 text-[13.5px] text-fg">
        {children}
      </dd>
    </div>
  )
}

// ---------------------------------------------------------------------------
// La tarjeta
// ---------------------------------------------------------------------------

export function SealBlockView({ block, seal }: { block: SealBlock; seal: SealContext }) {
  const p = resolveSealPresentation(block, seal.render, seal.slug)
  const Icon = TONE_ICON[p.tone]
  const signedAt = p.signedAtIso === null ? null : formatSealTimestamp(p.signedAtIso)
  const expiresAt = p.expiresAtIso === null ? null : formatSealTimestamp(p.expiresAtIso)
  const checkedAt = p.checkedAtIso === null ? null : formatSealTimestamp(p.checkedAtIso)
  const stateAttr = p.sample ? 'sample' : (seal.render?.seal.state ?? 'unavailable')

  return (
    <div className="space-y-5" data-seal-state={stateAttr}>
      {/* Veredicto */}
      <div
        data-seal-verdict={p.tone}
        className={cn(
          'flex flex-col gap-4 rounded-md border p-4 sm:flex-row sm:items-start sm:p-5',
          TONE_BOX[p.tone],
        )}
      >
        <span
          aria-hidden="true"
          className={cn('grid size-11 shrink-0 place-items-center rounded-md', TONE_TILE[p.tone])}
        >
          <Icon weight="duotone" className="size-6" />
        </span>
        <div className="min-w-0 flex-1 space-y-1">
          <p className="font-mono text-[10.5px] font-medium uppercase tracking-[0.1em] text-fg-subtle">
            Verificación del documento
          </p>
          <p className={cn('text-[16px] font-semibold leading-snug', TONE_TEXT[p.tone])}>
            {p.headline}
          </p>
          {p.detail !== null && <p className="text-body-sm text-fg-muted">{p.detail}</p>}
          {checkedAt !== null && (
            <p className="text-caption text-fg-subtle">
              Comprobado el <span className="font-mono tabular-nums">{checkedAt}</span>
            </p>
          )}
        </div>
        {p.chain !== null && <ChainChip chain={p.chain} />}
      </div>

      {/* Datos del sello + QR */}
      <div className="grid gap-6 md:grid-cols-[minmax(0,1fr)_200px] md:items-start">
        <dl className="grid gap-x-8 sm:grid-cols-2">
          <Field label="Emisor">{p.issuer}</Field>
          {signedAt !== null && (
            <Field label="Firmado el">
              <span className="font-mono tabular-nums">{signedAt}</span>
            </Field>
          )}
          {p.signedBy !== null && (
            <Field label="Firmado por" pii>
              {p.signedBy}
            </Field>
          )}
          {expiresAt !== null && (
            <Field label="Vigente hasta">
              <span className="font-mono tabular-nums">{expiresAt}</span>
            </Field>
          )}
          {p.methods.length > 0 && <Field label="Método">{p.methods.join(' · ')}</Field>}
          {p.value !== null && !p.value.missing && (
            <Field label="Valor sellado">
              <span className="whitespace-nowrap font-mono font-semibold tabular-nums">{formatScalar(p.value)}</span>
            </Field>
          )}
          {p.band !== null && !p.band.low.missing && !p.band.high.missing && (
            <Field label={`Banda sellada (${formatScalar(p.band.coverage)})`}>
              {/* Cada extremo es indivisible; si falta sitio se parte en el guión. */}
              <span className="font-mono tabular-nums">
                <span className="whitespace-nowrap">{formatScalar(p.band.low)}</span> —{' '}
                <span className="whitespace-nowrap">{formatScalar(p.band.high)}</span>
              </span>
            </Field>
          )}
          {p.hashShort !== null && (
            <Field label="Huella del contenido" className="sm:col-span-2 border-b-0">
              <span className="flex flex-wrap items-center gap-2">
                <code
                  className="rounded-sm bg-surface-muted px-2 py-1 font-mono text-[13px] tracking-[0.05em] text-fg"
                  data-seal-hash-short
                >
                  {p.hashShort}
                </code>
                {p.hashFull !== null && seal.canVerify && (
                  <CopyHashButton value={p.hashFull} className="print:hidden" />
                )}
              </span>
              {p.hashFull !== null && seal.canVerify && (
                <details className="mt-1.5">
                  <summary className="cursor-pointer text-caption text-fg-muted underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
                    Ver la huella completa
                  </summary>
                  <code
                    className="mt-1 block break-all font-mono text-[12px] leading-relaxed text-fg"
                    data-seal-hash-full
                  >
                    {p.hashFull}
                  </code>
                </details>
              )}
            </Field>
          )}
        </dl>

        <div className="flex flex-col items-stretch gap-3">
          {seal.render !== null && seal.canVerify && (
            <figure className="m-0 rounded-md border border-ink-border bg-ink p-3 text-center shadow-glow">
              <QrMatrix
                qr={seal.render.qr}
                label="Código QR del verificador público"
                className="mx-auto max-w-none"
              />
              <figcaption className="mt-2 font-mono text-[9.5px] uppercase tracking-[0.1em] text-ink-fg-subtle">
                Verificador público
              </figcaption>
            </figure>
          )}
          {p.verifyUrlEnabled && seal.canVerify ? (
            <a
              href={p.verifyUrl}
              target="_blank"
              rel="noopener noreferrer"
              data-seal-verify-link
              className="inline-flex items-center justify-center gap-1.5 rounded-full border border-border bg-surface px-4 py-2 text-body-sm font-medium text-fg transition-colors hover:bg-surface-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary active:scale-[0.98]"
            >
              Abrir el verificador
              <ArrowSquareOut aria-hidden="true" className="size-4" />
            </a>
          ) : (
            <p className="break-all rounded-md border border-dashed border-border-strong bg-surface-muted px-3 py-2 font-mono text-[11px] leading-relaxed text-fg-subtle">
              Verificador: {p.verifyUrl}{' '}
              {p.sample ? '(inactivo en esta muestra)' : '(enlace inactivo)'}
            </p>
          )}
        </div>
      </div>

      {p.note !== null && (
        <div className="flex items-start gap-3 rounded-md border border-warning bg-warning-soft px-4 py-3">
          <span
            aria-hidden="true"
            className="grid size-7 shrink-0 place-items-center rounded-full bg-warning font-mono text-[14px] font-bold text-primary-fg"
          >
            !
          </span>
          <p className="text-body-sm text-fg">{p.note}</p>
        </div>
      )}
    </div>
  )
}
