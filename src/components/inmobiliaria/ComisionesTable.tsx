'use client';

import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  Trophy,
  Medal,
  TrendUp,
  TrendDown,
  Minus,
  CurrencyDollar,
  Users,
  ChartLineUp,
  SortAscending,
  SortDescending,
} from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import { useI18n } from '@/lib/i18n';
import type { ComisionesAgenteReport, ComisionAgente } from '@/lib/types/inmobiliaria';
import { formatCurrency } from '@/lib/types/inmobiliaria';
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from '@/components/ui';

type SortField = 'rank' | 'agenteName' | 'closedDeals' | 'totalCommission' | 'avgCommissionPerDeal';
type SortDirection = 'asc' | 'desc';

interface ComisionesTableProps {
  data: ComisionesAgenteReport;
  showComparison?: boolean;
  onAgentClick?: (agenteId: string) => void;
}

const MEDALS = ['gold', 'silver', 'bronze'] as const;

/**
 * Get trend icon and colors
 */
function getTrendDisplay(trend: ComisionAgente['trend']) {
  switch (trend) {
    case 'up':
      return {
        Icon: TrendUp,
        bg: 'bg-success-soft',
        text: 'text-success',
      };
    case 'down':
      return {
        Icon: TrendDown,
        bg: 'bg-danger-soft',
        text: 'text-danger',
      };
    default:
      return {
        Icon: Minus,
        bg: 'bg-surface-muted dark:bg-ink',
        text: 'text-fg-muted dark:text-fg-subtle',
      };
  }
}

/**
 * Get medal emoji
 */
function getMedalEmoji(rank: number): string | null {
  const medals = ['gold', 'silver', 'bronze'];
  if (rank <= 3) {
    return rank === 1 ? '1' : rank === 2 ? '2' : '3';
  }
  return null;
}

/**
 * Get initials from name
 */
function getInitials(name: string): string {
  return name
    .split(' ')
    .slice(0, 2)
    .map((n) => n[0])
    .join('')
    .toUpperCase();
}

/**
 * ComisionesTable - Agent commissions breakdown table
 * Shows commission rankings with inline progress bars
 */
