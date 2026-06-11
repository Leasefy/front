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
import { useI18n } from '@/lib/i18n';
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
  emergency: 'border-l-[#C4503B]',
  high: 'border-l-[#B7791F]',
  medium: 'border-l-[#1A40FF]',
  low: 'border-l-[#6B6B6B]',
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
    color: 'text-[#6B6B6B] dark:text-[#6B6B6B]',
    bgColor: 'bg-[#6B6B6B] dark:bg-[#6B6B6B]/50',
  },
  {
    id: 'quoted',
    titleKey: 'inmobiliaria.mantenimiento.colQuoted',
    icon: CurrencyCircleDollar,
    color: 'text-[#1A40FF] dark:text-[#5570FF]',
    bgColor: 'bg-[#EEF1FF] dark:bg-[#1A40FF]/15',
  },
  {
    id: 'approved',
    titleKey: 'inmobiliaria.mantenimiento.colApproved',
    icon: Check,
    color: 'text-[#2C7A53] dark:text-[#3EAE70]',
    bgColor: 'bg-[#E8F3EC] dark:bg-[#2C7A53]/15',
  },
  {
    id: 'in_progress',
    titleKey: 'inmobiliaria.mantenimiento.colInProgress',
    icon: Clock,
    color: 'text-[#B7791F] dark:text-[#D2992F]',
    bgColor: 'bg-[#F8F0E0] dark:bg-[#B7791F]/15',
  },
  {
    id: 'completed',
    titleKey: 'inmobiliaria.mantenimiento.colCompleted',
    icon: CheckCircle,
    color: 'text-[#2C7A53] dark:text-[#3EAE70]',
    bgColor: 'bg-[#E8F3EC] dark:bg-[#2C7A53]/15',
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
        'w-full text-left p-3 rounded-md border-l-4 bg-white dark:bg-neutral-800/80',
        'border border-neutral-200 dark:border-neutral-700',
        'hover: hover:border-neutral-300 dark:hover:border-neutral-600',
        'transition-all cursor-pointer group',
        PRIORITY_COLORS[solicitud.priority]
      )}
    >
      {/* Header */}
      <div className="flex items-start gap-2 mb-2">
        <div
          className={cn(
            'w-7 h-7 rounded-sm flex items-center justify-center flex-shrink-0',
            solicitud.priority === 'emergency'
              ? 'bg-[#F8EAE7] dark:bg-[#C4503B]/15'
              : 'bg-[#EEF1FF] dark:bg-[#1A40FF]/15'
          )}
        >
          <TypeIcon
            className={cn(
              'w-4 h-4',
              solicitud.priority === 'emergency'
                ? 'text-[#C4503B] dark:text-[#E0664D]'
                : 'text-[#1A40FF] dark:text-[#5570FF]'
            )}
          />
        </div>
        <div className="min-w-0 flex-1">
          <h4 className="text-sm font-medium text-neutral-900 dark:text-white line-clamp-2 group-hover:text-[#1A40FF] dark:group-hover:text-[#1A40FF] transition-colors">
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
                ? 'bg-[#F8EAE7] text-[#C4503B] dark:bg-[#C4503B]/15 dark:text-[#E0664D]'
                : 'bg-[#F8F0E0] text-[#B7791F] dark:bg-[#B7791F]/15 dark:text-[#D2992F]'
            )}
          >
            {solicitud.priority === 'emergency' && <Warning className="w-3 h-3 inline mr-0.5" weight="fill" />}
            {t(PRIORITY_LABEL_KEYS[solicitud.priority])}
          </span>
        )}

        {/* Approved Amount */}
        {solicitud.approvedAmount && (
          <span className="font-medium text-[#2C7A53] dark:text-[#3EAE70]">
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
  const { t } = useI18n();
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
        <div className="mt-4 p-3 rounded-md bg-[#F8EAE7] dark:bg-[#C4503B]/15 border border-[#C4503B]/30 dark:border-[#C4503B]/40">
          <div className="flex items-center gap-2 text-sm text-[#C4503B] dark:text-[#E0664D]">
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
