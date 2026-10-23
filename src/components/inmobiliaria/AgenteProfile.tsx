'use client';

import {
  User,
  Envelope,
  Phone,
  MapPin,
  CalendarBlank,
  Briefcase,
  Buildings,
  Percent,
  PencilSimple,
  WhatsappLogo,
} from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Avatar } from '@/components/ui/avatar';
import { useI18n } from '@/lib/i18n';
import type { Agente, AgenteRole, AgenteStatus } from '@/lib/types/inmobiliaria';

interface AgenteProfileProps {
  agente: Agente;
  onEdit?: () => void;
}

// Role labels and colors
const ROLE_CONFIG: Record<AgenteRole, { label: string; bg: string; text: string }> = {
  agent: {
    label: 'Agente',
    bg: 'bg-surface-muted',
    text: 'text-fg',
  },
  coordinator: {
    label: 'Coordinador',
    bg: 'bg-surface-muted',
    text: 'text-fg-muted',
  },
  director: {
    label: 'Director',
    bg: 'bg-warning-soft',
    text: 'text-warning',
  },
};

// Status labels and colors
const STATUS_CONFIG: Record<AgenteStatus, { label: string; dot: string }> = {
  active: {
    label: 'Activo',
    dot: 'bg-success',
  },
  inactive: {
    label: 'Inactivo',
    dot: 'bg-muted',
  },
  on_leave: {
    label: 'En licencia',
    dot: 'bg-warning',
  },
  // No se llega acá desde una invitación (la ficha sólo existe para miembros
  // ACTIVE), pero el Record tiene que cubrir el tipo entero.
  invited: {
    label: 'Invitado',
    dot: 'bg-warning',
  },
};

// Specialization labels
const SPECIALIZATION_LABELS: Record<string, string> = {
  residential: 'Residencial',
  commercial: 'Comercial',
  both: 'Residencial y Comercial',
};

/**
 * AgenteProfile - Full profile header for agente detail page
 * Displays avatar, contact info, role, zone, commission split, and contact buttons
 */
