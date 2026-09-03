'use client';
import { AsignarAgente } from '@/components/inmobiliaria/AsignarAgente';
import { CandidatosDelInmueble } from '@/components/inmobiliaria/CandidatosDelInmueble';
import { PageGuard } from '@/components/auth/PageGuard';

import { useState, useCallback, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { CaretLeft, Buildings, X, CalendarPlus } from '@phosphor-icons/react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useI18n } from '@/lib/i18n';
import { Button, EmptyState } from '@/components/ui';
import { FotosDelInmueble } from '@/components/inmobiliaria/FotosDelInmueble';
import { UbicacionDelInmueble } from '@/components/inmobiliaria/inmueble/UbicacionDelInmueble';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useLenis } from '@/components/providers/SmoothScroll';
import { consignacionesApi } from '@/lib/api/inmobiliaria.service';
import {
  useConsignacion,
  usePropietario,
  useAgenteDeConsignacion,
} from '@/lib/hooks/useInmobiliaria';
import { useProperty } from '@/lib/hooks/useProperties';
import type { PropertyAvailability, ConsignacionFormData, Consignacion, InventoryItem } from '@/lib/types/inmobiliaria';

// Components
import { ConsignacionHeader } from '@/components/inmobiliaria/ConsignacionHeader';
import {
  PropertyInfoSection,
  PropietarioSection,
  AgenteSection,
  CurrentLeaseSection,
  DocumentsSection,
} from '@/components/inmobiliaria/ConsignacionDetailSections';
import { CambiarPropietarioDialog } from '@/components/inmobiliaria/CambiarPropietarioDialog';
import { ActaEntregaView } from '@/components/inmobiliaria/ActaEntregaView';
import { ConsignacionTimeline } from '@/components/inmobiliaria/ConsignacionTimeline';
import { ConsignacionEditForm } from '@/components/inmobiliaria/ConsignacionEditForm';
import {
  InventarioItemDialog,
  type ItemDeInventarioBorrador,
} from '@/components/inmobiliaria/InventarioItemDialog';
import { PedirCitaModal } from '@/components/inmobiliaria/agenda/PedirCitaModal';

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

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (open) {
      lenis.stop();
      const scrollY = window.scrollY;
      document.body.style.position = 'fixed';
      document.body.style.top = `-${scrollY}px`;
      document.body.style.left = '0';
      document.body.style.right = '0';
      document.body.style.overflow = 'hidden';
    }
    return () => {
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
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
        onClick={onClose}
      />
      <div
        className="absolute inset-0 flex items-center justify-center p-4"
        style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
      >
        <div
          className={cn(
            'relative bg-card border border-border w-full rounded-[20px] flex flex-col',
            sizeClasses[size]
          )}
          style={{ maxHeight: '85vh' }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex-shrink-0 flex items-center justify-between px-6 py-5 border-b border-border">
            <h3 className="text-base font-semibold text-fg">
              {title}
            </h3>
            <Button variant="ghost" size="icon" hideArrow onClick={onClose} aria-label="Cerrar">
              <X className="w-4 h-4" />
            </Button>
          </div>
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

  return createPortal(modalContent, document.body);
}

/**
 * Consignacion Detail Page
 * Route: /panel/inmobiliaria/inmuebles/[id]
 */
function ConsignacionDetailContent() {
  const { t } = useI18n();
  const params = useParams();
  const router = useRouter();
  const inventoryRef = useRef<HTMLDivElement>(null);

  const consignacionId = params.id as string;

  // Edit modal state
  const [showEditModal, setShowEditModal] = useState(false);
  const [consignacionData, setConsignacionData] = useState<Consignacion | null>(null);
  // Inventario: `undefined` = diálogo cerrado; `null` = agregar; ítem = editar.
  const [itemDeInventario, setItemDeInventario] = useState<InventoryItem | null | undefined>(undefined);
  const [guardandoInventario, setGuardandoInventario] = useState(false);
  const [showTerminateDialog, setShowTerminateDialog] = useState(false);
  const [isTerminating, setIsTerminating] = useState(false);
  const [showCitaModal, setShowCitaModal] = useState(false);
  const [showAsignarAgente, setShowAsignarAgente] = useState(false);
  const [showCambiarPropietario, setShowCambiarPropietario] = useState(false);

  // Fetch data
  const { consignacion: fetchedConsignacion } = useConsignacion(consignacionId);

  // Use local state for consignacion to allow updates after edit
  const consignacion = consignacionData || fetchedConsignacion;

  const { propietario } = usePropietario(consignacion?.propietarioId);
  // Por `userId` o por `id`: el back guarda el del usuario y `getById`
  // esperaba el del miembro, así que nunca resolvía. Ver el hook.
  const { agente } = useAgenteDeConsignacion(consignacion?.agenteId);
  // The photos live on the Property entity, not on the consignación
  // (consignacion.propertyThumbnail is never populated by the back — see
  // ledger §2.1). A failed/loading fetch just leaves `property` unset, which
  // ConsignacionHeader already renders as its placeholder icon.
  const {
    property,
    isLoading: cargandoProperty,
    refetch: refetchProperty,
  } = useProperty(consignacion?.propertyId);

  // Handlers
  const handleEdit = useCallback(() => {
    setShowEditModal(true);
  }, []);

  const handleEditSubmit = useCallback(async (data: ConsignacionFormData) => {
    if (!consignacion) return;

    try {
      // PUT /inmobiliaria/consignaciones/:id — the service maps enum casing
      // and strips agent reassignment (see ConsignacionUpdateInput).
      let updated = await consignacionesApi.update(consignacion.id, {
        propertyTitle: data.propertyTitle,
        propertyAddress: data.propertyAddress,
        propertyCity: data.propertyCity,
        propertyZone: data.propertyZone,
        propertyType: data.propertyType,
        monthlyRent: data.monthlyRent,
        adminFee: data.adminFee,
        commissionPercent: data.commissionPercent,
        minimumTerm: data.minimumTerm,
      });

      // El agente va por su propia ruta (`assign-agent` exige el User id):
      // el formulario ya trae ese id como valor del selector. Sólo si cambió.
      if (data.agenteId && data.agenteId !== consignacion.agenteId) {
        updated = await consignacionesApi.assignAgent(consignacion.id, data.agenteId);
      }

      setConsignacionData(updated);
      setShowEditModal(false);
      toast.success(t('inmobiliaria.portafolio.detail.toasts.propertyUpdated'), {
        description: t('inmobiliaria.portafolio.detail.toasts.changesSaved'),
      });
    } catch (err) {
      // Keep the modal open so the user can retry without losing edits.
      toast.error(t('inmobiliaria.portafolio.detail.toasts.updateError'), {
        description: err instanceof Error ? err.message : undefined,
      });
    }
  }, [consignacion, t]);

  // The header disables the button whenever propertyId is missing, but the
  // guard is repeated here in case that ever stops being true — a click that
  // opens a blank/broken tab is worse than one that silently does nothing.
  const handleViewPortal = useCallback(() => {
    if (!consignacion?.propertyId) return;
    window.open(`/propiedades/${consignacion.propertyId}`, '_blank', 'noopener,noreferrer');
  }, [consignacion]);

  const handleChangeStatus = useCallback(async (newStatus: PropertyAvailability) => {
    if (!consignacion) return;
    const statusLabels: Record<PropertyAvailability, string> = {
      available: t('inmobiliaria.portafolio.status.available'),
      rented: t('inmobiliaria.portafolio.status.rented'),
      in_process: t('inmobiliaria.portafolio.detail.statusLabels.inProcess'),
      maintenance: t('inmobiliaria.portafolio.status.maintenance'),
    };
    try {
      // PUT /inmobiliaria/consignaciones/:id { availability } (service uppercases)
      const updated = await consignacionesApi.update(consignacion.id, {
        availability: newStatus,
      });
      setConsignacionData(updated);
      toast.success(t('inmobiliaria.portafolio.detail.toasts.statusChanged', { status: statusLabels[newStatus] }), {
        description: t('inmobiliaria.portafolio.detail.toasts.changesSaved'),
      });
    } catch (err) {
      toast.error(t('inmobiliaria.portafolio.detail.toasts.statusChangeError'), {
        description: err instanceof Error ? err.message : undefined,
      });
    }
  }, [consignacion, t]);

  // Opens the destructive confirmation; the PUT happens in handleTerminateConfirm.
  const handleTerminate = useCallback(() => {
    setShowTerminateDialog(true);
  }, []);

  const handleTerminateConfirm = useCallback(async () => {
    if (!consignacion || isTerminating) return;
    setIsTerminating(true);
    try {
      // PUT /inmobiliaria/consignaciones/:id { status: TERMINATED }
      const updated = await consignacionesApi.update(consignacion.id, {
        status: 'terminated',
      });
      setConsignacionData(updated);
      setShowTerminateDialog(false);
      toast.success(t('inmobiliaria.portafolio.detail.toasts.terminated'));
    } catch (err) {
      toast.error(t('inmobiliaria.portafolio.detail.toasts.terminateError'), {
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setIsTerminating(false);
    }
  }, [consignacion, isTerminating, t]);

  const handleRenew = useCallback(() => {
    toast.info(t('inmobiliaria.portafolio.detail.toasts.renewSoon'), {
      description: t('inmobiliaria.portafolio.detail.toasts.renewDesc'),
    });
  }, [t]);

  /*
   * Antes esto era un toast de «próximamente». Con eso, un inmueble sin agente
   * no tenía forma de conseguir uno: el vacío no ofrecía nada y el botón de la
   * tarjeta con agente tampoco hacía nada. El back tenía la ruta desde hace
   * rato (`PUT /consignaciones/:id/assign-agent`).
   */
  const handleReassignAgent = useCallback(() => {
    setShowAsignarAgente(true);
  }, []);

  /**
   * El inventario vive en la consignación como lista completa: agregar,
   * editar y quitar son «mandar la lista nueva» (PUT …/inventario). Se carga
   * desde que el inmueble entra a la agencia — sin contrato, entrega ni acta.
   */
  const guardarInventario = useCallback(
    async (items: InventoryItem[], mensaje: string) => {
      if (!consignacion) return;
      setGuardandoInventario(true);
      try {
        const updated = await consignacionesApi.actualizarInventario(consignacion.id, items);
        setConsignacionData(updated);
        setItemDeInventario(undefined);
        toast.success(mensaje);
      } catch (err) {
        toast.error(t('inmobiliaria.acta.itemDialog.error'), {
          description: err instanceof Error ? err.message : undefined,
        });
      } finally {
        setGuardandoInventario(false);
      }
    },
    [consignacion, t],
  );

  const handleGuardarItem = useCallback(
    (item: ItemDeInventarioBorrador) => {
      const actuales = consignacion?.inventoryItems ?? [];
      const completo = { ...item, id: item.id ?? `it-${Date.now()}` } as InventoryItem;
      const existe = actuales.some((i) => i.id === completo.id);
      const siguientes = existe
        ? actuales.map((i) => (i.id === completo.id ? completo : i))
        : [...actuales, completo];
      void guardarInventario(siguientes, t('inmobiliaria.acta.itemDialog.saved'));
    },
    [consignacion?.inventoryItems, guardarInventario, t],
  );

  const handleQuitarItem = useCallback(
    (item: InventoryItem) => {
      const actuales = consignacion?.inventoryItems ?? [];
      void guardarInventario(
        actuales.filter((i) => i.id !== item.id),
        t('inmobiliaria.acta.itemDialog.removed'),
      );
    },
    [consignacion?.inventoryItems, guardarInventario, t],
  );

  const handleViewInventory = useCallback(() => {
    inventoryRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  // Load the property's visit availability, then open the schedule editor.
  // 404 if not found
  if (!consignacion) {
    return (
      <div className="p-4 md:p-6">
        <div className="max-w-lg mx-auto py-16">
          <EmptyState
            icon={Buildings}
            title={t('inmobiliaria.portafolio.detail.notFound')}
            description={t('inmobiliaria.portafolio.detail.notFoundDesc')}
            action={{
              label: t('inmobiliaria.portafolio.detail.backToPortfolio'),
              href: '/panel/inmobiliaria/inmuebles',
            }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Breadcrumb + agendar cita */}
      <div className="flex items-center justify-between gap-4">
        <nav className="flex items-center gap-2 text-sm min-w-0">
          <Link
            href="/panel/inmobiliaria/inmuebles"
            className="flex items-center gap-1.5 text-fg-muted hover:text-primary transition-colors"
          >
            <CaretLeft className="w-4 h-4" />
            {t('inmobiliaria.portafolio.title')}
          </Link>
          <span className="text-border">/</span>
          <span className="text-fg font-medium truncate max-w-[200px]">
            {consignacion.propertyTitle}
          </span>
        </nav>
        <Button hideArrow className="shrink-0" onClick={() => setShowCitaModal(true)}>
          <CalendarPlus className="w-4 h-4" />
          {t('inmobiliaria.agenda.pedirCita')}
        </Button>
      </div>

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <ConsignacionHeader
          consignacion={consignacion}
          propertyThumbnailUrl={property?.thumbnailUrl}
          onEdit={handleEdit}
          onViewPortal={handleViewPortal}
          onChangeStatus={handleChangeStatus}
          onTerminate={handleTerminate}
          onRenew={handleRenew}
        />
      </motion.div>

      {/* Main Content - Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Main Info (2/3) */}
        <div className="lg:col-span-2 space-y-6">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <PropertyInfoSection consignacion={consignacion} />
          </motion.div>

          {/* Las coordenadas viven en el Property (la consignación no las
              tiene). Sin propertyId no hay mapa que mostrar. */}
          {consignacion.propertyId && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.11 }}
            >
              <UbicacionDelInmueble
                property={property}
                cargando={cargandoProperty}
                consignacion={consignacion}
                onActualizado={refetchProperty}
              />
            </motion.div>
          )}

          {/* Las fotos viven en el Property; sin propertyId (mandato sin
              inmueble) no hay galería que mostrar. */}
          {consignacion.propertyId && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.12 }}
            >
              <FotosDelInmueble propertyId={consignacion.propertyId} onCambio={refetchProperty} />
            </motion.div>
          )}

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
          >
            <PropietarioSection
              propietario={propietario ?? undefined}
              onCambiar={() => setShowCambiarPropietario(true)}
              rutaDeOrigen={`/panel/inmobiliaria/inmuebles/${consignacionId}`}
            />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <AgenteSection
              agente={agente ?? undefined}
              commissionPercent={consignacion.commissionPercent}
              isSaleListing={consignacion.listingType === 'sale'}
              onReassign={handleReassignAgent}
            />
          </motion.div>

          {/* Quién se postuló. Vive acá, antes del contrato vigente: es lo que
              pasa mientras el inmueble está disponible. */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.22 }}
          >
            <CandidatosDelInmueble
              propertyId={consignacion.propertyId}
              consignacionId={consignacion.id}
            />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
          >
            <CurrentLeaseSection consignacion={consignacion} />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <DocumentsSection
              consignacion={consignacion}
              onViewInventory={handleViewInventory}
            />
          </motion.div>
        </div>

        {/* Right Column - Sidebar (1/3) */}
        <div className="space-y-6">
          <motion.div
            ref={inventoryRef}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 }}
          >
            <ActaEntregaView
              inventoryItems={consignacion.inventoryItems}
              contractDate={consignacion.contractDate}
              onAddItem={() => setItemDeInventario(null)}
              onEditItem={(item) => setItemDeInventario(item)}
              onDeleteItem={handleQuitarItem}
            />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <ConsignacionTimeline
              consignacion={consignacion}
              agenteName={agente?.name}
            />
          </motion.div>
        </div>
      </div>

      {/* Edit Modal */}
      <Modal
        open={showEditModal}
        onClose={() => setShowEditModal(false)}
        title={t('inmobiliaria.portafolio.detail.editProperty')}
        size="lg"
      >
        <ConsignacionEditForm
          consignacion={consignacion}
          onSubmit={handleEditSubmit}
          onCancel={() => setShowEditModal(false)}
        />
      </Modal>

      {/* Cambiar de propietario: reapunta la consignación, no la tumba. */}
      {consignacion && (
        <CambiarPropietarioDialog
          open={showCambiarPropietario}
          consignacion={consignacion}
          onClose={() => setShowCambiarPropietario(false)}
          onCambiado={(actualizada) => setConsignacionData(actualizada)}
        />
      )}

      {/* Terminate confirmation — shadcn AlertDialog, NOT browser confirm() */}
      <AlertDialog
        open={showTerminateDialog}
        onOpenChange={(open) => {
          if (!open && !isTerminating) setShowTerminateDialog(false);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t('inmobiliaria.portafolio.detail.terminateDialog.title')}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t('inmobiliaria.portafolio.detail.terminateDialog.body', {
                property: consignacion.propertyTitle,
              })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isTerminating}>
              {t('common.cancel')}
            </AlertDialogCancel>
            <AlertDialogAction
              tone="danger"
              onClick={handleTerminateConfirm}
              disabled={isTerminating}
            >
              {t('inmobiliaria.portafolio.detail.terminateDialog.confirm')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <PedirCitaModal
        isOpen={showCitaModal}
        onClose={() => setShowCitaModal(false)}
        // Vacío a propósito: esta pantalla no lista citas, así que no hay nada
        // que recargar. Las citas viven en /panel/inmobiliaria/agenda, que las
        // relee al montar.
        onCreated={() => {}}
        presetPropertyId={consignacion.propertyId}
        presetPropertyTitle={consignacion.propertyTitle}
      />

      <InventarioItemDialog
        abierto={itemDeInventario !== undefined}
        item={itemDeInventario ?? null}
        guardando={guardandoInventario}
        onCerrar={() => setItemDeInventario(undefined)}
        onGuardar={handleGuardarItem}
      />

      <AsignarAgente
        abierto={showAsignarAgente}
        onCerrar={() => setShowAsignarAgente(false)}
        consignacionId={consignacion.id}
        agenteActualId={consignacion.agenteId}
        // La copia local gana sobre lo que trae el hook (`consignacionData ||
        // fetchedConsignacion`), así que hay que soltarla: si no, el refresco
        // llega y la pantalla sigue mostrando el agente viejo.
        onAsignado={() => setConsignacionData(null)}
      />
    </div>
  );
}

export default function ConsignacionDetailPage() {
  return (
    <PageGuard module="portafolio">
      <ConsignacionDetailContent />
    </PageGuard>
  );
}
