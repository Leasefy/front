'use client';

import { useState, useMemo } from 'react';
import {
  ClockCounterClockwise,
  Clock,
  Warning,
  ShieldWarning,
  FileText,
  Envelope,
  WhatsappLogo,
  Bell,
  ChatText,
  Funnel,
} from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import { useI18n } from '@/lib/i18n';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from '@/components/ui';
import type {
  ReminderLogEntry,
  ReminderType,
  ReminderStatus,
  ReminderChannel,
} from '@/lib/types/reminders';

// ============================================================================
// Type metadata (icons, colors, labels)
// ============================================================================

const TYPE_META: Record<
  ReminderType,
  { icon: React.ElementType; label: string; bg: string; color: string; badgeBg: string; badgeText: string }
> = {
  'pre-payment': {
    icon: Clock,
    label: 'Recordatorio de pago',
    bg: 'bg-primary-soft',
    color: 'text-primary',
    badgeBg: 'bg-primary-soft',
    badgeText: 'text-primary',
  },
  overdue: {
    icon: Warning,
    label: 'Aviso de mora',
    bg: 'bg-warning-soft',
    color: 'text-warning',
    badgeBg: 'bg-warning-soft',
    badgeText: 'text-warning',
  },
  escalation: {
    icon: ShieldWarning,
    label: 'Escalacion',
    bg: 'bg-danger-soft',
    color: 'text-danger',
    badgeBg: 'bg-danger-soft',
    badgeText: 'text-danger',
  },
  'contract-expiry': {
    icon: FileText,
    label: 'Vencimiento contrato',
    bg: 'bg-surface-muted dark:bg-ink',
    color: 'text-fg-muted dark:text-fg-subtle',
    badgeBg: 'bg-surface-muted dark:bg-ink',
    badgeText: 'text-fg-muted dark:text-fg-subtle',
  },
};

const STATUS_META: Record<
  ReminderStatus,
  { label: string; bg: string; text: string; dot: string }
> = {
  sent: {
    label: 'Enviado',
    bg: 'bg-ink dark:bg-ink',
    text: 'text-white',
    dot: 'bg-success',
  },
  scheduled: {
    label: 'Programado',
    bg: 'bg-surface-muted dark:bg-ink',
    text: 'text-fg dark:text-white',
    dot: 'bg-primary',
  },
  failed: {
    label: 'Fallido',
    bg: 'bg-danger-soft',
    text: 'text-danger',
    dot: 'bg-danger',
  },
  cancelled: {
    label: 'Cancelado',
    bg: 'bg-muted dark:bg-ink',
    text: 'text-fg-muted dark:text-fg-subtle',
    dot: 'bg-muted',
  },
};

const CHANNEL_META: Record<ReminderChannel, { icon: React.ElementType; label: string }> = {
  email: { icon: Envelope, label: 'Email' },
  whatsapp: { icon: WhatsappLogo, label: 'WhatsApp' },
  push: { icon: Bell, label: 'Push' },
  sms: { icon: ChatText, label: 'SMS' },
};

// ============================================================================
// Helpers
// ============================================================================

function formatDateShort(date: Date): string {
  const months = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
  const d = new Date(date);
  const day = d.getDate();
  const month = months[d.getMonth()];
  const year = d.getFullYear();
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  return `${day} ${month} ${year}, ${hours}:${minutes}`;
}

