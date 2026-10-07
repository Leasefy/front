'use client';

import * as React from 'react';
import Link from 'next/link';
import { AnimatedNumber, Presence } from '@leasefy/cadence';
import {
  CurrencyCircleDollar,
  Clock,
  Warning,
  CheckCircle,
  TrendUp,
  Coin,
  PaperPlaneTilt,
  Bank,
  ArrowsClockwise,
} from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import { useI18n } from '@/lib/i18n';
import { Button } from '@/components/ui/button';
import { SIN_MEDIR, anchoDeBarra, tasaMedida, textoDeTasa } from '@/lib/tasas';
import type { DispersionSummary } from '@/lib/types/inmobiliaria';
import { nombreDelMes } from '@/lib/utils/mes';
import { RUTA_LOTES } from '@/lib/api/dispersiones-errores';
import { BarraDeAvance } from '@/components/inmobiliaria/pagos/BarraDeAvance';

interface DispersionResumenProps {
  summary: DispersionSummary;
  onViewPending?: () => void;
  /** Abre la confirmación de «Aprobar todas»; no aprueba nada por sí solo. */
  onProcessAll?: () => void;
  /**
   * La inmobiliaria aprueba por lote, con código. Aprobar una por una da 409
   * (`APROBAR_POR_LOTE`), así que el pie no ofrece «Aprobar todas»: lleva a
   * Lotes, que es donde de verdad se aprueba.
   */
  apruebaPorLote?: boolean;
  /**
   * El resumen del mes NO cargó y los números salen de las filas que hay en
   * pantalla. Antes eso pasaba en silencio y los totales se leían como reales.
   */
  estimado?: { onReintentar: () => void | Promise<unknown> };
  className?: string;
}

/**
 * Get completion rate color based on percentage - subtle version
 */
function getProgressColor(rate: number | null): string {
  if (rate === null) return 'bg-muted-foreground/30';
  if (rate >= 90) return 'bg-foreground';
  if (rate >= 50) return 'bg-foreground/70';
  if (rate > 0) return 'bg-foreground/50';
  return 'bg-muted-foreground/30';
}

/*
 * Movimiento (ola 2, 03-10-2026): las cifras cuentan con el `AnimatedNumber`
 * de Cadence (desde 0 al llegar, desde la anterior al cambiar de mes) en vez
 * del contador casero con `requestAnimationFrame`; la barra se corre con
 * `transform` (`BarraDeAvance`), no con el ancho, y la tarjeta ya no anima su
 * propia entrada (la página entra con su `template.tsx`).
 */

/** El aviso de totales estimados, con su reintento. */
function AvisoResumenEstimado({ onReintentar }: { onReintentar: () => void | Promise<unknown> }) {
  const [intentando, setIntentando] = React.useState(false);
  const reintentar = async () => {
    if (intentando) return;
    setIntentando(true);
    try {
      await onReintentar();
    } finally {
      setIntentando(false);
    }
  };
  return (
    <div
      role="status"
      data-testid="resumen-estimado"
      className="mx-6 mb-4 flex flex-wrap items-center gap-x-3 gap-y-2 rounded-md border border-warning/30 bg-warning-soft px-3 py-2 text-sm"
    >
      <Warning weight="fill" className="h-4 w-4 shrink-0 text-warning" aria-hidden="true" />
      <p className="min-w-0 flex-1 text-fg">
        <strong className="font-semibold">Totales estimados</strong> con lo que hay en pantalla: el
        resumen del mes no cargó.
      </p>
      <Button
        type="button"
        size="sm"
        variant="ghost"
        hideArrow
        onClick={() => void reintentar()}
        disabled={intentando}
        className="gap-1.5"
        data-testid="resumen-reintentar"
      >
        <ArrowsClockwise className={cn('h-4 w-4', intentando && 'animate-spin')} aria-hidden="true" />
        {intentando ? 'Intentando…' : 'Intentar de nuevo'}
      </Button>
    </div>
  );
}

/**
 * DispersionResumen - Monthly summary card with dispersion stats
 * Clean, minimal design following project conventions
 */
