'use client';
import { PageGuard } from '@/components/auth/PageGuard';

import { useState, useMemo, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useRouter, useSearchParams } from 'next/navigation';
import { useI18n } from '@/lib/i18n';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus,
  UserPlus,
  Sparkle,
  Buildings,
  CurrencyDollar,
  Warning,
  X,
  GridFour,
  List,
  CaretRight,
  Users,
  CaretLeft,
  CaretDoubleLeft,
  CaretDoubleRight,
} from '@phosphor-icons/react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useLenis } from '@/components/providers/SmoothScroll';
import {
  PropietarioCard,
  PropietarioTable,
  PropietarioForm,
} from '@/components/inmobiliaria';
import { TerceroIACapture } from '@/components/inmobiliaria/TerceroIACapture';
import { usePropietarios } from '@/lib/hooks/useInmobiliaria';
import type { Propietario, PropietarioFormData } from '@/lib/types/inmobiliaria';
import { formatCurrency } from '@/lib/types/inmobiliaria';

type ViewMode = 'table' | 'grid';

/**
 * Modal Component - Uses Portal to escape transformed parents
 */
function Modal({
  open,
  onClose,
  title,
  children,
  size = 'md',
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}) {
  const lenis = useLenis();
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);

  const sizeClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
  };

  // Mount check for portal
  useEffect(() => {
    setMounted(true);
  }, []);

  // Block body scroll and stop Lenis when modal is open
  useEffect(() => {
    if (open) {
      // Stop Lenis smooth scroll to allow native scroll in modal
      lenis.stop();

      const scrollY = window.scrollY;
      document.body.style.position = 'fixed';
      document.body.style.top = `-${scrollY}px`;
      document.body.style.left = '0';
      document.body.style.right = '0';
      document.body.style.overflow = 'hidden';
    }
    return () => {
      // Restart Lenis when modal closes
      lenis.start();

      const scrollY = document.body.style.top;
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.left = '';
      document.body.style.right = '';
      document.body.style.overflow = '';
      window.scrollTo(0, parseInt(scrollY || '0') * -1);
    };
  }, [open, lenis]);

  if (!open || !mounted) return null;

  const modalContent = (
    <div
      className="fixed inset-0 z-[9999]"
      style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0 }}
      data-lenis-prevent
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
        onClick={onClose}
      />
      {/* Modal container - centers the modal */}
      <div
        className="absolute inset-0 flex items-center justify-center p-4"
        style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
      >
        {/* Modal */}
        <div
          className={cn(
            'relative bg-white dark:bg-[#141416] w-full rounded-3xl shadow-2xl flex flex-col',
            sizeClasses[size]
          )}
          style={{ maxHeight: '85vh' }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header - fixed */}
          <div className="flex-shrink-0 flex items-center justify-between px-6 py-5 border-b border-neutral-100 dark:border-[#2a2a2c]">
            <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
              {title}
            </h3>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-neutral-100 dark:bg-[#1f1f21] flex items-center justify-center text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-200 dark:hover:bg-neutral-600 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          {/* Content - scrollable */}
          <div
            ref={scrollContainerRef}
            className="flex-1 overflow-y-auto overscroll-contain p-6"
            data-lenis-prevent
            style={{
              minHeight: 0,
              overscrollBehavior: 'contain',
              WebkitOverflowScrolling: 'touch',
              touchAction: 'pan-y',
            }}
            onWheel={(e) => e.stopPropagation()}
          >
            {children}
          </div>
        </div>
      </div>
    </div>
  );

  // Use portal to render at body level, escaping any transformed parents
  return createPortal(modalContent, document.body);
}

/**
 * Propietarios List Page
 * Main CRM view for managing property owners
 */
