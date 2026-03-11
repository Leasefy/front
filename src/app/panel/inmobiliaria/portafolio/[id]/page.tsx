'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { CaretLeft, Buildings, X } from '@phosphor-icons/react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useI18n } from '@/lib/i18n';
import { useLenis } from '@/components/providers/SmoothScroll';
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
      className="fixed inset-0 z-[9999]"
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
            'relative bg-white dark:bg-[#141416] w-full rounded-3xl shadow-2xl flex flex-col',
            sizeClasses[size]
          )}
          style={{ maxHeight: '85vh' }}
          onClick={(e) => e.stopPropagation()}
        >
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
export default function ConsignacionDetailPage() {
  const { t } = useI18n();
  const params = useParams();
  const router = useRouter();
  const inventoryRef = useRef<HTMLDivElement>(null);

  const consignacionId = params.id as string;

  // Edit modal state
  const [showEditModal, setShowEditModal] = useState(false);
  const [consignacionData, setConsignacionData] = useState<Consignacion | null>(null);

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

    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Update local state with new data
    const updatedConsignacion: Consignacion = {
      ...consignacion,
      propertyTitle: data.propertyTitle,
      propertyAddress: data.propertyAddress,
      propertyCity: data.propertyCity,
      propertyZone: data.propertyZone,
      propertyType: data.propertyType,
      monthlyRent: data.monthlyRent,
      adminFee: data.adminFee,
      commissionPercent: data.commissionPercent,
      agenteId: data.agenteId,
      minimumTerm: data.minimumTerm,
      updatedAt: new Date().toISOString(),
    };

    setConsignacionData(updatedConsignacion);
    setShowEditModal(false);
    toast.success(t('inmobiliaria.portafolio.detail.toasts.propertyUpdated'), {
      description: t('inmobiliaria.portafolio.detail.toasts.changesSaved'),
    });
  }, [consignacion]);

  const handleViewPortal = useCallback(() => {
    toast.info(t('inmobiliaria.portafolio.detail.toasts.viewPortalSoon'), {
      description: t('inmobiliaria.portafolio.detail.toasts.viewPortalDesc'),
    });
  }, []);

  const handleChangeStatus = useCallback((newStatus: PropertyAvailability) => {
    const statusLabels: Record<PropertyAvailability, string> = {
      available: t('inmobiliaria.portafolio.status.available'),
      rented: t('inmobiliaria.portafolio.status.rented'),
      in_process: t('inmobiliaria.portafolio.detail.statusLabels.inProcess'),
      maintenance: t('inmobiliaria.portafolio.status.maintenance'),
    };
    toast.success(t('inmobiliaria.portafolio.detail.toasts.statusChanged', { status: statusLabels[newStatus] }), {
      description: t('inmobiliaria.portafolio.detail.toasts.autoSave'),
    });
    console.log('Change status to:', newStatus);
  }, []);

  const handleTerminate = useCallback(() => {
    toast.error(t('inmobiliaria.portafolio.detail.toasts.terminateConsignment'), {
      description: t('inmobiliaria.portafolio.detail.toasts.requiresConfirmation'),
    });
  }, []);

  const handleRenew = useCallback(() => {
    toast.info(t('inmobiliaria.portafolio.detail.toasts.renewSoon'), {
      description: t('inmobiliaria.portafolio.detail.toasts.renewDesc'),
    });
  }, []);

  const handleReassignAgent = useCallback(() => {
    toast.info(t('inmobiliaria.portafolio.detail.toasts.reassignSoon'), {
      description: t('inmobiliaria.portafolio.detail.toasts.reassignDesc'),
    });
  }, []);

  const handleViewInventory = useCallback(() => {
    inventoryRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  // 404 if not found
  if (!consignacion) {
    return (
      <div className="p-4 md:p-6">
        <div className="max-w-lg mx-auto text-center py-16">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center">
            <Buildings className="w-8 h-8 text-neutral-400" />
          </div>
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-white mb-2">
            {t('inmobiliaria.portafolio.detail.notFound')}
          </h1>
          <p className="text-neutral-500 dark:text-neutral-400 mb-6">
            {t('inmobiliaria.portafolio.detail.notFoundDesc')}
          </p>
          <Link
            href="/panel/inmobiliaria/portafolio"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-500 text-white font-medium hover:bg-indigo-600 transition-colors"
          >
            <CaretLeft className="w-4 h-4" />
            {t('inmobiliaria.portafolio.detail.backToPortfolio')}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm">
        <Link
          href="/panel/inmobiliaria/portafolio"
          className="flex items-center gap-1.5 text-neutral-500 dark:text-neutral-400 hover:text-indigo-500 transition-colors"
        >
          <CaretLeft className="w-4 h-4" />
          {t('inmobiliaria.portafolio.title')}
        </Link>
        <span className="text-neutral-300 dark:text-neutral-600">/</span>
        <span className="text-neutral-900 dark:text-white font-medium truncate max-w-[200px]">
          {consignacion.propertyTitle}
        </span>
      </nav>

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
    </div>
  );
}
