'use client';
import { PageGuard } from '@/components/auth/PageGuard';

import { useState, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useI18n } from '@/lib/i18n';
import { usePermissions } from '@/lib/hooks/usePermissions';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import {
  Users,
  SquaresFour,
  List,
  Plus,
  CheckCircle,
  ChartLineUp,
  CurrencyDollar,
  CaretLeft,
  CaretRight,
  Trophy,
  ChartBar,
  UsersThree,
} from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import { useAgentes } from '@/lib/hooks/useInmobiliaria';
import { formatCurrency } from '@/lib/types/inmobiliaria';
import { AgenteCard } from '@/components/inmobiliaria/AgenteCard';
import { AgenteTable } from '@/components/inmobiliaria/AgenteTable';
import { AgenteFilters, AgenteFiltersState } from '@/components/inmobiliaria/AgenteFilters';
import { AgenteLeaderboard } from '@/components/inmobiliaria/AgenteLeaderboard';
import { AgenteWorkloadChart } from '@/components/inmobiliaria/AgenteWorkloadChart';
import { AgenteFormModal } from '@/components/inmobiliaria/AgenteFormModal';
import { inmobiliariaConfigApi } from '@/lib/api/inmobiliaria.service';
import type { UserInvite } from '@/lib/types/inmobiliaria';

type ViewMode = 'grid' | 'table';
type TabType = 'equipo' | 'ranking' | 'workload';

const ITEMS_PER_PAGE = 6;

/**
 * Agentes Page - Main view for managing all real estate agents
 * Route: /panel/inmobiliaria/agentes
 */