function formatCOP(amount: number): string {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

// ============================================================================
// ReminderLog Component
// ============================================================================

interface ReminderLogProps {
  entries: ReminderLogEntry[];
}

export function ReminderLog({ entries }: ReminderLogProps) {
  const { t } = useI18n();
  const [typeFilter, setTypeFilter] = useState<ReminderType | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<ReminderStatus | 'all'>('all');

  const tryTranslate = (key: string, fallback: string) => {
    const translated = t(key);
    return translated === key ? fallback : translated;
  };

  // Filter + sort by scheduledAt descending
  const filteredEntries = useMemo(() => {
    let result = [...entries];

    if (typeFilter !== 'all') {
      result = result.filter((e) => e.type === typeFilter);
    }
    if (statusFilter !== 'all') {
      result = result.filter((e) => e.status === statusFilter);
    }

    result.sort((a, b) => new Date(b.scheduledAt).getTime() - new Date(a.scheduledAt).getTime());

    return result;
  }, [entries, typeFilter, statusFilter]);

  return (
    <div className="rounded-xl border border-border bg-card">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-md bg-surface-muted dark:bg-ink flex items-center justify-center">
            <ClockCounterClockwise className="w-5 h-5 text-fg-muted dark:text-fg-subtle" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground">
              {tryTranslate('inmobiliaria.reminders.logTitle', 'Historial de Recordatorios')}
            </h3>
            <p className="text-xs text-muted-foreground">
              {tryTranslate('inmobiliaria.reminders.logSubtitle', 'Registro de envios automaticos')}
            </p>
          </div>
        </div>
        <span className="text-xs text-muted-foreground">
          {filteredEntries.length} {filteredEntries.length === 1 ? 'registro' : 'registros'}
        </span>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 px-5 py-3 border-b border-border bg-muted/20">
        <Funnel className="w-4 h-4 text-muted-foreground shrink-0" />

        {/* Type filter */}
        <Select
          value={typeFilter}
          onValueChange={(v) => setTypeFilter(v as ReminderType | 'all')}
        >
          <SelectTrigger
            className="h-8 w-auto gap-2 px-3 text-xs font-medium"
            aria-label={tryTranslate('inmobiliaria.reminders.filterAllTypes', 'Todos los tipos')}
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">
              {tryTranslate('inmobiliaria.reminders.filterAllTypes', 'Todos los tipos')}
            </SelectItem>
            <SelectItem value="pre-payment">{TYPE_META['pre-payment'].label}</SelectItem>
            <SelectItem value="overdue">{TYPE_META.overdue.label}</SelectItem>
            <SelectItem value="escalation">{TYPE_META.escalation.label}</SelectItem>
            <SelectItem value="contract-expiry">{TYPE_META['contract-expiry'].label}</SelectItem>
          </SelectContent>
        </Select>

        {/* Status filter */}
        <Select
          value={statusFilter}
          onValueChange={(v) => setStatusFilter(v as ReminderStatus | 'all')}
        >
          <SelectTrigger
            className="h-8 w-auto gap-2 px-3 text-xs font-medium"
            aria-label={tryTranslate('inmobiliaria.reminders.filterAllStatuses', 'Todos los estados')}
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">
              {tryTranslate('inmobiliaria.reminders.filterAllStatuses', 'Todos los estados')}
            </SelectItem>
            <SelectItem value="sent">{STATUS_META.sent.label}</SelectItem>
            <SelectItem value="scheduled">{STATUS_META.scheduled.label}</SelectItem>
            <SelectItem value="failed">{STATUS_META.failed.label}</SelectItem>
            <SelectItem value="cancelled">{STATUS_META.cancelled.label}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Desktop Table */}
      <div className="hidden md:block overflow-x-auto">
        <Table className="min-w-[800px]">
          <TableHeader>
            <TableRow className="border-b border-border">
              <TableHead className="text-left p-4">
                {tryTranslate('inmobiliaria.reminders.colType', 'Tipo')}
              </TableHead>
              <TableHead className="text-left p-4">
                {tryTranslate('inmobiliaria.reminders.colRecipient', 'Destinatario')}
              </TableHead>
              <TableHead className="text-left p-4">
                {tryTranslate('inmobiliaria.reminders.colProperty', 'Inmueble')}
              </TableHead>
              <TableHead className="text-left p-4">
                {tryTranslate('inmobiliaria.reminders.colDate', 'Fecha')}
              </TableHead>
              <TableHead className="text-left p-4">
                {tryTranslate('inmobiliaria.reminders.colStatus', 'Estado')}
              </TableHead>
              <TableHead className="text-left p-4">
                {tryTranslate('inmobiliaria.reminders.colChannel', 'Canal')}
              </TableHead>
              <TableHead className="text-right p-4">
                {tryTranslate('inmobiliaria.reminders.colAmount', 'Monto')}
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredEntries.map((entry) => {
              const typeMeta = TYPE_META[entry.type];
              const statusMeta = STATUS_META[entry.status];
              const channelMeta = CHANNEL_META[entry.channel];
              const TypeIcon = typeMeta.icon;
              const ChannelIcon = channelMeta.icon;

              return (
                <TableRow
                  key={entry.id}
                  className="border-b border-border/50 last:border-b-0 hover:bg-muted/30 transition-colors"
                >
                  {/* Type */}
                  <TableCell className="p-4">
                    <div className="flex items-center gap-2.5">
                      <div
                        className={cn(
                          'w-8 h-8 rounded-md flex items-center justify-center shrink-0',
                          typeMeta.bg
                        )}
                      >
                        <TypeIcon className={cn('w-4 h-4', typeMeta.color)} />
                      </div>
                      <span
                        className={cn(
                          'inline-flex px-2 py-0.5 rounded-sm text-[11px] font-medium',
                          typeMeta.badgeBg,
                          typeMeta.badgeText
                        )}
                      >
                        {typeMeta.label}
                      </span>
                    </div>
                  </TableCell>

                  {/* Recipient */}
                  <TableCell className="p-4">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground truncate max-w-[160px]">
                        {entry.recipientName}
                      </p>
                      <span
                        className={cn(
                          'inline-flex px-1.5 py-0.5 rounded text-[10px] font-medium mt-0.5',
                          entry.recipientType === 'tenant'
                            ? 'bg-primary-soft text-primary'
                            : 'bg-success-soft text-success'
                        )}
                      >
                        {entry.recipientType === 'tenant' ? 'Inquilino' : 'Propietario'}
                      </span>
                    </div>
                  </TableCell>

                  {/* Property */}
                  <TableCell className="p-4">
                    <p className="text-sm text-foreground truncate max-w-[180px]">
                      {entry.propertyTitle}
                    </p>
                  </TableCell>

                  {/* Date */}
                  <TableCell className="p-4">
                    <span className="text-sm text-muted-foreground whitespace-nowrap">
                      {formatDateShort(entry.scheduledAt)}
                    </span>
                  </TableCell>

                  {/* Status */}
                  <TableCell className="p-4">
                    <span
                      className={cn(
                        'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium',
                        statusMeta.bg,
                        statusMeta.text
                      )}
                    >
                      <span className={cn('w-1.5 h-1.5 rounded-full', statusMeta.dot)} />
                      {statusMeta.label}
                    </span>
                  </TableCell>

                  {/* Channel */}
                  <TableCell className="p-4">
                    <div className="flex items-center gap-1.5">
                      <ChannelIcon className="w-4 h-4 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">
                        {channelMeta.label}
                      </span>
                    </div>
                  </TableCell>

                  {/* Amount */}
                  <TableCell className="p-4 text-right">
                    {entry.amount ? (
                      <span className="text-sm font-medium text-foreground">
                        {formatCOP(entry.amount)}
                      </span>
                    ) : (
                      <span className="text-sm text-muted-foreground">&mdash;</span>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* Mobile Card List */}
      <div className="md:hidden divide-y divide-border/50">
        {filteredEntries.map((entry) => {
          const typeMeta = TYPE_META[entry.type];
          const statusMeta = STATUS_META[entry.status];
          const channelMeta = CHANNEL_META[entry.channel];
          const TypeIcon = typeMeta.icon;
          const ChannelIcon = channelMeta.icon;

          return (
            <div key={entry.id} className="px-5 py-4 space-y-2.5">
              {/* Top row: type + status */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div
                    className={cn(
                      'w-7 h-7 rounded-md flex items-center justify-center',
                      typeMeta.bg
                    )}
                  >
                    <TypeIcon className={cn('w-3.5 h-3.5', typeMeta.color)} />
                  </div>
                  <span
                    className={cn(
                      'inline-flex px-2 py-0.5 rounded-sm text-[11px] font-medium',
                      typeMeta.badgeBg,
                      typeMeta.badgeText
                    )}
                  >
                    {typeMeta.label}
                  </span>
                </div>
                <span
                  className={cn(
                    'inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium',
                    statusMeta.bg,
                    statusMeta.text
                  )}
                >
                  <span className={cn('w-1.5 h-1.5 rounded-full', statusMeta.dot)} />
                  {statusMeta.label}
                </span>
              </div>

              {/* Recipient + property */}
              <div>
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-foreground">
                    {entry.recipientName}
                  </p>
                  <span
                    className={cn(
                      'inline-flex px-1.5 py-0.5 rounded text-[10px] font-medium',
                      entry.recipientType === 'tenant'
                        ? 'bg-primary-soft text-primary'
                        : 'bg-success-soft text-success'
                    )}
                  >
                    {entry.recipientType === 'tenant' ? 'Inquilino' : 'Propietario'}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {entry.propertyTitle}
                </p>
              </div>

              {/* Bottom row: date, channel, amount */}
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>{formatDateShort(entry.scheduledAt)}</span>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1">
                    <ChannelIcon className="w-3.5 h-3.5" />
                    <span>{channelMeta.label}</span>
                  </div>
                  {entry.amount && (
                    <span className="font-medium text-foreground">
                      {formatCOP(entry.amount)}
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Empty state */}
      {filteredEntries.length === 0 && (
        <div className="p-12 text-center">
          <div className="w-14 h-14 mx-auto mb-3 rounded-full bg-muted flex items-center justify-center">
            <ClockCounterClockwise className="w-7 h-7 text-muted-foreground" />
          </div>
          <h4 className="text-sm font-semibold text-foreground mb-1">
            {tryTranslate('inmobiliaria.reminders.logEmpty', 'Sin registros')}
          </h4>
          <p className="text-xs text-muted-foreground max-w-[240px] mx-auto">
            {tryTranslate(
              'inmobiliaria.reminders.logEmptyDesc',
              'No hay recordatorios que coincidan con los filtros seleccionados'
            )}
          </p>
        </div>
      )}
    </div>
  );
}
