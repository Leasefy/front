'use client';

import { AnimatedNumber } from '@leasefy/cadence';
import {
  CurrencyCircleDollar,
  CheckCircle,
  Clock,
  Warning,
  ArrowClockwise,
  CaretRight,
  TrendUp,
  TrendDown,
  ChartLineUp,
} from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import { useI18n } from '@/lib/i18n';
import { Button } from '@/components/ui';
import { anchoDeBarra, textoDeTasa } from '@/lib/tasas';
import { claveDelRotulo, fraseDeLasCifras } from '@/lib/tasa-de-recaudo';
import type { CobroSummary } from '@/lib/types/inmobiliaria';
import { formatCurrency as formatCurrencyUtil } from '@/lib/types/inmobiliaria';
import { BarraDeAvance } from '@/components/inmobiliaria/pagos/BarraDeAvance';

interface CobroResumenProps {
  summary: CobroSummary;
  onViewPending?: () => void;
  onViewLate?: () => void;
  onRefresh?: () => void;
  className?: string;
}

/*
 * Movimiento (ola 2, 03-10-2026): las cifras cuentan con el `AnimatedNumber`
 * de Cadence (desde 0 al llegar, desde la anterior al cambiar de mes). Antes
 * había acá un contador casero con `requestAnimationFrame` que arrancaba en 0
 * en cada render y no respetaba el movimiento reducido. La tarjeta ya no anima
 * su propia entrada: la página entra con su `template.tsx`.
 */

/**
 * CobroResumen - Monthly summary card with collection stats
 * Clean, unified design following design token system
 */
