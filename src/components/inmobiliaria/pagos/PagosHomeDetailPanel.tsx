'use client'

/**
 * PagosHomeDetailPanel — Pagos IA Home, widget HOME-03.
 *
 * Right-side drawer (DS `Sheet`) opened when an attention item is selected.
 * Shows the 3 detail sections: contexto / actividad (timeline) / recomendación IA.
 *
 * The owning client passes the resolved `usePaymentDetail` state in (data /
 * isLoading / error). `data === null` while open means 404 (absence) → renders
 * the "not found" state, NOT an error. Loading → spinner/skeleton text.
 *
 * Sheet is controlled via `open` + `onOpenChange` (Radix dialog under the hood).
 */

import { ClockCounterClockwise, Lightbulb, Phone, Warning } from '@phosphor-icons/react'

import { useI18n } from '@/lib/i18n'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Badge } from '@/components/ui/badge'
import type { PaymentDetail } from '@/lib/api/pagos-home.types'

export interface PagosHomeDetailPanelProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  data: PaymentDetail | null
  isLoading: boolean
  error: string | null
  onRetry: () => void
}

export function PagosHomeDetailPanel({
  open,
  onOpenChange,
  data,
  isLoading,
  error,
  onRetry,
}: PagosHomeDetailPanelProps) {
  const { t } = useI18n()

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-lg overflow-y-auto"
        aria-label={t('inmobiliaria.ai.pagos_home.detail.title')}
      >
        <SheetHeader className="text-left">
          <SheetTitle>{t('inmobiliaria.ai.pagos_home.detail.title')}</SheetTitle>
          <SheetDescription>
            {t('inmobiliaria.ai.pagos_home.detail.description')}
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {isLoading ? (
            <p className="text-sm text-muted-foreground" aria-busy="true">
              {t('inmobiliaria.ai.pagos_home.detail.loading')}
            </p>
          ) : error ? (
            <div
              role="alert"
              className="rounded-xl border border-rose-200 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/30 p-4 flex items-center justify-between gap-4"
            >
              <span className="inline-flex items-center gap-2 text-sm text-rose-600 dark:text-rose-400">
                <Warning className="w-4 h-4 shrink-0" weight="fill" aria-hidden="true" />
                {t('inmobiliaria.ai.pagos_home.errors.loading')}: {error}
              </span>
              <button
                type="button"
                onClick={onRetry}
                className="shrink-0 text-xs font-medium text-rose-600 dark:text-rose-400 underline hover:no-underline"
              >
                {t('inmobiliaria.ai.pagos_home.errors.retry')}
              </button>
            </div>
          ) : !data ? (
            <div className="rounded-xl border-2 border-dashed border-border bg-muted/30 px-6 py-10 text-center">
              <p className="text-sm font-semibold text-foreground">
                {t('inmobiliaria.ai.pagos_home.detail.notFound.title')}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {t('inmobiliaria.ai.pagos_home.detail.notFound.description')}
              </p>
            </div>
          ) : (
            <DetailBody detail={data} />
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}

// ── Body (3 sections) ─────────────────────────────────────────────────────────

function DetailBody({ detail }: { detail: PaymentDetail }) {
  const { t, formatCurrency, formatDate } = useI18n()
  const { contexto, actividad, recomendacionIA } = detail

  return (
    <>
      {/* ── Contexto ── */}
      <section aria-label={t('inmobiliaria.ai.pagos_home.detail.contexto.title')}>
        <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">
          {t('inmobiliaria.ai.pagos_home.detail.contexto.title')}
        </h3>
        <dl className="grid grid-cols-2 gap-x-4 gap-y-3">
          <Field label={t('inmobiliaria.ai.pagos_home.detail.contexto.periodo')}>
            {contexto.periodo}
          </Field>
          <Field label={t('inmobiliaria.ai.pagos_home.detail.contexto.total')}>
            <span className="tabular-nums">{formatCurrency(contexto.totalCop)}</span>
          </Field>
          <Field label={t('inmobiliaria.ai.pagos_home.detail.contexto.status')}>
            <Badge variant="outline">{contexto.status}</Badge>
          </Field>
          <Field label={t('inmobiliaria.ai.pagos_home.detail.contexto.dueDate')}>
            {contexto.dueDate
              ? formatDate(contexto.dueDate)
              : t('inmobiliaria.ai.pagos_home.detail.contexto.noDueDate')}
          </Field>
          <Field label={t('inmobiliaria.ai.pagos_home.detail.contexto.tenant')}>
            {contexto.tenantPersonName}
          </Field>
          <Field label={t('inmobiliaria.ai.pagos_home.detail.contexto.phone')}>
            <span className="inline-flex items-center gap-1">
              <Phone className="w-3.5 h-3.5 text-muted-foreground" aria-hidden="true" />
              {contexto.tenantPersonPhone}
            </span>
          </Field>
          <div className="col-span-2">
            <Field label={t('inmobiliaria.ai.pagos_home.detail.contexto.property')}>
              {contexto.propertyRef}
            </Field>
          </div>
        </dl>
      </section>

      {/* ── Actividad (timeline) ── */}
      <section aria-label={t('inmobiliaria.ai.pagos_home.detail.actividad.title')}>
        <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3 inline-flex items-center gap-1.5">
          <ClockCounterClockwise className="w-4 h-4" aria-hidden="true" />
          {t('inmobiliaria.ai.pagos_home.detail.actividad.title')}
        </h3>
        {actividad.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            {t('inmobiliaria.ai.pagos_home.detail.actividad.empty')}
          </p>
        ) : (
          <ol className="relative border-l border-border ml-1.5 space-y-4">
            {actividad.map((entry, idx) => (
              <li key={`${entry.at}-${idx}`} className="pl-4">
                <span
                  className="absolute -left-1 mt-1 h-2 w-2 rounded-full bg-primary"
                  aria-hidden="true"
                />
                <p className="text-xs font-medium text-foreground">{entry.kind}</p>
                <p className="text-xs text-muted-foreground">{entry.detail}</p>
                <time className="text-[11px] tabular-nums text-muted-foreground/70">
                  {formatDate(entry.at)}
                </time>
              </li>
            ))}
          </ol>
        )}
      </section>

      {/* ── Recomendación IA ── */}
      <section aria-label={t('inmobiliaria.ai.pagos_home.detail.recomendacion.title')}>
        <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3 inline-flex items-center gap-1.5">
          <Lightbulb className="w-4 h-4" aria-hidden="true" />
          {t('inmobiliaria.ai.pagos_home.detail.recomendacion.title')}
        </h3>
        <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 space-y-3">
          <p className="text-sm text-foreground leading-relaxed">{recomendacionIA.text}</p>
          {recomendacionIA.suggestedAction ? (
            <p className="text-xs font-medium text-primary">{recomendacionIA.suggestedAction}</p>
          ) : null}
        </div>
      </section>
    </>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="text-sm text-foreground mt-0.5">{children}</dd>
    </div>
  )
}
