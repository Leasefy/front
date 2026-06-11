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
        bg: 'bg-[#E8F3EC] dark:bg-[#2C7A53]/15',
        text: 'text-[#2C7A53] dark:text-[#3EAE70]',
      };
    case 'down':
      return {
        Icon: TrendDown,
        bg: 'bg-[#F8EAE7] dark:bg-[#C4503B]/15',
        text: 'text-[#C4503B] dark:text-[#E0664D]',
      };
    default:
      return {
        Icon: Minus,
        bg: 'bg-neutral-100 dark:bg-neutral-800',
        text: 'text-neutral-500 dark:text-neutral-400',
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
    <th
      className={cn(
        'p-4',
        align === 'left' && 'text-left',
        align === 'center' && 'text-center',
        align === 'right' && 'text-right',
        className
      )}
    >
      <button
        onClick={() => handleSort(field)}
        className={cn(
          'flex items-center gap-2 text-xs font-semibold text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200',
          align === 'center' && 'mx-auto',
          align === 'right' && 'ml-auto'
        )}
      >
        {children}
        {sortField === field && <SortIcon className="w-3.5 h-3.5" />}
      </button>
    </th>
  );

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Total Comisiones */}
        <div className="p-4 rounded-xl bg-[#E8F3EC] dark:bg-[#2C7A53]/12 text-white">
          <div className="flex items-center gap-2 mb-2">
            <CurrencyDollar className="w-5 h-5 text-[#2C7A53]" />
            <span className="text-sm font-medium text-[#2C7A53]">{t('inmobiliaria.finance.commissionsTable.totalCommissions')}</span>
          </div>
          <p className="text-2xl font-bold">{formatCurrency(data.totalCommissions)}</p>
        </div>

        {/* Promedio por Agente */}
        <div className="p-4 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-[#1a1a1c]">
          <div className="flex items-center gap-2 mb-2">
            <Users className="w-5 h-5 text-[#1A40FF]" />
            <span className="text-sm font-medium text-neutral-500 dark:text-neutral-400">
              {t('inmobiliaria.finance.commissionsTable.avgPerAgent')}
            </span>
          </div>
          <p className="text-xl font-bold text-neutral-900 dark:text-white">
            {formatCurrency(data.avgCommissionPerAgent)}
          </p>
        </div>

        {/* Mejor Agente */}
        <div className="p-4 rounded-xl border border-[#B7791F]/30 dark:border-[#B7791F]/40 bg-[#F8F0E0] dark:bg-[#B7791F]/15">
          <div className="flex items-center gap-2 mb-2">
            <Medal className="w-5 h-5 text-[#B7791F]" weight="fill" />
            <span className="text-sm font-medium text-[#B7791F] dark:text-[#D2992F]">
              {t('inmobiliaria.finance.commissionsTable.topAgent')}
            </span>
          </div>
          <p className="text-lg font-bold text-[#B7791F] dark:text-[#D2992F] truncate">
            {data.topAgentName}
          </p>
        </div>

        {/* Cierres Totales */}
        <div className="p-4 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-[#1a1a1c]">
          <div className="flex items-center gap-2 mb-2">
            <ChartLineUp className="w-5 h-5 text-[#1A40FF]" />
            <span className="text-sm font-medium text-neutral-500 dark:text-neutral-400">
              {t('inmobiliaria.finance.commissionsTable.totalDeals')}
            </span>
          </div>
          <p className="text-2xl font-bold text-neutral-900 dark:text-white">
            {data.totalClosedDeals}
          </p>
        </div>
      </div>

      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center">
          <Trophy className="w-5 h-5 text-neutral-600 dark:text-neutral-300" weight="fill" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-neutral-900 dark:text-white">
            {t('inmobiliaria.finance.commissionsTable.commissionsByAgent')}
          </h2>
          <p className="text-sm text-neutral-500 dark:text-neutral-400">
            {t('inmobiliaria.finance.commissionsTable.period')}: {data.period}
          </p>
        </div>
      </div>

      {/* Data Table */}
      <div className="overflow-x-auto rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-[#1a1a1c]">
        <table className="w-full min-w-[800px]">
          <thead>
            <tr className="border-b border-neutral-100 dark:border-neutral-800">
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
              {showComparison && <th className="p-4 text-center w-20">{t('inmobiliaria.finance.commissionsTable.trend')}</th>}
              <th className="p-4 text-right w-40">{t('inmobiliaria.finance.commissionsTable.vsLeader')}</th>
            </tr>
          </thead>
          <tbody>
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
                    'border-b border-neutral-50 dark:border-neutral-800 transition-colors',
                    onAgentClick && 'cursor-pointer hover:bg-neutral-50 dark:hover:bg-[#141416]',
                    isFirst && 'bg-[#F8F0E0]/50 dark:bg-[#B7791F]/10'
                  )}
                >
                  {/* Rank */}
                  <td className="p-4 text-center">
                    {isTopThree ? (
                      <div
                        className={cn(
                          'w-8 h-8 mx-auto rounded-full flex items-center justify-center font-bold text-sm',
                          agente.rank === 1 && 'bg-[#F8F0E0] dark:bg-[#B7791F]/12 text-[#B7791F]',
                          agente.rank === 2 && 'bg-gradient-to-br from-gray-300 to-gray-400 text-gray-700',
                          agente.rank === 3 && 'bg-[#F8F0E0] dark:bg-[#B7791F]/12 text-[#B7791F]'
                        )}
                      >
                        {agente.rank}
                      </div>
                    ) : (
                      <span className="text-sm font-medium text-neutral-400 dark:text-neutral-500">
                        {agente.rank}
                      </span>
                    )}
                  </td>

                  {/* Agent */}
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div
                        className={cn(
                          'w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-semibold shrink-0',
                          isFirst
                            ? 'bg-[#F8F0E0] dark:bg-[#B7791F]/12'
                            : 'bg-gradient-to-br from-[#1A40FF] to-[#6B6B6B]'
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
                              ? 'text-[#B7791F] dark:text-[#D2992F]'
                              : 'text-neutral-900 dark:text-white'
                          )}
                        >
                          {agente.agenteName}
                        </p>
                        {agente.topPropertyTitle && (
                          <p className="text-xs text-neutral-500 dark:text-neutral-400 truncate max-w-[180px]">
                            Top: {agente.topPropertyTitle}
                          </p>
                        )}
                      </div>
                    </div>
                  </td>

                  {/* Closed Deals */}
                  <td className="p-4 text-center">
                    <span
                      className={cn(
                        'text-lg font-bold',
                        agente.closedDeals > 0
                          ? 'text-[#2C7A53] dark:text-[#3EAE70]'
                          : 'text-neutral-400 dark:text-neutral-500'
                      )}
                    >
                      {agente.closedDeals}
                    </span>
                  </td>

                  {/* Total Commission */}
                  <td className="p-4 text-right">
                    <span className="font-semibold text-neutral-900 dark:text-white">
                      {formatCurrency(agente.totalCommission)}
                    </span>
                  </td>

                  {/* Avg Per Deal */}
                  <td className="p-4 text-right">
                    <span className="text-sm text-neutral-600 dark:text-neutral-400">
                      {formatCurrency(agente.avgCommissionPerDeal)}
                    </span>
                  </td>

                  {/* Trend (comparison) */}
                  {showComparison && (
                    <td className="p-4 text-center">
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
                    </td>
                  )}

                  {/* Progress Bar vs Leader */}
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-2 rounded-full bg-neutral-100 dark:bg-neutral-800 overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${percentOfLeader}%` }}
                          transition={{ duration: 0.5, ease: 'easeOut', delay: index * 0.05 }}
                          className={cn(
                            'h-full rounded-full',
                            isFirst
                              ? 'bg-[#F8F0E0] dark:bg-[#B7791F]/12'
                              : 'bg-[#EEF1FF] dark:bg-[#1A40FF]/12'
                          )}
                        />
                      </div>
                      <span className="text-xs font-medium text-neutral-500 dark:text-neutral-400 w-10 text-right">
                        {Math.round(percentOfLeader)}%
                      </span>
                    </div>
                  </td>
                </motion.tr>
              );
            })}
          </tbody>
        </table>

        {/* Empty State */}
        {sortedAgentes.length === 0 && (
          <div className="p-12 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center">
              <Trophy className="w-8 h-8 text-neutral-400" />
            </div>
            <h3 className="text-lg font-semibold text-neutral-900 dark:text-white mb-1">
              {t('inmobiliaria.finance.commissionsTable.noData')}
            </h3>
            <p className="text-neutral-500 dark:text-neutral-400">
              {t('inmobiliaria.finance.commissionsTable.noDataDesc')}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default ComisionesTable;