export function ComisionesTable({
  data,
  showComparison = false,
  onAgentClick,
}: ComisionesTableProps) {
  const { t } = useI18n();
  const [sortField, setSortField] = useState<SortField>('rank');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  // Calculate max commission for relative progress bar
  const maxCommission = useMemo(() => {
    return Math.max(...data.agentes.map((a) => a.totalCommission));
  }, [data.agentes]);

  // Sort agentes
  const sortedAgentes = useMemo(() => {
    const result = [...data.agentes];

    // Initial ranking by total commission
    const rankedAgentes = result.map((a, idx) => ({
      ...a,
      rank: idx + 1,
    }));

    // Re-sort based on sortField
    rankedAgentes.sort((a, b) => {
      let aVal: string | number = '';
      let bVal: string | number = '';

      switch (sortField) {
        case 'rank':
          aVal = a.rank;
          bVal = b.rank;
          break;
        case 'agenteName':
          aVal = a.agenteName.toLowerCase();
          bVal = b.agenteName.toLowerCase();
          break;
        case 'closedDeals':
          aVal = a.closedDeals;
          bVal = b.closedDeals;
          break;
        case 'totalCommission':
          aVal = a.totalCommission;
          bVal = b.totalCommission;
          break;
        case 'avgCommissionPerDeal':
          aVal = a.avgCommissionPerDeal;
          bVal = b.avgCommissionPerDeal;
          break;
      }

      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    return rankedAgentes;
  }, [data.agentes, sortField, sortDirection]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection(field === 'rank' ? 'asc' : 'desc');
    }
  };

  const SortIcon = sortDirection === 'asc' ? SortAscending : SortDescending;

  const SortableHeader = ({
    field,
    children,
    className,
    align = 'left',
  }: {
    field: SortField;
    children: React.ReactNode;
    className?: string;
    align?: 'left' | 'center' | 'right';
  }) => (
    <TableHead
      className={cn(
        'p-4',
        align === 'left' && 'text-left',
        align === 'center' && 'text-center',
        align === 'right' && 'text-right',
        className
      )}
    >
      {/*
        allowlist: disparador de orden — no hay primitiva en Cadence. Un
        `<button>` llega con `text-transform: none` del navegador y pierde las
        mayúsculas del `TH`; por eso las repite y hereda el resto. Canónico:
        DispersionTable.
      */}
      <button
        onClick={() => handleSort(field)}
        className={cn(
          'flex items-center gap-2 font-[inherit] text-[inherit] uppercase tracking-[inherit] text-fg-subtle transition-colors hover:text-fg',
          align === 'center' && 'mx-auto',
          align === 'right' && 'ml-auto'
        )}
      >
        {children}
        {sortField === field && <SortIcon className="w-3.5 h-3.5" />}
      </button>
    </TableHead>
  );

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Total Comisiones */}
        <div className="p-4 rounded-lg bg-success-soft dark:bg-success/10 text-fg">
          <div className="flex items-center gap-2 mb-2">
            <CurrencyDollar className="w-5 h-5 text-success" />
            <span className="text-sm font-medium text-success">{t('inmobiliaria.finance.commissionsTable.totalCommissions')}</span>
          </div>
          <p className="text-2xl font-bold">{formatCurrency(data.totalCommissions)}</p>
        </div>

        {/* Promedio por Agente */}
        <div className="p-4 rounded-lg border border-border dark:border-border-strong bg-surface dark:bg-card">
          <div className="flex items-center gap-2 mb-2">
            <Users className="w-5 h-5 text-primary" />
            <span className="text-sm font-medium text-fg-muted dark:text-fg-subtle">
              {t('inmobiliaria.finance.commissionsTable.avgPerAgent')}
            </span>
          </div>
          <p className="text-xl font-bold text-fg dark:text-white">
            {formatCurrency(data.avgCommissionPerAgent)}
          </p>
        </div>

        {/* Mejor Agente */}
        <div className="p-4 rounded-lg border border-warning/30 dark:border-warning/40 bg-warning-soft">
          <div className="flex items-center gap-2 mb-2">
            <Medal className="w-5 h-5 text-warning" weight="fill" />
            <span className="text-sm font-medium text-warning">
              {t('inmobiliaria.finance.commissionsTable.topAgent')}
            </span>
          </div>
          <p className="text-lg font-bold text-warning truncate">
            {data.topAgentName}
          </p>
        </div>

        {/* Cierres Totales */}
        <div className="p-4 rounded-lg border border-border dark:border-border-strong bg-surface dark:bg-card">
          <div className="flex items-center gap-2 mb-2">
            <ChartLineUp className="w-5 h-5 text-primary" />
            <span className="text-sm font-medium text-fg-muted dark:text-fg-subtle">
              {t('inmobiliaria.finance.commissionsTable.totalDeals')}
            </span>
          </div>
          <p className="text-2xl font-bold text-fg dark:text-white">
            {data.totalClosedDeals}
          </p>
        </div>
      </div>

      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-surface-muted dark:bg-ink flex items-center justify-center">
          <Trophy className="w-5 h-5 text-fg-muted dark:text-fg-subtle" weight="fill" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-fg dark:text-white">
            {t('inmobiliaria.finance.commissionsTable.commissionsByAgent')}
          </h2>
          <p className="text-sm text-fg-muted dark:text-fg-subtle">
            {t('inmobiliaria.finance.commissionsTable.period')}: {data.period}
          </p>
        </div>
      </div>

      {/* Data Table */}
      <div className="overflow-x-auto rounded-lg border border-border dark:border-border-strong bg-surface dark:bg-card">
        <Table className="min-w-[800px]">
          <TableHeader>
            <TableRow className="border-b border-border-faint dark:border-border-strong">
              <SortableHeader field="rank" align="center" className="w-16">
                #
              </SortableHeader>
              <SortableHeader field="agenteName">{t('inmobiliaria.finance.commissionsTable.agent')}</SortableHeader>
              <SortableHeader field="closedDeals" align="center">
                {t('inmobiliaria.finance.commissionsTable.deals')}
              </SortableHeader>
              <SortableHeader field="totalCommission" align="right">
                {t('inmobiliaria.finance.commissionsTable.totalCommission')}
              </SortableHeader>
              <SortableHeader field="avgCommissionPerDeal" align="right">
                {t('inmobiliaria.finance.commissionsTable.avgPerDeal')}
              </SortableHeader>
              {showComparison && <TableHead className="p-4 text-center w-20">{t('inmobiliaria.finance.commissionsTable.trend')}</TableHead>}
              <TableHead className="p-4 text-right w-40">{t('inmobiliaria.finance.commissionsTable.vsLeader')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedAgentes.map((agente, index) => {
              const percentOfLeader = maxCommission > 0 ? (agente.totalCommission / maxCommission) * 100 : 0;
              const isTopThree = agente.rank <= 3;
              const isFirst = agente.rank === 1;
              const trendDisplay = getTrendDisplay(agente.trend);

              return (
                <motion.tr
                  key={agente.agenteId}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.03 }}
                  onClick={() => onAgentClick?.(agente.agenteId)}
                  className={cn(
                    'border-b border-border-faint dark:border-border-strong transition-colors',
                    onAgentClick && 'cursor-pointer hover:bg-surface-muted dark:hover:bg-muted/20',
                    isFirst && 'bg-warning-soft/50 dark:bg-warning/10'
                  )}
                >
                  {/* Rank */}
                  <TableCell className="p-4 text-center">
                    {isTopThree ? (
                      <div
                        className={cn(
                          'w-8 h-8 mx-auto rounded-full flex items-center justify-center font-bold text-sm',
                          agente.rank === 1 && 'bg-warning-soft dark:bg-warning/10 text-warning',
                          agente.rank === 2 && 'bg-gradient-to-br from-[#D5D1CA] to-[#B3AEA5] text-fg',
                          agente.rank === 3 && 'bg-warning-soft dark:bg-warning/10 text-warning'
                        )}
                      >
                        {agente.rank}
                      </div>
                    ) : (
                      <span className="text-sm font-medium text-fg-subtle dark:text-fg-muted">
                        {agente.rank}
                      </span>
                    )}
                  </TableCell>

                  {/* Agent */}
                  <TableCell className="p-4">
                    <div className="flex items-center gap-3">
                      <div
                        className={cn(
                          'w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-semibold shrink-0',
                          isFirst
                            ? 'bg-warning-soft dark:bg-warning/10'
                            : 'bg-gradient-to-br from-primary to-[#726E68]'
                        )}
                      >
                        {agente.agenteAvatar ? (
                          <img
                            src={agente.agenteAvatar}
                            alt={agente.agenteName}
                            className="w-full h-full rounded-full object-cover"
                          />
                        ) : (
                          getInitials(agente.agenteName)
                        )}
                      </div>
                      <div className="min-w-0">
                        <p
                          className={cn(
                            'font-medium truncate text-sm',
                            isFirst
                              ? 'text-warning'
                              : 'text-fg dark:text-white'
                          )}
                        >
                          {agente.agenteName}
                        </p>
                        {agente.topPropertyTitle && (
                          <p className="text-xs text-fg-muted dark:text-fg-subtle truncate max-w-[180px]">
                            Top: {agente.topPropertyTitle}
                          </p>
                        )}
                      </div>
                    </div>
                  </TableCell>

                  {/* Closed Deals */}
                  <TableCell className="p-4 text-center">
                    <span
                      className={cn(
                        'text-lg font-bold',
                        agente.closedDeals > 0
                          ? 'text-success'
                          : 'text-fg-subtle dark:text-fg-muted'
                      )}
                    >
                      {agente.closedDeals}
                    </span>
                  </TableCell>

                  {/* Total Commission */}
                  <TableCell className="p-4 text-right">
                    <span className="font-semibold text-fg dark:text-white">
                      {formatCurrency(agente.totalCommission)}
                    </span>
                  </TableCell>

                  {/* Avg Per Deal */}
                  <TableCell className="p-4 text-right">
                    <span className="text-sm text-fg-muted dark:text-fg-subtle">
                      {formatCurrency(agente.avgCommissionPerDeal)}
                    </span>
                  </TableCell>

                  {/* Trend (comparison) */}
                  {showComparison && (
                    <TableCell className="p-4 text-center">
                      <div
                        className={cn(
                          'w-7 h-7 mx-auto rounded-full flex items-center justify-center',
                          trendDisplay.bg
                        )}
                      >
                        <trendDisplay.Icon
                          className={cn('w-4 h-4', trendDisplay.text)}
                          weight="bold"
                        />
                      </div>
                    </TableCell>
                  )}

                  {/* Progress Bar vs Leader */}
                  <TableCell className="p-4">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-2 rounded-full bg-surface-muted dark:bg-ink overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${percentOfLeader}%` }}
                          transition={{ duration: 0.5, ease: 'easeOut', delay: index * 0.05 }}
                          className={cn(
                            'h-full rounded-full',
                            isFirst
                              ? 'bg-warning-soft dark:bg-warning/10'
                              : 'bg-primary-soft dark:bg-primary/10'
                          )}
                        />
                      </div>
                      <span className="text-xs font-medium text-fg-muted dark:text-fg-subtle w-10 text-right">
                        {Math.round(percentOfLeader)}%
                      </span>
                    </div>
                  </TableCell>
                </motion.tr>
              );
            })}
          </TableBody>
        </Table>

        {/* Empty State */}
        {sortedAgentes.length === 0 && (
          <div className="p-12 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-surface-muted dark:bg-ink flex items-center justify-center">
              <Trophy className="w-8 h-8 text-fg-subtle" />
            </div>
            <h3 className="text-lg font-semibold text-fg dark:text-white mb-1">
              {t('inmobiliaria.finance.commissionsTable.noData')}
            </h3>
            <p className="text-fg-muted dark:text-fg-subtle">
              {t('inmobiliaria.finance.commissionsTable.noDataDesc')}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default ComisionesTable;
