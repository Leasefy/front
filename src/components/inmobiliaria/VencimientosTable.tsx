'use client';

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  SortAscending,
  SortDescending,
  DotsThree,
  Eye,
  Phone,
  ArrowsClockwise,
  CheckSquare,
  Warning,
  HouseLine,
  User,
  CalendarBlank,
  Funnel,
  EnvelopeSimple,
} from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
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
import { IconButton, SegmentedControl } from '@leasefy/cadence';
import { useI18n } from '@/lib/i18n';
import type { VencimientosReport, VencimientoItem, RenewalStatus } from '@/lib/types/inmobiliaria';

type SortField = 'propertyTitle' | 'tenantName' | 'propietarioName' | 'daysUntilExpiry' | 'renewalStatus';
type SortDirection = 'asc' | 'desc';
type BucketFilter = 'all' | '0-30' | '31-60' | '61-90' | '90+';

interface VencimientosTableProps {
  data: VencimientosReport;
  onStartRenewal?: (propertyId: string) => void;
  onContactTenant?: (propertyId: string) => void;
  onViewContract?: (item: VencimientoItem) => void;
  onBulkRenewal?: (propertyIds: string[]) => void;
  onBulkReminder?: (propertyIds: string[]) => void;
}

// Mapeo bucket de urgencia → variant del Badge de Cadence (reemplaza getBucketColor).
const BUCKET_BADGE_VARIANT = {
  '0-30': 'destructive',
  '31-60': 'warning',
  '61-90': 'default',
  '90+': 'secondary',
} as const;

// Estado de renovación → label i18n + variant (reemplaza getRenewalStatusDisplay).
const RENEWAL_STATUS = {
  pending: { key: 'statusPending', variant: 'secondary' },
  negotiating: { key: 'statusNegotiating', variant: 'default' },
  renewed: { key: 'statusRenewed', variant: 'success' },
  terminating: { key: 'statusTerminating', variant: 'destructive' },
} as const;

/**
 * Format date to display
 */
