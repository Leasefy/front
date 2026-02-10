'use client';

import { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Wrench,
  Lightning,
  Snowflake,
  HouseLine,
  PaintBrush,
  Key,
  DotsThreeCircle,
  Warning,
  Clock,
  CheckCircle,
  XCircle,
  CurrencyCircleDollar,
  Check,
  ListBullets,
  CalendarBlank,
  User,
} from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import { useTranslation } from '@/lib/i18n/use-translation';
import type {
  SolicitudMantenimiento,
  MantenimientoType,
  MantenimientoPriority,
  MantenimientoStatus,
} from '@/lib/types/inmobiliaria';
import { formatCurrency, getMantenimientoTypeInfo } from '@/lib/types/inmobiliaria';

// ============================================================================
// Types
// ============================================================================

interface MantenimientoKanbanProps {
  data: SolicitudMantenimiento[];
  onViewDetails?: (solicitud: SolicitudMantenimiento) => void;
}

// ============================================================================
// Constants
// ============================================================================

const PRIORITY_COLORS: Record<MantenimientoPriority, string> = {
  emergency: 'border-l-red-500',
  high: 'border-l-amber-500',
  medium: 'border-l-blue-500',
  low: 'border-l-slate-400',
};

const PRIORITY_LABEL_KEYS: Record<MantenimientoPriority, string> = {
  emergency: 'inmobiliaria.mantenimiento.priorityEmergency',
  high: 'inmobiliaria.mantenimiento.priorityHigh',
  medium: 'inmobiliaria.mantenimiento.priorityMedium',
  low: 'inmobiliaria.mantenimiento.priorityLow',
};

const TYPE_ICONS: Record<MantenimientoType, React.ElementType> = {
  plumbing: Wrench,
  electrical: Lightning,
  appliance: Snowflake,
  structural: HouseLine,
  painting: PaintBrush,
  locks: Key,
  other: DotsThreeCircle,
};

interface KanbanColumn {
  id: MantenimientoStatus;
  titleKey: string;
  icon: React.ElementType;
  color: string;
  bgColor: string;
}

const KANBAN_COLUMNS: KanbanColumn[] = [
  {
    id: 'reported',
    titleKey: 'inmobiliaria.mantenimiento.colReported',
    icon: ListBullets,
    color: 'text-slate-600 dark:text-slate-400',
    bgColor: 'bg-slate-100 dark:bg-slate-800/50',
  },
  {
    id: 'quoted',
    titleKey: 'inmobiliaria.mantenimiento.colQuoted',
    icon: CurrencyCircleDollar,
    color: 'text-blue-600 dark:text-blue-400',
    bgColor: 'bg-blue-50 dark:bg-blue-900/20',
  },
  {
    id: 'approved',
    titleKey: 'inmobiliaria.mantenimiento.colApproved',
    icon: Check,
    color: 'text-lime-600 dark:text-lime-400',
    bgColor: 'bg-lime-50 dark:bg-lime-900/20',
  },
  {
    id: 'in_progress',
    titleKey: 'inmobiliaria.mantenimiento.colInProgress',
    icon: Clock,
    color: 'text-amber-600 dark:text-amber-400',
    bgColor: 'bg-amber-50 dark:bg-amber-900/20',
  },
  {
    id: 'completed',
    titleKey: 'inmobiliaria.mantenimiento.colCompleted',
    icon: CheckCircle,
    color: 'text-emerald-600 dark:text-emerald-400',
    bgColor: 'bg-emerald-50 dark:bg-emerald-900/20',
  },
];

// ============================================================================
// Helper Functions
// ============================================================================

