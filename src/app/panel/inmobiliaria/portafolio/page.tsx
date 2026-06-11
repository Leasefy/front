'use client';
import { PageGuard } from '@/components/auth/PageGuard';

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
  FileArrowUp,
} from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import { useI18n } from '@/lib/i18n';
import { useConsignaciones, usePropietarios, useAgentes } from '@/lib/hooks/useInmobiliaria';
import type { Consignacion } from '@/lib/types/inmobiliaria';
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
function PortafolioContent() {
  const { t } = useI18n();
  const router = useRouter();
  const { consignaciones: allConsignaciones } = useConsignaciones();
  const { propietarios: allPropietarios } = usePropietarios();
  const { agentes: allAgentes } = useAgentes();
  const [viewMode, setViewMode] = useState<ViewMode>('table');
  const [currentPage, setCurrentPage] = useState(1);
  const [filters, setFilters] = useState<ConsignacionFiltersState>({
    search: '',
    availability: 'available',
    agenteId: 'all',
    propietarioId: 'all',
    city: 'all',
    propertyType: 'all',
  });

  // Create lookup maps for propietarios and agentes
  const propietariosMap = useMemo(() => {
    const map: Record<string, string> = {};
    allPropietarios.forEach((p) => {
      map[p.id] = p.name;
    });
    return map;
  }, [allPropietarios]);

  const agentesMap = useMemo(() => {
    const map: Record<string, { name: string; avatar?: string }> = {};
    allAgentes.forEach((a) => {
      map[a.id] = { name: a.name, avatar: a.avatar };
    });
    return map;
  }, [allAgentes]);

  // Filter consignaciones
  const filteredConsignaciones = useMemo(() => {
    // Normalize backend values to lowercase to match frontend enum definitions
    const normalize = (val: string) => val?.toLowerCase() ?? '';

    let result = [...allConsignaciones];

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
      result = result.filter((c) => normalize(c.availability) === filters.availability);
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
      result = result.filter((c) => normalize(c.propertyCity) === normalize(filters.city));
    }

    // Property type filter
    if (filters.propertyType !== 'all') {
      result = result.filter((c) => normalize(c.propertyType) === normalize(filters.propertyType));
    }

    return result;
  }, [filters, allConsignaciones]);

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
  const handleView = useCallback((consignacion: Consignacion) => {
    router.push(`/panel/inmobiliaria/portafolio/${consignacion.id}`);
  }, [router]);

  const handleEdit = useCallback((consignacion: Consignacion) => {
    // Navigate to detail page where edit actions are available
    router.push(`/panel/inmobiliaria/portafolio/${consignacion.id}`);
  }, [router]);

  const handleNuevaConsignacion = useCallback(() => {
    router.push('/panel/inmobiliaria/portafolio/nuevo');
  }, [router]);

  const handleImportar = useCallback(() => {
    router.push('/panel/inmobiliaria/portafolio/importar');
  }, [router]);

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">
            {t('inmobiliaria.portafolio.title')}
          </h1>
          <p className="text-neutral-500 dark:text-neutral-400 mt-1">
            {t('inmobiliaria.portafolio.subtitle')}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Import Button */}
          <button
            onClick={handleImportar}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 font-medium text-sm hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
          >
            <FileArrowUp className="w-5 h-5" />
            {t('inmobiliaria.import.title')}
          </button>
          {/* Nueva consignación */}
          <button
            onClick={handleNuevaConsignacion}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#1A40FF] text-white font-medium hover:opacity-90 transition-colors"
          >
            <Plus className="w-5 h-5" />
            {t('inmobiliaria.portafolio.addProperty')}
          </button>
        </div>
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
                {t('inmobiliaria.portafolio.summary.totalProperties')}
              </p>
            </div>
          </div>
        </div>

        {/* Available */}
        <div className="p-4 rounded-xl border border-[#2C7A53]/30 dark:border-[#2C7A53]/40 bg-[#E8F3EC] dark:bg-[#2C7A53]/15">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#E8F3EC] dark:bg-[#2C7A53]/15 flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-[#2C7A53] dark:text-[#3EAE70]" />
            </div>
            <div>
              <p className="text-2xl font-bold text-[#2C7A53] dark:text-[#3EAE70]">
                {stats.available}
              </p>
              <p className="text-xs text-[#2C7A53] dark:text-[#3EAE70]">
                {t('inmobiliaria.portafolio.summary.available')}
              </p>
            </div>
          </div>
        </div>

        {/* Rented */}
        <div className="p-4 rounded-xl border border-[#1A40FF]/30 dark:border-[#1A40FF]/40 bg-[#EEF1FF] dark:bg-[#1A40FF]/15">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#EEF1FF] dark:bg-[#1A40FF]/15 flex items-center justify-center">
              <HouseSimple className="w-5 h-5 text-[#1A40FF] dark:text-[#5570FF]" />
            </div>
            <div>
              <p className="text-2xl font-bold text-[#1A40FF] dark:text-[#5570FF]">
                {stats.rented}
              </p>
              <p className="text-xs text-[#1A40FF] dark:text-[#5570FF]">
                {t('inmobiliaria.portafolio.summary.rented')}
              </p>
            </div>
          </div>
        </div>

        {/* In Process */}
        <div className="p-4 rounded-xl border border-[#B7791F]/30 dark:border-[#B7791F]/40 bg-[#F8F0E0] dark:bg-[#B7791F]/15">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#F8F0E0] dark:bg-[#B7791F]/15 flex items-center justify-center">
              <Timer className="w-5 h-5 text-[#B7791F] dark:text-[#D2992F]" />
            </div>
            <div>
              <p className="text-2xl font-bold text-[#B7791F] dark:text-[#D2992F]">
                {stats.inProcess}
              </p>
              <p className="text-xs text-[#B7791F] dark:text-[#D2992F]">
                {t('inmobiliaria.portafolio.stats.inProcess')}
              </p>
            </div>
          </div>
        </div>

        {/* Maintenance */}
        <div className="p-4 rounded-xl border border-[#C4503B]/30 dark:border-[#C4503B]/40 bg-[#F8EAE7] dark:bg-[#C4503B]/15 hidden sm:block">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#F8EAE7] dark:bg-[#C4503B]/15 flex items-center justify-center">
              <Wrench className="w-5 h-5 text-[#C4503B] dark:text-[#E0664D]" />
            </div>
            <div>
              <p className="text-2xl font-bold text-[#C4503B] dark:text-[#E0664D]">
                {stats.maintenance}
              </p>
              <p className="text-xs text-[#C4503B] dark:text-[#E0664D]">
                {t('inmobiliaria.portafolio.stats.maintenance')}
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
          <div className="flex items-center gap-2 p-1 rounded-md bg-muted">
            <button
              onClick={() => setViewMode('table')}
              className={cn(
                'flex items-center gap-2 px-3 py-1.5 rounded-sm text-sm font-medium transition-all',
                viewMode === 'table'
                  ? 'bg-background text-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <List className="w-4 h-4" />
              {t('inmobiliaria.portafolio.views.table')}
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={cn(
                'flex items-center gap-2 px-3 py-1.5 rounded-sm text-sm font-medium transition-all',
                viewMode === 'grid'
                  ? 'bg-background text-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <SquaresFour className="w-4 h-4" />
              {t('inmobiliaria.portafolio.views.cards')}
            </button>
          </div>
          <span className="text-sm text-muted-foreground tabular-nums">
            {t('inmobiliaria.portafolio.stats.propertyCount', { count: filteredConsignaciones.length })}
          </span>
        </div>

        {/* Filters - Second */}
        <ConsignacionFilters
          filters={filters}
          onFiltersChange={handleFiltersChange}
          consignaciones={allConsignaciones}
          propietarios={allPropietarios}
          agentes={allAgentes}
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
                'p-2 rounded-sm border border-border transition-all',
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
                    'w-8 h-8 rounded-sm text-sm font-medium transition-all',
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
                'p-2 rounded-sm border border-border transition-all',
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
  const { t } = useI18n();
  const router = useRouter();
  return (
    <div className="rounded-xl bg-neutral-50/80 dark:bg-white/[0.03] py-14 px-6 text-center">
      <div className="w-14 h-14 rounded-xl bg-white dark:bg-white/[0.06] flex items-center justify-center mx-auto mb-5">
        <Buildings className="w-6 h-6 text-neutral-400 dark:text-neutral-500" />
      </div>
      <h3 className="text-base font-semibold text-foreground mb-1.5">
        {t('inmobiliaria.portafolio.noProperties')}
      </h3>
      <p className="text-sm text-muted-foreground max-w-sm mx-auto leading-relaxed">
        {t('inmobiliaria.portafolio.noPropertiesDesc')}
      </p>
      <div className="flex items-center justify-center gap-3 mt-4">
        <button
          onClick={() => router.push('/panel/inmobiliaria/portafolio/importar')}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-400 font-medium text-sm hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
        >
          <FileArrowUp className="w-4 h-4" />
          {t('inmobiliaria.import.title')}
        </button>
      </div>
    </div>
  );
}

export default function PortafolioPage() {
  return (
    <PageGuard module="portafolio">
      <PortafolioContent />
    </PageGuard>
  );
}
