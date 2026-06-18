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
    bg: 'bg-primary-soft',
    text: 'text-primary',
  },
  coordinator: {
    label: 'Coordinador',
    bg: 'bg-neutral-100 dark:bg-neutral-800',
    text: 'text-neutral-600 dark:text-neutral-300',
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
    dot: 'bg-neutral-400',
  },
  on_leave: {
    label: 'En licencia',
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
  };

  const specializationLabels: Record<string, string> = {
    residential: t('inmobiliaria.agente.specResidential'),
    commercial: t('inmobiliaria.agente.specCommercial'),
    both: t('inmobiliaria.agente.specBoth'),
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
    <div className="rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-[#1a1a1c] overflow-hidden">
      <div className="p-5 lg:p-6">
        {/* Header Row */}
        <div className="flex flex-col sm:flex-row sm:items-start gap-4 mb-6">
          {/* Avatar with Status Indicator */}
          <div className="relative shrink-0">
            {agente.avatar ? (
              <img
                src={agente.avatar}
                alt={agente.name}
                className="w-20 h-20 rounded-xl object-cover"
              />
            ) : (
              <div className="w-20 h-20 rounded-xl bg-primary-soft flex items-center justify-center">
                <span className="text-2xl font-bold text-primary">
                  {agente.name.split(' ').map(n => n.charAt(0)).slice(0, 2).join('')}
                </span>
              </div>
            )}
            {/* Status dot */}
            <div
              className={cn(
                'absolute -bottom-1 -right-1 w-5 h-5 rounded-full border-2 border-white dark:border-[#1a1a1c]',
                statusConfig.dot
              )}
              title={statusConfig.label}
            />
          </div>

          {/* Name, Role, and Status */}
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <h1 className="text-2xl font-bold text-neutral-900 dark:text-white truncate">
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
              <div className="flex items-center gap-2 text-neutral-600 dark:text-neutral-400">
                <Envelope className="w-4 h-4 shrink-0" />
                <a
                  href={`mailto:${agente.email}`}
                  className="text-sm hover:text-primary transition-colors truncate"
                >
                  {agente.email}
                </a>
              </div>
              <div className="flex items-center gap-2 text-neutral-600 dark:text-neutral-400">
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

          {/* Edit Button */}
          <button
            onClick={onEdit}
            disabled
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-[#141416] text-neutral-400 dark:text-neutral-500 font-medium opacity-50 cursor-not-allowed"
            title={t('inmobiliaria.agente.comingSoon')}
          >
            <PencilSimple className="w-4 h-4" />
            {t('inmobiliaria.agente.edit')}
          </button>
        </div>

        {/* Info Pills */}
        <div className="flex flex-wrap gap-2 mb-6">
          {/* Zone */}
          {agente.zone && (
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-neutral-100 dark:bg-neutral-800 text-sm text-neutral-700 dark:text-neutral-300">
              <MapPin className="w-4 h-4" />
              {agente.zone}
            </div>
          )}
          {/* Specialization */}
          {agente.specialization && (
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-neutral-100 dark:bg-neutral-800 text-sm text-neutral-700 dark:text-neutral-300">
              <Buildings className="w-4 h-4" />
              {specializationLabels[agente.specialization]}
            </div>
          )}
          {/* Hire Date */}
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-neutral-100 dark:bg-neutral-800 text-sm text-neutral-700 dark:text-neutral-300">
            <CalendarBlank className="w-4 h-4" />
            {t('inmobiliaria.agente.since')} {formatHireDate(agente.hireDate)}
          </div>
        </div>

        {/* Commission Split */}
        <div className="p-4 rounded-xl bg-neutral-50 dark:bg-[#141416] mb-6">
          <div className="flex items-center gap-2 mb-3">
            <Percent className="w-4 h-4 text-neutral-500" />
            <span className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
              {t('inmobiliaria.agente.commissionDistribution')}
            </span>
          </div>

          {/* Split Bar */}
          <div className="h-3 rounded-full bg-neutral-200 dark:bg-neutral-700 overflow-hidden flex mb-3">
            <div
              className="bg-primary transition-all"
              style={{ width: `${agentPercent}%` }}
            />
            <div
              className="bg-neutral-400 dark:bg-neutral-500"
              style={{ width: `${agencyPercent}%` }}
            />
          </div>

          {/* Labels */}
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-primary" />
              <span className="text-neutral-600 dark:text-neutral-400">
                {t('inmobiliaria.agente.agentLabel')}: <span className="font-semibold text-neutral-900 dark:text-white">{agentPercent}%</span>
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-neutral-400 dark:bg-neutral-500" />
              <span className="text-neutral-600 dark:text-neutral-400">
                {t('inmobiliaria.agente.agencyLabel')}: <span className="font-semibold text-neutral-900 dark:text-white">{agencyPercent}%</span>
              </span>
            </div>
          </div>
        </div>

        {/* Contact Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <a
            href={`mailto:${agente.email}`}
            className="flex-1 min-w-[120px] flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-white font-medium hover:opacity-90 transition-colors"
          >
            <Envelope className="w-4 h-4" />
            Email
          </a>
          <a
            href={`tel:${agente.phone}`}
            className="flex-1 min-w-[120px] flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-[#141416] text-neutral-700 dark:text-neutral-300 font-medium hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors"
          >
            <Phone className="w-4 h-4" />
            {t('inmobiliaria.agente.call')}
          </a>
          <a
            href={`https://wa.me/${whatsappNumber}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 min-w-[120px] flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-success text-white font-medium hover:bg-success transition-colors"
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