export function AgenteProfile({ agente, onEdit }: AgenteProfileProps) {
  const { t, formatDate: formatDateI18n } = useI18n();
  const roleConfig = ROLE_CONFIG[agente.role];
  const statusConfig = STATUS_CONFIG[agente.status];

  const roleLabels: Record<AgenteRole, string> = {
    agent: t('inmobiliaria.agente.roleAgent'),
    coordinator: t('inmobiliaria.agente.roleCoordinator'),
    director: t('inmobiliaria.agente.roleDirector'),
  };

  const statusLabels: Record<AgenteStatus, string> = {
    active: t('inmobiliaria.agente.statusActive'),
    inactive: t('inmobiliaria.agente.statusInactive'),
    on_leave: t('inmobiliaria.agente.statusOnLeave'),
    invited: t('inmobiliaria.agente.statusInvited'),
  };

  const specializationLabels: Record<string, string> = {
    apartment: 'Apartamento',
    house: 'Casa',
    studio: 'Estudio',
    room: 'Habitación',
    all: 'Todos',
  };

  const formatHireDate = (dateString: string) => {
    return formatDateI18n(new Date(dateString), {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  // Calculate commission split visualization
  const agentPercent = agente.commissionSplit;
  const agencyPercent = 100 - agente.commissionSplit;

  // Format phone for WhatsApp (remove spaces and + sign)
  const whatsappNumber = agente.phone.replace(/[\s+\-]/g, '');

  return (
    <div className="rounded-lg border border-border bg-surface overflow-hidden">
      <div className="p-5 lg:p-6">
        {/* Header Row */}
        <div className="flex flex-col sm:flex-row sm:items-start gap-4 mb-6">
          {/* Avatar with Status Indicator */}
          <div className="relative shrink-0">
            {/* Glow up 22-10: el Avatar de Cadence (foto o iniciales), no un cuadro azul hecho a mano. */}
            <Avatar name={agente.name} src={agente.avatar ?? undefined} size="xl" />
            {/* Status dot */}
            <div
              className={cn(
                'absolute -bottom-1 -right-1 w-5 h-5 rounded-full border-2 border-card',
                statusConfig.dot
              )}
              title={statusConfig.label}
            />
          </div>

          {/* Name, Role, and Status */}
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <h1 className="truncate text-[30px] font-[420] leading-[1.08] tracking-[-0.025em] text-fg lg:text-[40px]">
                {agente.name}
              </h1>
              <span
                className={cn(
                  'px-3 py-1 rounded-full text-sm font-medium shrink-0',
                  roleConfig.bg,
                  roleConfig.text
                )}
              >
                {roleLabels[agente.role]}
              </span>
            </div>

            {/* Contact Info */}
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 text-fg-muted">
                <Envelope className="w-4 h-4 shrink-0" />
                <a
                  href={`mailto:${agente.email}`}
                  className="text-sm hover:text-primary transition-colors truncate"
                >
                  {agente.email}
                </a>
              </div>
              <div className="flex items-center gap-2 text-fg-muted">
                <Phone className="w-4 h-4 shrink-0" />
                <a
                  href={`tel:${agente.phone}`}
                  className="text-sm hover:text-primary transition-colors"
                >
                  {agente.phone}
                </a>
              </div>
            </div>
          </div>

          {/* Editar el perfil. Hasta el 21-09-2026 este botón estaba
              DESHABILITADO con el título «Disponible próximamente» sobre una
              ruta que el back ya tenía. Sin `onEdit` no se pinta: un botón que
              no lleva a ninguna parte es peor que no tener botón. */}
          {onEdit && (
            <Button
              variant="outline"
              hideArrow
              onClick={onEdit}
              className="shrink-0 gap-2"
            >
              <PencilSimple className="w-4 h-4" />
              {t('inmobiliaria.agente.edit')}
            </Button>
          )}
        </div>

        {/* Info Pills */}
        <div className="flex flex-wrap gap-2 mb-6">
          {/* Zone */}
          {agente.zone && (
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-surface-muted text-sm text-fg">
              <MapPin className="w-4 h-4" />
              {agente.zone}
            </div>
          )}
          {/* Specialization */}
          {agente.specialization && (
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-surface-muted text-sm text-fg">
              <Buildings className="w-4 h-4" />
              {specializationLabels[agente.specialization]}
            </div>
          )}
          {/* Hire Date */}
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-surface-muted text-sm text-fg">
            <CalendarBlank className="w-4 h-4" />
            {t('inmobiliaria.agente.since')} {formatHireDate(agente.hireDate)}
          </div>
        </div>

        {/* Commission Split */}
        <div className="p-4 rounded-lg bg-surface-muted mb-6">
          <div className="flex items-center gap-2 mb-3">
            <Percent className="w-4 h-4 text-fg-muted" />
            <span className="text-sm font-medium text-fg">
              {t('inmobiliaria.agente.commissionDistribution')}
            </span>
          </div>

          {/* Split Bar */}
          <div className="h-3 rounded-full bg-surface-muted overflow-hidden flex mb-3">
            {/* Ronda 30: el reparto en tinta (el voltaje es para la acción, no para un dato). */}
            <div
              className="bg-fg"
              style={{ width: `${agentPercent}%` }}
            />
            <div
              className="bg-muted"
              style={{ width: `${agencyPercent}%` }}
            />
          </div>

          {/* Labels */}
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-fg" />
              <span className="text-fg-muted">
                {t('inmobiliaria.agente.agentLabel')}: <span className="font-mono text-fg">{agentPercent} %</span>
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-muted" />
              <span className="text-fg-muted">
                {t('inmobiliaria.agente.agencyLabel')}: <span className="font-mono text-fg">{agencyPercent} %</span>
              </span>
            </div>
          </div>
        </div>

        {/* Contact Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Ronda 30: contactar no es LA acción de la ficha: los tres en arena (antes Correo en
              azul y WhatsApp en un verde lleno). */}
          <Button asChild hideArrow variant="outline" className="min-w-[120px] flex-1">
            <a href={`mailto:${agente.email}`}>
              <Envelope className="w-4 h-4" />
              Correo
            </a>
          </Button>
          <a
            href={`tel:${agente.phone}`}
            className="flex-1 min-w-[120px] flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-border bg-surface text-fg font-medium hover:bg-surface-muted transition-colors"
          >
            <Phone className="w-4 h-4" />
            {t('inmobiliaria.agente.call')}
          </a>
          <a
            href={`https://wa.me/${whatsappNumber}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 min-w-[120px] flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-border bg-surface text-fg font-medium hover:bg-surface-muted transition-colors"
          >
            <WhatsappLogo className="w-4 h-4" />
            WhatsApp
          </a>
        </div>
      </div>
    </div>
  );
}

export default AgenteProfile;
