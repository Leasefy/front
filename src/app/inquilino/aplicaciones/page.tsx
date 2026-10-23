'use client';

import { EncabezadoDePantalla } from '@/components/pantalla/EncabezadoDePantalla';
import { useId, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { FileText, MapPin, Clock, CheckCircle, XCircle, GridFour, List, CaretLeft, CaretRight, ListBullets, Warning } from '@phosphor-icons/react';
import { IconButton, CrossFade, MotionIndicator, MonoLabel, StatusBadge } from '@leasefy/cadence';
import { PestanasDeEstado } from '@/components/pantalla/PestanasDeEstado';
import { useEntradaTrasCargar } from '@/components/portales/use-entrada-tras-cargar';

import { useTenantApplications } from '@/lib/hooks/useApplications';
import { cn } from '@/lib/utils';
import { useI18n } from '@/lib/i18n';
import { useOnboardingStatus } from '@/lib/hooks/use-onboarding-status';
import { CompleteProfileFirst } from '@/components/tenant/CompleteProfileFirst';
import { EmptyState } from '@/components/ui/empty-state';
import { FalloDeCarga } from '@/components/estado/FalloDeCarga';
import { Button } from '@/components/ui/button';
import { EsqueletoDePagina } from '@/components/estado/EsqueletoDePagina';
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
        color: 'bg-warning-soft text-warning',
        icon: Clock,
        progress: 100,
      };
    case 'pending_tenant':
      return {
        label: locale === 'es' ? 'Firmar contrato' : 'Sign contract',
        color: 'bg-primary-soft text-primary',
        icon: Warning,
        progress: 100,
      };
    case 'pending_landlord':
      return {
        label: locale === 'es' ? 'Esperando firma del propietario' : 'Waiting for landlord signature',
        color: 'bg-warning-soft text-warning',
        icon: Clock,
        progress: 100,
      };
    case 'rejected_pending_modifications':
      return {
        label: locale === 'es' ? 'Esperando cambios' : 'Waiting for changes',
        color: 'bg-warning-soft text-warning',
        icon: Clock,
        progress: 100,
      };
    case 'signed':
      return {
        label: locale === 'es' ? 'Firmado — pendiente activar' : 'Signed — pending activation',
        color: 'bg-primary-soft text-primary',
        icon: CheckCircle,
        progress: 100,
      };
    case 'active':
      return {
        label: locale === 'es' ? 'Contrato activo' : 'Contract active',
        color: 'bg-success-soft text-success',
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
        color: 'bg-danger-soft text-danger',
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
      return locale === 'es' ? 'Firma el contrato (tu turno)' : 'Sign the contract (your turn)';
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
/** El tono del StatusBadge desde el color que ya decide el estado de la postulación. */
function tonoDelColor(color: string): 'success' | 'warning' | 'critical' | 'info' | 'neutral' {
  if (color.includes('success')) return 'success';
  if (color.includes('warning')) return 'warning';
  if (color.includes('danger')) return 'critical';
  if (color.includes('primary')) return 'info';
  return 'neutral';
}

export default function AplicacionesPage() {
  const { t, locale, formatCurrency } = useI18n();
  const router = useRouter();
  // Statuses where scheduling a property visit still makes sense.
  const canScheduleVisit = (s: string) =>
    ['submitted', 'under_review', 'needs_info'].includes(s);
  const { isComplete: isOnboardingComplete, isLoading: isOnboardingLoading } = useOnboardingStatus();
  const { active: activeApplications, completed: completedApplications, contractsByApp, isLoading: isAppsLoading, error, errorCrudo, refetch: recargarPostulaciones } = useTenantApplications();

  const [activeTab, setTab] = useState<'active' | 'completed'>('active');
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [currentPage, setCurrentPage] = useState(1);
  // La píldora de la vista activa (lista/cuadrícula) se desliza de un botón al otro.
  const idDeLaVista = useId();

  const formatShortDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString(locale === 'es' ? 'es-CO' : 'en-US', {
      day: 'numeric',
      month: 'short',
    });
  };

  const statusConfig: Record<string, { label: string; color: string; icon: typeof CheckCircle; progress: number }> = {
    submitted: {
      label: t('applications.steps.submitted'),
      color: 'bg-primary-soft text-primary',
      icon: Clock,
      progress: 20
    },
    under_review: {
      label: t('applications.steps.review'),
      color: 'bg-warning-soft text-warning',
      icon: Clock,
      progress: 60
    },
    needs_info: {
      label: locale === 'es' ? 'Info. requerida' : 'Info required',
      color: 'bg-warning-soft text-warning',
      icon: Warning,
      progress: 30
    },
    approved: {
      label: t('applications.steps.approved'),
      color: 'bg-success-soft text-success',
      icon: CheckCircle,
      progress: 100
    },
    rejected: {
      label: t('applications.rejected'),
      color: 'bg-danger-soft text-danger',
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
      color: 'bg-danger-soft text-danger',
      icon: XCircle,
      progress: 100,
    },
    // QA-IA-A: el inmueble quedó para otra persona. No es un rechazo.
    no_adjudicado: {
      label: locale === 'es' ? 'Quedó para otra persona' : 'Went to someone else',
      color: 'bg-surface-muted text-fg-muted',
      icon: XCircle,
      progress: 100,
    },
  };

  const currentApplications = activeTab === 'active' ? activeApplications : completedApplications;
  /*
   * Sin ninguna postulación no hay nada que resumir, filtrar ni ver de dos
   * formas. Los KPI en cero, las pestañas y el conmutador lista/tarjetas eran
   * andamiaje alrededor de un vacío: ocupaban la pantalla y empujaban abajo lo
   * único que importa ahí, que es cómo empezar.
   */
  const sinPostulaciones = activeApplications.length + completedApplications.length === 0;

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
  // Carga → contenido: entra con 4 px sólo si se vio el esqueleto.
  const entrada = useEntradaTrasCargar(isOnboardingLoading || isAppsLoading);
  if (isOnboardingLoading || isAppsLoading) {
    return (
      <div className="min-h-screen bg-bg">
        {/* Dentro del panel va el esqueleto, no el logo (Nico, 01-10: «el logo sólo en cargas de pantalla completa»). */}
        <EsqueletoDePagina variante="list" className="mx-auto max-w-7xl" />
      </div>
    );
  }

  // Show "complete profile first" if onboarding not done
  if (!isOnboardingComplete) {
    return (
      <div className="min-h-screen bg-bg">
        <div className="p-6 lg:p-8">
          <CompleteProfileFirst context="applications" />
        </div>
      </div>
    );
  }

  // Un fallo NO es un vacío. Antes se pintaba con `EmptyState` —el cartel de
  // «no hay nada»— y su «Reintentar» era un <a> a esta misma ruta: en el App
  // Router eso no vuelve a pedir nada, así que el botón no hacía absolutamente
  // nada. `FalloDeCarga` clasifica el fallo y reintenta de verdad.
  if (error) {
    return (
      <div className="min-h-screen bg-bg">
        <div className="p-6 lg:p-8">
          <FalloDeCarga
            error={errorCrudo ?? error}
            queEs="tus postulaciones"
            onReintentar={recargarPostulaciones}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg">
      <motion.div {...entrada} className="space-y-6 p-6 lg:p-8">

        {/* Header */}
        <EncabezadoDePantalla
          className="mb-8"
          seccion={locale === 'es' ? 'Buscar arriendo' : 'Find a rental'}
          titulo={t('applications.title')}
          descripcion={t('applications.subtitle')}
        />

        {/* GLOW UP (22-10): aquí iban tres cifras (todas, en proceso, cerradas) que repetían los números de las
            pestañas de abajo. Cada postulación dice su estado; las pestañas cuentan. */}

        {/* Controls: Tabs + View Toggle */}
        {!sinPostulaciones && (
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          {/* Las pestañas de estado de todas las pantallas (antes, un SegmentedControl con el conteo en una
              pastilla voltaje: el azul es para la acción, no para un número). */}
          <PestanasDeEstado
            etiqueta={locale === 'es' ? 'Filtrar postulaciones' : 'Filter applications'}
            valor={activeTab}
            onCambio={handleTabChange}
            pestanas={[
              { valor: 'active', etiqueta: locale === 'es' ? 'En proceso' : 'In progress', cuantos: activeApplications.length, fija: true, testid: 'pestana-en-proceso' },
              { valor: 'completed', etiqueta: locale === 'es' ? 'Historial' : 'History', cuantos: completedApplications.length, fija: true, testid: 'pestana-historial' },
            ]}
          />

          {/* View Toggle — el fondo blanco del activo es un `MotionIndicator`
              que se desliza al otro botón (antes saltaba). */}
          <div className="flex items-center gap-1 p-1 bg-surface-muted rounded-full w-fit">
            <span className="relative isolate inline-flex rounded-full">
              {viewMode === 'list' && (
                <MotionIndicator layoutId={`${idDeLaVista}-vista`} className="inset-0 -z-10 rounded-full bg-surface" />
              )}
              <IconButton
                variant="ghost"
                onClick={() => setViewMode('list')}
                aria-pressed={viewMode === 'list'}
                className={cn(
                  'p-2 rounded-full',
                  viewMode === 'list'
                    ? 'text-fg'
                    : 'text-fg-muted hover:text-fg'
                )}
                title={locale === 'es' ? 'Vista de lista' : 'List view'}
                aria-label={locale === 'es' ? 'Vista de lista' : 'List view'}
                icon={<ListBullets className="w-4 h-4" />}
              />
            </span>
            <span className="relative isolate inline-flex rounded-full">
              {viewMode === 'grid' && (
                <MotionIndicator layoutId={`${idDeLaVista}-vista`} className="inset-0 -z-10 rounded-full bg-surface" />
              )}
              <IconButton
                variant="ghost"
                onClick={() => setViewMode('grid')}
                aria-pressed={viewMode === 'grid'}
                className={cn(
                  'p-2 rounded-full',
                  viewMode === 'grid'
                    ? 'text-fg'
                    : 'text-fg-muted hover:text-fg'
                )}
                title={locale === 'es' ? 'Vista de cuadrícula' : 'Grid view'}
                aria-label={locale === 'es' ? 'Vista de cuadrícula' : 'Grid view'}
                icon={<GridFour className="w-4 h-4" />}
              />
            </span>
          </div>
        </div>
        )}

        {/* Applications — cambiar de pestaña, de vista o de página cruza el
            contenido (sale el viejo en 150 ms y entra el nuevo). */}
        <section>
          <CrossFade swapKey={`${activeTab}-${viewMode}-${currentPage}`}>
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

                    return (
                      <div key={application.id}>
                        <Link href={`/inquilino/aplicaciones/${application.id}`}>
                          <div className="group rounded-lg border border-border bg-surface hover:border-border-strong transition-colors duration-slow overflow-hidden">
                            <div className="flex flex-col lg:flex-row">
                              {/* Image */}
                              <div className="relative w-full lg:w-72 h-52 lg:h-auto flex-shrink-0">
                                <Image
                                  src={application.property?.thumbnail || '/placeholder-property.svg'}
                                  alt={application.property?.title || 'Propiedad'}
                                  fill
                                  quality={90}
                                  sizes="(max-width: 1024px) 100vw, 288px"
                                  priority={index === 0}
                                  className="object-cover transition-transform duration-reveal group-hover:scale-105"
                                />
                                <div className="absolute top-4 left-4">
                                  <StatusBadge tone={tonoDelColor(status.color)} className="bg-surface/90 backdrop-blur-sm">
                                    {status.label}
                                  </StatusBadge>
                                </div>
                              </div>

                              {/* Content */}
                              <div className="flex-1 p-6">
                                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-4">
                                  <div>
                                    <h3 className="text-h3 text-fg group-hover:text-primary transition-colors [text-wrap:balance]">
                                      {application.property?.title || 'Propiedad'}
                                    </h3>
                                    <p className="text-sm text-fg-muted mt-1 flex items-center gap-1.5">
                                      <MapPin className="w-3.5 h-3.5" />
                                      {application.property?.neighborhood}, {application.property?.city}
                                    </p>
                                  </div>
                                  <div className="sm:text-right">
                                    <p className="font-mono text-h3 tabular-nums text-fg">
                                      {formatCurrency(application.property?.monthlyRent || 0)}
                                    </p>
                                    <p className="text-caption text-fg-muted">{locale === 'es' ? 'al mes' : 'per month'}</p>
                                  </div>
                                </div>

                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 py-4 border-y border-border-faint">
                                  <div>
                                    <MonoLabel className="mb-1 block text-fg-subtle">{locale === 'es' ? 'Código' : 'Code'}</MonoLabel>
                                    <p className="text-sm font-mono font-medium text-fg">
                                      {application.trackingCode}
                                    </p>
                                  </div>
                                  <div>
                                    <MonoLabel className="mb-1 block text-fg-subtle">{locale === 'es' ? 'Enviada' : 'Submitted'}</MonoLabel>
                                    <p className="text-sm font-medium text-fg">
                                      {formatShortDate(application.submittedAt)}
                                    </p>
                                  </div>
                                  <div>
                                    <MonoLabel className="mb-1 block text-fg-subtle">{locale === 'es' ? 'Actualizada' : 'Updated'}</MonoLabel>
                                    <p className="text-sm font-medium text-fg">
                                      {formatShortDate(application.updatedAt)}
                                    </p>
                                  </div>
                                  <div>
                                    <MonoLabel className="mb-1 block text-fg-subtle">{locale === 'es' ? 'Progreso' : 'Progress'}</MonoLabel>
                                    <p className="font-mono text-sm tabular-nums text-fg">{status.progress} %</p>
                                  </div>
                                </div>

                                <div className="mt-4">
                                  <div className="flex items-center justify-between text-caption text-fg-muted mb-2">
                                    <span>{locale === 'es' ? 'Progreso de tu postulación' : 'Application progress'}</span>
                                    <span>{status.progress}% {locale === 'es' ? 'completado' : 'complete'}</span>
                                  </div>
                                  <div className="h-2 bg-surface-muted rounded-full overflow-hidden">
                                    <div
                                      className={cn(
                                        "h-full w-full rounded-full transition-transform duration-slow ease-enter",
                                        application.status === 'rejected' || application.status === 'withdrawn' || application.status === 'contract_failed'
                                          ? "bg-danger"
                                          : application.status === 'approved'
                                          ? "bg-success"
                                          : application.status === 'needs_info'
                                          ? "bg-warning"
                                          : "bg-primary"
                                      )}
                                      style={{ transform: `translateX(${status.progress - 100}%)` }}
                                    />
                                  </div>
                                </div>

                                <div className="flex flex-wrap items-center justify-between gap-3 mt-4 p-4 bg-surface-muted rounded-lg">
                                  <div className="flex items-center gap-3 min-w-0">
                                    <div className="min-w-0">
                                      <MonoLabel className="block text-fg-subtle">{locale === 'es' ? 'Próximo paso' : 'Next step'}</MonoLabel>
                                      <p className={cn(
                                        'text-sm font-medium',
                                        application.status === 'needs_info'
                                          ? 'text-warning'
                                          : 'text-fg'
                                      )}>
                                        {application.status === 'submitted' && (locale === 'es' ? 'Esperando revisión' : 'Waiting for review')}
                                        {application.status === 'under_review' && (locale === 'es' ? 'En evaluación de documentos' : 'Document evaluation')}
                                        {application.status === 'needs_info' && (locale === 'es' ? 'Completar la información que te pidieron' : 'Complete the requested information')}
                                        {application.status === 'approved' && nextStepForApproved(contractsByApp[application.id], locale)}
                                        {application.status === 'rejected' && (locale === 'es' ? 'Proceso cerrado — explora alternativas' : 'Process closed — explore alternatives')}
                                        {application.status === 'withdrawn' && (locale === 'es' ? 'Postulación cerrada' : 'Application closed')}
                                        {application.status === 'contract_failed' && (locale === 'es' ? 'Contrato no prosperó — crear nueva postulación' : 'Contract didn\'t succeed — create a new application')}
                                      </p>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-3">
                                    {canScheduleVisit(application.status) && application.propertyId && (
                                      <button
                                        type="button"
                                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); router.push(`/propiedades/${application.propertyId}`); }}
                                        className="text-sm font-medium text-primary hover:underline"
                                      >
                                        {locale === 'es' ? 'Agendar visita' : 'Schedule visit'}
                                      </button>
                                    )}
                                    <span className="text-sm font-medium text-primary underline-offset-4 group-hover:underline">
                                      {locale === 'es' ? 'Ver detalle' : 'View details'}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </Link>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Grid View */}
              {viewMode === 'grid' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                  {paginatedApplications.map((application) => {
                    const fallbackStatus = statusConfig[application.status] || statusConfig.submitted;
                    const contractStatus = application.status === 'approved'
                      ? displayStatusForApproved(contractsByApp[application.id], locale)
                      : null;
                    const status = contractStatus ?? fallbackStatus;

                    return (
                      <div key={application.id}>
                        <Link href={`/inquilino/aplicaciones/${application.id}`}>
                          <div className="group rounded-lg border border-border bg-surface hover:border-border-strong transition-colors duration-slow overflow-hidden h-full flex flex-col">
                            {/* Image */}
                            <div className="relative aspect-[4/3] overflow-hidden">
                              <Image
                                src={application.property?.thumbnail || '/placeholder-property.svg'}
                                alt={application.property?.title || 'Propiedad'}
                                fill
                                quality={90}
                                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                                className="object-cover transition-transform duration-reveal group-hover:scale-105"
                              />
                              <div className="absolute top-3 left-3">
                                <StatusBadge tone={tonoDelColor(status.color)} className="bg-surface/90 backdrop-blur-sm">
                                  {status.label}
                                </StatusBadge>
                              </div>
                            </div>

                            {/* Content */}
                            <div className="p-4 flex-1 flex flex-col">
                              <div className="flex-1">
                                <h3 className="font-medium text-fg group-hover:text-primary transition-colors line-clamp-1 mb-1">
                                  {application.property?.title || 'Propiedad'}
                                </h3>
                                <p className="text-sm text-fg-muted flex items-center gap-1 mb-3">
                                  <MapPin className="w-3 h-3 flex-shrink-0" />
                                  <span className="truncate">{application.property?.neighborhood}, {application.property?.city}</span>
                                </p>

                                <div className="flex items-center justify-between mb-3">
                                  <p className="font-mono text-body tabular-nums text-fg">
                                    {formatCurrency(application.property?.monthlyRent || 0)}
                                    <span className="font-sans text-caption text-fg-muted"> {locale === 'es' ? 'al mes' : 'per month'}</span>
                                  </p>
                                  <span className="text-caption font-mono text-fg-subtle">
                                    {application.trackingCode}
                                  </span>
                                </div>

                                {/* Progress Bar */}
                                <div className="mb-3">
                                  <div className="flex items-center justify-between text-caption text-fg-subtle mb-1">
                                    <span>{locale === 'es' ? 'Progreso' : 'Progress'}</span>
                                    <span className="font-mono tabular-nums">{status.progress} %</span>
                                  </div>
                                  <div className="h-1.5 bg-surface-muted rounded-full overflow-hidden">
                                    <div
                                      className={cn(
                                        "h-full w-full rounded-full transition-transform duration-slow ease-enter",
                                        application.status === 'rejected' || application.status === 'withdrawn' || application.status === 'contract_failed'
                                          ? "bg-danger"
                                          : application.status === 'approved'
                                          ? "bg-success"
                                          : application.status === 'needs_info'
                                          ? "bg-warning"
                                          : "bg-primary"
                                      )}
                                      style={{ transform: `translateX(${status.progress - 100}%)` }}
                                    />
                                  </div>
                                </div>
                              </div>

                              {/* Footer */}
                              <div className="pt-3 border-t border-border-faint flex items-center justify-between">
                                <span className="text-caption text-fg-muted">
                                  {formatShortDate(application.updatedAt)}
                                </span>
                                <span className="text-caption font-medium text-primary underline-offset-4 group-hover:underline">
                                  {locale === 'es' ? 'Ver detalle' : 'View details'}
                                </span>
                              </div>
                            </div>
                          </div>
                        </Link>
                      </div>
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
                        ? 'text-fg-subtle cursor-not-allowed'
                        : 'text-fg-muted hover:bg-surface-muted'
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
                            ? 'bg-primary text-primary-fg'
                            : 'text-fg-muted hover:bg-surface-muted'
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
                        ? 'text-fg-subtle cursor-not-allowed'
                        : 'text-fg-muted hover:bg-surface-muted'
                    )}
                    aria-label={locale === 'es' ? 'Página siguiente' : 'Next page'}
                    icon={<CaretRight className="w-5 h-5" />}
                  />
                </div>
              )}

              {/* Results info */}
              <p className="text-center text-sm text-fg-muted mt-4">
                {locale === 'es'
                  ? `Mostrando ${startIndex + 1}-${Math.min(startIndex + ITEMS_PER_PAGE, currentApplications.length)} de ${currentApplications.length} aplicaciones`
                  : `Showing ${startIndex + 1}-${Math.min(startIndex + ITEMS_PER_PAGE, currentApplications.length)} of ${currentApplications.length} applications`}
              </p>
            </>
          ) : (
            <EmptyState
              icon={FileText}
              title={activeTab === 'active'
                ? (locale === 'es' ? 'Todavía no te has postulado' : "You haven't applied yet")
                : (locale === 'es' ? 'No tienes postulaciones cerradas' : 'No closed applications')
              }
              description={activeTab === 'active'
                ? (locale === 'es'
                    ? 'Con tu tope aprobado te mostramos los inmuebles que puedes tomar. Postularte es el primer paso.'
                    : 'Explore available properties and apply to start your rental process.')
                : (locale === 'es'
                    ? 'Las postulaciones aprobadas o rechazadas aparecerán aquí.'
                    : 'Approved or rejected applications will appear here.')
              }
              /* A SU catálogo, no al listado general: ahí están las que puede
                 tomar de verdad. "aplicar" está muerto (docs/VOCABULARIO.md). */
              action={activeTab === 'active' ? { label: locale === 'es' ? 'Ver inmuebles para mí' : 'See properties for me', href: '/inquilino/para-ti' } : undefined}
            />
          )}
          </CrossFade>
        </section>

      </motion.div>
    </div>
  );
}
