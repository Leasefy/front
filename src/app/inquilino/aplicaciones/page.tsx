'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { FileText, MapPin, Clock, CheckCircle, XCircle, ArrowUpRight, GridFour, List, CaretLeft, CaretRight, ListBullets } from '@phosphor-icons/react';

import { useTenantApplications } from '@/lib/hooks/useApplications';
import { cn } from '@/lib/utils';
import { useI18n } from '@/lib/i18n';
import { useOnboardingStatus } from '@/lib/hooks/use-onboarding-status';
import { CompleteProfileFirst } from '@/components/tenant/CompleteProfileFirst';
import { EmptyState } from '@/components/ui/empty-state';

const ITEMS_PER_PAGE = 4;

/**
 * Tenant Applications Page - Landing Style with List/Grid views and Pagination
 */
export default function AplicacionesPage() {
  const { t, locale, formatCurrency } = useI18n();
  const { isComplete: isOnboardingComplete, isLoading: isOnboardingLoading } = useOnboardingStatus();
  const { active: activeApplications, completed: completedApplications, isLoading: isAppsLoading, error } = useTenantApplications();

  const [activeTab, setActiveTab] = useState<'active' | 'completed'>('active');
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
      color: 'bg-blue-100 text-blue-700',
      icon: Clock,
      progress: 25
    },
    under_review: {
      label: t('applications.steps.review'),
      color: 'bg-amber-100 text-amber-700',
      icon: Clock,
      progress: 50
    },
    pre_approved: {
      label: locale === 'es' ? 'Pre-aprobada' : 'Pre-approved',
      color: 'bg-emerald-100 text-emerald-700',
      icon: CheckCircle,
      progress: 75
    },
    approved: {
      label: t('applications.steps.approved'),
      color: 'bg-emerald-100 text-emerald-700',
      icon: CheckCircle,
      progress: 100
    },
    rejected: {
      label: t('applications.rejected'),
      color: 'bg-red-100 text-red-700',
      icon: XCircle,
      progress: 100
    },
    withdrawn: {
      label: t('applications.withdrawn'),
      color: 'bg-neutral-100 text-neutral-600',
      icon: XCircle,
      progress: 100
    },
  };

  const currentApplications = activeTab === 'active' ? activeApplications : completedApplications;

  // Pagination logic
  const totalPages = Math.ceil(currentApplications.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedApplications = currentApplications.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  // Reset page when changing tabs
  const handleTabChange = (tab: 'active' | 'completed') => {
    setActiveTab(tab);
    setCurrentPage(1);
  };

  // Loading state
  if (isOnboardingLoading || isAppsLoading) {
    return (
      <div className="min-h-screen bg-white dark:bg-[#0f0f10] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Show "complete profile first" if onboarding not done
  if (!isOnboardingComplete) {
    return (
      <div className="min-h-screen bg-white dark:bg-[#0f0f10]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 sm:py-10">
          <CompleteProfileFirst context="applications" />
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-white dark:bg-[#0f0f10]">
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
    <div className="min-h-screen bg-white dark:bg-[#0f0f10]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 sm:py-10">

        {/* Header */}
        <motion.header
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-3xl font-medium text-neutral-900 dark:text-white tracking-tight">
            {t('applications.title')}
          </h1>
          <p className="mt-1 text-neutral-500 dark:text-neutral-400">
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
          <div className="rounded-3xl bg-stone-50 dark:bg-[#1a1a1c] p-6">
            <div className="w-10 h-10 rounded-2xl bg-white dark:bg-[#2a2a2c] flex items-center justify-center shadow-sm mb-4">
              <FileText className="w-5 h-5 text-neutral-700 dark:text-neutral-300" />
            </div>
            <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-1">{locale === 'es' ? 'Total aplicaciones' : 'Total applications'}</p>
            <p className="text-3xl font-bold text-neutral-900 dark:text-white tracking-tight">
              {activeApplications.length + completedApplications.length}
            </p>
            <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-2">{locale === 'es' ? 'Todas tus aplicaciones' : 'All your applications'}</p>
          </div>

          <div className="rounded-3xl bg-gradient-to-br from-indigo-50 to-indigo-100/50 dark:from-indigo-950/60 dark:to-indigo-900/40 border border-indigo-100 dark:border-indigo-800/60 p-6">
            <div className="w-10 h-10 rounded-2xl bg-white dark:bg-[#2a2a2c] flex items-center justify-center shadow-sm mb-4">
              <Clock className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            </div>
            <p className="text-sm text-indigo-600 dark:text-indigo-400 mb-1">{locale === 'es' ? 'En proceso' : 'In progress'}</p>
            <p className="text-3xl font-bold text-neutral-900 dark:text-white tracking-tight">
              {activeApplications.length}
            </p>
            <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-2">{t('applications.active')}</p>
          </div>

          <div className="rounded-3xl bg-stone-50 dark:bg-[#1a1a1c] p-6">
            <div className="w-10 h-10 rounded-2xl bg-white dark:bg-[#2a2a2c] flex items-center justify-center shadow-sm mb-4">
              <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-1">{locale === 'es' ? 'Completadas' : 'Completed'}</p>
            <p className="text-3xl font-bold text-neutral-900 dark:text-white tracking-tight">
              {completedApplications.length}
            </p>
            <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-2">{locale === 'es' ? 'Aprobadas o rechazadas' : 'Approved or rejected'}</p>
          </div>
        </motion.div>

        {/* Controls: Tabs + View Toggle */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6"
        >
          {/* Tabs */}
          <div className="flex items-center gap-2 p-1 bg-stone-100 dark:bg-[#1a1a1c] rounded-full w-fit">
            <button
              onClick={() => handleTabChange('active')}
              className={cn(
                'px-5 py-2 text-sm font-medium rounded-full transition-all',
                activeTab === 'active'
                  ? 'bg-white dark:bg-[#2a2a2c] text-neutral-900 dark:text-white shadow-sm'
                  : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-300'
              )}
            >
              {locale === 'es' ? 'En Proceso' : 'In Progress'}
              {activeApplications.length > 0 && (
                <span className={cn(
                  'ml-2 px-2 py-0.5 text-xs rounded-full',
                  activeTab === 'active' ? 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400' : 'bg-neutral-200 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-300'
                )}>
                  {activeApplications.length}
                </span>
              )}
            </button>
            <button
              onClick={() => handleTabChange('completed')}
              className={cn(
                'px-5 py-2 text-sm font-medium rounded-full transition-all',
                activeTab === 'completed'
                  ? 'bg-white dark:bg-[#2a2a2c] text-neutral-900 dark:text-white shadow-sm'
                  : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-300'
              )}
            >
              {locale === 'es' ? 'Historial' : 'History'}
              {completedApplications.length > 0 && (
                <span className={cn(
                  'ml-2 px-2 py-0.5 text-xs rounded-full',
                  activeTab === 'completed' ? 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400' : 'bg-neutral-200 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-300'
                )}>
                  {completedApplications.length}
                </span>
              )}
            </button>
          </div>

          {/* View Toggle */}
          <div className="flex items-center gap-1 p-1 bg-stone-100 dark:bg-[#1a1a1c] rounded-full w-fit">
            <button
              onClick={() => setViewMode('list')}
              className={cn(
                'p-2 rounded-full transition-all',
                viewMode === 'list'
                  ? 'bg-white dark:bg-[#2a2a2c] text-neutral-900 dark:text-white shadow-sm'
                  : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-300'
              )}
              title={locale === 'es' ? 'Vista de lista' : 'List view'}
            >
              <ListBullets className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={cn(
                'p-2 rounded-full transition-all',
                viewMode === 'grid'
                  ? 'bg-white dark:bg-[#2a2a2c] text-neutral-900 dark:text-white shadow-sm'
                  : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-300'
              )}
              title={locale === 'es' ? 'Vista de cuadrícula' : 'Grid view'}
            >
              <GridFour className="w-4 h-4" />
            </button>
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
                    const status = statusConfig[application.status] || statusConfig.submitted;
                    const StatusIcon = status.icon;

                    return (
                      <motion.div
                        key={application.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                      >
                        <Link href={`/inquilino/aplicaciones/${application.id}`}>
                          <div className="group rounded-3xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-[#1a1a1c] hover:border-neutral-300 dark:hover:border-neutral-600 hover:shadow-lg transition-all duration-300 overflow-hidden">
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
                                    <h3 className="text-lg font-semibold text-neutral-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                                      {application.property?.title || 'Propiedad'}
                                    </h3>
                                    <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1 flex items-center gap-1.5">
                                      <MapPin className="w-3.5 h-3.5" />
                                      {application.property?.neighborhood}, {application.property?.city}
                                    </p>
                                  </div>
                                  <div className="sm:text-right">
                                    <p className="text-2xl font-bold text-neutral-900 dark:text-white">
                                      {formatCurrency(application.property?.monthlyRent || 0)}
                                    </p>
                                    <p className="text-xs text-neutral-500 dark:text-neutral-400">/mes</p>
                                  </div>
                                </div>

                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 py-4 border-y border-neutral-100 dark:border-neutral-700">
                                  <div>
                                    <p className="text-xs text-neutral-400 mb-1">{locale === 'es' ? 'Código' : 'Code'}</p>
                                    <p className="text-sm font-mono font-medium text-neutral-900 dark:text-white">
                                      {application.trackingCode}
                                    </p>
                                  </div>
                                  <div>
                                    <p className="text-xs text-neutral-400 mb-1">{locale === 'es' ? 'Enviada' : 'Submitted'}</p>
                                    <p className="text-sm font-medium text-neutral-900 dark:text-white">
                                      {formatShortDate(application.submittedAt)}
                                    </p>
                                  </div>
                                  <div>
                                    <p className="text-xs text-neutral-400 mb-1">{locale === 'es' ? 'Actualizada' : 'Updated'}</p>
                                    <p className="text-sm font-medium text-neutral-900 dark:text-white">
                                      {formatShortDate(application.updatedAt)}
                                    </p>
                                  </div>
                                  <div>
                                    <p className="text-xs text-neutral-400 mb-1">{locale === 'es' ? 'Progreso' : 'Progress'}</p>
                                    <p className="text-sm font-medium text-neutral-900 dark:text-white">{status.progress}%</p>
                                  </div>
                                </div>

                                <div className="mt-4">
                                  <div className="flex items-center justify-between text-xs text-neutral-500 dark:text-neutral-400 mb-2">
                                    <span>{locale === 'es' ? 'Progreso de aplicación' : 'Application progress'}</span>
                                    <span>{status.progress}% {locale === 'es' ? 'completado' : 'complete'}</span>
                                  </div>
                                  <div className="h-2 bg-neutral-100 dark:bg-neutral-700 rounded-full overflow-hidden">
                                    <div
                                      className={cn(
                                        "h-full rounded-full transition-all duration-500",
                                        application.status === 'rejected' || application.status === 'withdrawn'
                                          ? "bg-red-400"
                                          : application.status === 'approved' || application.status === 'pre_approved'
                                          ? "bg-emerald-500"
                                          : "bg-indigo-500"
                                      )}
                                      style={{ width: `${status.progress}%` }}
                                    />
                                  </div>
                                </div>

                                <div className="flex items-center justify-between mt-4 p-4 bg-neutral-50 dark:bg-[#2a2a2c] rounded-2xl">
                                  <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-white dark:bg-[#1a1a1c] flex items-center justify-center shadow-sm">
                                      <FileText className="w-5 h-5 text-neutral-600 dark:text-neutral-400" />
                                    </div>
                                    <div>
                                      <p className="text-xs text-neutral-500 dark:text-neutral-400">{locale === 'es' ? 'Próximo paso' : 'Next step'}</p>
                                      <p className="text-sm font-semibold text-neutral-900 dark:text-white">
                                        {application.status === 'submitted' && (locale === 'es' ? 'Esperando revisión' : 'Waiting for review')}
                                        {application.status === 'under_review' && (locale === 'es' ? 'En evaluación de documentos' : 'Document evaluation')}
                                        {application.status === 'pre_approved' && (locale === 'es' ? 'Agendar visita' : 'Schedule visit')}
                                        {application.status === 'approved' && (locale === 'es' ? 'Firmar contrato' : 'Sign contract')}
                                        {application.status === 'rejected' && (locale === 'es' ? 'Aplicación cerrada' : 'Application closed')}
                                        {application.status === 'withdrawn' && (locale === 'es' ? 'Aplicación cerrada' : 'Application closed')}
                                      </p>
                                    </div>
                                  </div>
                                  <span className="flex items-center gap-1 text-sm font-medium text-indigo-600 dark:text-indigo-400 group-hover:text-indigo-700 dark:group-hover:text-indigo-300 transition-colors">
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
                    const status = statusConfig[application.status] || statusConfig.submitted;
                    const StatusIcon = status.icon;

                    return (
                      <motion.div
                        key={application.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                      >
                        <Link href={`/inquilino/aplicaciones/${application.id}`}>
                          <div className="group rounded-2xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-[#1a1a1c] hover:border-neutral-300 dark:hover:border-neutral-600 hover:shadow-lg transition-all duration-300 overflow-hidden h-full flex flex-col">
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
                                <h3 className="font-semibold text-neutral-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors line-clamp-1 mb-1">
                                  {application.property?.title || 'Propiedad'}
                                </h3>
                                <p className="text-sm text-neutral-500 dark:text-neutral-400 flex items-center gap-1 mb-3">
                                  <MapPin className="w-3 h-3 flex-shrink-0" />
                                  <span className="truncate">{application.property?.neighborhood}, {application.property?.city}</span>
                                </p>

                                <div className="flex items-center justify-between mb-3">
                                  <p className="text-lg font-bold text-neutral-900 dark:text-white">
                                    {formatCurrency(application.property?.monthlyRent || 0)}
                                    <span className="text-xs font-normal text-neutral-500 dark:text-neutral-400">/mes</span>
                                  </p>
                                  <span className="text-xs font-mono text-neutral-400">
                                    {application.trackingCode}
                                  </span>
                                </div>

                                {/* Progress Bar */}
                                <div className="mb-3">
                                  <div className="flex items-center justify-between text-xs text-neutral-400 mb-1">
                                    <span>{locale === 'es' ? 'Progreso' : 'Progress'}</span>
                                    <span>{status.progress}%</span>
                                  </div>
                                  <div className="h-1.5 bg-neutral-100 dark:bg-neutral-700 rounded-full overflow-hidden">
                                    <div
                                      className={cn(
                                        "h-full rounded-full transition-all duration-500",
                                        application.status === 'rejected' || application.status === 'withdrawn'
                                          ? "bg-red-400"
                                          : application.status === 'approved' || application.status === 'pre_approved'
                                          ? "bg-emerald-500"
                                          : "bg-indigo-500"
                                      )}
                                      style={{ width: `${status.progress}%` }}
                                    />
                                  </div>
                                </div>
                              </div>

                              {/* Footer */}
                              <div className="pt-3 border-t border-neutral-100 dark:border-neutral-700 flex items-center justify-between">
                                <span className="text-xs text-neutral-500 dark:text-neutral-400">
                                  {formatShortDate(application.updatedAt)}
                                </span>
                                <span className="flex items-center gap-1 text-xs font-medium text-indigo-600 dark:text-indigo-400 group-hover:text-indigo-700 dark:group-hover:text-indigo-300 transition-colors">
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
                  <button
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className={cn(
                      'p-2 rounded-full transition-all',
                      currentPage === 1
                        ? 'text-neutral-300 dark:text-neutral-600 cursor-not-allowed'
                        : 'text-neutral-600 dark:text-neutral-400 hover:bg-stone-100 dark:hover:bg-[#2a2a2c]'
                    )}
                  >
                    <CaretLeft className="w-5 h-5" />
                  </button>

                  <div className="flex items-center gap-1">
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                      <button
                        key={page}
                        onClick={() => setCurrentPage(page)}
                        className={cn(
                          'w-10 h-10 rounded-full text-sm font-medium transition-all',
                          currentPage === page
                            ? 'bg-neutral-900 dark:bg-white text-white dark:text-neutral-900'
                            : 'text-neutral-600 dark:text-neutral-400 hover:bg-stone-100 dark:hover:bg-[#2a2a2c]'
                        )}
                      >
                        {page}
                      </button>
                    ))}
                  </div>

                  <button
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className={cn(
                      'p-2 rounded-full transition-all',
                      currentPage === totalPages
                        ? 'text-neutral-300 dark:text-neutral-600 cursor-not-allowed'
                        : 'text-neutral-600 dark:text-neutral-400 hover:bg-stone-100 dark:hover:bg-[#2a2a2c]'
                    )}
                  >
                    <CaretRight className="w-5 h-5" />
                  </button>
                </div>
              )}

              {/* Results info */}
              <p className="text-center text-sm text-neutral-500 dark:text-neutral-400 mt-4">
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
              action={activeTab === 'active' ? { label: locale === 'es' ? 'Buscar propiedades' : 'Browse properties', href: '/propiedades' } : undefined}
            />
          )}
        </motion.section>

      </div>
    </div>
  );
}