export function DispersionResumen({
  summary,
  onViewPending,
  onProcessAll,
  apruebaPorLote = false,
  estimado,
  className,
}: DispersionResumenProps) {
  const { t, formatCurrency } = useI18n();
  const totalDispersions = summary.dispersionsPending + summary.dispersionsCompleted + summary.dispersionsFailed;
  // Sin una sola dispersión el avance no existe: `null`, no 0.
  const completionRate = tasaMedida(summary.dispersionsCompleted, totalDispersions);

  // Format month for display
  // `new Date('2026-08-01')` es medianoche UTC: en Colombia retrocede al 31
  // de julio y el título decía «julio» sobre datos de agosto.
  const monthDisplay = nombreDelMes(summary.month);

  const hasPending = summary.dispersionsPending > 0;
  const hasFailed = summary.dispersionsFailed > 0;

  return (
    <div
      className={cn(
        'rounded-lg border border-border bg-card overflow-hidden',
        className
      )}
      data-estimado={estimado ? 'si' : 'no'}
    >
      {/* Header */}
      <div className="px-6 pt-6 pb-4">
        {/* N-14 (QA-PAGOS-95): sin `capitalize` («Resumen Octubre De 2026»). */}
        <h3 className="text-lg font-semibold text-foreground">
          {t('inmobiliaria.dispersiones.resumen.summaryMonth', { month: monthDisplay })}
        </h3>
        <p className="text-sm text-muted-foreground mt-0.5">
          {t('inmobiliaria.dispersiones.resumen.ownerDisbursements')}
        </p>
      </div>

      {/* El aviso de «estimado» entra y, al cargar el resumen con el
          reintento, sale (no se corta de golpe). */}
      <Presence show={Boolean(estimado)} initial={false}>
      {estimado && <AvisoResumenEstimado onReintentar={estimado.onReintentar} />}
      </Presence>

      {/* Main Stats Grid */}
      <div className="px-6 pb-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 sm:gap-6">
          {/* Total to Disburse */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <CurrencyCircleDollar className="w-4 h-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground uppercase tracking-wide">
                {t('inmobiliaria.dispersiones.resumen.toDisburse')}
              </span>
            </div>
            <AnimatedNumber
              value={summary.totalToDisburse}
              from={0}
              format={formatCurrency}
              className="text-xl sm:text-2xl font-semibold text-foreground tabular-nums"
            />
          </div>

          {/* Commissions */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Coin className="w-4 h-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground uppercase tracking-wide">
                {t('inmobiliaria.dispersiones.resumen.commissions')}
              </span>
            </div>
            <AnimatedNumber
              value={summary.totalCommissions}
              from={0}
              format={formatCurrency}
              className="text-xl sm:text-2xl font-semibold text-foreground tabular-nums"
            />
          </div>

          {/* Completion Rate */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <TrendUp className="w-4 h-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground uppercase tracking-wide">
                {t('inmobiliaria.dispersiones.resumen.progress')}
              </span>
            </div>
            <div className="flex items-baseline gap-1">
              {completionRate === null ? (
                <span
                className="text-xl sm:text-2xl font-semibold text-foreground tabular-nums"
                data-testid="dispersiones-avance"
              >
                  {SIN_MEDIR}
                </span>
              ) : (
                <AnimatedNumber
                  value={completionRate}
                  from={0}
                  format={(n) => n.toFixed(0)}
                  className="text-xl sm:text-2xl font-semibold text-foreground tabular-nums"
                  data-testid="dispersiones-avance"
                />
              )}
              {completionRate !== null && <span className="text-lg text-muted-foreground">%</span>}
            </div>
          </div>
        </div>

        {/* Progress Bar — aparece con la primera dispersión del mes y se
            corre con `transform`. */}
        <Presence show={totalDispersions > 0} initial={false} className="mt-6">
            <div className="h-1.5 rounded-full bg-muted overflow-hidden">
            <BarraDeAvance
              ancho={anchoDeBarra(completionRate)}
              className={getProgressColor(completionRate)}
              />
            </div>
        </Presence>

        {/* Status Counts - Inline */}
        <div className="flex items-center gap-4 mt-4 pt-4 border-t border-border">
          <div className="flex items-center gap-1.5 text-sm">
            <Clock className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="text-muted-foreground">{t('inmobiliaria.dispersiones.resumen.pendingLabel')}</span>
            <span className={cn(
              'font-medium tabular-nums',
              hasPending ? 'text-foreground' : 'text-muted-foreground'
            )}>
              {summary.dispersionsPending}
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-sm">
            <CheckCircle className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="text-muted-foreground">{t('inmobiliaria.dispersiones.resumen.completedLabel')}</span>
            <span className="font-medium text-foreground tabular-nums">
              {summary.dispersionsCompleted}
            </span>
          </div>
          {hasFailed && (
            <div className="flex items-center gap-1.5 text-sm">
              <Warning className="w-3.5 h-3.5 text-destructive" />
              <span className="text-muted-foreground">{t('inmobiliaria.dispersiones.resumen.failedLabel')}</span>
              <span className="font-medium text-destructive tabular-nums">
                {summary.dispersionsFailed}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Action Footer — al aprobar la última pendiente se va con su salida. */}
      <Presence show={hasPending && Boolean(onProcessAll || onViewPending || apruebaPorLote)} initial={false}>
        <div className="px-6 py-4 bg-muted/30 border-t border-border flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">
            {apruebaPorLote
              ? 'Tu inmobiliaria aprueba las dispersiones por lote, con código.'
              : summary.dispersionsPending !== 1
                ? t('inmobiliaria.dispersiones.resumen.pendingToProcessPlural', { count: summary.dispersionsPending })
                : t('inmobiliaria.dispersiones.resumen.pendingToProcess', { count: summary.dispersionsPending })}
          </p>
          <div className="flex items-center gap-2">
            {onViewPending && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onViewPending}
                hideArrow
              >
                {t('inmobiliaria.dispersiones.resumen.viewPending')}
              </Button>
            )}
            {apruebaPorLote ? (
              <Button asChild size="sm" className="gap-2" hideArrow>
                <Link href={RUTA_LOTES} data-testid="resumen-ir-a-lotes">
                  <Bank className="w-4 h-4" />
                  Ir a Lotes
                </Link>
              </Button>
            ) : (
              onProcessAll && (
                <Button
                  size="sm"
                  onClick={onProcessAll}
                  className="gap-2"
                  data-testid="resumen-aprobar-todas"
                >
                  <PaperPlaneTilt className="w-4 h-4" weight="fill" />
                  {/* Decía «Procesar todas»: lo que hace es APROBAR —el giro
                      lo anota otra persona, con la referencia del banco—. */}
                  Aprobar todas
                </Button>
              )
            )}
          </div>
        </div>
      </Presence>
    </div>
  );
}

/**
 * DispersionResumenCompact - Smaller variant for dashboards
 */
export function DispersionResumenCompact({
  summary,
  className,
}: {
  summary: DispersionSummary;
  className?: string;
}) {
  const { t, formatCurrency } = useI18n();
  const totalDispersions = summary.dispersionsPending + summary.dispersionsCompleted + summary.dispersionsFailed;
  // Sin una sola dispersión el avance no existe: `null`, no 0.
  const completionRate = tasaMedida(summary.dispersionsCompleted, totalDispersions);

  return (
    <div className={cn('p-4 rounded-lg border border-border bg-card', className)}>
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-medium text-foreground">{t('inmobiliaria.dispersiones.resumen.dispersionsLabel')}</span>
        <span
          className="text-lg font-semibold text-foreground tabular-nums"
          data-testid="dispersiones-avance-compacto"
        >
          {textoDeTasa(completionRate, 0)}
        </span>
      </div>
      <div className="h-1.5 rounded-full bg-muted overflow-hidden mb-3">
        <BarraDeAvance ancho={anchoDeBarra(completionRate)} className={getProgressColor(completionRate)} />
      </div>
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>{formatCurrency(summary.totalToDisburse)}</span>
        <span>{summary.dispersionsCompleted}/{totalDispersions}</span>
      </div>
    </div>
  );
}

export default DispersionResumen;
