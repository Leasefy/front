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
  UserCircle,
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
import { propietariosApi } from '@/lib/api/inmobiliaria.service';
import type { Propietario, PropietarioFormData } from '@/lib/types/inmobiliaria';
import { formatCurrency } from '@/lib/types/inmobiliaria';
import { Button } from '@/components/ui/button';
import { TablePagination } from '@/components/ui/pagination';
import { EstadoDeDatos } from '@/components/estado/EstadoDeDatos';
import { SinDatos } from '@/components/estado/SinDatos';
import { SegmentedControl, KpiCard, IconButton } from '@leasefy/cadence';

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
      // Modal layer = z-[300] (misma capa que <Dialog>/<Sheet>). Antes z-[9999],
      // que tapaba cualquier AlertDialog disparado desde adentro. Ver DESIGN.md §17.
      className="fixed inset-0 z-[300]"
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
            'relative bg-card w-full rounded-[20px] flex flex-col',
            sizeClasses[size]
          )}
          style={{ maxHeight: '85vh' }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header - fixed */}
          <div className="flex-shrink-0 flex items-center justify-between px-6 py-5 border-b border-border">
            <h3 className="text-base font-semibold text-foreground">
              {title}
            </h3>
            <IconButton
              onClick={onClose}
              aria-label="Cerrar"
              variant="ghost"
              size="md"
              className="bg-muted hover:bg-muted/70"
              icon={<X className="w-4 h-4" />}
            />
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
  // ⚠️ Tomar SÓLO los datos era el defecto: `useApiData` captura el fallo en su
  // estado y no lo relanza, así que una petición muerta llegaba acá como lista
  // vacía y la pantalla decía «todavía no tenés propietarios» — afirmando algo
  // que nadie verificó. `errorCrudo` es el error entero, que es lo que
  // `FalloDeCarga` necesita para saber si reintentar sirve.
  const {
    propietarios: apiPropietarios,
    isLoading: cargandoPropietarios,
    errorCrudo: errorPropietarios,
    refetch: recargarPropietarios,
  } = usePropietarios();
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
  const [isDeleting, setIsDeleting] = useState(false);

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

  const handleConfirmDelete = async () => {
    if (!deletingPropietario) return;

    setIsDeleting(true);
    try {
      await propietariosApi.delete(deletingPropietario.id);
      // Only remove from local state once the backend confirms deletion
      setPropietarios((prev) => prev.filter((p) => p.id !== deletingPropietario.id));
      toast.success(t('inmobiliaria.propietarios.toasts.deleted', { name: deletingPropietario.name }));
      setDeletingPropietario(null);
    } catch (err) {
      console.error('Delete propietario error:', err);
      toast.error(t('inmobiliaria.propietarios.toasts.deleteError'));
      // Keep the item and the modal open so the user can retry
    } finally {
      setIsDeleting(false);
    }
  };

  const handleCreateSubmit = async (data: PropietarioFormData) => {
    try {
      const created = await propietariosApi.create(data);
      // Use the persisted object returned by the backend (real id, computed fields)
      setPropietarios((prev) => [created, ...prev]);
      toast.success(t('inmobiliaria.propietarios.toasts.created', { name: created.name }));
      setShowAddModal(false);
      setCurrentPage(1); // Reset to first page to show new item
    } catch (err) {
      console.error('Create propietario error:', err);
      toast.error(t('inmobiliaria.propietarios.toasts.createError'));
      // Re-throw so the form keeps the modal open and resets its submitting state
      throw err;
    }
  };

  const handleEditSubmit = async (data: PropietarioFormData) => {
    if (!editingPropietario) return;

    try {
      const updated = await propietariosApi.update(editingPropietario.id, data);
      // Replace with the persisted object returned by the backend
      setPropietarios((prev) =>
        prev.map((p) => (p.id === editingPropietario.id ? updated : p))
      );
      toast.success(t('inmobiliaria.propietarios.toasts.updated'));
      setEditingPropietario(null);
    } catch (err) {
      console.error('Update propietario error:', err);
      toast.error(t('inmobiliaria.propietarios.toasts.updateError'));
      // Re-throw so the form keeps the modal open and resets its submitting state
      throw err;
    }
  };

  const handleExport = () => {
    toast.info(t('inmobiliaria.propietarios.toasts.exporting'));
    // TODO: Implement export functionality
  };

  return (
    <div className="p-6 lg:p-8 space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>{t('inmobiliaria.common.title')}</span>
            <CaretRight className="w-3 h-3" />
            <span className="text-foreground">{t('inmobiliaria.propietarios.title')}</span>
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            {t('inmobiliaria.propietarios.crmTitle')}
          </h1>
          <p className="text-sm text-muted-foreground max-w-2xl">
            {t('inmobiliaria.propietarios.subtitle')}
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button variant="secondary" hideArrow onClick={() => setShowIACapture(true)}>
            <Sparkle className="w-5 h-5 text-primary" weight="fill" />
            {t('inmobiliaria.propietarios.addOwnerIA')}
          </Button>
          <Button hideArrow onClick={() => setShowAddModal(true)}>
            <UserPlus className="w-5 h-5" />
            {t('inmobiliaria.propietarios.addOwner')}
          </Button>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label={t('inmobiliaria.propietarios.title')}
          value={String(stats.totalPropietarios)}
          icon={<Users />}
        />
        <KpiCard
          label={t('inmobiliaria.propietarios.properties')}
          value={String(stats.totalProperties)}
          icon={<Buildings />}
        />
        <KpiCard
          label={t('inmobiliaria.propietarios.monthlyRevenue')}
          value={formatCurrency(stats.totalMonthlyRent)}
          icon={<CurrencyDollar />}
        />
        <KpiCard
          label={
            stats.pendingCount > 0
              ? t('inmobiliaria.propietarios.withBalance', { count: stats.pendingCount })
              : t('inmobiliaria.propietarios.noPending')
          }
          value={stats.pendingCount > 0 ? formatCurrency(stats.totalPending) : t('inmobiliaria.propietarios.upToDate')}
          icon={stats.pendingCount > 0 ? <Warning /> : <CurrencyDollar />}
          deltaDirection={stats.pendingCount > 0 ? 'down' : 'up'}
        />
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
          <SegmentedControl<ViewMode>
            value={viewMode}
            onChange={setViewMode}
            aria-label={t('inmobiliaria.propietarios.viewTable')}
            options={[
              {
                value: 'table',
                label: (
                  <span className="flex items-center gap-2">
                    <List className="w-4 h-4" />
                    {t('inmobiliaria.propietarios.viewTable')}
                  </span>
                ),
                ariaLabel: t('inmobiliaria.propietarios.viewTable'),
              },
              {
                value: 'grid',
                label: (
                  <span className="flex items-center gap-2">
                    <GridFour className="w-4 h-4" />
                    {t('inmobiliaria.propietarios.viewCards')}
                  </span>
                ),
                ariaLabel: t('inmobiliaria.propietarios.viewCards'),
              },
            ]}
          />
          <span className="text-sm text-muted-foreground tabular-nums">
            {paginationData.totalItems} {t('inmobiliaria.propietarios.title').toLowerCase()}
          </span>
        </div>

        {/* Content */}
        <div>
          <EstadoDeDatos
            cargando={cargandoPropietarios}
            error={errorPropietarios}
            queEs="los propietarios"
            onReintentar={recargarPropietarios}
          >
            {paginationData.totalItems === 0 ? (
              /* Sin filtros en esta pantalla: un vacío acá es siempre «todavía
                 no hay ninguno», y lo útil es crear el primero. */
              <SinDatos
                queSon="propietarios"
                icono={UserCircle}
                descripcion="Registrá al dueño de un inmueble para poder consignarlo y liquidarle sus pagos."
                crear={{ label: 'Agregar propietario', onClick: () => setShowAddModal(true) }}
              />
            ) : viewMode === 'table' ? (
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
          </EstadoDeDatos>
        </div>

        {/* Pagination Footer */}
        {paginationData.totalPages > 1 && (
          <div className="px-4 py-3 border-t border-border bg-muted/10">
            <TablePagination
              total={paginationData.totalItems}
              page={currentPage}
              pageSize={itemsPerPage}
              pageSizeOptions={[5, 10, 20, 50]}
              onPageChange={handlePageChange}
              onPageSizeChange={(size) => {
                setItemsPerPage(size);
                setCurrentPage(1);
              }}
            />
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
            <p className="text-sm text-muted-foreground">
              {t('inmobiliaria.propietarios.deleteConfirm', { name: deletingPropietario.name })}
            </p>
            {deletingPropietario.propertyCount > 0 && (
              <div className="p-3 rounded-xl bg-warning-soft border border-warning/30">
                <div className="flex items-center gap-2 text-warning">
                  <Warning className="w-4 h-4" />
                  <p className="text-sm">
                    {t('inmobiliaria.propietarios.deleteWarningProperties', { count: deletingPropietario.propertyCount })}
                  </p>
                </div>
              </div>
            )}
            <div className="flex items-center gap-3 justify-end pt-4">
              <Button
                variant="secondary"
                hideArrow
                onClick={() => setDeletingPropietario(null)}
                disabled={isDeleting}
              >
                {t('inmobiliaria.common.cancel')}
              </Button>
              <Button
                variant="destructive"
                hideArrow
                onClick={handleConfirmDelete}
                isLoading={isDeleting}
                disabled={isDeleting}
              >
                {t('inmobiliaria.common.delete')}
              </Button>
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
