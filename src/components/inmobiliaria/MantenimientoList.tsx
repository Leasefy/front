'use client';

import { useState, useMemo } from 'react';
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
  Image,
  CaretDown,
  Eye,
  CurrencyCircleDollar,
  Check,
  X,
  MagnifyingGlass,
  Funnel,
  DotsThree,
  CalendarBlank,
  User,
  MapPin,
  ListBullets,
} from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import type {
  SolicitudMantenimiento,
  MantenimientoType,
  MantenimientoPriority,
  MantenimientoStatus,
} from '@/lib/types/inmobiliaria';
import { formatCurrency, MANTENIMIENTO_TYPES, getMantenimientoTypeInfo } from '@/lib/types/inmobiliaria';

// ============================================================================
// Types
// ============================================================================

interface MantenimientoListProps {
  data: SolicitudMantenimiento[];
  onViewDetails?: (solicitud: SolicitudMantenimiento) => void;
  onAddQuote?: (solicitud: SolicitudMantenimiento) => void;
  onApproveQuote?: (solicitud: SolicitudMantenimiento, quoteId: string) => void;
  onComplete?: (solicitud: SolicitudMantenimiento) => void;
  onCancel?: (solicitud: SolicitudMantenimiento) => void;
  /** Hide the summary cards and filters - useful when embedded in a parent with its own UI */
  minimal?: boolean;
}

type SortField = 'priority' | 'createdAt' | 'status';
type SortDirection = 'asc' | 'desc';

// ============================================================================
// Constants
// ============================================================================

