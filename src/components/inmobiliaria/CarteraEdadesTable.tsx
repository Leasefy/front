'use client';

import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  SortAscending,
  SortDescending,
  DotsThree,
  Eye,
  Phone,
  Envelope,
  WhatsappLogo,
  User,
  HouseLine,
  Warning,
  Download,
  Funnel,
} from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import { useI18n } from '@/lib/i18n';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from '@/components/ui/table';
import {
  DropdownList,
  DropdownListTrigger,
  DropdownListContent,
  DropdownListItem,
} from '@/components/ui/dropdown-menu';
import { SegmentedControl, IconButton } from '@leasefy/cadence';
import type { CarteraReport, CarteraItem } from '@/lib/types/inmobiliaria';
import { formatCurrency } from '@/lib/types/inmobiliaria';

type SortField = 'propertyTitle' | 'tenantName' | 'propietarioName' | 'agenteName' | 'month' | 'pendingAmount' | 'daysLate';
type SortDirection = 'asc' | 'desc';
type BucketFilter = 'all' | '0-30' | '31-60' | '61-90' | '90+';

interface CarteraEdadesTableProps {
  data: CarteraReport;
  onExport?: () => void;
  onContactTenant?: (item: CarteraItem) => void;
  onViewCobro?: (item: CarteraItem) => void;
  onNotifyAgent?: (item: CarteraItem) => void;
}

/**
 * Get bucket color classes
 */
function getBucketColor(bucket: CarteraItem['bucket']): {
  bg: string;
  text: string;
  border: string;
} {
  const colors: Record<CarteraItem['bucket'], { bg: string; text: string; border: string }> = {
    '0-30': {
      bg: 'bg-success-soft',
      text: 'text-success',
      border: 'border-success/30',
    },
    '31-60': {
      bg: 'bg-warning-soft',
      text: 'text-warning',
      border: 'border-warning/30',
    },
    '61-90': {
      bg: 'bg-warning-soft',
      text: 'text-warning',
      border: 'border-warning/30',
    },
    '90+': {
      bg: 'bg-danger-soft',
      text: 'text-danger',
      border: 'border-danger/30',
    },
  };
  return colors[bucket];
}

/**
 * Format month string to Spanish display
 */
function formatMonth(month: string, loc: string): string {
  const [year, monthNum] = month.split('-');
  const date = new Date(parseInt(year), parseInt(monthNum) - 1, 1);
  return date.toLocaleDateString(loc === 'es' ? 'es-CL' : 'en-US', { month: 'short', year: 'numeric' });
}

/**
 * CarteraEdadesTable - Aging receivables analysis table
 * Shows receivables grouped by 30/60/90+ day buckets with actions
 */