function PropietariosContent() {
  const { t } = useI18n();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { propietarios: apiPropietarios } = usePropietarios();
  const [propietarios, setPropietarios] = useState<Propietario[]>([]);

  // Sync with API data
  useEffect(() => {
    if (apiPropietarios.length > 0) setPropietarios(apiPropietarios);
  }, [apiPropietarios]);
  const [viewMode, setViewMode] = useState<ViewMode>('table');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showIACapture, setShowIACapture] = useState(false);
  const [editingPropietario, setEditingPropietario] = useState<Propietario | null>(null);
  const [deletingPropietario, setDeletingPropietario] = useState<Propietario | null>(null);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Open modal if ?nuevo=true query param is present
  useEffect(() => {
    if (searchParams.get('nuevo') === 'true') {
      setShowAddModal(true);
      // Clean up URL without reload
      router.replace('/panel/inmobiliaria/propietarios', { scroll: false });
    }
  }, [searchParams, router]);

  // Calculate summary stats
  const stats = useMemo(() => {
    const totalProperties = propietarios.reduce((sum, p) => sum + p.propertyCount, 0);
    const totalMonthlyRent = propietarios.reduce((sum, p) => sum + p.totalMonthlyRent, 0);
    const totalPending = propietarios.reduce((sum, p) => sum + p.pendingBalance, 0);
    const pendingCount = propietarios.filter((p) => p.pendingBalance > 0).length;

    return {
      totalPropietarios: propietarios.length,
      totalProperties,
      totalMonthlyRent,
      totalPending,
      pendingCount,
    };
  }, [propietarios]);

  // Pagination calculations
  const paginationData = useMemo(() => {
    const totalItems = propietarios.length;
    const totalPages = Math.ceil(totalItems / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedItems = propietarios.slice(startIndex, endIndex);

    return {
      totalItems,
      totalPages,
      startIndex,
      endIndex: Math.min(endIndex, totalItems),
      paginatedItems,
    };
  }, [propietarios, currentPage, itemsPerPage]);

  const handlePageChange = (page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, paginationData.totalPages)));
  };

  const handleView = (propietario: Propietario) => {
    router.push(`/panel/inmobiliaria/propietarios/${propietario.id}`);
  };

  const handleEdit = (propietario: Propietario) => {
    setEditingPropietario(propietario);
  };

  const handleDelete = (propietario: Propietario) => {
    setDeletingPropietario(propietario);
  };

  const handleConfirmDelete = () => {
    if (deletingPropietario) {
      setPropietarios((prev) => prev.filter((p) => p.id !== deletingPropietario.id));
      toast.success(t('inmobiliaria.propietarios.toasts.deleted', { name: deletingPropietario.name }));
      setDeletingPropietario(null);
    }
  };

  const handleCreateSubmit = async (data: PropietarioFormData) => {
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1000));

    const newPropietario: Propietario = {
      id: `prop-${Date.now()}`,
      ...data,
      bankAccount: {
        bank: data.bankCode as any,
        accountType: data.accountType as any,
        accountNumber: data.accountNumber,
        accountHolder: data.accountHolder,
      },
      propertyCount: 0,
      activeLeases: 0,
      totalMonthlyRent: 0,
      pendingBalance: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    setPropietarios((prev) => [newPropietario, ...prev]);
    toast.success(t('inmobiliaria.propietarios.toasts.created', { name: data.name }));
    setShowAddModal(false);
    setCurrentPage(1); // Reset to first page to show new item
  };

  const handleEditSubmit = async (data: PropietarioFormData) => {
    if (!editingPropietario) return;

    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1000));

    setPropietarios((prev) =>
      prev.map((p) =>
        p.id === editingPropietario.id
          ? {
              ...p,
              ...data,
              bankAccount: {
                bank: data.bankCode as any,
                accountType: data.accountType as any,
                accountNumber: data.accountNumber,
                accountHolder: data.accountHolder,
              },
              updatedAt: new Date().toISOString(),
            }
          : p
      )
    );
    toast.success(t('inmobiliaria.propietarios.toasts.updated'));
    setEditingPropietario(null);
  };

  const handleExport = () => {
    toast.info(t('inmobiliaria.propietarios.toasts.exporting'));
    // TODO: Implement export functionality
  };

  return (
    <div className="p-6 lg:p-8 space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-sm text-neutral-500 dark:text-neutral-400 mb-1">
            <span>{t('inmobiliaria.common.title')}</span>
            <CaretRight className="w-3 h-3" />
            <span className="text-neutral-900 dark:text-white">{t('inmobiliaria.propietarios.title')}</span>
          </div>
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">
            {t('inmobiliaria.propietarios.crmTitle')}
          </h1>
          <p className="text-neutral-500 dark:text-neutral-400 mt-1">
            {t('inmobiliaria.propietarios.subtitle')}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowIACapture(true)}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-border bg-card hover:bg-muted text-foreground uppercase tracking-wide font-mono font-medium transition-colors"
          >
            <Sparkle className="w-5 h-5 text-indigo-600 dark:text-indigo-400" weight="fill" />
            {t('inmobiliaria.propietarios.addOwnerIA')}
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white uppercase tracking-wide font-mono font-medium transition-colors"
          >
            <UserPlus className="w-5 h-5" />
            {t('inmobiliaria.propietarios.addOwner')}
          </button>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-[#1a1a1c]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center">
              <Users className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-neutral-900 dark:text-white">
                {stats.totalPropietarios}
              </p>
              <p className="text-sm text-neutral-500 dark:text-neutral-400">{t('inmobiliaria.propietarios.title')}</p>
            </div>
          </div>
        </div>

        <div className="p-4 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-[#1a1a1c]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
              <Buildings className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-neutral-900 dark:text-white">
                {stats.totalProperties}
              </p>
              <p className="text-sm text-neutral-500 dark:text-neutral-400">{t('inmobiliaria.propietarios.properties')}</p>
            </div>
          </div>
        </div>

        <div className="p-4 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-[#1a1a1c]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
              <CurrencyDollar className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-neutral-900 dark:text-white">
                {formatCurrency(stats.totalMonthlyRent)}
              </p>
              <p className="text-sm text-neutral-500 dark:text-neutral-400">{t('inmobiliaria.propietarios.monthlyRevenue')}</p>
            </div>
          </div>
        </div>

        <div className={cn(
          'p-4 rounded-xl border',
          stats.pendingCount > 0
            ? 'border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20'
            : 'border-neutral-200 dark:border-neutral-700 bg-white dark:bg-[#1a1a1c]'
        )}>
          <div className="flex items-center gap-3">
            <div className={cn(
              'w-10 h-10 rounded-xl flex items-center justify-center',
              stats.pendingCount > 0
                ? 'bg-amber-100 dark:bg-amber-900/30'
                : 'bg-emerald-100 dark:bg-emerald-900/30'
            )}>
              <Warning className={cn(
                'w-5 h-5',
                stats.pendingCount > 0
                  ? 'text-amber-600 dark:text-amber-400'
                  : 'text-emerald-600 dark:text-emerald-400'
              )} />
            </div>
            <div>
              <p className={cn(
                'text-2xl font-bold',
                stats.pendingCount > 0
                  ? 'text-amber-600 dark:text-amber-400'
                  : 'text-emerald-600 dark:text-emerald-400'
              )}>
                {stats.pendingCount > 0 ? formatCurrency(stats.totalPending) : t('inmobiliaria.propietarios.upToDate')}
              </p>
              <p className="text-sm text-neutral-500 dark:text-neutral-400">
                {stats.pendingCount > 0 ? t('inmobiliaria.propietarios.withBalance', { count: stats.pendingCount }) : t('inmobiliaria.propietarios.noPending')}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Unified Data Card - View Toggle + Content + Pagination */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="rounded-xl border border-border bg-card overflow-hidden"
      >
        {/* View Toggle Header */}
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
              {t('inmobiliaria.propietarios.viewTable')}
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
              <GridFour className="w-4 h-4" />
              {t('inmobiliaria.propietarios.viewCards')}
            </button>
          </div>
          <span className="text-sm text-muted-foreground tabular-nums">
            {paginationData.totalItems} {t('inmobiliaria.propietarios.title').toLowerCase()}
          </span>
        </div>

        {/* Content */}
        <div>
          {viewMode === 'table' ? (
            <PropietarioTable
              propietarios={paginationData.paginatedItems}
              onView={handleView}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onExport={handleExport}
            />
          ) : (
            <div className="p-4 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {paginationData.paginatedItems.map((propietario) => (
                <PropietarioCard
                  key={propietario.id}
                  propietario={propietario}
                  onClick={() => handleView(propietario)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Pagination Footer */}
        {paginationData.totalPages > 1 && (
          <div className="px-4 py-3 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-4 bg-muted/10">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>{t('inmobiliaria.propietarios.showing')}</span>
              <select
                value={itemsPerPage}
                onChange={(e) => {
                  setItemsPerPage(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="px-2 py-1 rounded-md border border-border bg-background text-foreground text-sm"
              >
                <option value={5}>5</option>
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
              </select>
              <span>{t('inmobiliaria.propietarios.ofTotal', { total: paginationData.totalItems })}</span>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={() => handlePageChange(1)}
                disabled={currentPage === 1}
                className="p-2 rounded-md border border-border text-muted-foreground hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <CaretDoubleLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className="p-2 rounded-md border border-border text-muted-foreground hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <CaretLeft className="w-4 h-4" />
              </button>

              <div className="flex items-center gap-1 px-2">
                {Array.from({ length: Math.min(5, paginationData.totalPages) }, (_, i) => {
                  let pageNum: number;
                  if (paginationData.totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (currentPage <= 3) {
                    pageNum = i + 1;
                  } else if (currentPage >= paginationData.totalPages - 2) {
                    pageNum = paginationData.totalPages - 4 + i;
                  } else {
                    pageNum = currentPage - 2 + i;
                  }
                  return (
                    <button
                      key={pageNum}
                      onClick={() => handlePageChange(pageNum)}
                      className={cn(
                        'w-8 h-8 rounded-md text-sm font-medium transition-colors',
                        currentPage === pageNum
                          ? 'bg-foreground text-background'
                          : 'text-muted-foreground hover:bg-muted'
                      )}
                    >
                      {pageNum}
                    </button>
                  );
                })}
              </div>

              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === paginationData.totalPages}
                className="p-2 rounded-md border border-border text-muted-foreground hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <CaretRight className="w-4 h-4" />
              </button>
              <button
                onClick={() => handlePageChange(paginationData.totalPages)}
                disabled={currentPage === paginationData.totalPages}
                className="p-2 rounded-md border border-border text-muted-foreground hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <CaretDoubleRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </motion.div>

      {/* Add Modal */}
      <Modal
        open={showAddModal}
        onClose={() => setShowAddModal(false)}
        title={t('inmobiliaria.propietarios.addOwner')}
        size="lg"
      >
        <PropietarioForm
          onSubmit={handleCreateSubmit}
          onCancel={() => setShowAddModal(false)}
          mode="create"
        />
      </Modal>

      {/* AI Capture Modal (v6-07 — additive; reuses the create handler) */}
      <Modal
        open={showIACapture}
        onClose={() => setShowIACapture(false)}
        title={t('inmobiliaria.propietarios.addOwnerIA')}
        size="lg"
      >
        <TerceroIACapture
          onCreated={handleCreateSubmit}
          onClose={() => setShowIACapture(false)}
        />
      </Modal>

      {/* Edit Modal */}
      <Modal
        open={!!editingPropietario}
        onClose={() => setEditingPropietario(null)}
        title={t('inmobiliaria.propietarios.editOwner')}
        size="lg"
      >
        {editingPropietario && (
          <PropietarioForm
            initialData={editingPropietario}
            onSubmit={handleEditSubmit}
            onCancel={() => setEditingPropietario(null)}
            mode="edit"
          />
        )}
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        open={!!deletingPropietario}
        onClose={() => setDeletingPropietario(null)}
        title={t('inmobiliaria.propietarios.deleteOwner')}
        size="sm"
      >
        {deletingPropietario && (
          <div className="space-y-4">
            <p className="text-neutral-600 dark:text-neutral-400">
              {t('inmobiliaria.propietarios.deleteConfirm', { name: deletingPropietario.name })}
            </p>
            {deletingPropietario.propertyCount > 0 && (
              <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
                <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400">
                  <Warning className="w-4 h-4" />
                  <p className="text-sm">
                    {t('inmobiliaria.propietarios.deleteWarningProperties', { count: deletingPropietario.propertyCount })}
                  </p>
                </div>
              </div>
            )}
            <div className="flex items-center gap-3 justify-end pt-4">
              <button
                onClick={() => setDeletingPropietario(null)}
                className="px-4 py-2 rounded-xl border border-neutral-200 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 font-medium hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors"
              >
                {t('inmobiliaria.common.cancel')}
              </button>
              <button
                onClick={handleConfirmDelete}
                className="px-4 py-2 rounded-xl bg-red-500 hover:bg-red-600 text-white uppercase tracking-wide font-mono font-medium transition-colors"
              >
                {t('inmobiliaria.common.delete')}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

export default function PropietariosPage() {
  return (
    <PageGuard module="propietarios">
      <PropietariosContent />
    </PageGuard>
  );
}