const PRIORITY_STYLES: Record<MantenimientoPriority, { bg: string; text: string; label: string }> = {
  low: { bg: 'bg-slate-100 dark:bg-slate-800', text: 'text-slate-600 dark:text-slate-400', label: 'Baja' },
  medium: { bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-600 dark:text-blue-400', label: 'Media' },
  high: { bg: 'bg-amber-100 dark:bg-amber-900/30', text: 'text-amber-600 dark:text-amber-400', label: 'Alta' },
  emergency: { bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-600 dark:text-red-400', label: 'Emergencia' },
};

const STATUS_STYLES: Record<MantenimientoStatus, { bg: string; text: string; label: string; icon: React.ElementType }> = {
  reported: { bg: 'bg-slate-100 dark:bg-slate-800', text: 'text-slate-600 dark:text-slate-400', label: 'Reportada', icon: ListBullets },
  quoted: { bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-600 dark:text-blue-400', label: 'Cotizada', icon: CurrencyCircleDollar },
  approved: { bg: 'bg-lime-100 dark:bg-lime-900/30', text: 'text-lime-600 dark:text-lime-400', label: 'Aprobada', icon: Check },
  in_progress: { bg: 'bg-amber-100 dark:bg-amber-900/30', text: 'text-amber-600 dark:text-amber-400', label: 'En progreso', icon: Clock },
  completed: { bg: 'bg-emerald-100 dark:bg-emerald-900/30', text: 'text-emerald-600 dark:text-emerald-400', label: 'Completada', icon: CheckCircle },
  cancelled: { bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-600 dark:text-red-400', label: 'Cancelada', icon: XCircle },
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

const PRIORITY_ORDER: MantenimientoPriority[] = ['emergency', 'high', 'medium', 'low'];
const STATUS_ORDER: MantenimientoStatus[] = ['reported', 'quoted', 'approved', 'in_progress', 'completed', 'cancelled'];

// ============================================================================
// Helper Functions
// ============================================================================

function getDaysSinceCreated(createdAt: string): number {
  const created = new Date(createdAt);
  const now = new Date();
  const diffTime = now.getTime() - created.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('es-CO', {
    day: 'numeric',
    month: 'short',
  });
}

// ============================================================================
// Summary Cards Component
// ============================================================================

function SummaryCards({ data }: { data: SolicitudMantenimiento[] }) {
  const stats = useMemo(() => {
    const counts = {
      total: data.length,
      reported: 0,
      quoted: 0,
      approved: 0,
      in_progress: 0,
      completed: 0,
    };

    data.forEach((item) => {
      if (item.status in counts) {
        counts[item.status as keyof typeof counts]++;
      }
    });

    return counts;
  }, [data]);

  const cards = [
    { label: 'Total', value: stats.total, color: 'bg-indigo-500' },
    { label: 'Reportadas', value: stats.reported, color: 'bg-slate-400' },
    { label: 'Cotizadas', value: stats.quoted, color: 'bg-blue-500' },
    { label: 'Aprobadas', value: stats.approved, color: 'bg-lime-500' },
    { label: 'En progreso', value: stats.in_progress, color: 'bg-amber-500' },
    { label: 'Completadas', value: stats.completed, color: 'bg-emerald-500' },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
      {cards.map((card) => (
        <div
          key={card.label}
          className="p-4 rounded-xl bg-white dark:bg-[#1a1a1c] border border-neutral-200 dark:border-neutral-700"
        >
          <div className="flex items-center gap-2 mb-1">
            <div className={cn('w-2 h-2 rounded-full', card.color)} />
            <span className="text-xs font-medium text-neutral-500 dark:text-neutral-400">
              {card.label}
            </span>
          </div>
          <p className="text-2xl font-bold text-neutral-900 dark:text-white">{card.value}</p>
        </div>
      ))}
    </div>
  );
}

// ============================================================================
// Filter Bar Component
// ============================================================================

interface FilterBarProps {
  typeFilter: MantenimientoType | 'all';
  setTypeFilter: (value: MantenimientoType | 'all') => void;
  priorityFilter: MantenimientoPriority | 'all';
  setPriorityFilter: (value: MantenimientoPriority | 'all') => void;
  statusFilter: MantenimientoStatus | 'all';
  setStatusFilter: (value: MantenimientoStatus | 'all') => void;
  searchQuery: string;
  setSearchQuery: (value: string) => void;
  sortField: SortField;
  setSortField: (value: SortField) => void;
  sortDirection: SortDirection;
  setSortDirection: (value: SortDirection) => void;
}

function FilterBar({
  typeFilter,
  setTypeFilter,
  priorityFilter,
  setPriorityFilter,
  statusFilter,
  setStatusFilter,
  searchQuery,
  setSearchQuery,
  sortField,
  setSortField,
  sortDirection,
  setSortDirection,
}: FilterBarProps) {
  return (
    <div className="flex flex-col lg:flex-row gap-4">
      {/* Search */}
      <div className="relative flex-1 max-w-sm">
        <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
        <input
          type="text"
          placeholder="Buscar por propiedad o zona..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-[#1a1a1c] text-neutral-900 dark:text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
        />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        {/* Type Filter */}
        <div className="relative">
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as MantenimientoType | 'all')}
            className="appearance-none px-4 py-2.5 pr-10 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-[#1a1a1c] text-neutral-900 dark:text-white text-sm cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
          >
            <option value="all">Todos los tipos</option>
            {MANTENIMIENTO_TYPES.map((type) => (
              <option key={type.type} value={type.type}>
                {type.icon} {type.labelEs}
              </option>
            ))}
          </select>
          <CaretDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400 pointer-events-none" />
        </div>

        {/* Priority Filter */}
        <div className="relative">
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value as MantenimientoPriority | 'all')}
            className="appearance-none px-4 py-2.5 pr-10 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-[#1a1a1c] text-neutral-900 dark:text-white text-sm cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
          >
            <option value="all">Todas las prioridades</option>
            <option value="emergency">Emergencia</option>
            <option value="high">Alta</option>
            <option value="medium">Media</option>
            <option value="low">Baja</option>
          </select>
          <CaretDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400 pointer-events-none" />
        </div>

        {/* Status Filter */}
        <div className="relative">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as MantenimientoStatus | 'all')}
            className="appearance-none px-4 py-2.5 pr-10 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-[#1a1a1c] text-neutral-900 dark:text-white text-sm cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
          >
            <option value="all">Todos los estados</option>
            <option value="reported">Reportadas</option>
            <option value="quoted">Cotizadas</option>
            <option value="approved">Aprobadas</option>
            <option value="in_progress">En progreso</option>
            <option value="completed">Completadas</option>
            <option value="cancelled">Canceladas</option>
          </select>
          <CaretDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400 pointer-events-none" />
        </div>

        {/* Sort */}
        <div className="relative">
          <select
            value={`${sortField}-${sortDirection}`}
            onChange={(e) => {
              const [field, dir] = e.target.value.split('-') as [SortField, SortDirection];
              setSortField(field);
              setSortDirection(dir);
            }}
            className="appearance-none px-4 py-2.5 pr-10 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-[#1a1a1c] text-neutral-900 dark:text-white text-sm cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
          >
            <option value="priority-asc">Prioridad (mayor primero)</option>
            <option value="priority-desc">Prioridad (menor primero)</option>
            <option value="createdAt-desc">Más recientes</option>
            <option value="createdAt-asc">Más antiguas</option>
            <option value="status-asc">Estado</option>
          </select>
          <CaretDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400 pointer-events-none" />
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Maintenance Card Component
// ============================================================================

interface MantenimientoCardProps {
  solicitud: SolicitudMantenimiento;
  onViewDetails?: () => void;
  onAddQuote?: () => void;
  onApproveQuote?: (quoteId: string) => void;
  onComplete?: () => void;
  onCancel?: () => void;
}

function MantenimientoCard({
  solicitud,
  onViewDetails,
  onAddQuote,
  onApproveQuote,
  onComplete,
  onCancel,
}: MantenimientoCardProps) {
  const [showMenu, setShowMenu] = useState(false);

  const typeInfo = getMantenimientoTypeInfo(solicitud.type);
  const TypeIcon = TYPE_ICONS[solicitud.type];
  const priorityStyle = PRIORITY_STYLES[solicitud.priority];
  const statusStyle = STATUS_STYLES[solicitud.status];
  const StatusIcon = statusStyle.icon;
  const daysSince = getDaysSinceCreated(solicitud.createdAt);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="p-5 rounded-xl bg-card border border-border hover:border-foreground/20 transition-all"
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-4">
        <div className="flex items-center gap-3">
          <div
            className={cn(
              'w-10 h-10 rounded-lg flex items-center justify-center',
              solicitud.priority === 'emergency' ? 'bg-red-100 dark:bg-red-900/30' : 'bg-indigo-100 dark:bg-indigo-900/30'
            )}
          >
            <TypeIcon
              className={cn(
                'w-5 h-5',
                solicitud.priority === 'emergency' ? 'text-red-600 dark:text-red-400' : 'text-indigo-600 dark:text-indigo-400'
              )}
            />
          </div>
          <div>
            <h3 className="font-semibold text-foreground line-clamp-1">
              {solicitud.title}
            </h3>
            <p className="text-sm text-muted-foreground">
              {typeInfo?.labelEs || solicitud.type}
            </p>
          </div>
        </div>

        {/* Actions Menu */}
        <div className="relative">
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="p-2 rounded-lg hover:bg-muted transition-colors"
          >
            <DotsThree className="w-5 h-5 text-muted-foreground" weight="bold" />
          </button>

          <AnimatePresence>
            {showMenu && (
              <>
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="absolute right-0 top-full mt-1 w-48 p-2 rounded-xl border border-border bg-card shadow-xl z-20"
                >
                  <button
                    onClick={() => {
                      onViewDetails?.();
                      setShowMenu(false);
                    }}
                    className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left text-foreground hover:bg-muted transition-colors"
                  >
                    <Eye className="w-4 h-4" />
                    <span className="text-sm">Ver detalle</span>
                  </button>

                  {solicitud.status === 'reported' && onAddQuote && (
                    <button
                      onClick={() => {
                        onAddQuote();
                        setShowMenu(false);
                      }}
                      className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                    >
                      <CurrencyCircleDollar className="w-4 h-4" />
                      <span className="text-sm">Agregar cotizacion</span>
                    </button>
                  )}

                  {solicitud.status === 'quoted' && solicitud.quotes.length > 0 && onApproveQuote && (
                    <button
                      onClick={() => {
                        onApproveQuote(solicitud.quotes[0].id);
                        setShowMenu(false);
                      }}
                      className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left text-lime-600 dark:text-lime-400 hover:bg-lime-50 dark:hover:bg-lime-900/20 transition-colors"
                    >
                      <Check className="w-4 h-4" />
                      <span className="text-sm">Aprobar cotizacion</span>
                    </button>
                  )}

                  {solicitud.status === 'in_progress' && onComplete && (
                    <button
                      onClick={() => {
                        onComplete();
                        setShowMenu(false);
                      }}
                      className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-colors"
                    >
                      <CheckCircle className="w-4 h-4" />
                      <span className="text-sm">Marcar completada</span>
                    </button>
                  )}

                  {!['completed', 'cancelled'].includes(solicitud.status) && onCancel && (
                    <button
                      onClick={() => {
                        onCancel();
                        setShowMenu(false);
                      }}
                      className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                    >
                      <X className="w-4 h-4" />
                      <span className="text-sm">Cancelar solicitud</span>
                    </button>
                  )}
                </motion.div>
                <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
              </>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Property Info */}
      <div className="mb-4 p-3 rounded-lg bg-muted/50">
        <div className="flex items-center gap-2 mb-1">
          <HouseLine className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm font-medium text-foreground line-clamp-1">
            {solicitud.propertyTitle}
          </span>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <MapPin className="w-3 h-3" />
          <span className="line-clamp-1">{solicitud.propertyAddress}</span>
        </div>
        <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
          <User className="w-3 h-3" />
          <span>{solicitud.tenantName}</span>
        </div>
      </div>

      {/* Badges Row */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        {/* Priority Badge */}
        <span className={cn('inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium', priorityStyle.bg, priorityStyle.text)}>
          {solicitud.priority === 'emergency' && <Warning className="w-3 h-3 mr-1" weight="fill" />}
          {priorityStyle.label}
        </span>

        {/* Status Badge */}
        <span className={cn('inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium', statusStyle.bg, statusStyle.text)}>
          <StatusIcon className="w-3 h-3 mr-1" />
          {statusStyle.label}
        </span>
      </div>

      {/* Footer Info */}
      <div className="flex items-center justify-between text-sm text-muted-foreground border-t border-border pt-4">
        <div className="flex items-center gap-4">
          {/* Days since created */}
          <div className="flex items-center gap-1">
            <CalendarBlank className="w-4 h-4" />
            <span>
              {formatDate(solicitud.createdAt)} ({daysSince}d)
            </span>
          </div>

          {/* Quotes count */}
          {solicitud.quotes.length > 0 && (
            <div className="flex items-center gap-1">
              <CurrencyCircleDollar className="w-4 h-4" />
              <span>{solicitud.quotes.length} cotiz.</span>
            </div>
          )}

          {/* Photo indicator */}
          {solicitud.photoUrls && solicitud.photoUrls.length > 0 && (
            <div className="flex items-center gap-1">
              <Image className="w-4 h-4" />
              <span>{solicitud.photoUrls.length}</span>
            </div>
          )}
        </div>

        {/* Approved amount */}
        {solicitud.approvedAmount && (
          <span className="font-medium text-emerald-600 dark:text-emerald-400">
            {formatCurrency(solicitud.approvedAmount)}
          </span>
        )}
      </div>
    </motion.div>
  );
}

// ============================================================================
// Main MantenimientoList Component
// ============================================================================

export function MantenimientoList({
  data,
  onViewDetails,
  onAddQuote,
  onApproveQuote,
  onComplete,
  onCancel,
  minimal = false,
}: MantenimientoListProps) {
  // Filter State
  const [typeFilter, setTypeFilter] = useState<MantenimientoType | 'all'>('all');
  const [priorityFilter, setPriorityFilter] = useState<MantenimientoPriority | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<MantenimientoStatus | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<SortField>('priority');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  // Filter and Sort data
  const filteredData = useMemo(() => {
    let result = [...data];

    // Filter by type
    if (typeFilter !== 'all') {
      result = result.filter((item) => item.type === typeFilter);
    }

    // Filter by priority
    if (priorityFilter !== 'all') {
      result = result.filter((item) => item.priority === priorityFilter);
    }

    // Filter by status
    if (statusFilter !== 'all') {
      result = result.filter((item) => item.status === statusFilter);
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (item) =>
          item.propertyTitle.toLowerCase().includes(query) ||
          item.propertyAddress.toLowerCase().includes(query) ||
          item.title.toLowerCase().includes(query) ||
          item.tenantName.toLowerCase().includes(query)
      );
    }

    // Sort
    result.sort((a, b) => {
      switch (sortField) {
        case 'priority':
          const aPriorityIndex = PRIORITY_ORDER.indexOf(a.priority);
          const bPriorityIndex = PRIORITY_ORDER.indexOf(b.priority);
          return sortDirection === 'asc'
            ? aPriorityIndex - bPriorityIndex
            : bPriorityIndex - aPriorityIndex;

        case 'createdAt':
          const aTime = new Date(a.createdAt).getTime();
          const bTime = new Date(b.createdAt).getTime();
          return sortDirection === 'asc' ? aTime - bTime : bTime - aTime;

        case 'status':
          const aStatusIndex = STATUS_ORDER.indexOf(a.status);
          const bStatusIndex = STATUS_ORDER.indexOf(b.status);
          return sortDirection === 'asc'
            ? aStatusIndex - bStatusIndex
            : bStatusIndex - aStatusIndex;

        default:
          return 0;
      }
    });

    return result;
  }, [data, typeFilter, priorityFilter, statusFilter, searchQuery, sortField, sortDirection]);

  const hasFilters = typeFilter !== 'all' || priorityFilter !== 'all' || statusFilter !== 'all' || searchQuery.trim() !== '';

  return (
    <div className={minimal ? 'p-5' : 'space-y-6'}>
      {/* Summary Cards - only show in full mode */}
      {!minimal && <SummaryCards data={data} />}

      {/* Filters - only show in full mode */}
      {!minimal && (
        <FilterBar
          typeFilter={typeFilter}
          setTypeFilter={setTypeFilter}
          priorityFilter={priorityFilter}
          setPriorityFilter={setPriorityFilter}
          statusFilter={statusFilter}
          setStatusFilter={setStatusFilter}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          sortField={sortField}
          setSortField={setSortField}
          sortDirection={sortDirection}
          setSortDirection={setSortDirection}
        />
      )}

      {/* Results count - only show in full mode */}
      {!minimal && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-neutral-500 dark:text-neutral-400">
            {filteredData.length} de {data.length} solicitudes
            {hasFilters && ' (filtradas)'}
          </p>

          {hasFilters && (
            <button
              onClick={() => {
                setTypeFilter('all');
                setPriorityFilter('all');
                setStatusFilter('all');
                setSearchQuery('');
              }}
              className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline"
            >
              Limpiar filtros
            </button>
          )}
        </div>
      )}

      {/* Cards Grid */}
      {filteredData.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          <AnimatePresence mode="popLayout">
            {filteredData.map((solicitud) => (
              <MantenimientoCard
                key={solicitud.id}
                solicitud={solicitud}
                onViewDetails={() => onViewDetails?.(solicitud)}
                onAddQuote={() => onAddQuote?.(solicitud)}
                onApproveQuote={(quoteId) => onApproveQuote?.(solicitud, quoteId)}
                onComplete={() => onComplete?.(solicitud)}
                onCancel={() => onCancel?.(solicitud)}
              />
            ))}
          </AnimatePresence>
        </div>
      ) : (
        <div className="p-12 text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
            <Wrench className="w-8 h-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold text-foreground mb-1">
            No hay solicitudes para mostrar
          </h3>
          <p className="text-muted-foreground">
            {hasFilters ? 'Ajusta los filtros para ver más resultados' : 'No hay solicitudes de mantenimiento registradas'}
          </p>
        </div>
      )}
    </div>
  );
}

export default MantenimientoList;
