'use client';

import { useState, useMemo, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  Funnel,
  Users,
  CalendarCheck,
  CheckCircle,
  ChartLineUp,
  ArrowsClockwise,
} from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import {
  MOCK_PIPELINE_ITEMS,
  MOCK_AGENTES,
  MOCK_CONSIGNACIONES,
} from '@/lib/data/mock-inmobiliaria';
import type { PipelineItem, PipelineStage } from '@/lib/types/inmobiliaria';
import {
  PipelineBoard,
  PipelineFilters,
  PipelineDetail,
  type PipelineFiltersState,
} from '@/components/inmobiliaria';

/**
 * Pipeline Page - Kanban board for managing the rental pipeline
 * Route: /panel/inmobiliaria/pipeline
 */
export default function PipelinePage() {
  // State for pipeline items (local copy for optimistic updates)
  const [items, setItems] = useState<PipelineItem[]>(MOCK_PIPELINE_ITEMS);

  // State for selected item (detail modal)
  const [selectedItem, setSelectedItem] = useState<PipelineItem | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  // State for filters
  const [filters, setFilters] = useState<PipelineFiltersState>({
    agenteId: undefined,
    consignacionId: undefined,
    dateFrom: undefined,
    dateTo: undefined,
    search: undefined,
  });

  // Calculate stats from all items
  const stats = useMemo(() => {
    const total = items.length;
    const inProcess = items.filter(
      (i) => !['completed', 'lost'].includes(i.stage)
    ).length;
    const completedThisMonth = items.filter((i) => {
      if (i.stage !== 'completed') return false;
      const date = new Date(i.updatedAt);
      const now = new Date();
      return (
        date.getMonth() === now.getMonth() &&
        date.getFullYear() === now.getFullYear()
      );
    }).length;

    // Calculate conversion rate (completed / (completed + lost))
    const completed = items.filter((i) => i.stage === 'completed').length;
    const lost = items.filter((i) => i.stage === 'lost').length;
    const conversionRate = completed + lost > 0
      ? Math.round((completed / (completed + lost)) * 100)
      : 0;

    return { total, inProcess, completedThisMonth, conversionRate };
  }, [items]);

  // Filter items based on current filters
  const filteredItems = useMemo(() => {
    let result = [...items];

    // Filter by agente
    if (filters.agenteId) {
      result = result.filter((i) => i.agenteId === filters.agenteId);
    }

    // Filter by consignacion (property)
    if (filters.consignacionId) {
      result = result.filter((i) => i.consignacionId === filters.consignacionId);
    }

    // Filter by date range (createdAt)
    if (filters.dateFrom) {
      const from = new Date(filters.dateFrom);
      result = result.filter((i) => new Date(i.createdAt) >= from);
    }
    if (filters.dateTo) {
      const to = new Date(filters.dateTo);
      to.setHours(23, 59, 59, 999);
      result = result.filter((i) => new Date(i.createdAt) <= to);
    }

    // Filter by search (candidate name, email, property title)
    if (filters.search) {
      const query = filters.search.toLowerCase();
      result = result.filter(
        (i) =>
          i.candidateName.toLowerCase().includes(query) ||
          i.candidateEmail.toLowerCase().includes(query) ||
          i.propertyTitle.toLowerCase().includes(query)
      );
    }

    return result;
  }, [items, filters]);

  // Handle card click - open detail modal
  const handleCardClick = useCallback((item: PipelineItem) => {
    setSelectedItem(item);
    setIsDetailOpen(true);
  }, []);

  // Handle stage change from drag-and-drop or detail modal
  const handleStageChange = useCallback((itemId: string, newStage: PipelineStage) => {
    setItems((prev) =>
      prev.map((item) =>
        item.id === itemId
          ? {
              ...item,
              stage: newStage,
              enteredStageAt: new Date().toISOString(),
              daysInStage: 0,
              updatedAt: new Date().toISOString(),
            }
          : item
      )
    );

    // Also update selected item if it's the one being changed
    setSelectedItem((prev) =>
      prev?.id === itemId
        ? {
            ...prev,
            stage: newStage,
            enteredStageAt: new Date().toISOString(),
            daysInStage: 0,
            updatedAt: new Date().toISOString(),
          }
        : prev
    );
  }, []);

  // Handle filter change
  const handleFilterChange = useCallback((newFilters: PipelineFiltersState) => {
    setFilters(newFilters);
  }, []);

  // Handle detail modal close
  const handleDetailClose = useCallback(() => {
    setIsDetailOpen(false);
    // Delay clearing selected item for smooth animation
    setTimeout(() => setSelectedItem(null), 300);
  }, []);

  // Refresh data (mock - just resets to original)
  const handleRefresh = useCallback(() => {
    setItems([...MOCK_PIPELINE_ITEMS]);
  }, []);

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">
            Pipeline de Arriendos
          </h1>
          <p className="text-neutral-500 dark:text-neutral-400 mt-1">
            Gestiona el proceso de arriendo de principio a fin
          </p>
        </div>
        <button
          onClick={handleRefresh}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-[#1a1a1c] text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors font-medium"
        >
          <ArrowsClockwise className="w-5 h-5" />
          Actualizar
        </button>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* Total Leads */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="p-4 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-[#1a1a1c]"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center">
              <Users className="w-5 h-5 text-neutral-600 dark:text-neutral-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-neutral-900 dark:text-white">
                {stats.total}
              </p>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                Total leads
              </p>
            </div>
          </div>
        </motion.div>

        {/* In Process */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="p-4 rounded-xl border border-indigo-200 dark:border-indigo-800 bg-indigo-50 dark:bg-indigo-900/20"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center">
              <Funnel className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-indigo-700 dark:text-indigo-400">
                {stats.inProcess}
              </p>
              <p className="text-xs text-indigo-600 dark:text-indigo-500">
                En proceso
              </p>
            </div>
          </div>
        </motion.div>

        {/* Closed This Month */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="p-4 rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/20"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-400">
                {stats.completedThisMonth}
              </p>
              <p className="text-xs text-emerald-600 dark:text-emerald-500">
                Cerrados este mes
              </p>
            </div>
          </div>
        </motion.div>

        {/* Conversion Rate */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="p-4 rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
              <ChartLineUp className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-amber-700 dark:text-amber-400">
                {stats.conversionRate}%
              </p>
              <p className="text-xs text-amber-600 dark:text-amber-500">
                Tasa de conversion
              </p>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Filters */}
      <PipelineFilters
        agentes={MOCK_AGENTES}
        consignaciones={MOCK_CONSIGNACIONES}
        filters={filters}
        onFilterChange={handleFilterChange}
      />

      {/* Results Count */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-neutral-500 dark:text-neutral-400">
          Mostrando {filteredItems.length} de {items.length} leads
        </p>
        {filteredItems.length !== items.length && (
          <button
            onClick={() => setFilters({
              agenteId: undefined,
              consignacionId: undefined,
              dateFrom: undefined,
              dateTo: undefined,
              search: undefined,
            })}
            className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline"
          >
            Limpiar filtros
          </button>
        )}
      </div>

      {/* Pipeline Board */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
      >
        <PipelineBoard
          items={filteredItems}
          onItemClick={handleCardClick}
          onStageChange={handleStageChange}
        />
      </motion.div>

      {/* Detail Modal */}
      <PipelineDetail
        isOpen={isDetailOpen}
        onClose={handleDetailClose}
        item={selectedItem}
        onStageChange={handleStageChange}
      />
    </div>
  );
}
