'use client';

import { useState, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Buildings,
  SquaresFour,
  List,
  Plus,
  CheckCircle,
  HouseSimple,
  Timer,
  Wrench,
  CaretLeft,
  CaretRight,
} from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import {
  MOCK_CONSIGNACIONES,
  MOCK_PROPIETARIOS,
  MOCK_AGENTES,
} from '@/lib/data/mock-inmobiliaria';
import { formatCurrency } from '@/lib/types/inmobiliaria';
import { ConsignacionCard } from '@/components/inmobiliaria/ConsignacionCard';
import { ConsignacionTable } from '@/components/inmobiliaria/ConsignacionTable';
import { ConsignacionFilters, ConsignacionFiltersState } from '@/components/inmobiliaria/ConsignacionFilters';

type ViewMode = 'grid' | 'table';

const ITEMS_PER_PAGE = 12;

/**
 * Portafolio Page - Main view for managing all consigned properties
 * Route: /panel/inmobiliaria/portafolio
 */
export default function PortafolioPage() {
  const router = useRouter();
  const [viewMode, setViewMode] = useState<ViewMode>('table');
  const [currentPage, setCurrentPage] = useState(1);
  const [filters, setFilters] = useState<ConsignacionFiltersState>({
    search: '',
    availability: 'all',
    agenteId: 'all',
    propietarioId: 'all',
    city: 'all',
    propertyType: 'all',
  });

  // Create lookup maps for propietarios and agentes
  const propietariosMap = useMemo(() => {
    const map: Record<string, string> = {};
    MOCK_PROPIETARIOS.forEach((p) => {
      map[p.id] = p.name;
    });
    return map;
  }, []);

  const agentesMap = useMemo(() => {
    const map: Record<string, { name: string; avatar?: string }> = {};
    MOCK_AGENTES.forEach((a) => {
      map[a.id] = { name: a.name, avatar: a.avatar };
    });
    return map;
  }, []);

  // Filter consignaciones
  const filteredConsignaciones = useMemo(() => {
    let result = [...MOCK_CONSIGNACIONES];

    // Search filter
    if (filters.search) {
      const query = filters.search.toLowerCase();
      result = result.filter(
        (c) =>
          c.propertyTitle.toLowerCase().includes(query) ||
          c.propertyAddress.toLowerCase().includes(query)
      );
    }

    // Availability filter
    if (filters.availability !== 'all') {
      result = result.filter((c) => c.availability === filters.availability);
    }

    // Agente filter
    if (filters.agenteId !== 'all') {
      result = result.filter((c) => c.agenteId === filters.agenteId);
    }

    // Propietario filter
    if (filters.propietarioId !== 'all') {
      result = result.filter((c) => c.propietarioId === filters.propietarioId);
    }

    // City filter
    if (filters.city !== 'all') {
      result = result.filter((c) => c.propertyCity === filters.city);
    }

    // Property type filter
    if (filters.propertyType !== 'all') {
      result = result.filter((c) => c.propertyType === filters.propertyType);
    }

    return result;
  }, [filters]);

  // Calculate stats from filtered data
  const stats = useMemo(() => {
    const total = filteredConsignaciones.length;
    const available = filteredConsignaciones.filter((c) => c.availability === 'available').length;
    const rented = filteredConsignaciones.filter((c) => c.availability === 'rented').length;
    const inProcess = filteredConsignaciones.filter((c) => c.availability === 'in_process').length;
    const maintenance = filteredConsignaciones.filter((c) => c.availability === 'maintenance').length;
    const totalMonthlyRent = filteredConsignaciones.reduce((sum, c) => sum + c.monthlyRent, 0);

    return { total, available, rented, inProcess, maintenance, totalMonthlyRent };
  }, [filteredConsignaciones]);

  // Pagination
  const totalPages = Math.ceil(filteredConsignaciones.length / ITEMS_PER_PAGE);
  const paginatedConsignaciones = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    const end = start + ITEMS_PER_PAGE;
    return filteredConsignaciones.slice(start, end);
  }, [filteredConsignaciones, currentPage]);

  // Reset page when filters change
  const handleFiltersChange = useCallback((newFilters: ConsignacionFiltersState) => {
    setFilters(newFilters);
    setCurrentPage(1);
  }, []);

  // Handlers
  const handleView = useCallback((consignacion: typeof MOCK_CONSIGNACIONES[0]) => {
    router.push(`/panel/inmobiliaria/portafolio/${consignacion.id}`);
  }, [router]);

  const handleEdit = useCallback((consignacion: typeof MOCK_CONSIGNACIONES[0]) => {
    // Navigate to detail page where edit actions are available
    router.push(`/panel/inmobiliaria/portafolio/${consignacion.id}`);
  }, [router]);

  const handleNuevaConsignacion = useCallback(() => {
    router.push('/panel/inmobiliaria/portafolio/nuevo');
  }, [router]);

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">
            Portafolio
          </h1>
          <p className="text-neutral-500 dark:text-neutral-400 mt-1">
            Gestiona todas las propiedades consignadas
          </p>
        </div>
        <button
          onClick={handleNuevaConsignacion}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-500 text-white font-medium hover:bg-indigo-600 transition-colors shadow-lg shadow-indigo-500/25"
        >
          <Plus className="w-5 h-5" />
          Nueva Consignacion
        </button>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {/* Total */}
        <div className="p-4 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-[#1a1a1c]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center">
              <Buildings className="w-5 h-5 text-neutral-600 dark:text-neutral-400" />
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

        {/* Available */}
        <div className="p-4 rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-400">
                {stats.available}
              </p>
              <p className="text-xs text-emerald-600 dark:text-emerald-500">
                Disponibles
              </p>
            </div>
          </div>
        </div>

        {/* Rented */}
        <div className="p-4 rounded-xl border border-indigo-200 dark:border-indigo-800 bg-indigo-50 dark:bg-indigo-900/20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center">
              <HouseSimple className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-indigo-700 dark:text-indigo-400">
                {stats.rented}
              </p>
              <p className="text-xs text-indigo-600 dark:text-indigo-500">
                Arrendadas
              </p>
            </div>
          </div>
        </div>

        {/* In Process */}
        <div className="p-4 rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
              <Timer className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-amber-700 dark:text-amber-400">
                {stats.inProcess}
              </p>
              <p className="text-xs text-amber-600 dark:text-amber-500">
                En proceso
              </p>
            </div>
          </div>
        </div>

        {/* Maintenance */}
        <div className="p-4 rounded-xl border border-rose-200 dark:border-rose-800 bg-rose-50 dark:bg-rose-900/20 hidden sm:block">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-100 dark:bg-rose-900/30 flex items-center justify-center">
              <Wrench className="w-5 h-5 text-rose-600 dark:text-rose-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-rose-700 dark:text-rose-400">
                {stats.maintenance}
              </p>
              <p className="text-xs text-rose-600 dark:text-rose-500">
                Mantenimiento
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Unified Data Card - View Toggle + Filters + Content + Pagination */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="rounded-xl border border-border bg-card overflow-hidden"
      >
        {/* View Toggle Header - First */}
        <div className="px-4 py-3 border-b border-border flex items-center justify-between bg-muted/20">
          <div className="flex items-center gap-2 p-1 rounded-lg bg-muted">
            <button
              onClick={() => setViewMode('table')}
              className={cn(
                'flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all',
                viewMode === 'table'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <List className="w-4 h-4" />
              Tabla
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={cn(
                'flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all',
                viewMode === 'grid'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <SquaresFour className="w-4 h-4" />
              Cards
            </button>
          </div>
          <span className="text-sm text-muted-foreground tabular-nums">
            {filteredConsignaciones.length} propiedades
          </span>
        </div>

        {/* Filters - Second */}
        <ConsignacionFilters
          filters={filters}
          onFiltersChange={handleFiltersChange}
          consignaciones={MOCK_CONSIGNACIONES}
          propietarios={MOCK_PROPIETARIOS}
          agentes={MOCK_AGENTES}
        />

        {/* Content */}
        <div>
          <AnimatePresence mode="wait">
            {viewMode === 'grid' ? (
              <motion.div
                key="grid"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
              >
                {paginatedConsignaciones.length > 0 ? (
                  <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {paginatedConsignaciones.map((consignacion) => (
                      <ConsignacionCard
                        key={consignacion.id}
                        consignacion={consignacion}
                        propietarioName={propietariosMap[consignacion.propietarioId]}
                        agenteName={agentesMap[consignacion.agenteId]?.name}
                        agenteAvatar={agentesMap[consignacion.agenteId]?.avatar}
                        onClick={() => handleView(consignacion)}
                        onView={() => handleView(consignacion)}
                        onEdit={() => handleEdit(consignacion)}
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
                {paginatedConsignaciones.length > 0 ? (
                  <ConsignacionTable
                    consignaciones={paginatedConsignaciones}
                    propietariosMap={propietariosMap}
                    agentesMap={agentesMap}
                    onView={handleView}
                    onEdit={handleEdit}
                  />
                ) : (
                  <EmptyState />
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Pagination Footer */}
        {totalPages > 1 && (
          <div className="px-4 py-3 border-t border-border flex items-center justify-center gap-2 bg-muted/10">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className={cn(
                'p-2 rounded-md border border-border transition-all',
                currentPage === 1
                  ? 'text-muted-foreground/40 cursor-not-allowed'
                  : 'text-muted-foreground hover:bg-muted'
              )}
            >
              <CaretLeft className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-1 px-2">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                <button
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  className={cn(
                    'w-8 h-8 rounded-md text-sm font-medium transition-all',
                    page === currentPage
                      ? 'bg-foreground text-background'
                      : 'text-muted-foreground hover:bg-muted'
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
                'p-2 rounded-md border border-border transition-all',
                currentPage === totalPages
                  ? 'text-muted-foreground/40 cursor-not-allowed'
                  : 'text-muted-foreground hover:bg-muted'
              )}
            >
              <CaretRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </motion.div>
    </div>
  );
}

// Empty State Component
function EmptyState() {
  return (
    <div className="p-12 text-center">
      <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
        <Buildings className="w-8 h-8 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-semibold text-foreground mb-1">
        No se encontraron propiedades
      </h3>
      <p className="text-muted-foreground max-w-md mx-auto">
        Ajusta los filtros de búsqueda o agrega una nueva consignación para comenzar
      </p>
    </div>
  );
}
