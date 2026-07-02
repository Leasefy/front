'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { FileText, MapPin, Clock, CheckCircle, XCircle, ArrowUpRight, GridFour, List, CaretLeft, CaretRight, ListBullets, Warning } from '@phosphor-icons/react';
import { SegmentedControl, IconButton } from '@leasefy/cadence';

import { useTenantApplications } from '@/lib/hooks/useApplications';
import { cn } from '@/lib/utils';
import { useI18n } from '@/lib/i18n';
import { useOnboardingStatus } from '@/lib/hooks/use-onboarding-status';
import { CompleteProfileFirst } from '@/components/tenant/CompleteProfileFirst';
import { EmptyState } from '@/components/ui/empty-state';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import type { Contract } from '@/lib/types/contract';

const ITEMS_PER_PAGE = 4;

type DisplayStatusConfig = {
  label: string;
  color: string;
  icon: typeof CheckCircle;
  progress: number;
};

/**
 * Cuando la application está `approved` y existe un contrato, el badge y el próximo paso
 * reflejan el estado del CONTRATO (no de la application). Así el tenant ve "Firmado — pendiente
 * activar" en vez del genérico "Aprobada" cuando el proceso ya avanzó.
 */
function displayStatusForApproved(contract: Contract | undefined, locale: string): DisplayStatusConfig | null {
  if (!contract) return null;
  switch (contract.status) {
    case 'draft':
      return {
        label: locale === 'es' ? 'Contrato en preparación' : 'Contract being prepared',
        color: 'bg-[#F8F0E0] text-[#B7791F] dark:bg-[#B7791F]/15 dark:text-[#D2992F]',
        icon: Clock,
        progress: 100,
      };
    case 'pending_tenant':
      return {
        label: locale === 'es' ? 'Firmar contrato' : 'Sign contract',
        color: 'bg-[#EEF1FF] text-[#1A40FF] dark:bg-[#1A40FF]/15 dark:text-[#5570FF]',
        icon: Warning,
        progress: 100,
      };
    case 'pending_landlord':
      return {
        label: locale === 'es' ? 'Esperando firma del propietario' : 'Waiting for landlord signature',
        color: 'bg-[#F8F0E0] text-[#B7791F] dark:bg-[#B7791F]/15 dark:text-[#D2992F]',
        icon: Clock,
        progress: 100,
      };
    case 'rejected_pending_modifications':
      return {
        label: locale === 'es' ? 'Esperando cambios' : 'Waiting for changes',
        color: 'bg-[#F8F0E0] text-[#B7791F] dark:bg-[#B7791F]/15 dark:text-[#D2992F]',
        icon: Clock,
        progress: 100,
      };
    case 'signed':
      return {
        label: locale === 'es' ? 'Firmado — pendiente activar' : 'Signed — pending activation',
        color: 'bg-[#EEF1FF] text-[#1A40FF] dark:bg-[#1A40FF]/15 dark:text-[#5570FF]',
        icon: CheckCircle,
        progress: 100,
      };
    case 'active':
      return {
        label: locale === 'es' ? 'Contrato activo' : 'Contract active',
        color: 'bg-[#E8F3EC] text-[#2C7A53] dark:bg-[#2C7A53]/15 dark:text-[#3EAE70]',
        icon: CheckCircle,
        progress: 100,
      };
    case 'expired':
      return {
        label: locale === 'es' ? 'Contrato expirado' : 'Contract expired',
        color: 'bg-surface-muted text-fg-muted',
        icon: XCircle,
        progress: 100,
      };
    case 'cancelled':
      return {
        label: locale === 'es' ? 'Contrato cancelado' : 'Contract cancelled',
        color: 'bg-[#F8EAE7] text-[#C4503B] dark:bg-[#C4503B]/15 dark:text-[#E0664D]',
        icon: XCircle,
        progress: 100,
      };
    default:
      return null;
  }
}

/**
 * Próximo paso para una aplicación en estado `approved`. Depende del contrato asociado:
 * aún no existe, pendiente de firma del propietario, pendiente del tenant, etc.
 */
