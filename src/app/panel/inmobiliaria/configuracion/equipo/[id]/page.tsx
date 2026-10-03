'use client';
import { PageGuard } from '@/components/auth/PageGuard';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useI18n } from '@/lib/i18n';
import { Stagger, StaggerItem } from '@leasefy/cadence';
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
import { CaptacionesYArriendos } from '@/components/inmobiliaria/CaptacionesYArriendos';
import { AgentePropertyList } from '@/components/inmobiliaria/AgentePropertyList';
import { AgentePipeline } from '@/components/inmobiliaria/AgentePipeline';
import { AgenteHorarioVisitas } from '@/components/inmobiliaria/AgenteHorarioVisitas';
import { EditarPerfilDelAsesor } from '@/components/inmobiliaria/EditarPerfilDelAsesor';
import { AsignarInmuebleAlAsesor } from '@/components/inmobiliaria/AsignarInmuebleAlAsesor';

/**
 * Agente Detail Page
 * Route: /panel/inmobiliaria/configuracion/equipo/[id]
 */
function AgenteDetailContent() {
  const { t } = useI18n();
  const params = useParams();
  const agenteId = params.id as string;

  // Fetch data
  const { agente, refetch: recargarAgente } = useAgente(agenteId);
  const { consignaciones, refetch: recargarConsignaciones } =
    useAgenteConsignaciones(agenteId);
  const { pipelineItems } = useAgentePipeline(agenteId);

  /* 🔴 Acá había dos avisos de «próximamente» sobre dos rutas que el back ya
     publicaba —`PATCH /inmobiliaria/agency/members/:memberId/profile` y
     `PUT /inmobiliaria/consignaciones/:id/assign-agent`— y con el servicio del
     front ya escrito para las dos. Lo que faltaba eran los diálogos. */
  const [editando, setEditando] = useState(false);
  const [asignando, setAsignando] = useState(false);

  // 404 if not found
  if (!agente) {
    return (
      <div className="p-4 md:p-6">
        <div className="max-w-lg mx-auto flex flex-col items-center text-center py-16 gap-4">
          <div className="w-14 h-14 rounded-2xl bg-surface-muted flex items-center justify-center">
            <Users weight="duotone" className="w-6 h-6 text-fg-muted" />
          </div>
          <div className="space-y-1.5">
            <h1 className="text-h2 text-fg">
              {t('inmobiliaria.agentes.notFound')}
            </h1>
            <p className="text-sm text-fg-muted line-clamp-2 max-w-2xl">
              {t('inmobiliaria.agentes.notFoundDesc')}
            </p>
          </div>
          <Button asChild hideArrow className="mt-1">
            <Link href="/panel/inmobiliaria/configuracion/equipo">
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
      {/* Miga de pan: la ficha cuelga de Configuración → Equipo (el marco de
          Configuración se aparta acá, así que la ubicación la dice esta línea). */}
      <nav className="flex items-center gap-2 text-sm">
        <Link
          href="/panel/inmobiliaria/configuracion"
          className="text-fg-muted hover:text-primary transition-colors"
        >
          {t('inmobiliaria.config.title')}
        </Link>
        <span className="text-border">/</span>
        <Link
          href="/panel/inmobiliaria/configuracion/equipo"
          className="flex items-center gap-1.5 text-fg-muted hover:text-primary transition-colors"
        >
          <CaretLeft className="w-4 h-4" />
          {t('inmobiliaria.config.tabs.equipo')}
        </Link>
        <span className="text-border">/</span>
        <span className="text-fg font-medium truncate max-w-[200px]">
          {agente.name}
        </span>
      </nav>

      {/* Main Content - Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Main Content (2/3) */}
        {/* La ficha llega desde la lista de Equipo dentro del mismo módulo (el
            template del panel no se vuelve a montar): sus bloques entran
            escalonados con el techo del sistema, no con retrasos a mano. */}
        <Stagger className="lg:col-span-2 space-y-6">
          {/* Profile Section */}
          <StaggerItem key="perfil">
            <AgenteProfile agente={agente} onEdit={() => setEditando(true)} />
          </StaggerItem>

          {/* Metrics Section */}
          <StaggerItem key="metricas" className="rounded-lg border border-border bg-card p-5">
            <AgenteMetrics metrics={agente.metrics} />
          </StaggerItem>

          {/* Properties Section */}
          <StaggerItem key="inmuebles">
            <AgentePropertyList
              consignaciones={consignaciones}
              onAssignProperty={() => setAsignando(true)}
            />
          </StaggerItem>

          {/* Visit working-hours — one schedule for all the agent's properties */}
          <StaggerItem key="horario">
            <AgenteHorarioVisitas agenteId={agenteId} />
          </StaggerItem>
        </Stagger>

        {/* Right Column - Sidebar (1/3) */}
        <Stagger className="space-y-6" delay={0.08}>
          {/* Pipeline Section */}
          <StaggerItem key="pipeline">
            <AgentePipeline pipelineItems={pipelineItems} />
          </StaggerItem>

          {/* 🔴 17-09: acá había un «Historial de comisiones — próximamente».
              La comisión del asesor se liquida por fuera de Leasefy, así que
              esa pantalla no va a existir; lo que sí es un hecho —qué captó y
              qué arrendó— es esto. */}
          <StaggerItem key="captaciones" className="rounded-lg border border-border bg-card p-5">
            <CaptacionesYArriendos userId={agente.userId} />
          </StaggerItem>
        </Stagger>
      </div>

      <EditarPerfilDelAsesor
        abierto={editando}
        onCerrar={() => setEditando(false)}
        agente={agente}
        onGuardado={recargarAgente}
      />
      <AsignarInmuebleAlAsesor
        abierto={asignando}
        onCerrar={() => setAsignando(false)}
        agenteUserId={agente.userId}
        agenteNombre={agente.name}
        onAsignado={recargarConsignaciones}
      />
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
