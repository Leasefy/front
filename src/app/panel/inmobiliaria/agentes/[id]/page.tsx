'use client';

import { useMemo, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import {
  CaretLeft,
  Users,
  Clock,
} from '@phosphor-icons/react';
import {
  getAgenteById,
  getConsignacionesForAgente,
  getPipelineItemsForAgente,
} from '@/lib/data/mock-inmobiliaria';

// Components
import { AgenteProfile } from '@/components/inmobiliaria/AgenteProfile';
import { AgenteMetrics } from '@/components/inmobiliaria/AgenteMetrics';
import { AgentePropertyList } from '@/components/inmobiliaria/AgentePropertyList';
import { AgentePipeline } from '@/components/inmobiliaria/AgentePipeline';

/**
 * Agente Detail Page
 * Route: /panel/inmobiliaria/agentes/[id]
 */
export default function AgenteDetailPage() {
  const params = useParams();
  const agenteId = params.id as string;

  // Fetch data
  const agente = useMemo(() => getAgenteById(agenteId), [agenteId]);
  const consignaciones = useMemo(
    () => (agente ? getConsignacionesForAgente(agenteId) : []),
    [agente, agenteId]
  );
  const pipelineItems = useMemo(
    () => (agente ? getPipelineItemsForAgente(agenteId) : []),
    [agente, agenteId]
  );

  // Handlers
  const handleEdit = useCallback(() => {
    toast.info('Editar perfil proximamente', {
      description: 'Podras modificar los datos del agente',
    });
  }, []);

  const handleAssignProperty = useCallback(() => {
    toast.info('Asignar propiedad proximamente', {
      description: 'Podras asignar nuevas propiedades a este agente',
    });
  }, []);

  // 404 if not found
  if (!agente) {
    return (
      <div className="p-4 md:p-6">
        <div className="max-w-lg mx-auto text-center py-16">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center">
            <Users className="w-8 h-8 text-neutral-400" />
          </div>
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-white mb-2">
            Agente no encontrado
          </h1>
          <p className="text-neutral-500 dark:text-neutral-400 mb-6">
            El agente que buscas no existe o ha sido eliminado
          </p>
          <Link
            href="/panel/inmobiliaria/agentes"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-500 text-white font-medium hover:bg-indigo-600 transition-colors"
          >
            <CaretLeft className="w-4 h-4" />
            Volver a Agentes
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
          href="/panel/inmobiliaria"
          className="text-neutral-500 dark:text-neutral-400 hover:text-indigo-500 transition-colors"
        >
          Inmobiliaria
        </Link>
        <span className="text-neutral-300 dark:text-neutral-600">/</span>
        <Link
          href="/panel/inmobiliaria/agentes"
          className="flex items-center gap-1.5 text-neutral-500 dark:text-neutral-400 hover:text-indigo-500 transition-colors"
        >
          <CaretLeft className="w-4 h-4" />
          Agentes
        </Link>
        <span className="text-neutral-300 dark:text-neutral-600">/</span>
        <span className="text-neutral-900 dark:text-white font-medium truncate max-w-[200px]">
          {agente.name}
        </span>
      </nav>

      {/* Main Content - Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Main Content (2/3) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Profile Section */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <AgenteProfile agente={agente} onEdit={handleEdit} />
          </motion.div>

          {/* Metrics Section */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="rounded-2xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-[#1a1a1c] p-5"
          >
            <AgenteMetrics metrics={agente.metrics} />
          </motion.div>

          {/* Properties Section */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <AgentePropertyList
              consignaciones={consignaciones}
              onAssignProperty={handleAssignProperty}
            />
          </motion.div>
        </div>

        {/* Right Column - Sidebar (1/3) */}
        <div className="space-y-6">
          {/* Pipeline Section */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
          >
            <AgentePipeline pipelineItems={pipelineItems} />
          </motion.div>

          {/* Commission History Placeholder */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="rounded-2xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-[#1a1a1c] overflow-hidden"
          >
            <div className="flex items-center gap-3 px-5 py-4 border-b border-neutral-100 dark:border-neutral-800">
              <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                <Clock className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              </div>
              <h3 className="font-semibold text-neutral-900 dark:text-white">
                Historial de Comisiones
              </h3>
            </div>
            <div className="p-8 text-center">
              <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center">
                <Clock className="w-6 h-6 text-neutral-400" />
              </div>
              <p className="text-neutral-600 dark:text-neutral-400 font-medium mb-1">
                Proximamente
              </p>
              <p className="text-sm text-neutral-500 dark:text-neutral-500">
                Historial detallado de pagos y comisiones del agente
              </p>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
