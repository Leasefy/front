'use client';
import { PageGuard } from '@/components/auth/PageGuard';

import { useMemo, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useI18n } from '@/lib/i18n';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { Button } from '@/components/ui';
import {
  CaretLeft,
  Users,
  Clock,
} from '@phosphor-icons/react';
import {
  useAgente,
  useAgenteConsignaciones,
  useAgentePipeline,
} from '@/lib/hooks/useInmobiliaria';

// Components
import { AgenteProfile } from '@/components/inmobiliaria/AgenteProfile';
import { AgenteMetrics } from '@/components/inmobiliaria/AgenteMetrics';
import { AgentePropertyList } from '@/components/inmobiliaria/AgentePropertyList';
import { AgentePipeline } from '@/components/inmobiliaria/AgentePipeline';
import { AgenteHorarioVisitas } from '@/components/inmobiliaria/AgenteHorarioVisitas';

/**
 * Agente Detail Page
 * Route: /panel/inmobiliaria/agentes/[id]
 */
function AgenteDetailContent() {
  const { t } = useI18n();
  const params = useParams();
  const agenteId = params.id as string;

  // Fetch data
  const { agente } = useAgente(agenteId);
  const { consignaciones } = useAgenteConsignaciones(agenteId);
  const { pipelineItems } = useAgentePipeline(agenteId);

  // Handlers
  const handleEdit = useCallback(() => {
    toast.info(t('inmobiliaria.agentes.detail.editComingSoon'), {
      description: t('inmobiliaria.agentes.detail.editComingSoonDesc'),
    });
  }, [t]);

  const handleAssignProperty = useCallback(() => {
    toast.info(t('inmobiliaria.agentes.detail.assignComingSoon'), {
      description: t('inmobiliaria.agentes.detail.assignComingSoonDesc'),
    });
  }, [t]);

  // 404 if not found
  if (!agente) {
    return (
      <div className="p-4 md:p-6">
        <div className="max-w-lg mx-auto flex flex-col items-center text-center py-16 gap-4">
          <div className="w-14 h-14 rounded-2xl bg-surface-muted flex items-center justify-center">
            <Users weight="duotone" className="w-6 h-6 text-fg-muted" />
          </div>
          <div className="space-y-1.5">
            <h1 className="text-2xl font-semibold tracking-tight text-fg">
              {t('inmobiliaria.agentes.notFound')}
            </h1>
            <p className="text-sm text-fg-muted">
              {t('inmobiliaria.agentes.notFoundDesc')}
            </p>
          </div>
          <Button asChild hideArrow className="mt-1">
            <Link href="/panel/inmobiliaria/agentes">
              <CaretLeft className="w-4 h-4" />
              {t('inmobiliaria.agentes.backToList')}
            </Link>
          </Button>
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
          className="text-fg-muted hover:text-primary transition-colors"
        >
          {t('inmobiliaria.common.title')}
        </Link>
        <span className="text-border">/</span>
        <Link
          href="/panel/inmobiliaria/agentes"
          className="flex items-center gap-1.5 text-fg-muted hover:text-primary transition-colors"
        >
          <CaretLeft className="w-4 h-4" />
          {t('inmobiliaria.agentes.title')}
        </Link>
        <span className="text-border">/</span>
        <span className="text-fg font-medium truncate max-w-[200px]">
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
            className="rounded-xl border border-border bg-card p-5"
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

          {/* Visit working-hours — one schedule for all the agent's properties */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
          >
            <AgenteHorarioVisitas agenteId={agenteId} />
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
            className="rounded-xl border border-border bg-card overflow-hidden"
          >
            <div className="flex items-center gap-3 px-5 py-4 border-b border-border">
              <div className="w-8 h-8 rounded-md bg-surface-muted flex items-center justify-center">
                <Clock className="w-4 h-4 text-fg-muted" />
              </div>
              <h3 className="text-base font-semibold text-fg">
                {t('inmobiliaria.agentes.detail.commissions')}
              </h3>
            </div>
            <div className="flex flex-col items-center p-8 text-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-surface-muted flex items-center justify-center">
                <Clock weight="duotone" className="w-6 h-6 text-fg-muted" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium text-fg">
                  {t('inmobiliaria.agentes.detail.comingSoon')}
                </p>
                <p className="text-xs text-fg-muted">
                  {t('inmobiliaria.agentes.detail.commissionsDesc')}
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}

export default function AgenteDetailPage() {
  return (
    <PageGuard module="agentes">
      <AgenteDetailContent />
    </PageGuard>
  );
}
