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
import { KpiCard } from '@leasefy/cadence';

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
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            {t('inmobiliaria.pipeline.title')}
          </h1>
          <p className="text-sm text-muted-foreground max-w-2xl">
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
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          {t('inmobiliaria.pipeline.title')}
        </h1>
        <p className="text-sm text-muted-foreground max-w-2xl">
          {t('inmobiliaria.pipeline.subtitle')}
        </p>
      </div>

      {/* Stats Row */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-2 sm:grid-cols-4 gap-3"
      >
        <KpiCard
          label={t('inmobiliaria.pipeline.stats.totalLeads')}
          value={String(stats.total)}
          icon={<Users />}
        />
        <KpiCard
          label={t('inmobiliaria.pipeline.stats.inProcess')}
          value={String(stats.inProcess)}
          icon={<Funnel />}
        />
        <KpiCard
          label={t('inmobiliaria.pipeline.stats.closedThisMonth')}
          value={String(stats.completedThisMonth)}
          icon={<CheckCircle />}
        />
        <KpiCard
          label={t('inmobiliaria.pipeline.stats.conversionRate')}
          value={`${stats.conversionRate}%`}
          icon={<ChartLineUp />}
        />
      </motion.div>

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