function getDaysSinceCreated(createdAt: string): number {
  const created = new Date(createdAt);
  const now = new Date();
  const diffTime = now.getTime() - created.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

// ============================================================================
// Kanban Card Component
// ============================================================================

interface KanbanCardProps {
  solicitud: SolicitudMantenimiento;
  onClick?: () => void;
  t: (key: string, params?: Record<string, string | number>) => string;
}

function KanbanCard({ solicitud, onClick, t }: KanbanCardProps) {
  const typeInfo = getMantenimientoTypeInfo(solicitud.type);
  const TypeIcon = TYPE_ICONS[solicitud.type];
  const daysSince = getDaysSinceCreated(solicitud.createdAt);

  return (
    <motion.button
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      onClick={onClick}
      className={cn(
        'w-full text-left p-3 rounded-lg border-l-4 bg-white dark:bg-neutral-800/80',
        'border border-neutral-200 dark:border-neutral-700',
        'hover:shadow-md hover:border-neutral-300 dark:hover:border-neutral-600',
        'transition-all cursor-pointer group',
        PRIORITY_COLORS[solicitud.priority]
      )}
    >
      {/* Header */}
      <div className="flex items-start gap-2 mb-2">
        <div
          className={cn(
            'w-7 h-7 rounded-md flex items-center justify-center flex-shrink-0',
            solicitud.priority === 'emergency'
              ? 'bg-red-100 dark:bg-red-900/30'
              : 'bg-indigo-100 dark:bg-indigo-900/30'
          )}
        >
          <TypeIcon
            className={cn(
              'w-4 h-4',
              solicitud.priority === 'emergency'
                ? 'text-red-600 dark:text-red-400'
                : 'text-indigo-600 dark:text-indigo-400'
            )}
          />
        </div>
        <div className="min-w-0 flex-1">
          <h4 className="text-sm font-medium text-neutral-900 dark:text-white line-clamp-2 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
            {solicitud.title}
          </h4>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
            {typeInfo?.labelEs}
          </p>
        </div>
      </div>

      {/* Property */}
      <div className="text-xs text-neutral-500 dark:text-neutral-400 mb-2 line-clamp-1">
        <HouseLine className="w-3 h-3 inline mr-1" />
        {solicitud.propertyTitle}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-2 text-neutral-400">
          <span className="flex items-center gap-1">
            <CalendarBlank className="w-3 h-3" />
            {daysSince}d
          </span>
          {solicitud.quotes.length > 0 && (
            <span className="flex items-center gap-1">
              <CurrencyCircleDollar className="w-3 h-3" />
              {solicitud.quotes.length}
            </span>
          )}
        </div>

        {/* Priority Badge for emergency/high */}
        {(solicitud.priority === 'emergency' || solicitud.priority === 'high') && (
          <span
            className={cn(
              'px-1.5 py-0.5 rounded text-xs font-medium',
              solicitud.priority === 'emergency'
                ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
            )}
          >
            {solicitud.priority === 'emergency' && <Warning className="w-3 h-3 inline mr-0.5" weight="fill" />}
            {t(PRIORITY_LABEL_KEYS[solicitud.priority])}
          </span>
        )}

        {/* Approved Amount */}
        {solicitud.approvedAmount && (
          <span className="font-medium text-emerald-600 dark:text-emerald-400">
            {formatCurrency(solicitud.approvedAmount)}
          </span>
        )}
      </div>
    </motion.button>
  );
}

// ============================================================================
// Kanban Column Component
// ============================================================================

interface KanbanColumnProps {
  column: KanbanColumn;
  items: SolicitudMantenimiento[];
  onViewDetails?: (solicitud: SolicitudMantenimiento) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
}

function KanbanColumnComponent({ column, items, onViewDetails, t }: KanbanColumnProps) {
  const Icon = column.icon;

  return (
    <div className="flex flex-col min-w-[280px] max-w-[320px] flex-1">
      {/* Column Header */}
      <div
        className={cn(
          'flex items-center gap-2 px-3 py-2.5 rounded-t-xl border border-b-0',
          'border-neutral-200 dark:border-neutral-700',
          column.bgColor
        )}
      >
        <Icon className={cn('w-4 h-4', column.color)} />
        <span className={cn('font-semibold text-sm', column.color)}>{t(column.titleKey)}</span>
        <span
          className={cn(
            'ml-auto px-2 py-0.5 rounded-full text-xs font-medium',
            'bg-white/80 dark:bg-neutral-800/80',
            column.color
          )}
        >
          {items.length}
        </span>
      </div>

      {/* Column Content */}
      <div
        className={cn(
          'flex-1 p-2 space-y-2 rounded-b-xl border overflow-y-auto',
          'border-neutral-200 dark:border-neutral-700',
          'bg-neutral-50/50 dark:bg-neutral-900/30',
          'min-h-[200px] max-h-[calc(100vh-400px)]'
        )}
      >
        <AnimatePresence mode="popLayout">
          {items.length > 0 ? (
            items.map((item) => (
              <KanbanCard
                key={item.id}
                solicitud={item}
                onClick={() => onViewDetails?.(item)}
                t={t}
              />
            ))
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center justify-center h-full py-8 text-neutral-400"
            >
              <Icon className="w-8 h-8 mb-2 opacity-50" />
              <p className="text-xs">{t('inmobiliaria.mantenimiento.noRequests')}</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

// ============================================================================
// Main MantenimientoKanban Component
// ============================================================================

export function MantenimientoKanban({ data, onViewDetails }: MantenimientoKanbanProps) {
  const { t } = useTranslation();
  // Group data by status
  const groupedData = useMemo(() => {
    const groups: Record<MantenimientoStatus, SolicitudMantenimiento[]> = {
      reported: [],
      quoted: [],
      approved: [],
      in_progress: [],
      completed: [],
      cancelled: [],
    };

    // Sort by priority within each group (emergency first)
    const priorityOrder: MantenimientoPriority[] = ['emergency', 'high', 'medium', 'low'];

    data.forEach((item) => {
      if (item.status in groups) {
        groups[item.status].push(item);
      }
    });

    // Sort each group by priority
    Object.keys(groups).forEach((status) => {
      groups[status as MantenimientoStatus].sort((a, b) => {
        return priorityOrder.indexOf(a.priority) - priorityOrder.indexOf(b.priority);
      });
    });

    return groups;
  }, [data]);

  return (
    <div className="w-full">
      {/* Kanban Board */}
      <div className="flex gap-4 overflow-x-auto pb-4 -mx-4 px-4">
        {KANBAN_COLUMNS.map((column) => (
          <KanbanColumnComponent
            key={column.id}
            column={column}
            items={groupedData[column.id]}
            onViewDetails={onViewDetails}
            t={t}
          />
        ))}
      </div>

      {/* Cancelled items notice */}
      {groupedData.cancelled.length > 0 && (
        <div className="mt-4 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
          <div className="flex items-center gap-2 text-sm text-red-700 dark:text-red-400">
            <XCircle className="w-4 h-4" />
            <span>
              {t('inmobiliaria.mantenimiento.cancelledNotice', { count: groupedData.cancelled.length })}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

export default MantenimientoKanban;
