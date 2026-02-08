'use client';

import { useMemo, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { CaretLeft, Buildings } from '@phosphor-icons/react';
import { toast } from 'sonner';
import {
  getConsignacionById,
  getPropietarioById,
  getAgenteById,
} from '@/lib/data/mock-inmobiliaria';
import type { PropertyAvailability } from '@/lib/types/inmobiliaria';

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

/**
 * Consignacion Detail Page
 * Route: /panel/inmobiliaria/portafolio/[id]
 */
export default function ConsignacionDetailPage() {
  const params = useParams();
  const router = useRouter();
  const inventoryRef = useRef<HTMLDivElement>(null);

  const consignacionId = params.id as string;

  // Fetch data
  const consignacion = useMemo(() => getConsignacionById(consignacionId), [consignacionId]);
  const propietario = useMemo(
    () => (consignacion ? getPropietarioById(consignacion.propietarioId) : undefined),
    [consignacion]
  );
  const agente = useMemo(
    () => (consignacion ? getAgenteById(consignacion.agenteId) : undefined),
    [consignacion]
  );

  // Handlers
  const handleEdit = useCallback(() => {
    toast.info('Función de edición próximamente', {
      description: 'Podrás editar los datos de la consignación',
    });
  }, []);

  const handleViewPortal = useCallback(() => {
    toast.info('Ver en portal próximamente', {
      description: 'Esta propiedad se mostrará en el portal público',
    });
  }, []);

  const handleChangeStatus = useCallback((newStatus: PropertyAvailability) => {
    const statusLabels: Record<PropertyAvailability, string> = {
      available: 'Disponible',
      rented: 'Arrendado',
      in_process: 'En proceso',
      maintenance: 'Mantenimiento',
    };
    toast.success(`Estado cambiado a: ${statusLabels[newStatus]}`, {
      description: 'Los cambios se guardarán automáticamente',
    });
    console.log('Change status to:', newStatus);
  }, []);

  const handleTerminate = useCallback(() => {
    toast.error('Terminar consignación', {
      description: 'Esta acción requiere confirmación adicional',
    });
  }, []);

  const handleRenew = useCallback(() => {
    toast.info('Renovar consignación próximamente', {
      description: 'Podrás extender el contrato de consignación',
    });
  }, []);

  const handleReassignAgent = useCallback(() => {
    toast.info('Reasignar agente próximamente', {
      description: 'Podrás cambiar el agente asignado',
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
            Consignación no encontrada
          </h1>
          <p className="text-neutral-500 dark:text-neutral-400 mb-6">
            La consignación que buscas no existe o ha sido eliminada
          </p>
          <Link
            href="/panel/inmobiliaria/portafolio"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-500 text-white font-medium hover:bg-indigo-600 transition-colors"
          >
            <CaretLeft className="w-4 h-4" />
            Volver al portafolio
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
          Portafolio
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
            <PropietarioSection propietario={propietario} />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <AgenteSection
              agente={agente}
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
    </div>
  );
}