function AgentesContent() {
  const { t } = useI18n();
  const router = useRouter();
  const { agentes: allAgentes } = useAgentes();
  const { canAccess } = usePermissions();

  const TABS: { id: TabType; label: string; icon: React.ElementType }[] = useMemo(() => [
    { id: 'equipo', label: t('inmobiliaria.agentes.tabs.team'), icon: UsersThree },
    { id: 'ranking', label: t('inmobiliaria.agentes.leaderboard'), icon: Trophy },
    { id: 'workload', label: t('inmobiliaria.agentes.tabs.workload'), icon: ChartBar },
  ], [t]);
  const [activeTab, setActiveTab] = useState<TabType>('equipo');
  const [viewMode, setViewMode] = useState<ViewMode>('table');
  const [currentPage, setCurrentPage] = useState(1);
  const [filters, setFilters] = useState<AgenteFiltersState>({
    search: '',
    role: 'all',
    status: 'all',
    sortBy: 'name',
  });
  const [showAddModal, setShowAddModal] = useState(false);

  // Filter agentes
  const filteredAgentes = useMemo(() => {
    let result = [...allAgentes];

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
  }, [filters, allAgentes]);

  // Calculate stats from all agentes (not filtered)
  const stats = useMemo(() => {
    const total = allAgentes.length;
    const active = allAgentes.filter((a) => a.status === 'active').length;
    const closedThisMonth = allAgentes.reduce((sum, a) => sum + a.metrics.closedThisMonth, 0);
    const commissionsThisMonth = allAgentes.reduce((sum, a) => sum + a.metrics.commissionsThisMonth, 0);

    return { total, active, closedThisMonth, commissionsThisMonth };
  }, [allAgentes]);

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
  const handleView = useCallback((agente: typeof allAgentes[0]) => {
    router.push(`/panel/inmobiliaria/agentes/${agente.id}`);
  }, [router]);

  const handleEdit = useCallback((agente: typeof allAgentes[0]) => {
    toast.info(t('inmobiliaria.agentes.toasts.editTitle', { name: agente.name }), {
      description: t('inmobiliaria.agentes.toasts.editDesc'),
    });
  }, [t]);

  const handleNuevoAgente = useCallback(() => {
    setShowAddModal(true);
  }, []);

  const handleCreateAgente = useCallback(async (data: UserInvite) => {
    try {
      await inmobiliariaConfigApi.inviteUser(data);
      toast.success(t('inmobiliaria.agentes.toasts.created'), {
        description: t('inmobiliaria.agentes.toasts.createdDesc', { name: data.name }),
      });
    } catch (error) {
      toast.error('Error al invitar al agente', {
        description: error instanceof Error ? error.message : undefined,
      });
    }
  }, [t]);

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">
            {t('inmobiliaria.agentes.teamTitle')}
          </h1>
          <p className="text-neutral-500 dark:text-neutral-400 mt-1">
            {t('inmobiliaria.agentes.subtitle')}
          </p>
        </div>
        {canAccess('agentes', 'create') && (
          <button
            onClick={handleNuevoAgente}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#1A40FF] text-white font-medium hover:opacity-90 transition-colors"
          >
            <Plus className="w-5 h-5" />
            {t('inmobiliaria.agentes.addAgent')}
          </button>
        )}
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
                {t('inmobiliaria.common.total')}
              </p>
            </div>
          </div>
        </div>

        {/* Active Agents */}
        <div className="p-4 rounded-xl border border-[#2C7A53]/30 dark:border-[#2C7A53]/40 bg-[#E8F3EC] dark:bg-[#2C7A53]/15">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#E8F3EC] dark:bg-[#2C7A53]/15 flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-[#2C7A53] dark:text-[#3EAE70]" />
            </div>
            <div>
              <p className="text-2xl font-bold text-[#2C7A53] dark:text-[#3EAE70]">
                {stats.active}
              </p>
              <p className="text-xs text-[#2C7A53] dark:text-[#3EAE70]">
                {t('inmobiliaria.agentes.active')}
              </p>
            </div>
          </div>
        </div>

        {/* Closings This Month */}
        <div className="p-4 rounded-xl border border-[#1A40FF]/30 dark:border-[#1A40FF]/40 bg-[#EEF1FF] dark:bg-[#1A40FF]/15">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#EEF1FF] dark:bg-[#1A40FF]/15 flex items-center justify-center">
              <ChartLineUp className="w-5 h-5 text-[#1A40FF] dark:text-[#5570FF]" />
            </div>
            <div>
              <p className="text-2xl font-bold text-[#1A40FF] dark:text-[#5570FF]">
                {stats.closedThisMonth}
              </p>
              <p className="text-xs text-[#1A40FF] dark:text-[#5570FF]">
                {t('inmobiliaria.agentes.closingsMonth')}
              </p>
            </div>
          </div>
        </div>

        {/* Commissions This Month */}
        <div className="p-4 rounded-xl border border-[#B7791F]/30 dark:border-[#B7791F]/40 bg-[#F8F0E0] dark:bg-[#B7791F]/15">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#F8F0E0] dark:bg-[#B7791F]/15 flex items-center justify-center">
              <CurrencyDollar className="w-5 h-5 text-[#B7791F] dark:text-[#D2992F]" />
            </div>
            <div>
              <p className="text-lg font-bold text-[#B7791F] dark:text-[#D2992F] truncate">
                {formatCurrency(stats.commissionsThisMonth)}
              </p>
              <p className="text-xs text-[#B7791F] dark:text-[#D2992F]">
                {t('inmobiliaria.agentes.commissionsMonth')}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Tab Content - Tabs integrated into card */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        {/* Tab Navigation - Inside the card */}
        <div className="px-4 py-3 border-b border-border bg-muted/20">
          <div className="flex items-center gap-1 p-1 rounded-md bg-muted w-fit">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    'flex items-center gap-2 px-4 py-2 rounded-sm text-sm font-medium transition-all',
                    activeTab === tab.id
                      ? 'bg-background text-foreground'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  <Icon className="w-4 h-4" weight={activeTab === tab.id ? 'fill' : 'regular'} />
                  <span className="hidden sm:inline">{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Tab Content */}
        <AnimatePresence mode="wait">
          {activeTab === 'equipo' && (
            <motion.div
              key="equipo"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              {/* View Toggle Header */}
              <div className="px-4 py-3 border-b border-border flex items-center justify-between">
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
                    {t('inmobiliaria.agentes.viewTable')}
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
                    {t('inmobiliaria.agentes.viewCards')}
                  </button>
                </div>
                <span className="text-sm text-muted-foreground tabular-nums">
                  {filteredAgentes.length} {t('inmobiliaria.agentes.title').toLowerCase()}
                </span>
              </div>

              {/* Filters - Second */}
              <AgenteFilters
                filters={filters}
                onFiltersChange={handleFiltersChange}
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
                      {paginatedAgentes.length > 0 ? (
                        <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
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
                      {paginatedAgentes.length > 0 ? (
                        <AgenteTable
                          agentes={paginatedAgentes}
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
          )}

          {activeTab === 'ranking' && (
            <motion.div
              key="ranking"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="p-4"
            >
              <AgenteLeaderboard agentes={allAgentes} />
            </motion.div>
          )}

          {activeTab === 'workload' && (
            <motion.div
              key="workload"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="p-4"
            >
              <AgenteWorkloadChart agentes={allAgentes} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Add Agent Modal */}
      <AgenteFormModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSubmit={handleCreateAgente}
      />
    </div>
  );
}

// Empty State Component
function EmptyState() {
  const { t } = useI18n();
  return (
    <div className="rounded-xl bg-neutral-50/80 dark:bg-white/[0.03] py-14 px-6 text-center">
      <div className="w-14 h-14 rounded-xl bg-white dark:bg-white/[0.06] flex items-center justify-center mx-auto mb-5">
        <Users className="w-6 h-6 text-neutral-400 dark:text-neutral-500" />
      </div>
      <h3 className="text-base font-semibold text-foreground mb-1.5">
        {t('inmobiliaria.agentes.noAgents')}
      </h3>
      <p className="text-sm text-muted-foreground max-w-sm mx-auto leading-relaxed">
        {t('inmobiliaria.agentes.noAgentsDesc')}
      </p>
    </div>
  );
}

export default function AgentesPage() {
  return (
    <PageGuard module="agentes">
      <AgentesContent />
    </PageGuard>
  );
}