export function CarteraEdadesTable({
  data,
  onExport,
  onContactTenant,
  onViewCobro,
  onNotifyAgent,
}: CarteraEdadesTableProps) {
  const { t, locale } = useI18n();
  const [sortField, setSortField] = useState<SortField>('daysLate');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [bucketFilter, setBucketFilter] = useState<BucketFilter>('all');

  // Count items by bucket
  const bucketCounts = useMemo(() => {
    const items = data.items;
    return {
      all: items.length,
      '0-30': items.filter((i) => i.bucket === '0-30').length,
      '31-60': items.filter((i) => i.bucket === '31-60').length,
      '61-90': items.filter((i) => i.bucket === '61-90').length,
      '90+': items.filter((i) => i.bucket === '90+').length,
    };
  }, [data.items]);

  // Filter and sort items
  const filteredAndSortedItems = useMemo(() => {
    let result = [...data.items];

    // Apply bucket filter
    if (bucketFilter !== 'all') {
      result = result.filter((item) => item.bucket === bucketFilter);
    }

    // Sort
    result.sort((a, b) => {
      let aVal: string | number = '';
      let bVal: string | number = '';

      switch (sortField) {
        case 'propertyTitle':
          aVal = a.propertyTitle.toLowerCase();
          bVal = b.propertyTitle.toLowerCase();
          break;
        case 'tenantName':
          aVal = a.tenantName.toLowerCase();
          bVal = b.tenantName.toLowerCase();
          break;
        case 'propietarioName':
          aVal = a.propietarioName.toLowerCase();
          bVal = b.propietarioName.toLowerCase();
          break;
        case 'agenteName':
          aVal = a.agenteName.toLowerCase();
          bVal = b.agenteName.toLowerCase();
          break;
        case 'month':
          aVal = a.month;
          bVal = b.month;
          break;
        case 'pendingAmount':
          aVal = a.pendingAmount;
          bVal = b.pendingAmount;
          break;
        case 'daysLate':
          aVal = a.daysLate;
          bVal = b.daysLate;
          break;
      }

      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    return result;
  }, [data.items, bucketFilter, sortField, sortDirection]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const SortIcon = sortDirection === 'asc' ? SortAscending : SortDescending;

  const SortableHeader = ({
    field,
    children,
    className,
  }: {
    field: SortField;
    children: React.ReactNode;
    className?: string;
  }) => (
    <TableHead className={className}>
      {/* allowlist: table column-sort trigger — no Cadence primitive (DataTable has no sort) */}
      <button
        onClick={() => handleSort(field)}
        className="flex items-center gap-2 hover:text-fg dark:hover:text-white"
      >
        {children}
        {sortField === field && <SortIcon className="w-3.5 h-3.5" />}
      </button>
    </TableHead>
  );

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {/* Total Pendiente */}
        <div className="col-span-2 md:col-span-1 p-4 rounded-xl border border-danger/30 bg-danger-soft">
          <p className="text-sm font-medium text-danger">{t('inmobiliaria.finance.aging.totalPending')}</p>
          <p className="text-2xl font-bold text-danger">{formatCurrency(data.summary.totalPending)}</p>
          <p className="text-xs text-danger mt-1">{data.items.length} {t('inmobiliaria.finance.aging.overdueCharges')}</p>
        </div>

        {/* 0-30 dias */}
        <div className="p-4 rounded-xl border border-success/30 bg-success-soft">
          <p className="text-sm font-medium text-success">{t('inmobiliaria.finance.aging.days030')}</p>
          <p className="text-xl font-bold text-success">
            {formatCurrency(data.summary.bucket0to30)}
          </p>
          <p className="text-xs text-success mt-1">
            {bucketCounts['0-30']} {t('inmobiliaria.finance.aging.charges')}
          </p>
        </div>

        {/* 31-60 dias */}
        <div className="p-4 rounded-xl border border-warning/30 bg-warning-soft">
          <p className="text-sm font-medium text-warning">{t('inmobiliaria.finance.aging.days3160')}</p>
          <p className="text-xl font-bold text-warning">
            {formatCurrency(data.summary.bucket31to60)}
          </p>
          <p className="text-xs text-warning mt-1">
            {bucketCounts['31-60']} {t('inmobiliaria.finance.aging.charges')}
          </p>
        </div>

        {/* 61-90 dias */}
        <div className="p-4 rounded-xl border border-warning/30 bg-warning-soft">
          <p className="text-sm font-medium text-warning">{t('inmobiliaria.finance.aging.days6190')}</p>
          <p className="text-xl font-bold text-warning">
            {formatCurrency(data.summary.bucket61to90)}
          </p>
          <p className="text-xs text-warning mt-1">
            {bucketCounts['61-90']} {t('inmobiliaria.finance.aging.charges')}
          </p>
        </div>

        {/* 90+ dias */}
        <div className="p-4 rounded-xl border border-danger/30 bg-danger-soft">
          <p className="text-sm font-medium text-danger">{t('inmobiliaria.finance.aging.days90plus')}</p>
          <p className="text-xl font-bold text-danger">
            {formatCurrency(data.summary.bucket90plus)}
          </p>
          <p className="text-xs text-danger mt-1">
            {bucketCounts['90+']} {t('inmobiliaria.finance.aging.charges')}
          </p>
        </div>
      </div>

      {/* Filter Tabs and Export */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        {/* Bucket Filter Tabs */}
        <div className="overflow-x-auto">
          <SegmentedControl<BucketFilter>
            value={bucketFilter}
            onChange={setBucketFilter}
            options={[
              {
                value: 'all',
                ariaLabel: t('inmobiliaria.finance.aging.all'),
                label: (
                  <span className="flex items-center gap-2 whitespace-nowrap">
                    <Funnel className="w-4 h-4" />
                    {t('inmobiliaria.finance.aging.all')}
                    <Badge variant="secondary">{bucketCounts.all}</Badge>
                  </span>
                ),
              },
              {
                value: '0-30',
                ariaLabel: '0-30 días',
                label: (
                  <span className="flex items-center gap-2 whitespace-nowrap">
                    0-30d
                    <Badge variant="success">{bucketCounts['0-30']}</Badge>
                  </span>
                ),
              },
              {
                value: '31-60',
                ariaLabel: '31-60 días',
                label: (
                  <span className="flex items-center gap-2 whitespace-nowrap">
                    31-60d
                    <span className="px-1.5 py-0.5 rounded-full text-xs bg-warning-soft text-warning">
                      {bucketCounts['31-60']}
                    </span>
                  </span>
                ),
              },
              {
                value: '61-90',
                ariaLabel: '61-90 días',
                label: (
                  <span className="flex items-center gap-2 whitespace-nowrap">
                    61-90d
                    <span className="px-1.5 py-0.5 rounded-full text-xs bg-warning-soft text-warning">
                      {bucketCounts['61-90']}
                    </span>
                  </span>
                ),
              },
              {
                value: '90+',
                ariaLabel: '90+ días',
                label: (
                  <span className="flex items-center gap-2 whitespace-nowrap">
                    90+d
                    <span className="px-1.5 py-0.5 rounded-full text-xs bg-danger-soft text-danger">
                      {bucketCounts['90+']}
                    </span>
                  </span>
                ),
              },
            ]}
          />
        </div>

        {/* Export Button */}
        {onExport && (
          <Button variant="secondary" size="sm" hideArrow onClick={onExport} className="gap-2">
            <Download className="w-4 h-4" />
            {t('inmobiliaria.finance.aging.exportExcel')}
          </Button>
        )}
      </div>

      {/* Data Table */}
      <div className="overflow-x-auto rounded-xl border border-border dark:border-strong bg-surface dark:bg-[#14130F]">
        <table className="w-full min-w-[1100px]">
          <thead>
            <tr className="border-b border-faint dark:border-strong">
              <SortableHeader field="propertyTitle">{t('inmobiliaria.finance.aging.property')}</SortableHeader>
              <SortableHeader field="tenantName">{t('inmobiliaria.finance.aging.tenant')}</SortableHeader>
              <SortableHeader field="propietarioName">{t('inmobiliaria.finance.aging.owner')}</SortableHeader>
              <SortableHeader field="agenteName">{t('inmobiliaria.finance.aging.agent')}</SortableHeader>
              <SortableHeader field="month">{t('inmobiliaria.finance.aging.month')}</SortableHeader>
              <SortableHeader field="pendingAmount">{t('inmobiliaria.finance.aging.pending')}</SortableHeader>
              <SortableHeader field="daysLate">{t('inmobiliaria.finance.aging.overdue')}</SortableHeader>
              <th className="w-12 p-4"></th>
            </tr>
          </thead>
          <tbody>
            {filteredAndSortedItems.map((item, index) => {
              const bucketColors = getBucketColor(item.bucket);

              return (
                <motion.tr
                  key={item.cobroId}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.02 }}
                  className="border-b border-faint dark:border-strong hover:bg-surface-muted dark:hover:bg-[#14130F] transition-colors"
                >
                  {/* Property */}
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-md bg-primary-soft flex items-center justify-center shrink-0">
                        <HouseLine className="w-5 h-5 text-primary" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-fg dark:text-white truncate max-w-[160px]">
                          {item.propertyTitle}
                        </p>
                        <p className="text-sm text-fg-muted dark:text-fg-subtle truncate max-w-[160px]">
                          {item.propertyAddress}
                        </p>
                      </div>
                    </div>
                  </td>

                  {/* Tenant */}
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-surface-muted dark:bg-ink flex items-center justify-center shrink-0">
                        <User className="w-4 h-4 text-fg-muted dark:text-fg-subtle" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-fg dark:text-white truncate max-w-[120px]">
                          {item.tenantName}
                        </p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <a
                            href={`tel:${item.tenantPhone}`}
                            onClick={(e) => e.stopPropagation()}
                            className="p-1 rounded hover:bg-surface-muted dark:hover:bg-ink transition-colors"
                            title={t('inmobiliaria.finance.aging.call')}
                          >
                            <Phone className="w-3.5 h-3.5 text-fg-subtle" />
                          </a>
                          <a
                            href={`https://wa.me/${item.tenantPhone.replace(/\D/g, '')}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="p-1 rounded hover:bg-success-soft transition-colors"
                            title="WhatsApp"
                          >
                            <WhatsappLogo
                              className="w-3.5 h-3.5 text-success"
                              weight="fill"
                            />
                          </a>
                        </div>
                      </div>
                    </div>
                  </td>

                  {/* Propietario */}
                  <td className="p-4">
                    <span className="text-sm text-fg dark:text-fg-subtle truncate block max-w-[120px]">
                      {item.propietarioName}
                    </span>
                  </td>

                  {/* Agente */}
                  <td className="p-4">
                    <span className="text-sm text-fg dark:text-fg-subtle truncate block max-w-[120px]">
                      {item.agenteName}
                    </span>
                  </td>

                  {/* Month */}
                  <td className="p-4">
                    <span className="text-fg dark:text-fg-subtle capitalize text-sm">
                      {formatMonth(item.month, locale)}
                    </span>
                  </td>

                  {/* Pending Amount */}
                  <td className="p-4">
                    <span className="font-semibold text-danger">
                      {formatCurrency(item.pendingAmount)}
                    </span>
                  </td>

                  {/* Days Late */}
                  <td className="p-4">
                    <span
                      className={cn(
                        'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium',
                        bucketColors.bg,
                        bucketColors.text
                      )}
                    >
                      <Warning className="w-3.5 h-3.5" weight="fill" />
                      {item.daysLate}d
                    </span>
                  </td>

                  {/* Actions */}
                  <td className="p-4">
                    <DropdownList>
                      <DropdownListTrigger asChild>
                        <IconButton
                          variant="ghost"
                          size="sm"
                          icon={<DotsThree className="w-5 h-5" weight="bold" />}
                          onClick={(e) => e.stopPropagation()}
                          aria-label="Acciones"
                        />
                      </DropdownListTrigger>
                      <DropdownListContent align="end" className="w-48">
                        {onContactTenant && (
                          <DropdownListItem onSelect={() => onContactTenant(item)}>
                            <Phone className="w-4 h-4" />
                            <span className="text-sm">{t('inmobiliaria.finance.aging.contactTenant')}</span>
                          </DropdownListItem>
                        )}
                        {onViewCobro && (
                          <DropdownListItem onSelect={() => onViewCobro(item)}>
                            <Eye className="w-4 h-4" />
                            <span className="text-sm">{t('inmobiliaria.finance.aging.viewCharge')}</span>
                          </DropdownListItem>
                        )}
                        {onNotifyAgent && (
                          <DropdownListItem onSelect={() => onNotifyAgent(item)} className="text-primary">
                            <Envelope className="w-4 h-4" />
                            <span className="text-sm">{t('inmobiliaria.finance.aging.notifyAgent')}</span>
                          </DropdownListItem>
                        )}
                      </DropdownListContent>
                    </DropdownList>
                  </td>
                </motion.tr>
              );
            })}
          </tbody>
        </table>

        {/* Empty State */}
        {filteredAndSortedItems.length === 0 && (
          <div className="p-12 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-success-soft flex items-center justify-center">
              <Warning className="w-8 h-8 text-success" />
            </div>
            <h3 className="text-base font-semibold text-fg mb-1">
              {t('inmobiliaria.finance.aging.noOverdue')}
            </h3>
            <p className="text-sm text-fg-muted">
              {bucketFilter === 'all'
                ? t('inmobiliaria.finance.aging.noOverdueDesc')
                : t('inmobiliaria.finance.aging.noOverdueRange', { range: bucketFilter })}
            </p>
          </div>
        )}

      </div>
    </div>
  );
}

export default CarteraEdadesTable;
