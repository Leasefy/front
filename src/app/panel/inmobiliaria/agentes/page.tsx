'use client';

import { useState, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import {
  Users,
  SquaresFour,
  List,
  Plus,
  CheckCircle,
  Clock,
  ChartLineUp,
  CurrencyDollar,
  CaretLeft,
  CaretRight,
} from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import { MOCK_AGENTES } from '@/lib/data/mock-inmobiliaria';
import { formatCurrency } from '@/lib/types/inmobiliaria';
import { AgenteCard } from '@/components/inmobiliaria/AgenteCard';
import { AgenteTable } from '@/components/inmobiliaria/AgenteTable';
import { AgenteFilters, AgenteFiltersState } from '@/components/inmobiliaria/AgenteFilters';

type ViewMode = 'grid' | 'table';

const ITEMS_PER_PAGE = 12;

/**
 * Agentes Page - Main view for managing all real estate agents
 * Route: /panel/inmobiliaria/agentes
 */
export default function AgentesPage() {
  const router = useRouter();
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [currentPage, setCurrentPage] = useState(1);
  const [filters, setFilters] = useState<AgenteFiltersState>({
    search: '',
    role: 'all',
    status: 'all',
    sortBy: 'name',
  });

  // Filter agentes
  const filteredAgentes = useMemo(() => {
    let result = [...MOCK_AGENTES];

    // Search filter
    if (filters.search) {
      const query = filters.search.toLowerCase();
      result = result.filter(
        (a) =>
          a.name.toLowerCase().includes(query) ||
          a.email.toLowerCase().includes(query)
      );
    }

    // Role filter
    if (filters.role !== 'all') {
      result = result.filter((a) => a.role === filters.role);
    }

    // Status filter
    if (filters.status !== 'all') {
      result = result.filter((a) => a.status === filters.status);
    }

    // Sort
    result.sort((a, b) => {
      switch (filters.sortBy) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'closedThisMonth':
          return b.metrics.closedThisMonth - a.metrics.closedThisMonth;
        case 'commissionsThisMonth':
          return b.metrics.commissionsThisMonth - a.metrics.commissionsThisMonth;
        default:
          return 0;
      }
    });

    return result;
  }, [filters]);

  // Calculate stats from all agentes (not filtered)
  const stats = useMemo(() => {
    const total = MOCK_AGENTES.length;
    const active = MOCK_AGENTES.filter((a) => a.status === 'active').length;
    const closedThisMonth = MOCK_AGENTES.reduce((sum, a) => sum + a.metrics.closedThisMonth, 0);
    const commissionsThisMonth = MOCK_AGENTES.reduce((sum, a) => sum + a.metrics.commissionsThisMonth, 0);

    return { total, active, closedThisMonth, commissionsThisMonth };
  }, []);

  // Pagination
  const totalPages = Math.ceil(filteredAgentes.length / ITEMS_PER_PAGE);
  const paginatedAgentes = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    const end = start + ITEMS_PER_PAGE;
    return filteredAgentes.slice(start, end);
  }, [filteredAgentes, currentPage]);

  // Reset page when filters change
  const handleFiltersChange = useCallback((newFilters: AgenteFiltersState) => {
    setFilters(newFilters);
    setCurrentPage(1);
  }, []);

  // Handlers
  const handleView = useCallback((agente: typeof MOCK_AGENTES[0]) => {
    // Detail page in next plan (04-02)
    toast.info(`Ver detalle de ${agente.name}`, {
      description: 'Pagina de detalle disponible en la proxima version',
    });
  }, []);

  const handleEdit = useCallback((agente: typeof MOCK_AGENTES[0]) => {
    toast.info(`Editar ${agente.name}`, {
      description: 'Formulario de edicion disponible en la proxima version',
    });
  }, []);

  const handleNuevoAgente = useCallback(() => {
    toast.info('Nuevo Agente', {
      description: 'Formulario de creacion disponible en la proxima version',
    });
  }, []);

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">
            Equipo de Agentes
          </h1>
          <p className="text-neutral-500 dark:text-neutral-400 mt-1">
            Gestiona tu equipo de agentes inmobiliarios
          </p>
        </div>
        <button
          onClick={handleNuevoAgente}
          disabled
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-neutral-300 dark:bg-neutral-700 text-neutral-500 dark:text-neutral-400 font-medium cursor-not-allowed opacity-60"
          title="Disponible proximamente"
        >
          <Plus className="w-5 h-5" />
          Nuevo Agente
        </button>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* Total Agents */}
        <div className="p-4 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-[#1a1a1c]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center">
              <Users className="w-5 h-5 text-neutral-600 dark:text-neutral-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-neutral-900 dark:text-white">
                {stats.total}
              </p>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                Total
              </p>
            </div>
          </div>
        </div>

        {/* Active Agents */}
        <div className="p-4 rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-400">
                {stats.active}
              </p>
              <p className="text-xs text-emerald-600 dark:text-emerald-500">
                Activos
              </p>
            </div>
          </div>
        </div>

        {/* Closings This Month */}
        <div className="p-4 rounded-xl border border-indigo-200 dark:border-indigo-800 bg-indigo-50 dark:bg-indigo-900/20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center">
              <ChartLineUp className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-indigo-700 dark:text-indigo-400">
                {stats.closedThisMonth}
              </p>
              <p className="text-xs text-indigo-600 dark:text-indigo-500">
                Cierres mes
              </p>
            </div>
          </div>
        </div>

        {/* Commissions This Month */}
        <div className="p-4 rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
              <CurrencyDollar className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <p className="text-lg font-bold text-amber-700 dark:text-amber-400 truncate">
                {formatCurrency(stats.commissionsThisMonth)}
              </p>
              <p className="text-xs text-amber-600 dark:text-amber-500">
                Comisiones mes
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <AgenteFilters
        filters={filters}
        onFiltersChange={handleFiltersChange}
        agentes={MOCK_AGENTES}
      />

      {/* View Toggle and Results Count */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-neutral-500 dark:text-neutral-400">
          {filteredAgentes.length} de {MOCK_AGENTES.length} agentes
        </p>
        <div className="flex items-center gap-1 p-1 rounded-xl bg-neutral-100 dark:bg-neutral-800">
          <button
            onClick={() => setViewMode('grid')}
            className={cn(
              'p-2 rounded-lg transition-all',
              viewMode === 'grid'
                ? 'bg-white dark:bg-[#1a1a1c] text-indigo-600 dark:text-indigo-400 shadow-sm'
                : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200'
            )}
            title="Vista de cuadricula"
          >
            <SquaresFour className="w-5 h-5" />
          </button>
          <button
            onClick={() => setViewMode('table')}
            className={cn(
              'p-2 rounded-lg transition-all',
              viewMode === 'table'
                ? 'bg-white dark:bg-[#1a1a1c] text-indigo-600 dark:text-indigo-400 shadow-sm'
                : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200'
            )}
            title="Vista de tabla"
          >
            <List className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Content */}
      <AnimatePresence mode="wait">
        {viewMode === 'grid' ? (
          <motion.div
            key="grid"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            {paginatedAgentes.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {paginatedAgentes.map((agente) => (
                  <AgenteCard
                    key={agente.id}
                    agente={agente}
                    onClick={() => handleView(agente)}
                    onView={() => handleView(agente)}
                    onEdit={() => handleEdit(agente)}
                  />
                ))}
              </div>
            ) : (
              <EmptyState />
            )}
          </motion.div>
        ) : (
          <motion.div
            key="table"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <AgenteTable
              agentes={paginatedAgentes}
              onView={handleView}
              onEdit={handleEdit}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-4">
          <button
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className={cn(
              'p-2 rounded-lg transition-all',
              currentPage === 1
                ? 'text-neutral-300 dark:text-neutral-600 cursor-not-allowed'
                : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800'
            )}
          >
            <CaretLeft className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-1">
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
              <button
                key={page}
                onClick={() => setCurrentPage(page)}
                className={cn(
                  'w-9 h-9 rounded-lg text-sm font-medium transition-all',
                  page === currentPage
                    ? 'bg-indigo-500 text-white'
                    : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800'
                )}
              >
                {page}
              </button>
            ))}
          </div>

          <button
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className={cn(
              'p-2 rounded-lg transition-all',
              currentPage === totalPages
                ? 'text-neutral-300 dark:text-neutral-600 cursor-not-allowed'
                : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800'
            )}
          >
            <CaretRight className="w-5 h-5" />
          </button>
        </div>
      )}
    </div>
  );
}

// Empty State Component
function EmptyState() {
  return (
    <div className="p-12 text-center rounded-2xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-[#1a1a1c]">
      <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center">
        <Users className="w-8 h-8 text-neutral-400" />
      </div>
      <h3 className="text-lg font-semibold text-neutral-900 dark:text-white mb-1">
        No se encontraron agentes
      </h3>
      <p className="text-neutral-500 dark:text-neutral-400 max-w-md mx-auto">
        Ajusta los filtros de busqueda o agrega un nuevo agente para comenzar
      </p>
    </div>
  );
}
