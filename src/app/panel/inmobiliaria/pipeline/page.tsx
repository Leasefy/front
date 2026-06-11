'use client';
import { PageGuard } from '@/components/auth/PageGuard';

import { useState, useMemo, useCallback, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Funnel,
  Users,
  CalendarCheck,
  CheckCircle,
  ChartLineUp,
} from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import { useI18n } from '@/lib/i18n';
import {
  usePipelineItems,
  useAgentes,
  useConsignaciones,
  pipelineApi,
} from '@/lib/hooks/useInmobiliaria';
import type { PipelineItem, PipelineStage } from '@/lib/types/inmobiliaria';
import {
  PipelineBoard,
  PipelineFilters,
  PipelineDetail,
  type PipelineFiltersState,
} from '@/components/inmobiliaria';
import { Spinner } from '@/components/ui/spinner';

/**
 * Pipeline Page - Kanban board for managing the rental pipeline
 * Route: /panel/inmobiliaria/pipeline
 */
function PipelineContent() {
  const { t } = useI18n();

  // Fetch data from API
  const { pipelineItems, isLoading, refetch } = usePipelineItems();
  const { agentes } = useAgentes();
  const { consignaciones } = useConsignaciones();

  // State for pipeline items (local copy for optimistic updates)
  const [items, setItems] = useState<PipelineItem[]>([]);

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

  // Sync API data to local state for optimistic updates
  useEffect(() => {
    if (pipelineItems.length > 0) {
      setItems(pipelineItems);
    }
  }, [pipelineItems]);

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
  const handleStageChange = useCallback(async (itemId: string, newStage: PipelineStage) => {
    // Optimistic update
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

    // Call API to persist the change
    try {
      await pipelineApi.moveStage(itemId, newStage);
      // Refetch to get the latest data
      refetch();
    } catch (error) {
      console.error('Error moving pipeline item:', error);
      // Revert optimistic update on error
      refetch();
    }
  }, [refetch]);

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

  // Show loading state
  if (isLoading) {
    return (
      <div className="p-4 md:p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">
            {t('inmobiliaria.pipeline.title')}
          </h1>
          <p className="text-neutral-500 dark:text-neutral-400 mt-1">
            {t('inmobiliaria.pipeline.subtitle')}
          </p>
        </div>
        <div className="flex items-center justify-center py-12">
          <Spinner size="lg" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">
          {t('inmobiliaria.pipeline.title')}
        </h1>
        <p className="text-neutral-500 dark:text-neutral-400 mt-1">
          {t('inmobiliaria.pipeline.subtitle')}
        </p>
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
                {t('inmobiliaria.pipeline.stats.totalLeads')}
              </p>
            </div>
          </div>
        </motion.div>

        {/* In Process */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="p-4 rounded-xl border border-[#1A40FF]/30 dark:border-[#1A40FF]/40 bg-[#EEF1FF] dark:bg-[#1A40FF]/15"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#EEF1FF] dark:bg-[#1A40FF]/15 flex items-center justify-center">
              <Funnel className="w-5 h-5 text-[#1A40FF] dark:text-[#5570FF]" />
            </div>
            <div>
              <p className="text-2xl font-bold text-[#1A40FF] dark:text-[#5570FF]">
                {stats.inProcess}
              </p>
              <p className="text-xs text-[#1A40FF] dark:text-[#5570FF]">
                {t('inmobiliaria.pipeline.stats.inProcess')}
              </p>
            </div>
          </div>
        </motion.div>

        {/* Closed This Month */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="p-4 rounded-xl border border-[#2C7A53]/30 dark:border-[#2C7A53]/40 bg-[#E8F3EC] dark:bg-[#2C7A53]/15"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#E8F3EC] dark:bg-[#2C7A53]/15 flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-[#2C7A53] dark:text-[#3EAE70]" />
            </div>
            <div>
              <p className="text-2xl font-bold text-[#2C7A53] dark:text-[#3EAE70]">
                {stats.completedThisMonth}
              </p>
              <p className="text-xs text-[#2C7A53] dark:text-[#3EAE70]">
                {t('inmobiliaria.pipeline.stats.closedThisMonth')}
              </p>
            </div>
          </div>
        </motion.div>

        {/* Conversion Rate */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="p-4 rounded-xl border border-[#B7791F]/30 dark:border-[#B7791F]/40 bg-[#F8F0E0] dark:bg-[#B7791F]/15"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#F8F0E0] dark:bg-[#B7791F]/15 flex items-center justify-center">
              <ChartLineUp className="w-5 h-5 text-[#B7791F] dark:text-[#D2992F]" />
            </div>
            <div>
              <p className="text-2xl font-bold text-[#B7791F] dark:text-[#D2992F]">
                {stats.conversionRate}%
              </p>
              <p className="text-xs text-[#B7791F] dark:text-[#D2992F]">
                {t('inmobiliaria.pipeline.stats.conversionRate')}
              </p>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Unified Data Card - Filters + Content */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="rounded-xl border border-border bg-card overflow-hidden"
      >
        {/* Header with count */}
        <div className="px-4 py-3 border-b border-border flex items-center justify-between bg-muted/20">
          <span className="text-sm font-medium text-foreground">
            {t('inmobiliaria.pipeline.board.title')}
          </span>
          <span className="text-sm text-muted-foreground tabular-nums">
            {t('inmobiliaria.pipeline.board.count', { filtered: filteredItems.length, total: items.length })}
          </span>
        </div>

        {/* Filters */}
        <PipelineFilters
          agentes={agentes}
          consignaciones={consignaciones}
          filters={filters}
          onFilterChange={handleFilterChange}
        />

        {/* Pipeline Board */}
        <div className="p-4">
          <PipelineBoard
            items={filteredItems}
            onItemClick={handleCardClick}
            onStageChange={handleStageChange}
          />
        </div>
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

export default function PipelinePage() {
  return (
    <PageGuard module="pipeline">
      <PipelineContent />
    </PageGuard>
  );
}