export function CobroResumen({
  summary,
  onViewPending,
  onViewLate,
  onRefresh,
  className,
}: CobroResumenProps) {
  const { t, formatDate, formatCurrency } = useI18n();

  /**
   * El color, la etiqueta y la flecha que le corresponden a la tasa.
   *
   * Con `rate` en null —un mes sin un solo cobro— NO hay veredicto: ni
   * «Bajo», ni flecha, ni barra roja. Decir que el recaudo viene bajando
   * cuando no hubo nada que recaudar es la afirmación más falsa de la
   * pantalla.
   */
  const getCollectionRateInfo = (rate: number | null) => {
    if (rate === null) {
      return {
        fill: 'bg-muted',
        text: 'text-fg-muted',
        label: null,
        trend: 'none' as const,
      };
    }
    if (rate >= 90) {
      return {
        fill: 'bg-success',
        text: 'text-success',
        label: t('inmobiliaria.cobros.resumen.rateExcellent'),
        trend: 'up' as const,
      };
    }
    if (rate >= 70) {
      return {
        fill: 'bg-warning',
        text: 'text-warning',
        label: t('inmobiliaria.cobros.resumen.rateAcceptable'),
        trend: 'neutral' as const,
      };
    }
    return {
      fill: 'bg-danger',
      text: 'text-danger',
      label: t('inmobiliaria.cobros.resumen.rateLow'),
      trend: 'down' as const,
    };
  };

  const rateInfo = getCollectionRateInfo(summary.collectionRate);
  /*
   * 🔴 La tasa de esta tarjeta NO es «pagado de lo emitido» por fuerza: es la
   * de la inmobiliaria (sobre lo causado por defecto), medida en el back. Por
   * eso lleva su rótulo y sus dos cifras: el «Por cobrar» de al lado son los
   * cobros emitidos, y sin decirlo parecería el denominador.
   */
  const tasa = summary.tasaDeRecaudo;
  const rotuloDeLaTasa = tasa
    ? t(claveDelRotulo(tasa.base))
    : t('inmobiliaria.cobros.resumen.collectionRate');

  // Format month for display. Build the Date in LOCAL time — parsing 'YYYY-MM-01'
  // as a string is UTC and shifts to the previous month in negative-offset zones
  // (Colombia UTC-5 rendered July as "junio").
  const [summaryYear, summaryMonthNum] = summary.month.split('-').map(Number);
  const monthDisplay = formatDate(new Date(summaryYear, summaryMonthNum - 1, 1), {
    month: 'long',
    year: 'numeric',
  });

  return (
    <div
      className={cn(
        'rounded-lg border border-border bg-card overflow-hidden',
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-border bg-muted/20">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-md bg-primary-soft flex items-center justify-center">
            <ChartLineUp className="w-5 h-5 text-primary" weight="duotone" />
          </div>
          <div>
            {/* N-14 (QA-PAGOS-95): «Octubre de 2026», no «Octubre De 2026». */}
            <h3 className="text-base font-semibold text-fg">
              {monthDisplay.charAt(0).toUpperCase() + monthDisplay.slice(1)}
            </h3>
            <p className="text-sm text-fg-muted">
              {t('inmobiliaria.cobros.resumen.summaryTitle')}
            </p>
          </div>
        </div>
        {onRefresh && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onRefresh}
            hideArrow
            title={t('inmobiliaria.cobros.resumen.refreshTooltip')}
            aria-label={t('inmobiliaria.cobros.resumen.refreshTooltip')}
          >
            <ArrowClockwise className="w-5 h-5" />
          </Button>
        )}
      </div>

      {/* Main Content */}
      <div className="p-5">
        {/* Collection Rate - Hero Section */}
        {/* 🔴 24-09-2026 (a 390 px): la tasa y «Por cobrar» se parten en dos
            líneas si no caben; antes se cortaban contra el borde de la
            tarjeta (`overflow-hidden`). */}
        <div
          className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3 mb-5"
          data-testid="cobros-tasa-y-por-cobrar"
        >
          <div>
            <p className="text-sm text-muted-foreground mb-1" data-testid="cobros-rotulo-de-la-tasa">
              {rotuloDeLaTasa}
            </p>
            <div className="flex items-baseline gap-2" data-testid="cobros-tasa">
              {/* La tasa cuenta como las demás cifras; sin tasa medida, el «—»
                  quieto (no hay número que contar). */}
              {summary.collectionRate === null ? (
                <span className="text-4xl font-bold text-foreground">
                  {textoDeTasa(summary.collectionRate)}
                </span>
              ) : (
                <AnimatedNumber
                  value={summary.collectionRate}
                  from={0}
                  format={(n) => textoDeTasa(n)}
                className="text-4xl font-bold text-foreground"
                />
              )}
              {rateInfo.label && (
                <span className={cn('text-sm font-medium', rateInfo.text)}>
                  {rateInfo.label}
                </span>
              )}
              {rateInfo.trend === 'up' && (
                <TrendUp className={cn('w-5 h-5', rateInfo.text)} weight="bold" />
              )}
              {rateInfo.trend === 'down' && (
                <TrendDown className={cn('w-5 h-5', rateInfo.text)} weight="bold" />
              )}
            </div>
            {tasa && (
              <p className="mt-1 text-xs text-muted-foreground tabular-nums" data-testid="cobros-cifras-de-la-tasa">
                {fraseDeLasCifras(tasa, t, formatCurrency)}
              </p>
            )}
          </div>
          <div className="text-right">
            <p className="text-sm text-muted-foreground mb-1">{t('inmobiliaria.cobros.resumen.toCollect')}</p>
            <p className="text-2xl font-bold text-foreground">
              <AnimatedNumber value={summary.totalExpected} from={0} format={formatCurrency} />
            </p>
          </div>
        </div>

        {/* Progress Bar — se corre con `transform`, no con el ancho. */}
        <div className="h-2 rounded-full overflow-hidden bg-muted mb-5">
          <BarraDeAvance ancho={anchoDeBarra(summary.collectionRate)} className={rateInfo.fill} />
        </div>

        {/* Stats Row */}
        {/* 🔴 24-09-2026 (a 390 px): una debajo de otra en el teléfono. En tres
            columnas cada cifra tenía ≈71 px para «$10.631.082» (≈110 px) y se
            pisaban. */}
        <div
          className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4 mb-5"
          data-testid="cobros-cifras-del-mes"
        >
          {/* Cobrado */}
          <div className="p-3 rounded-md bg-muted/30">
            <div className="flex items-center gap-2 mb-1">
              <CheckCircle className="w-4 h-4 text-success" weight="fill" />
              <span className="text-xs font-medium text-fg-muted">{t('inmobiliaria.cobros.resumen.collected')}</span>
            </div>
            <AnimatedNumber
              value={summary.totalCollected}
              className="text-lg font-bold text-foreground"
              from={0}
              format={formatCurrency}
            />
            <p className="text-xs text-muted-foreground mt-0.5">
              {t('inmobiliaria.cobros.resumen.payments', { count: summary.cobrosPaid })}
            </p>
          </div>

          {/* Pendiente. El back manda en `totalPending` todo lo que falta cobrar, mora
              incluida (así lo suman el pie de la tabla y los reportes). Al lado de
              «En mora» eso contaba la mora dos veces: «Pendiente $10,6 M · 0 cobros»
              y «En mora $10,6 M · 5 cobros» (QA 2026-09-14). Acá va lo que falta y
              todavía NO está en mora, igual que su conteo. */}
          <div className="p-3 rounded-md bg-muted/30">
            <div className="flex items-center gap-2 mb-1">
              <Clock className="w-4 h-4 text-warning" weight="fill" />
              <span className="text-xs font-medium text-fg-muted">{t('inmobiliaria.cobros.resumen.pendingLabel')}</span>
            </div>
            <AnimatedNumber
              value={Math.max(0, summary.totalPending - summary.totalLate)}
              className="text-lg font-bold text-foreground"
              from={0}
              format={formatCurrency}
            />
            <p className="text-xs text-muted-foreground mt-0.5">
              {t('inmobiliaria.cobros.resumen.collections', { count: summary.cobrosPending })}
            </p>
          </div>

          {/* En mora. 🔴 N-22 (QA-PAGOS-95, CR-31): sin plazo fijado lo vencido NO
              es mora —así lo dicen Cartera, Deuda del mes y Tablero—; los cobros
              conservan su `LATE`, y esta tarjeta decía «En mora · Ver morosos». */}
          <div className="p-3 rounded-md bg-muted/30" data-testid="cobros-resumen-vencido">
            <div className="flex items-center gap-2 mb-1">
              <Warning className={cn('w-4 h-4', summary.plazoSinFijar ? 'text-warning' : 'text-danger')} weight="fill" />
              <span className="text-xs font-medium text-fg-muted">
                {summary.plazoSinFijar ? 'Vencido' : t('inmobiliaria.cobros.resumen.lateLabel')}
              </span>
            </div>
            <AnimatedNumber
              value={summary.totalLate}
              className="text-lg font-bold text-foreground"
              from={0}
              format={formatCurrency}
            />
            <p className="text-xs text-muted-foreground mt-0.5">
              {t('inmobiliaria.cobros.resumen.collections', { count: summary.cobrosLate })}
              {summary.plazoSinFijar && (
                <span data-testid="vencido-sin-plazo"> · sin plazo fijado: no corre mora</span>
              )}
            </p>
          </div>
        </div>

        {/* Quick Actions */}
        {(onViewPending || onViewLate) && (
          <div
            className="flex flex-col gap-3 pt-4 border-t border-border sm:flex-row"
            data-testid="cobros-atajos-del-resumen"
          >
            {onViewPending && summary.cobrosPending > 0 && (
              <Button
                variant="outline"
                hideArrow
                onClick={onViewPending}
                className="flex-1 justify-between group"
              >
                <span className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-warning" weight="fill" />
                  {t('inmobiliaria.cobros.resumen.viewPending')}
                </span>
                <CaretRight className="w-4 h-4 text-fg-muted group-hover:text-fg transition-colors" />
              </Button>
            )}
            {onViewLate && summary.cobrosLate > 0 && (
              <Button
                variant="outline"
                hideArrow
                onClick={onViewLate}
                className="flex-1 justify-between group"
              >
                <span className="flex items-center gap-2">
                  <Warning className={cn('w-4 h-4', summary.plazoSinFijar ? 'text-warning' : 'text-danger')} weight="fill" />
                  {summary.plazoSinFijar ? 'Ver vencidos' : t('inmobiliaria.cobros.resumen.viewLate')}
                </span>
                <CaretRight className="w-4 h-4 text-fg-muted group-hover:text-fg transition-colors" />
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * CobroResumenCompact - Smaller variant for dashboards
 */
export function CobroResumenCompact({
  summary,
  className,
}: {
  summary: CobroSummary;
  className?: string;
}) {
  const { t, formatCurrency } = useI18n();

  // Sin tasa medida no hay color ni flecha — ver el comentario del grande.
  const getCollectionRateInfo = (rate: number | null) => {
    if (rate === null) {
      return {
        fill: 'bg-muted',
        text: 'text-fg-muted',
        trend: 'none' as const,
      };
    }
    if (rate >= 90) {
      return {
        fill: 'bg-success',
        text: 'text-success',
        trend: 'up' as const,
      };
    }
    if (rate >= 70) {
      return {
        fill: 'bg-warning',
        text: 'text-warning',
        trend: 'neutral' as const,
      };
    }
    return {
      fill: 'bg-danger',
      text: 'text-danger',
      trend: 'down' as const,
    };
  };

  const rateInfo = getCollectionRateInfo(summary.collectionRate);

  return (
    <div className={cn('p-4 rounded-lg border border-border bg-card', className)}>
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-medium text-foreground">{t('inmobiliaria.cobros.resumen.compactCollection')}</span>
        <div className="flex items-center gap-1.5" data-testid="cobros-tasa-compacta">
          <span className="text-xl font-bold text-foreground">
            {textoDeTasa(summary.collectionRate, 0)}
          </span>
          {rateInfo.trend === 'up' && (
            <TrendUp className={cn('w-4 h-4', rateInfo.text)} weight="bold" />
          )}
          {rateInfo.trend === 'down' && (
            <TrendDown className={cn('w-4 h-4', rateInfo.text)} weight="bold" />
          )}
        </div>
      </div>
      <div className="h-2 rounded-full overflow-hidden bg-muted mb-3">
        <BarraDeAvance ancho={anchoDeBarra(summary.collectionRate)} className={rateInfo.fill} />
      </div>
      <div className="flex items-center justify-between text-xs">
        <span className="text-foreground font-medium">
          {formatCurrency(summary.totalCollected)}
        </span>
        <span className="text-muted-foreground">{t('inmobiliaria.cobros.resumen.compactOf')}</span>
        <span className="text-muted-foreground">
          {formatCurrency(summary.totalExpected)}
        </span>
      </div>
    </div>
  );
}

export default CobroResumen;
