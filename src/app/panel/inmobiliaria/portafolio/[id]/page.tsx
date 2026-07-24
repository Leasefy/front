'use client';
import { PageGuard } from '@/components/auth/PageGuard';

import { useState, useCallback, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { CaretLeft, Buildings, X, CalendarPlus, Clock } from '@phosphor-icons/react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useI18n } from '@/lib/i18n';
import { Button, EmptyState } from '@/components/ui';
import { Spinner } from '@/components/ui/spinner';
import { AvailabilityScheduleEditor } from '@/components/panel/AvailabilityScheduleEditor';
import { type AvailabilitySchedule, DEFAULT_AVAILABILITY_SCHEDULE } from '@/lib/types/property';
import { agendaApi } from '@/lib/api/agenda.service';
import { scheduleToWindows, windowsToSchedule } from '@/lib/utils/availability-schedule';
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
  useAgente,
} from '@/lib/hooks/useInmobiliaria';
import type { PropertyAvailability, ConsignacionFormData, Consignacion } from '@/lib/types/inmobiliaria';

// Components
import { ConsignacionHeader } from '@/components/inmobiliaria/ConsignacionHeader';
import {
  PropertyInfoSection,
  PropietarioSection,
  AgenteSection,
  CurrentLeaseSection,
  DocumentsSection,
} from '@/components/inmobiliaria/ConsignacionDetailSections';
import { ActaEntregaView } from '@/components/inmobiliaria/ActaEntregaView';
import { ConsignacionTimeline } from '@/components/inmobiliaria/ConsignacionTimeline';
import { ConsignacionEditForm } from '@/components/inmobiliaria/ConsignacionEditForm';
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
            'relative bg-card border border-border w-full rounded-xl flex flex-col',
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
 * Route: /panel/inmobiliaria/portafolio/[id]
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
  const [showTerminateDialog, setShowTerminateDialog] = useState(false);
  const [isTerminating, setIsTerminating] = useState(false);
  const [showCitaModal, setShowCitaModal] = useState(false);
  const [showHorarios, setShowHorarios] = useState(false);
  const [horariosSchedule, setHorariosSchedule] = useState<AvailabilitySchedule | null>(null);

  // Fetch data
  const { consignacion: fetchedConsignacion } = useConsignacion(consignacionId);

  // Use local state for consignacion to allow updates after edit
  const consignacion = consignacionData || fetchedConsignacion;

  const { propietario } = usePropietario(consignacion?.propietarioId);
  const { agente } = useAgente(consignacion?.agenteId);

  // Handlers
  const handleEdit = useCallback(() => {
    setShowEditModal(true);
  }, []);

  const handleEditSubmit = useCallback(async (data: ConsignacionFormData) => {
    if (!consignacion) return;

    try {
      // PUT /inmobiliaria/consignaciones/:id — the service maps enum casing
      // and strips agent reassignment (see ConsignacionUpdateInput).
      const updated = await consignacionesApi.update(consignacion.id, {
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

  const handleViewPortal = useCallback(() => {
    toast.info(t('inmobiliaria.portafolio.detail.toasts.viewPortalSoon'), {
      description: t('inmobiliaria.portafolio.detail.toasts.viewPortalDesc'),
    });
  }, [t]);

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

  const handleReassignAgent = useCallback(() => {
    toast.info(t('inmobiliaria.portafolio.detail.toasts.reassignSoon'), {
      description: t('inmobiliaria.portafolio.detail.toasts.reassignDesc'),
    });
  }, [t]);

  const handleViewInventory = useCallback(() => {
    inventoryRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  // Load the property's visit availability, then open the schedule editor.
  const handleOpenHorarios = useCallback(async () => {
    if (!consignacion?.propertyId) return;
    setHorariosSchedule(null);
    setShowHorarios(true);
    try {
      const windows = await agendaApi.getDisponibilidad(consignacion.propertyId);
      setHorariosSchedule(
        windows.length > 0 ? windowsToSchedule(windows) : DEFAULT_AVAILABILITY_SCHEDULE,
      );
    } catch {
      setHorariosSchedule(DEFAULT_AVAILABILITY_SCHEDULE);
    }
  }, [consignacion?.propertyId]);

  const handleSaveHorarios = useCallback(
    async (schedule: AvailabilitySchedule) => {
      if (!consignacion?.propertyId) return;
      try {
        await agendaApi.setDisponibilidad(
          consignacion.propertyId,
          scheduleToWindows(schedule),
        );
        setShowHorarios(false);
      } catch (err) {
        toast.error(t('inmobiliaria.portafolio.detail.toasts.updateError'), {
          description: err instanceof Error ? err.message : undefined,
        });
      }
    },
    [consignacion?.propertyId, t],
  );

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
              href: '/panel/inmobiliaria/portafolio',
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
            href="/panel/inmobiliaria/portafolio"
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
        <div className="flex items-center gap-2 shrink-0">
          <Button variant="outline" hideArrow onClick={handleOpenHorarios}>
            <Clock className="w-4 h-4" />
            {t('inmobiliaria.agenda.horariosVisita')}
          </Button>
          <Button hideArrow onClick={() => setShowCitaModal(true)}>
            <CalendarPlus className="w-4 h-4" />
            {t('inmobiliaria.agenda.pedirCita')}
          </Button>
        </div>
      </div>

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <ConsignacionHeader
          consignacion={consignacion}
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

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
          >
            <PropietarioSection propietario={propietario ?? undefined} />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <AgenteSection
              agente={agente ?? undefined}
              commissionPercent={consignacion.commissionPercent}
              onReassign={handleReassignAgent}
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
        onCreated={() => {}}
        presetPropertyId={consignacion.propertyId}
        presetPropertyTitle={consignacion.propertyTitle}
      />

      {/* Visit availability editor */}
      <Modal
        open={showHorarios}
        onClose={() => setShowHorarios(false)}
        title={t('inmobiliaria.agenda.horariosVisita')}
        size="lg"
      >
        {horariosSchedule ? (
          <AvailabilityScheduleEditor
            key={consignacion.propertyId}
            schedule={horariosSchedule}
            onSave={handleSaveHorarios}
          />
        ) : (
          <div className="py-12 flex justify-center">
            <Spinner />
          </div>
        )}
      </Modal>
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