function nextStepForApproved(contract: Contract | undefined, locale: string): string {
  if (!contract) {
    return locale === 'es'
      ? 'Esperando que el propietario cree el contrato'
      : 'Waiting for the landlord to create the contract';
  }
  switch (contract.status) {
    case 'draft':
      return locale === 'es'
        ? 'El propietario está preparando el contrato'
        : 'The landlord is preparing the contract';
    case 'pending_tenant':
      return locale === 'es' ? 'Firmá el contrato (tu turno)' : 'Sign the contract (your turn)';
    case 'pending_landlord':
      return locale === 'es'
        ? 'Ya firmaste — esperando que el propietario firme'
        : 'You already signed — waiting for the landlord to sign';
    case 'rejected_pending_modifications':
      return locale === 'es'
        ? 'El propietario está corrigiendo los cambios que pediste'
        : 'The landlord is making the changes you requested';
    case 'signed':
      return locale === 'es'
        ? 'Firmado por ambas partes — esperando que empiece el contrato'
        : 'Signed by both parties — waiting for the contract to start';
    case 'active':
      return locale === 'es' ? 'Contrato activo' : 'Contract active';
    case 'expired':
      return locale === 'es' ? 'Contrato expirado' : 'Contract expired';
    case 'cancelled':
      return locale === 'es' ? 'Contrato cancelado' : 'Contract cancelled';
    default:
      return locale === 'es' ? 'Firmar contrato' : 'Sign contract';
  }
}

/**
 * Tenant Applications Page - Landing Style with List/Grid views and Pagination
 */