function formatDate(dateStr: string, loc: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString(loc === 'es' ? 'es-CL' : 'en-US', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

/**
 * VencimientosTable - Contract expirations table
 * Shows expiring contracts grouped by urgency buckets
 */
export function VencimientosTable({
  data,
  onStartRenewal,
  onContactTenant,
  onViewContract,
  onBulkRenewal,
  onBulkReminder,
}: VencimientosTableProps) {
  const { t, locale } = useI18n();
  const [sortField, setSortField] = useState<SortField>('daysUntilExpiry');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [bucketFilter, setBucketFilter] = useState<BucketFilter>('all');
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());

  // Count items by bucket
  const bucketCounts = useMemo(() => {
    const items = data.items;
    return {
      all: items.length,
      '0-30': data.summary.bucket0to30,
      '31-60': data.summary.bucket31to60,
      '61-90': data.summary.bucket61to90,
      '90+': data.summary.bucket90plus,
    };
  }, [data]);

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
        case 'daysUntilExpiry':
          aVal = a.daysUntilExpiry;
          bVal = b.daysUntilExpiry;
          break;
        case 'renewalStatus':
          const statusOrder: Record<RenewalStatus, number> = {
            terminating: 0,
            pending: 1,
            negotiating: 2,
            renewed: 3,
          };
          aVal = statusOrder[a.renewalStatus];
          bVal = statusOrder[b.renewalStatus];
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
      setSortDirection('asc');
    }
  };

  const toggleSelectItem = (id: string) => {
    const newSelected = new Set(selectedItems);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedItems(newSelected);
  };

  const toggleSelectAll = () => {
    if (selectedItems.size === filteredAndSortedItems.length) {
      setSelectedItems(new Set());
    } else {
      setSelectedItems(new Set(filteredAndSortedItems.map((i) => i.propertyId)));
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
    <TableHead className={cn('text-left p-4', className)}>
      {/*
        allowlist: disparador de orden — no hay primitiva en Cadence (DataTable
        no ordena). El navegador le pone `text-transform: none` a todo control
        de formulario, así que un `<button>` dentro del `TH` PIERDE las
        mayúsculas que el encabezado hereda: por eso el botón repite `uppercase`
        y hereda el resto con `inherit`. Patrón canónico en DispersionTable.
      */}
      <button
        onClick={() => handleSort(field)}
        className="flex items-center gap-2 font-[inherit] text-[inherit] uppercase tracking-[inherit] text-fg-subtle transition-colors hover:text-fg"
      >
        {children}
        {sortField === field && <SortIcon className="w-3.5 h-3.5" />}
      </button>
    </TableHead>
  );

  const hasSelection = selectedItems.size > 0;

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Proximos 30 dias */}
        <div className="p-4 rounded-xl bg-danger-soft dark:bg-danger/10 text-fg">
          <div className="flex items-center gap-2 mb-1">
            <Warning className="w-5 h-5 text-danger" weight="fill" />
            <span className="text-sm font-medium text-danger">{t('inmobiliaria.finance.expirations.critical30d')}</span>
          </div>
          <p className="text-2xl font-bold">{data.summary.bucket0to30}</p>
          <p className="text-xs text-danger mt-1">{t('inmobiliaria.finance.expirations.contractsExpiring')}</p>
        </div>

        {/* 31-60 dias */}
        <div className="p-4 rounded-xl border border-warning/30 dark:border-warning/40 bg-warning-soft">
          <div className="flex items-center gap-2 mb-1">
            <CalendarBlank className="w-5 h-5 text-warning" />
            <span className="text-sm font-medium text-warning">
              {t('inmobiliaria.finance.expirations.warning3160d')}
            </span>
          </div>
          <p className="text-2xl font-bold text-warning">
            {data.summary.bucket31to60}
          </p>
        </div>

        {/* 61-90 dias */}
        <div className="p-4 rounded-xl border border-primary/30 dark:border-primary/40 bg-primary-soft">
          <div className="flex items-center gap-2 mb-1">
            <CalendarBlank className="w-5 h-5 text-primary" />
            <span className="text-sm font-medium text-primary">
              {t('inmobiliaria.finance.expirations.info6190d')}
            </span>
          </div>
          <p className="text-2xl font-bold text-primary">
            {data.summary.bucket61to90}
          </p>
        </div>

        {/* Total */}
        <div className="p-4 rounded-xl border border-border dark:border-border-strong bg-surface dark:bg-card">
          <div className="flex items-center gap-2 mb-1">
            <HouseLine className="w-5 h-5 text-fg-muted dark:text-fg-subtle" />
            <span className="text-sm font-medium text-fg-muted dark:text-fg-subtle">
              {t('inmobiliaria.finance.expirations.total')}
            </span>
          </div>
          <p className="text-2xl font-bold text-fg dark:text-white">
            {data.summary.totalVencimientos}
          </p>
        </div>
      </div>

      {/* Filter Tabs and Bulk Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        {/* Bucket Filter Tabs */}
        <div className="overflow-x-auto">
          <SegmentedControl<BucketFilter>
            value={bucketFilter}
            onChange={setBucketFilter}
            options={[
              {
                value: 'all',
                ariaLabel: t('inmobiliaria.finance.expirations.all'),
                label: (
                  <span className="flex items-center gap-2 whitespace-nowrap">
                    <Funnel className="w-4 h-4" />
                    {t('inmobiliaria.finance.expirations.all')}
                    <Badge variant="secondary">{bucketCounts.all}</Badge>
                  </span>
                ),
              },
              {
                value: '0-30',
                ariaLabel: '0-30d',
                label: (
                  <span className="flex items-center gap-2 whitespace-nowrap">
                    0-30d
                    <Badge variant="destructive">{bucketCounts['0-30']}</Badge>
                  </span>
                ),
              },
              {
                value: '31-60',
                ariaLabel: '31-60d',
                label: (
                  <span className="flex items-center gap-2 whitespace-nowrap">
                    31-60d
                    <Badge variant="warning">{bucketCounts['31-60']}</Badge>
                  </span>
                ),
              },
              {
                value: '61-90',
                ariaLabel: '61-90d',
                label: (
                  <span className="flex items-center gap-2 whitespace-nowrap">
                    61-90d
                    <Badge variant="default">{bucketCounts['61-90']}</Badge>
                  </span>
                ),
              },
            ]}
          />
        </div>

        {/* Bulk Actions */}
        <AnimatePresence>
          {hasSelection && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="flex items-center gap-2"
            >
              <span className="text-sm text-fg-muted dark:text-fg-subtle">
                {selectedItems.size} {t('inmobiliaria.finance.expirations.selected')}
              </span>
              {onBulkRenewal && (
                <Button
                  size="sm"
                  hideArrow
                  onClick={() => onBulkRenewal(Array.from(selectedItems))}
                  className="gap-2"
                >
                  <ArrowsClockwise className="w-4 h-4" />
                  {t('inmobiliaria.finance.expirations.startRenewal')}
                </Button>
              )}
              {onBulkReminder && (
                <Button
                  variant="secondary"
                  size="sm"
                  hideArrow
                  onClick={() => onBulkReminder(Array.from(selectedItems))}
                  className="gap-2"
                >
                  <EnvelopeSimple className="w-4 h-4" />
                  {t('inmobiliaria.finance.expirations.sendReminders')}
                </Button>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Data Table */}
      <div className="overflow-x-auto rounded-xl border border-border dark:border-border-strong bg-surface dark:bg-card">
        <Table className="min-w-[1000px]">
          <TableHeader>
            <TableRow className="border-b border-border-faint dark:border-border-strong">
              <TableHead className="w-12 p-4">
                <Checkbox
                  checked={
                    selectedItems.size === filteredAndSortedItems.length &&
                    filteredAndSortedItems.length > 0
                  }
                  onCheckedChange={toggleSelectAll}
                  aria-label={t('inmobiliaria.finance.expirations.all')}
                />
              </TableHead>
              <SortableHeader field="propertyTitle">{t('inmobiliaria.finance.expirations.property')}</SortableHeader>
              <SortableHeader field="tenantName">{t('inmobiliaria.finance.expirations.tenant')}</SortableHeader>
              <SortableHeader field="propietarioName">{t('inmobiliaria.finance.expirations.owner')}</SortableHeader>
              <TableHead className="p-4 text-left">
                {t('inmobiliaria.finance.expirations.expiration')}
              </TableHead>
              <SortableHeader field="daysUntilExpiry">{t('inmobiliaria.finance.expirations.days')}</SortableHeader>
              <SortableHeader field="renewalStatus">{t('inmobiliaria.finance.expirations.status')}</SortableHeader>
              <TableHead className="w-12 p-4" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredAndSortedItems.map((item, index) => {
              const isUrgent = item.bucket === '0-30';
              const isSelected = selectedItems.has(item.propertyId);

              return (
                <motion.tr
                  key={item.consignacionId}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.02 }}
                  className={cn(
                    'border-b border-border-faint dark:border-border-strong transition-colors',
                    isSelected && 'bg-primary-soft',
                    !isSelected && 'hover:bg-surface-muted dark:hover:bg-muted/20'
                  )}
                >
                  {/* Checkbox */}
                  <TableCell className="p-4">
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => toggleSelectItem(item.propertyId)}
                      aria-label={item.propertyTitle}
                    />
                  </TableCell>

                  {/* Property */}
                  <TableCell className="p-4">
                    <div className="flex items-center gap-3">
                      <div
                        className={cn(
                          'w-10 h-10 rounded-md flex items-center justify-center shrink-0',
                          isUrgent
                            ? 'bg-danger-soft'
                            : 'bg-primary-soft'
                        )}
                      >
                        <HouseLine
                          className={cn(
                            'w-5 h-5',
                            isUrgent
                              ? 'text-danger'
                              : 'text-primary'
                          )}
                        />
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
                  </TableCell>

                  {/* Tenant */}
                  <TableCell className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-surface-muted dark:bg-ink flex items-center justify-center shrink-0">
                        <User className="w-4 h-4 text-fg-muted dark:text-fg-subtle" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-fg dark:text-white truncate max-w-[120px]">
                          {item.tenantName}
                        </p>
                      </div>
                    </div>
                  </TableCell>

                  {/* Propietario */}
                  <TableCell className="p-4">
                    <span className="text-sm text-fg dark:text-fg-subtle truncate block max-w-[120px]">
                      {item.propietarioName}
                    </span>
                  </TableCell>

                  {/* End Date */}
                  <TableCell className="p-4">
                    <span className="text-sm text-fg dark:text-fg-subtle">
                      {formatDate(item.contractEndDate, locale)}
                    </span>
                  </TableCell>

                  {/* Days Until Expiry */}
                  <TableCell className="p-4">
                    <Badge variant={BUCKET_BADGE_VARIANT[item.bucket]} className="gap-1.5">
                      {isUrgent && <Warning className="w-3.5 h-3.5" weight="fill" />}
                      {item.daysUntilExpiry}d
                    </Badge>
                  </TableCell>

                  {/* Renewal Status */}
                  <TableCell className="p-4">
                    <Badge variant={RENEWAL_STATUS[item.renewalStatus].variant}>
                      {t(`inmobiliaria.finance.expirations.${RENEWAL_STATUS[item.renewalStatus].key}`)}
                    </Badge>
                  </TableCell>

                  {/* Actions */}
                  <TableCell className="p-4">
                    <DropdownList>
                      <DropdownListTrigger asChild>
                        <IconButton
                          variant="ghost"
                          size="sm"
                          icon={<DotsThree className="w-5 h-5" weight="bold" />}
                          aria-label="Acciones"
                        />
                      </DropdownListTrigger>
                      <DropdownListContent align="end" className="w-48">
                        {onContactTenant && (
                          <DropdownListItem onSelect={() => onContactTenant(item.propertyId)}>
                            <Phone className="w-4 h-4" />
                            <span className="text-sm">{t('inmobiliaria.finance.expirations.contactTenant')}</span>
                          </DropdownListItem>
                        )}
                        {onStartRenewal && (
                          <DropdownListItem onSelect={() => onStartRenewal(item.propertyId)} className="text-primary">
                            <ArrowsClockwise className="w-4 h-4" />
                            <span className="text-sm">{t('inmobiliaria.finance.expirations.startRenewal')}</span>
                          </DropdownListItem>
                        )}
                        {onViewContract && (
                          <DropdownListItem onSelect={() => onViewContract(item)}>
                            <Eye className="w-4 h-4" />
                            <span className="text-sm">{t('inmobiliaria.finance.expirations.viewContract')}</span>
                          </DropdownListItem>
                        )}
                      </DropdownListContent>
                    </DropdownList>
                  </TableCell>
                </motion.tr>
              );
            })}
          </TableBody>
        </Table>

        {/* Empty State */}
        {filteredAndSortedItems.length === 0 && (
          <div className="p-12 text-center">
            {/* allowlist: empty-state hero icon-circle (wraps Phosphor glyph), no text-label pill */}
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-success-soft flex items-center justify-center">
              <CheckSquare className="w-8 h-8 text-success" weight="fill" />
            </div>
            <h3 className="text-lg font-semibold text-fg dark:text-white mb-1">
              {t('inmobiliaria.finance.expirations.noExpirations')}
            </h3>
            <p className="text-fg-muted dark:text-fg-subtle">
              {bucketFilter === 'all'
                ? t('inmobiliaria.finance.expirations.noExpirationsDesc')
                : t('inmobiliaria.finance.expirations.noExpirationsRange', { range: bucketFilter })}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default VencimientosTable;
