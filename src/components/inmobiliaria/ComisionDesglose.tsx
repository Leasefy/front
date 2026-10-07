'use client';

import * as React from 'react';
import {
  CaretDown,
  Buildings,
  House,
  Storefront,
  Warehouse,
  Briefcase,
  DoorOpen,
  Percent,
} from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import { useI18n } from '@/lib/i18n';
import {
  Table,
  TableBodyAnimado,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableRowAnimada,
  TableFooter,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import type { DispersionItem, Consignacion } from '@/lib/types/inmobiliaria';
import { formatCurrency } from '@/lib/types/inmobiliaria';
import { baseDeLaDispersion, type BaseDelCanon } from '@/lib/propietarios/base-del-canon';
import { Collapse, Presence } from '@leasefy/cadence';
import { RotuloDelMandato } from './mandato/ElMandatoEnLaLiquidacion';
import { BarraDeAvance } from './pagos/BarraDeAvance';

interface ComisionDesgloseProps {
  items: DispersionItem[];
  /**
   * Con qué base salió el canon de estas líneas. Quien la conoce la pasa (la
   * dispersión, o la vista previa del mes); sin ella se deduce de las líneas
   * igual que el back: cobro sin cuota es RECAUDADO, todo lo demás CAUSADO.
   */
  baseDelCanon?: BaseDelCanon;
  /**
   * El mes de la liquidación, para que un renglón que trae otro mes lo diga
   * (sobre recaudo: la cuota que el inquilino pagó tarde entra en la siguiente).
   */
  mesDeLaLiquidacion?: string;
  variant?: 'full' | 'compact';
  showPercentages?: boolean;
  className?: string;
}

/**
 * Get icon for property type based on title keywords
 */
function getPropertyTypeIcon(title: string) {
  const lowerTitle = title.toLowerCase();
  if (lowerTitle.includes('casa')) return House;
  if (lowerTitle.includes('local') || lowerTitle.includes('comercial')) return Storefront;
  if (lowerTitle.includes('bodega')) return Warehouse;
  if (lowerTitle.includes('oficina')) return Briefcase;
  if (lowerTitle.includes('estudio')) return DoorOpen;
  return Buildings; // Default for apartments
}

/**
 * Calculate totals from items
 */
function calculateTotals(items: DispersionItem[]) {
  return items.reduce(
    (acc, item) => ({
      totalCollected: acc.totalCollected + item.rentCollected,
      totalCommission: acc.totalCommission + item.commissionAmount,
      totalIvaComision: acc.totalIvaComision + (item.ivaComisionAmount ?? 0),
      totalNet: acc.totalNet + item.netAmount,
    }),
    { totalCollected: 0, totalCommission: 0, totalIvaComision: 0, totalNet: 0 }
  );
}

/**
 * Commission percentage badge with color coding
 */
function CommissionBadge({ percent }: { percent: number }) {
  const colorClass =
    percent >= 12
      ? 'bg-primary-soft text-primary dark:bg-primary/15 dark:text-primary'
      : percent >= 10
      ? 'bg-primary-soft text-primary dark:bg-primary/15 dark:text-primary'
      : 'bg-success-soft text-success dark:bg-success/15 dark:text-success';

  return (
    <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium', colorClass)}>
      <Percent className="w-3 h-3" weight="bold" />
      {percent}%
    </span>
  );
}

/**
 * Progress bar showing commission vs net ratio
 */
function CommissionRatioBar({
  commission,
  net,
  className,
  t,
}: {
  commission: number;
  net: number;
  className?: string;
  t: (key: string, params?: Record<string, string | number>) => string;
}) {
  const total = commission + net;
  const commissionPercent = total > 0 ? (commission / total) * 100 : 0;

  return (
    <div className={cn('space-y-1.5', className)}>
      <div className="flex items-center justify-between text-xs">
        <span className="text-primary font-medium">
          {t('inmobiliaria.finance.commBreakdown.commission')}: {formatCurrency(commission)}
        </span>
        <span className="text-success font-medium">
          {t('inmobiliaria.finance.commBreakdown.net')}: {formatCurrency(net)}
        </span>
      </div>
      {/* La barra se llena de izquierda a derecha con `transform` (antes
          animaba el ancho de las dos partes): el neto ocupa el riel y la
          comisión, encima, llega hasta su porcentaje. */}
      <div className="relative h-2 rounded-full bg-surface-muted overflow-hidden">
        <BarraDeAvance ancho={total > 0 ? 100 : 0} className="absolute inset-0 rounded-none bg-success" />
        <BarraDeAvance ancho={commissionPercent} className="absolute inset-0 rounded-none bg-primary" />
      </div>
    </div>
  );
}

/**
 * ComisionDesglose - Commission breakdown per property
 * Shows a table with property-level commission details
 */
export function ComisionDesglose({
  items,
  baseDelCanon,
  mesDeLaLiquidacion,
  variant = 'full',
  showPercentages = true,
  className,
}: ComisionDesgloseProps) {
  const { t } = useI18n();
  const [isExpanded, setIsExpanded] = React.useState(variant === 'full');
  const totals = React.useMemo(() => calculateTotals(items), [items]);
  /*
   * 🔴 La columna decía «Recaudado» siempre, y la dispersión gira por defecto
   * con base CAUSADO: el canon del mes, haya pagado el inquilino o no.
   */
  const base = baseDelCanon ?? baseDeLaDispersion({ items });

  const cantidad = `${items.length} ${
    items.length === 1
      ? t('inmobiliaria.finance.commBreakdown.property')
      : t('inmobiliaria.finance.commBreakdown.properties')
  }`;

  const tabla = (
    <>
      {/* Table */}
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="w-[40%]">{t('inmobiliaria.finance.commBreakdown.propertyHeader')}</TableHead>
              <TableHead className="text-right" data-testid="desglose-columna-canon">
                {t(
                  base === 'RECAUDADO'
                    ? 'inmobiliaria.finance.commBreakdown.canonRecaudado'
                    : 'inmobiliaria.finance.commBreakdown.canonCausado',
                )}
              </TableHead>
              {showPercentages && <TableHead className="text-center">{t('inmobiliaria.finance.commBreakdown.commission')}</TableHead>}
              <TableHead className="text-right">{t('inmobiliaria.finance.commBreakdown.commAmount')}</TableHead>
              <TableHead className="text-right">{t('inmobiliaria.finance.commBreakdown.net')}</TableHead>
            </TableRow>
          </TableHeader>
          {/* Las líneas entran escalonadas con techo (antes `index * 0.05` sin
              tope: con 40 inmuebles la última esperaba 2 s). */}
          <TableBodyAnimado>
              {items.map((item) => {
                const Icon = getPropertyTypeIcon(item.propertyTitle);
                return (
                  <TableRowAnimada
                    key={item.cuotaId ?? item.cobroId}
                    className="border-b-0 hover:bg-surface-hover transition-colors"
                  >
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-md bg-surface-muted flex items-center justify-center flex-shrink-0">
                          <Icon className="w-4 h-4 text-fg-muted" />
                        </div>
                        <span className="flex flex-col min-w-0">
                          <span className="text-sm text-fg truncate max-w-[200px]">
                            {item.propertyTitle}
                          </span>
                          {/* D1/D2: de dónde sale este renglón. No cambia el número. */}
                          <RotuloDelMandato item={item} mesDeLaLiquidacion={mesDeLaLiquidacion} />
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-medium text-fg">
                      {formatCurrency(item.rentCollected)}
                    </TableCell>
                    {showPercentages && (
                      <TableCell className="text-center">
                        <CommissionBadge percent={item.commissionPercent} />
                      </TableCell>
                    )}
                    <TableCell className="text-right font-medium text-primary">
                      {formatCurrency(item.commissionAmount)}
                      {/* 🔴 22-09: el IVA de la comisión, debajo de ella. */}
                      {(item.ivaComisionAmount ?? 0) > 0 && (
                        <span className="block font-mono text-caption tabular-nums text-fg-muted" data-testid="desglose-iva-comision">
                          + IVA {formatCurrency(item.ivaComisionAmount ?? 0)}
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-right font-semibold text-success">
                      {formatCurrency(item.netAmount)}
                    </TableCell>
                  </TableRowAnimada>
                );
              })}
          </TableBodyAnimado>
          <TableFooter>
            <TableRow className="bg-surface-muted font-semibold">
              <TableCell>
                <span className="text-fg">{t('inmobiliaria.finance.commBreakdown.total')} ({items.length} {t('inmobiliaria.finance.commBreakdown.properties')})</span>
              </TableCell>
              <TableCell className="text-right text-fg">
                {formatCurrency(totals.totalCollected)}
              </TableCell>
              {showPercentages && <TableCell />}
              <TableCell className="text-right text-primary">
                {formatCurrency(totals.totalCommission)}
                {totals.totalIvaComision > 0 && (
                  <span className="block font-mono text-caption tabular-nums text-fg-muted">
                    + IVA {formatCurrency(totals.totalIvaComision)}
                  </span>
                )}
              </TableCell>
              <TableCell className="text-right text-success">
                {formatCurrency(totals.totalNet)}
              </TableCell>
            </TableRow>
          </TableFooter>
        </Table>
      </div>
    </>
  );

  /*
   * Compacta (el cajón de la dispersión): arranca plegada y se abre con
   * `Collapse` (altura + fundido) en vez de cambiar de golpe un botón por la
   * tabla; el caret gira con la misma curva y el total de la comisión, que
   * sólo se dice plegada, sale con un fundido.
   */
  if (variant === 'compact') {
    return (
      <div className={className}>
        {/* allowlist: disclosure toggle de fila entera (etiqueta + importe + caret)
            como UN solo objetivo de clic — Button no puede hospedar esa fila. */}
        <button
          type="button"
          onClick={() => setIsExpanded((abierto) => !abierto)}
          aria-expanded={isExpanded}
          className={cn(
            'w-full flex items-center justify-between text-left group hover:bg-surface-hover transition-colors',
            isExpanded ? 'px-4 py-3 border-b border-border' : 'p-4'
          )}
        >
          <div className="flex items-center gap-3">
            <span className="text-sm text-fg-muted">{cantidad}</span>
          </div>
          <div className="flex items-center gap-3">
            <Presence as="span" show={!isExpanded} initial={false} direction="none" className="text-sm font-medium text-fg tabular-nums">
              {formatCurrency(totals.totalCommission)}
            </Presence>
            <CaretDown
              className={cn(
                'w-4 h-4 text-fg-muted group-hover:text-fg transition-[transform,color] duration-slow ease-emphasis',
                isExpanded && 'rotate-180'
              )}
            />
          </div>
        </button>
        <Collapse open={isExpanded}>{tabla}</Collapse>
      </div>
    );
  }

  return (
    <div
      className={cn('rounded-lg border border-border bg-card overflow-hidden', className)}
    >
      {tabla}

      {/* Commission Ratio Visualization - only for full variant */}
        <div className="p-4 border-t border-border bg-surface-muted">
          <CommissionRatioBar commission={totals.totalCommission} net={totals.totalNet} t={t} />
        </div>
    </div>
  );
}

/**
 * ComisionDesgloseCompact - Minimal variant for inline use
 */
export function ComisionDesgloseCompact({
  items,
  className,
}: {
  items: DispersionItem[];
  className?: string;
}) {
  const { t } = useI18n();
  const totals = React.useMemo(() => calculateTotals(items), [items]);

  return (
    <div className={cn('space-y-3', className)}>
      <div className="flex items-center justify-between">
        <span className="text-sm text-fg-muted">
          {items.length} {items.length === 1 ? t('inmobiliaria.finance.commBreakdown.property') : t('inmobiliaria.finance.commBreakdown.properties')}
        </span>
        <span className="text-sm font-medium text-primary">
          {formatCurrency(totals.totalCommission)} {t('inmobiliaria.finance.commBreakdown.inCommissions')}
        </span>
      </div>
      <CommissionRatioBar commission={totals.totalCommission} net={totals.totalNet} t={t} />
    </div>
  );
}

export default ComisionDesglose;