export default function AplicacionesPage() {
  const { t, locale, formatCurrency } = useI18n();
  const { isComplete: isOnboardingComplete, isLoading: isOnboardingLoading } = useOnboardingStatus();
  const { active: activeApplications, completed: completedApplications, contractsByApp, isLoading: isAppsLoading, error } = useTenantApplications();

  const [activeTab, setTab] = useState<'active' | 'completed'>('active');
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [currentPage, setCurrentPage] = useState(1);

  const formatShortDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString(locale === 'es' ? 'es-CL' : 'en-US', {
      day: 'numeric',
      month: 'short',
    });
  };

  const statusConfig: Record<string, { label: string; color: string; icon: typeof CheckCircle; progress: number }> = {
    submitted: {
      label: t('applications.steps.submitted'),
      color: 'bg-[#EEF1FF] text-[#1A40FF] dark:bg-[#1A40FF]/15 dark:text-[#5570FF]',
      icon: Clock,
      progress: 25
    },
    under_review: {
      label: t('applications.steps.review'),
      color: 'bg-[#F8F0E0] text-[#B7791F] dark:bg-[#B7791F]/15 dark:text-[#D2992F]',
      icon: Clock,
      progress: 50
    },
    needs_info: {
      label: locale === 'es' ? 'Info. requerida' : 'Info required',
      color: 'bg-[#F8F0E0] text-[#B7791F] dark:bg-[#B7791F]/15 dark:text-[#D2992F]',
      icon: Warning,
      progress: 30
    },
    pre_approved: {
      label: locale === 'es' ? 'Pre-aprobada' : 'Pre-approved',
      color: 'bg-[#E8F3EC] text-[#2C7A53] dark:bg-[#2C7A53]/15 dark:text-[#3EAE70]',
      icon: CheckCircle,
      progress: 75
    },
    approved: {
      label: t('applications.steps.approved'),
      color: 'bg-[#E8F3EC] text-[#2C7A53] dark:bg-[#2C7A53]/15 dark:text-[#3EAE70]',
      icon: CheckCircle,
      progress: 100
    },
    rejected: {
      label: t('applications.rejected'),
      color: 'bg-[#F8EAE7] text-[#C4503B] dark:bg-[#C4503B]/15 dark:text-[#E0664D]',
      icon: XCircle,
      progress: 100
    },
    withdrawn: {
      label: t('applications.withdrawn'),
      color: 'bg-surface-muted text-fg-muted',
      icon: XCircle,
      progress: 100
    },
    contract_failed: {
      label: locale === 'es' ? 'Contrato fallido' : 'Contract failed',
      color: 'bg-[#F8EAE7] text-[#C4503B] dark:bg-[#C4503B]/15 dark:text-[#E0664D]',
      icon: XCircle,
      progress: 100,
    },
  };

  const currentApplications = activeTab === 'active' ? activeApplications : completedApplications;

  // Pagination logic
  const totalPages = Math.ceil(currentApplications.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedApplications = currentApplications.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  // Reset page when changing tabs
  const handleTabChange = (tab: 'active' | 'completed') => {
    setTab(tab);
    setCurrentPage(1);
  };

  // Loading state
  if (isOnboardingLoading || isAppsLoading) {
    return (
      <div className="min-h-screen bg-[#f8f8f8] dark:bg-[#0e0e10] flex items-center justify-center">
        <Spinner size="lg" variant="current" className="text-primary" />
      </div>
    );
  }

  // Show "complete profile first" if onboarding not done
  if (!isOnboardingComplete) {
    return (
      <div className="min-h-screen bg-[#f8f8f8] dark:bg-[#0e0e10]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 sm:py-10">
          <CompleteProfileFirst context="applications" />
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-[#f8f8f8] dark:bg-[#0e0e10]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 sm:py-10">
          <EmptyState
            icon={XCircle}
            title={locale === 'es' ? 'Error al cargar aplicaciones' : 'Error loading applications'}
            description={error}
            action={{ label: locale === 'es' ? 'Reintentar' : 'Retry', href: '/inquilino/aplicaciones' }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8f8f8] dark:bg-[#0e0e10]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 sm:py-10">

        {/* Header */}
        <motion.header
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-3xl font-medium text-fg dark:text-white tracking-tight">
            {t('applications.title')}
          </h1>
          <p className="mt-1 text-fg-muted dark:text-fg-subtle">
            {t('applications.subtitle')}
          </p>
        </motion.header>

        {/* Stats Grid */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8"
        >
          <div className="rounded-xl bg-surface-muted dark:bg-[#1a1a1c] p-6">
            <div className="w-10 h-10 rounded-xl bg-surface dark:bg-[#2a2a2c] flex items-center justify-center mb-4">
              <FileText className="w-5 h-5 text-fg dark:text-fg-subtle" />
            </div>
            <p className="text-sm text-fg-muted dark:text-fg-subtle mb-1">{locale === 'es' ? 'Total aplicaciones' : 'Total applications'}</p>
            <p className="text-3xl font-bold text-fg dark:text-white tracking-tight">
              {activeApplications.length + completedApplications.length}
            </p>
            <p className="text-sm text-fg-muted dark:text-fg-subtle mt-2">{locale === 'es' ? 'Todas tus aplicaciones' : 'All your applications'}</p>
          </div>

          <div className="rounded-xl bg-[#EEF1FF] dark:bg-[#1A40FF]/12 border border-[#1A40FF]/30 dark:border-[#1A40FF]/40 p-6">
            <div className="w-10 h-10 rounded-xl bg-surface dark:bg-[#2a2a2c] flex items-center justify-center mb-4">
              <Clock className="w-5 h-5 text-[#1A40FF] dark:text-[#5570FF]" />
            </div>
            <p className="text-sm text-[#1A40FF] dark:text-[#5570FF] mb-1">{locale === 'es' ? 'En proceso' : 'In progress'}</p>
            <p className="text-3xl font-bold text-fg dark:text-white tracking-tight">
              {activeApplications.length}
            </p>
            <p className="text-sm text-fg-muted dark:text-fg-subtle mt-2">{t('applications.active')}</p>
          </div>

          <div className="rounded-xl bg-surface-muted dark:bg-[#1a1a1c] p-6">
            <div className="w-10 h-10 rounded-xl bg-surface dark:bg-[#2a2a2c] flex items-center justify-center mb-4">
              <CheckCircle className="w-5 h-5 text-[#2C7A53] dark:text-[#3EAE70]" />
            </div>
            <p className="text-sm text-fg-muted dark:text-fg-subtle mb-1">{locale === 'es' ? 'Completadas' : 'Completed'}</p>
            <p className="text-3xl font-bold text-fg dark:text-white tracking-tight">
              {completedApplications.length}
            </p>
            <p className="text-sm text-fg-muted dark:text-fg-subtle mt-2">{locale === 'es' ? 'Aprobadas o rechazadas' : 'Approved or rejected'}</p>
          </div>
        </motion.div>

        {/* Controls: Tabs + View Toggle */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6"
        >
          {/* Tabs — Cadence SegmentedControl */}
          <SegmentedControl
            value={activeTab}
            onChange={handleTabChange}
            aria-label={locale === 'es' ? 'Filtrar aplicaciones' : 'Filter applications'}
            options={[
              {
                value: 'active',
                label: (
                  <span className="inline-flex items-center">
                    {locale === 'es' ? 'En Proceso' : 'In Progress'}
                    {activeApplications.length > 0 && (
                      <Badge variant="default" className="ml-2 h-auto bg-primary-soft px-2 py-0.5 font-mono tabular-nums text-primary">
                        {activeApplications.length}
                      </Badge>
                    )}
                  </span>
                ),
              },
              {
                value: 'completed',
                label: (
                  <span className="inline-flex items-center">
                    {locale === 'es' ? 'Historial' : 'History'}
                    {completedApplications.length > 0 && (
                      <Badge variant="default" className="ml-2 h-auto bg-primary-soft px-2 py-0.5 font-mono tabular-nums text-primary">
                        {completedApplications.length}
                      </Badge>
                    )}
                  </span>
                ),
              },
            ]}
          />

          {/* View Toggle */}
          <div className="flex items-center gap-1 p-1 bg-surface-muted dark:bg-[#1a1a1c] rounded-full w-fit">
            <IconButton
              variant="ghost"
              onClick={() => setViewMode('list')}
              aria-pressed={viewMode === 'list'}
              className={cn(
                'p-2 rounded-full',
                viewMode === 'list'
                  ? 'bg-surface dark:bg-[#2a2a2c] text-fg dark:text-white'
                  : 'text-fg-muted dark:text-fg-subtle hover:text-fg dark:hover:text-fg-subtle'
              )}
              title={locale === 'es' ? 'Vista de lista' : 'List view'}
              aria-label={locale === 'es' ? 'Vista de lista' : 'List view'}
              icon={<ListBullets className="w-4 h-4" />}
            />
            <IconButton
              variant="ghost"
              onClick={() => setViewMode('grid')}
              aria-pressed={viewMode === 'grid'}
              className={cn(
                'p-2 rounded-full',
                viewMode === 'grid'
                  ? 'bg-surface dark:bg-[#2a2a2c] text-fg dark:text-white'
                  : 'text-fg-muted dark:text-fg-subtle hover:text-fg dark:hover:text-fg-subtle'
              )}
              title={locale === 'es' ? 'Vista de cuadrícula' : 'Grid view'}
              aria-label={locale === 'es' ? 'Vista de cuadrícula' : 'Grid view'}
              icon={<GridFour className="w-4 h-4" />}
            />
          </div>
        </motion.div>

        {/* Applications */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          {paginatedApplications.length > 0 ? (
            <>
              {/* List View */}
              {viewMode === 'list' && (
                <div className="space-y-4">
                  {paginatedApplications.map((application, index) => {
                    const fallbackStatus = statusConfig[application.status] || statusConfig.submitted;
                    const contractStatus = application.status === 'approved'
                      ? displayStatusForApproved(contractsByApp[application.id], locale)
                      : null;
                    const status = contractStatus ?? fallbackStatus;
                    const StatusIcon = status.icon;

                    return (
                      <motion.div
                        key={application.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                      >
                        <Link href={`/inquilino/aplicaciones/${application.id}`}>
                          <div className="group rounded-xl border border-border dark:border-border-strong bg-surface dark:bg-[#1a1a1c] hover:border-border dark:hover:border-border-strong hover: transition-all duration-300 overflow-hidden">
                            <div className="flex flex-col lg:flex-row">
                              {/* Image */}
                              <div className="relative w-full lg:w-72 h-52 lg:h-auto flex-shrink-0">
                                <Image
                                  src={application.property?.thumbnail || '/placeholder-property.jpg'}
                                  alt={application.property?.title || 'Propiedad'}
                                  fill
                                  quality={90}
                                  sizes="(max-width: 1024px) 100vw, 288px"
                                  priority={index === 0}
                                  className="object-cover transition-transform duration-500 group-hover:scale-105"
                                />
                                <div className="absolute top-4 left-4">
                                  <span className={cn(
                                    'px-3 py-1.5 text-xs font-medium rounded-full flex items-center gap-1.5',
                                    status.color
                                  )}>
                                    <StatusIcon className="w-3 h-3" />
                                    {status.label}
                                  </span>
                                </div>
                              </div>

                              {/* Content */}
                              <div className="flex-1 p-6">
                                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-4">
                                  <div>
                                    <h3 className="text-lg font-semibold text-fg dark:text-white group-hover:text-[#1A40FF] dark:group-hover:text-[#1A40FF] transition-colors">
                                      {application.property?.title || 'Propiedad'}
                                    </h3>
                                    <p className="text-sm text-fg-muted dark:text-fg-subtle mt-1 flex items-center gap-1.5">
                                      <MapPin className="w-3.5 h-3.5" />
                                      {application.property?.neighborhood}, {application.property?.city}
                                    </p>
                                  </div>
                                  <div className="sm:text-right">
                                    <p className="text-2xl font-bold text-fg dark:text-white">
                                      {formatCurrency(application.property?.monthlyRent || 0)}
                                    </p>
                                    <p className="text-xs text-fg-muted dark:text-fg-subtle">/mes</p>
                                  </div>
                                </div>

                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 py-4 border-y border-border-faint dark:border-border-strong">
                                  <div>
                                    <p className="text-xs text-fg-subtle mb-1">{locale === 'es' ? 'Código' : 'Code'}</p>
                                    <p className="text-sm font-mono font-medium text-fg dark:text-white">
                                      {application.trackingCode}
                                    </p>
                                  </div>
                                  <div>
                                    <p className="text-xs text-fg-subtle mb-1">{locale === 'es' ? 'Enviada' : 'Submitted'}</p>
                                    <p className="text-sm font-medium text-fg dark:text-white">
                                      {formatShortDate(application.submittedAt)}
                                    </p>
                                  </div>
                                  <div>
                                    <p className="text-xs text-fg-subtle mb-1">{locale === 'es' ? 'Actualizada' : 'Updated'}</p>
                                    <p className="text-sm font-medium text-fg dark:text-white">
                                      {formatShortDate(application.updatedAt)}
                                    </p>
                                  </div>
                                  <div>
                                    <p className="text-xs text-fg-subtle mb-1">{locale === 'es' ? 'Progreso' : 'Progress'}</p>
                                    <p className="text-sm font-medium text-fg dark:text-white">{status.progress}%</p>
                                  </div>
                                </div>

                                <div className="mt-4">
                                  <div className="flex items-center justify-between text-xs text-fg-muted dark:text-fg-subtle mb-2">
                                    <span>{locale === 'es' ? 'Progreso de aplicación' : 'Application progress'}</span>
                                    <span>{status.progress}% {locale === 'es' ? 'completado' : 'complete'}</span>
                                  </div>
                                  <div className="h-2 bg-surface-muted dark:bg-surface-muted rounded-full overflow-hidden">
                                    <div
                                      className={cn(
                                        "h-full rounded-full transition-all duration-500",
                                        application.status === 'rejected' || application.status === 'withdrawn' || application.status === 'contract_failed'
                                          ? "bg-[#C4503B]"
                                          : application.status === 'approved' || application.status === 'pre_approved'
                                          ? "bg-[#2C7A53]"
                                          : application.status === 'needs_info'
                                          ? "bg-[#B7791F]"
                                          : "bg-[#1A40FF]"
                                      )}
                                      style={{ width: `${status.progress}%` }}
                                    />
                                  </div>
                                </div>

                                <div className="flex items-center justify-between mt-4 p-4 bg-surface-muted dark:bg-[#2a2a2c] rounded-xl">
                                  <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-surface dark:bg-[#1a1a1c] flex items-center justify-center">
                                      <FileText className="w-5 h-5 text-fg-muted dark:text-fg-subtle" />
                                    </div>
                                    <div>
                                      <p className="text-xs text-fg-muted dark:text-fg-subtle">{locale === 'es' ? 'Próximo paso' : 'Next step'}</p>
                                      <p className={cn(
                                        'text-sm font-semibold',
                                        application.status === 'needs_info'
                                          ? 'text-[#B7791F] dark:text-[#D2992F]'
                                          : 'text-fg dark:text-white'
                                      )}>
                                        {application.status === 'submitted' && (locale === 'es' ? 'Esperando revisión' : 'Waiting for review')}
                                        {application.status === 'under_review' && (locale === 'es' ? 'En evaluación de documentos' : 'Document evaluation')}
                                        {application.status === 'needs_info' && (locale === 'es' ? '⚠ Completar información solicitada' : '⚠ Complete requested information')}
                                        {application.status === 'pre_approved' && (locale === 'es' ? 'Agendar visita' : 'Schedule visit')}
                                        {application.status === 'approved' && nextStepForApproved(contractsByApp[application.id], locale)}
                                        {application.status === 'rejected' && (locale === 'es' ? 'Proceso cerrado — explorá alternativas' : 'Process closed — explore alternatives')}
                                        {application.status === 'withdrawn' && (locale === 'es' ? 'Aplicación cerrada' : 'Application closed')}
                                        {application.status === 'contract_failed' && (locale === 'es' ? 'Contrato no prosperó — crear nueva aplicación' : 'Contract didn\'t succeed — create a new application')}
                                      </p>
                                    </div>
                                  </div>
                                  <span className="flex items-center gap-1 text-sm font-medium text-[#1A40FF] dark:text-[#5570FF] group-hover:text-[#1A40FF] dark:group-hover:text-[#1A40FF] transition-colors">
                                    {locale === 'es' ? 'Ver detalle' : 'View details'}
                                    <ArrowUpRight className="w-4 h-4" />
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </Link>
                      </motion.div>
                    );
                  })}
                </div>
              )}

              {/* Grid View */}
              {viewMode === 'grid' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                  {paginatedApplications.map((application, index) => {
                    const fallbackStatus = statusConfig[application.status] || statusConfig.submitted;
                    const contractStatus = application.status === 'approved'
                      ? displayStatusForApproved(contractsByApp[application.id], locale)
                      : null;
                    const status = contractStatus ?? fallbackStatus;
                    const StatusIcon = status.icon;

                    return (
                      <motion.div
                        key={application.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                      >
                        <Link href={`/inquilino/aplicaciones/${application.id}`}>
                          <div className="group rounded-xl border border-border dark:border-border-strong bg-surface dark:bg-[#1a1a1c] hover:border-border dark:hover:border-border-strong hover: transition-all duration-300 overflow-hidden h-full flex flex-col">
                            {/* Image */}
                            <div className="relative aspect-[4/3] overflow-hidden">
                              <Image
                                src={application.property?.thumbnail || '/placeholder-property.jpg'}
                                alt={application.property?.title || 'Propiedad'}
                                fill
                                quality={90}
                                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                                className="object-cover transition-transform duration-500 group-hover:scale-105"
                              />
                              <div className="absolute top-3 left-3">
                                <span className={cn(
                                  'px-2.5 py-1 text-xs font-medium rounded-full flex items-center gap-1',
                                  status.color
                                )}>
                                  <StatusIcon className="w-3 h-3" />
                                  {status.label}
                                </span>
                              </div>
                            </div>

                            {/* Content */}
                            <div className="p-4 flex-1 flex flex-col">
                              <div className="flex-1">
                                <h3 className="font-semibold text-fg dark:text-white group-hover:text-[#1A40FF] dark:group-hover:text-[#1A40FF] transition-colors line-clamp-1 mb-1">
                                  {application.property?.title || 'Propiedad'}
                                </h3>
                                <p className="text-sm text-fg-muted dark:text-fg-subtle flex items-center gap-1 mb-3">
                                  <MapPin className="w-3 h-3 flex-shrink-0" />
                                  <span className="truncate">{application.property?.neighborhood}, {application.property?.city}</span>
                                </p>

                                <div className="flex items-center justify-between mb-3">
                                  <p className="text-lg font-bold text-fg dark:text-white">
                                    {formatCurrency(application.property?.monthlyRent || 0)}
                                    <span className="text-xs font-normal text-fg-muted dark:text-fg-subtle">/mes</span>
                                  </p>
                                  <span className="text-xs font-mono text-fg-subtle">
                                    {application.trackingCode}
                                  </span>
                                </div>

                                {/* Progress Bar */}
                                <div className="mb-3">
                                  <div className="flex items-center justify-between text-xs text-fg-subtle mb-1">
                                    <span>{locale === 'es' ? 'Progreso' : 'Progress'}</span>
                                    <span>{status.progress}%</span>
                                  </div>
                                  <div className="h-1.5 bg-surface-muted dark:bg-surface-muted rounded-full overflow-hidden">
                                    <div
                                      className={cn(
                                        "h-full rounded-full transition-all duration-500",
                                        application.status === 'rejected' || application.status === 'withdrawn' || application.status === 'contract_failed'
                                          ? "bg-[#C4503B]"
                                          : application.status === 'approved' || application.status === 'pre_approved'
                                          ? "bg-[#2C7A53]"
                                          : application.status === 'needs_info'
                                          ? "bg-[#B7791F]"
                                          : "bg-[#1A40FF]"
                                      )}
                                      style={{ width: `${status.progress}%` }}
                                    />
                                  </div>
                                </div>
                              </div>

                              {/* Footer */}
                              <div className="pt-3 border-t border-border-faint dark:border-border-strong flex items-center justify-between">
                                <span className="text-xs text-fg-muted dark:text-fg-subtle">
                                  {formatShortDate(application.updatedAt)}
                                </span>
                                <span className="flex items-center gap-1 text-xs font-medium text-[#1A40FF] dark:text-[#5570FF] group-hover:text-[#1A40FF] dark:group-hover:text-[#1A40FF] transition-colors">
                                  {locale === 'es' ? 'Ver detalle' : 'View details'}
                                  <ArrowUpRight className="w-3 h-3" />
                                </span>
                              </div>
                            </div>
                          </div>
                        </Link>
                      </motion.div>
                    );
                  })}
                </div>
              )}

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 mt-8">
                  <IconButton
                    variant="ghost"
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className={cn(
                      'p-2 rounded-full',
                      currentPage === 1
                        ? 'text-fg-subtle dark:text-fg-muted cursor-not-allowed'
                        : 'text-fg-muted dark:text-fg-subtle hover:bg-surface-muted dark:hover:bg-[#2a2a2c]'
                    )}
                    aria-label={locale === 'es' ? 'Página anterior' : 'Previous page'}
                    icon={<CaretLeft className="w-5 h-5" />}
                  />

                  <div className="flex items-center gap-1">
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                      <Button
                        key={page}
                        variant="ghost"
                        hideArrow
                        onClick={() => setCurrentPage(page)}
                        aria-current={currentPage === page ? 'page' : undefined}
                        className={cn(
                          'w-10 h-10 rounded-full p-0 text-sm font-medium',
                          currentPage === page
                            ? 'bg-ink dark:bg-surface text-white dark:text-fg'
                            : 'text-fg-muted dark:text-fg-subtle hover:bg-surface-muted dark:hover:bg-[#2a2a2c]'
                        )}
                      >
                        {page}
                      </Button>
                    ))}
                  </div>

                  <IconButton
                    variant="ghost"
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className={cn(
                      'p-2 rounded-full',
                      currentPage === totalPages
                        ? 'text-fg-subtle dark:text-fg-muted cursor-not-allowed'
                        : 'text-fg-muted dark:text-fg-subtle hover:bg-surface-muted dark:hover:bg-[#2a2a2c]'
                    )}
                    aria-label={locale === 'es' ? 'Página siguiente' : 'Next page'}
                    icon={<CaretRight className="w-5 h-5" />}
                  />
                </div>
              )}

              {/* Results info */}
              <p className="text-center text-sm text-fg-muted dark:text-fg-subtle mt-4">
                {locale === 'es'
                  ? `Mostrando ${startIndex + 1}-${Math.min(startIndex + ITEMS_PER_PAGE, currentApplications.length)} de ${currentApplications.length} aplicaciones`
                  : `Showing ${startIndex + 1}-${Math.min(startIndex + ITEMS_PER_PAGE, currentApplications.length)} of ${currentApplications.length} applications`}
              </p>
            </>
          ) : (
            <EmptyState
              icon={FileText}
              title={activeTab === 'active'
                ? (locale === 'es' ? 'No tienes aplicaciones en proceso' : 'No applications in progress')
                : (locale === 'es' ? 'No tienes aplicaciones completadas' : 'No completed applications')
              }
              description={activeTab === 'active'
                ? (locale === 'es'
                    ? 'Explora propiedades disponibles y aplica para comenzar tu proceso de arriendo.'
                    : 'Explore available properties and apply to start your rental process.')
                : (locale === 'es'
                    ? 'Las aplicaciones aprobadas o rechazadas aparecerán aquí.'
                    : 'Approved or rejected applications will appear here.')
              }
              action={activeTab === 'active' ? { label: locale === 'es' ? 'Buscar propiedades' : 'Browse properties', href: '/inquilino/explorar' } : undefined}
            />
          )}
        </motion.section>

      </div>
    </div>
  );
}
