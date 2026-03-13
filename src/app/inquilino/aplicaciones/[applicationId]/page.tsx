'use client';

import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { FileText, MapPin, Calendar, Clock, CheckCircle, XCircle, ChatCircle, Phone, Copy, Check, ArrowUpRight, Sparkle, PaperPlaneTilt, SealCheck, Eye, ThumbsUp, Confetti, PenNib } from '@phosphor-icons/react';
import { useState } from 'react';

import { BackButton } from '@/components/ui/back-button';
import { Button } from '@/components/ui/button';
import { useTenantApplication } from '@/lib/hooks/useApplications';
import { useContracts } from '@/lib/hooks/useContracts';
import { cn } from '@/lib/utils';
import { useI18n } from '@/lib/i18n';

/**
 * Generate a status-based timeline for display
 */
function generateTimelineFromStatus(
  status: string,
  submittedAt: string,
  locale: string
) {
  const events: Array<{ id: string; type: string; timestamp: string; description: string }> = [];
  const baseDate = new Date(submittedAt);
  let eventId = 1;

  // Created event
  const createdDate = new Date(baseDate);
  createdDate.setHours(createdDate.getHours() - 2);
  events.push({
    id: `evt-${eventId++}`,
    type: 'created',
    timestamp: createdDate.toISOString(),
    description: locale === 'es' ? 'Solicitud iniciada' : 'Application started',
  });

  // Submitted
  events.push({
    id: `evt-${eventId++}`,
    type: 'submitted',
    timestamp: baseDate.toISOString(),
    description: locale === 'es' ? 'Solicitud enviada al propietario' : 'Application submitted to landlord',
  });

  if (status === 'submitted') return events;

  if (status === 'withdrawn') {
    const d = new Date(baseDate);
    d.setDate(d.getDate() + 1);
    events.push({
      id: `evt-${eventId++}`,
      type: 'withdrawn',
      timestamp: d.toISOString(),
      description: locale === 'es' ? 'Solicitud retirada por el inquilino' : 'Application withdrawn by tenant',
    });
    return events;
  }

  // Under review
  const reviewDate = new Date(baseDate);
  reviewDate.setDate(reviewDate.getDate() + 1);
  events.push({
    id: `evt-${eventId++}`,
    type: 'under_review',
    timestamp: reviewDate.toISOString(),
    description: locale === 'es' ? 'El propietario está revisando tu solicitud' : 'Landlord is reviewing your application',
  });
  if (status === 'under_review') return events;

  // Pre-approved
  if (status === 'pre_approved' || status === 'approved') {
    const d = new Date(baseDate);
    d.setDate(d.getDate() + 3);
    events.push({
      id: `evt-${eventId++}`,
      type: 'pre_approved',
      timestamp: d.toISOString(),
      description: locale === 'es' ? 'Pre-aprobación otorgada' : 'Pre-approval granted',
    });
  }
  if (status === 'pre_approved') return events;

  if (status === 'approved') {
    const d = new Date(baseDate);
    d.setDate(d.getDate() + 5);
    events.push({
      id: `evt-${eventId++}`,
      type: 'approved',
      timestamp: d.toISOString(),
      description: locale === 'es' ? '¡Tu solicitud ha sido aprobada!' : 'Your application has been approved!',
    });
  }

  if (status === 'rejected') {
    const d = new Date(baseDate);
    d.setDate(d.getDate() + 4);
    events.push({
      id: `evt-${eventId++}`,
      type: 'rejected',
      timestamp: d.toISOString(),
      description: locale === 'es' ? 'Lo sentimos, tu solicitud no fue aprobada' : 'Sorry, your application was not approved',
    });
  }

  return events;
}

/**
 * Application Detail Page - Premium Leasefy Style
 */
export default function ApplicationDetailPage() {
  const { t, locale, formatCurrency } = useI18n();
  const params = useParams();
  const router = useRouter();
  const [copied, setCopied] = useState(false);

  const applicationId = params.applicationId as string;
  const { application, isLoading, error } = useTenantApplication(applicationId);
  const { contracts } = useContracts();

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-white dark:bg-[#0f0f10] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!application || error) {
    return (
      <div className="min-h-screen bg-white dark:bg-[#0f0f10] flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center px-6"
        >
          <div className="w-20 h-20 rounded-full bg-stone-100 dark:bg-[#1a1a1c] flex items-center justify-center mx-auto mb-6">
            <FileText className="w-10 h-10 text-neutral-400" />
          </div>
          <h2 className="text-2xl font-semibold text-neutral-900 dark:text-white mb-3">
            {locale === 'es' ? 'Aplicación no encontrada' : 'Application not found'}
          </h2>
          <p className="text-neutral-500 dark:text-neutral-400 mb-6 max-w-sm">
            {error || (locale === 'es'
              ? 'No pudimos encontrar esta aplicación. Es posible que haya sido eliminada o el enlace sea incorrecto.'
              : 'We couldn\'t find this application. It may have been deleted or the link is incorrect.')}
          </p>
          <Button onClick={() => router.push('/inquilino/aplicaciones')}>
            {locale === 'es' ? 'Ver mis aplicaciones' : 'View my applications'}
          </Button>
        </motion.div>
      </div>
    );
  }

  const property = application.property;

  const statusConfig: Record<string, { label: string; color: string; bgColor: string; icon: typeof CheckCircle }> = {
    submitted: { label: locale === 'es' ? 'Enviada' : 'Submitted', color: 'text-blue-600', bgColor: 'bg-blue-100', icon: PaperPlaneTilt },
    under_review: { label: locale === 'es' ? 'En revisión' : 'Under review', color: 'text-amber-600', bgColor: 'bg-amber-100', icon: Eye },
    pre_approved: { label: locale === 'es' ? 'Pre-aprobada' : 'Pre-approved', color: 'text-indigo-600', bgColor: 'bg-indigo-100', icon: ThumbsUp },
    approved: { label: locale === 'es' ? 'Aprobada' : 'Approved', color: 'text-emerald-600', bgColor: 'bg-emerald-100', icon: Confetti },
    rejected: { label: locale === 'es' ? 'Rechazada' : 'Rejected', color: 'text-red-600', bgColor: 'bg-red-100', icon: XCircle },
    withdrawn: { label: locale === 'es' ? 'Retirada' : 'Withdrawn', color: 'text-neutral-600', bgColor: 'bg-neutral-100', icon: XCircle },
  };

  const progressSteps = [
    { key: 'submitted', label: locale === 'es' ? 'Enviada' : 'Submitted', icon: PaperPlaneTilt },
    { key: 'under_review', label: locale === 'es' ? 'En revisión' : 'Under review', icon: Eye },
    { key: 'pre_approved', label: locale === 'es' ? 'Pre-aprobada' : 'Pre-approved', icon: ThumbsUp },
    { key: 'approved', label: locale === 'es' ? 'Aprobada' : 'Approved', icon: Confetti },
  ];

  const getCurrentStepIndex = () => {
    const statusOrder = ['submitted', 'under_review', 'pre_approved', 'approved'];
    return statusOrder.indexOf(application.status);
  };

  const currentStep = getCurrentStepIndex();

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString(locale === 'es' ? 'es-CL' : 'en-US', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  const formatShortDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString(locale === 'es' ? 'es-CL' : 'en-US', {
      day: 'numeric',
      month: 'short',
    });
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString(locale === 'es' ? 'es-CL' : 'en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getEventIcon = (type: string) => {
    switch (type) {
      case 'created':
        return FileText;
      case 'submitted':
        return PaperPlaneTilt;
      case 'under_review':
        return Eye;
      case 'documents_verified':
        return SealCheck;
      case 'pre_approved':
        return ThumbsUp;
      case 'approved':
        return Confetti;
      case 'rejected':
        return XCircle;
      case 'withdrawn':
        return XCircle;
      default:
        return Clock;
    }
  };

  const copyTrackingCode = () => {
    navigator.clipboard.writeText(application.trackingCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const isFinalStatus = ['approved', 'rejected', 'withdrawn'].includes(application.status);
  const status = statusConfig[application.status] || statusConfig.submitted;
  const StatusIcon = status.icon;

  // Find pending_tenant contract for this application's property
  const pendingContract = application.status === 'approved' && property
    ? contracts.find(c => c.propertyId === property.id && c.status === 'pending_tenant')
    : null;

  // Generate timeline from status
  const events = generateTimelineFromStatus(application.status, application.submittedAt, locale);

  return (
    <div className="min-h-screen bg-white dark:bg-[#0f0f10]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 sm:py-10">
        {/* Back Button */}
        <motion.div
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          className="mb-6"
        >
          <BackButton label={locale === 'es' ? 'Volver a aplicaciones' : 'Back to applications'} />
        </motion.div>

        {/* Hero Card - Property with Status */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-stone-100 to-stone-50 dark:from-[#1a1a1c] dark:to-[#1a1a1c] border border-transparent dark:border-neutral-800 mb-8"
        >
          <div className="flex flex-col lg:flex-row">
            {/* Property Image */}
            <div className="relative w-full lg:w-[400px] h-64 lg:h-auto flex-shrink-0">
              <Image
                src={property?.thumbnail || '/placeholder-property.jpg'}
                alt={property?.title || 'Propiedad'}
                fill
                className="object-cover"
                priority
              />
              {/* Gradient overlay */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-transparent to-stone-100/80 dark:to-[#1a1a1c]/90 hidden lg:block" />
              <div className="absolute inset-0 bg-gradient-to-t from-stone-100/80 dark:from-[#1a1a1c]/90 via-transparent to-transparent lg:hidden" />
            </div>

            {/* Content */}
            <div className="flex-1 p-6 lg:p-8">
              {/* Status Badge */}
              <div className="flex items-center justify-between mb-4">
                <span className={cn(
                  'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium',
                  status.bgColor, status.color
                )}>
                  <StatusIcon className="w-4 h-4" />
                  {status.label}
                </span>
                <button
                  onClick={copyTrackingCode}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/80 dark:bg-[#2a2a2c] hover:bg-white dark:hover:bg-[#3a3a3e] text-neutral-600 dark:text-neutral-300 text-sm transition-colors"
                >
                  {copied ? (
                    <>
                      <Check className="w-4 h-4 text-emerald-500" />
                      {locale === 'es' ? 'Copiado' : 'Copied'}
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      {application.trackingCode}
                    </>
                  )}
                </button>
              </div>

              {/* Property Info */}
              {property && (
                <Link href={`/propiedades/${property.id}`} className="group">
                  <h1 className="text-2xl lg:text-3xl font-semibold text-neutral-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors mb-2">
                    {property.title}
                  </h1>
                  <p className="text-neutral-500 dark:text-neutral-400 flex items-center gap-1.5 mb-4">
                    <MapPin className="w-4 h-4" />
                    {property.neighborhood}, {property.city}
                  </p>
                </Link>
              )}

              {/* Price and Date */}
              <div className="flex flex-wrap items-center gap-6 mb-6">
                <div>
                  <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-1">
                    {locale === 'es' ? 'Arriendo mensual' : 'Monthly rent'}
                  </p>
                  <p className="text-2xl font-bold text-neutral-900 dark:text-white">
                    {formatCurrency(property?.monthlyRent || 0)}
                  </p>
                </div>
                <div className="h-10 w-px bg-stone-200 dark:bg-neutral-700 hidden sm:block" />
                <div>
                  <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-1">
                    {locale === 'es' ? 'Fecha de envío' : 'Submitted on'}
                  </p>
                  <p className="text-lg font-medium text-neutral-700 dark:text-neutral-200 flex items-center gap-1.5">
                    <Calendar className="w-4 h-4" />
                    {formatShortDate(application.submittedAt)}
                  </p>
                </div>
              </div>

              {/* Progress Steps */}
              {!isFinalStatus && (
                <div className="pt-6 border-t border-stone-200 dark:border-neutral-700">
                  <div className="flex items-center justify-between">
                    {progressSteps.map((step, index) => {
                      const StepIcon = step.icon;
                      const isCompleted = index <= currentStep;
                      const isCurrent = index === currentStep;

                      return (
                        <div key={step.key} className="flex items-center">
                          <div className="flex flex-col items-center">
                            <div className={cn(
                              'w-10 h-10 rounded-full flex items-center justify-center transition-all',
                              isCompleted
                                ? isCurrent
                                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/30'
                                  : 'bg-emerald-500 text-white'
                                : 'bg-stone-200 dark:bg-neutral-700 text-neutral-400'
                            )}>
                              {isCompleted && !isCurrent ? (
                                <CheckCircle className="w-5 h-5" />
                              ) : (
                                <StepIcon className="w-5 h-5" />
                              )}
                            </div>
                            <span className={cn(
                              'text-xs mt-2 font-medium hidden sm:block',
                              isCurrent ? 'text-indigo-600 dark:text-indigo-400' : isCompleted ? 'text-emerald-600 dark:text-emerald-400' : 'text-neutral-400'
                            )}>
                              {step.label}
                            </span>
                          </div>
                          {index < progressSteps.length - 1 && (
                            <div className={cn(
                              'w-8 sm:w-16 lg:w-24 h-1 mx-2 rounded-full transition-colors',
                              index < currentStep ? 'bg-emerald-500' : 'bg-stone-200 dark:bg-neutral-700'
                            )} />
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Final Status Message */}
              {application.status === 'approved' && (
                pendingContract ? (
                  <div className="mt-6 p-4 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/60">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-full bg-indigo-600 flex items-center justify-center flex-shrink-0">
                        <PenNib className="w-5 h-5 text-white" />
                      </div>
                      <div className="flex-1">
                        <p className="font-semibold text-indigo-800 dark:text-indigo-300">
                          {locale === 'es' ? '¡Tu contrato está listo para firmar!' : 'Your contract is ready to sign!'}
                        </p>
                        <p className="text-sm text-indigo-700 dark:text-indigo-400 mt-1">
                          {locale === 'es'
                            ? 'El propietario ya firmó el contrato. Solo falta tu firma para activarlo.'
                            : 'The landlord has signed the contract. Only your signature is needed to activate it.'}
                        </p>
                        <Link
                          href={`/inquilino/contratos/${pendingContract.id}/firmar`}
                          className="mt-3 inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold transition-colors shadow-lg shadow-indigo-500/25"
                        >
                          <PenNib className="w-4 h-4" />
                          {locale === 'es' ? 'Firmar contrato' : 'Sign contract'}
                        </Link>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="mt-6 p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-full bg-emerald-500 flex items-center justify-center flex-shrink-0">
                        <Confetti className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <p className="font-semibold text-emerald-800 dark:text-emerald-300">
                          {locale === 'es' ? '¡Felicidades! Tu aplicación fue aprobada' : 'Congratulations! Your application was approved'}
                        </p>
                        <p className="text-sm text-emerald-700 dark:text-emerald-400 mt-1">
                          {locale === 'es'
                            ? 'El propietario te contactará para coordinar la firma del contrato.'
                            : 'The landlord will contact you to coordinate the contract signing.'}
                        </p>
                      </div>
                    </div>
                  </div>
                )
              )}

              {application.status === 'rejected' && (
                <div className="mt-6 p-4 rounded-2xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/60">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-full bg-red-500 flex items-center justify-center flex-shrink-0">
                      <XCircle className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <p className="font-semibold text-red-800 dark:text-red-300">
                        {locale === 'es' ? 'Aplicación no aprobada' : 'Application not approved'}
                      </p>
                      <p className="text-sm text-red-700 dark:text-red-400 mt-1">
                        {locale === 'es'
                          ? 'No te desanimes. Puedes explorar otras propiedades disponibles.'
                          : 'Don\'t be discouraged. You can explore other available properties.'}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Timeline */}
            <motion.section
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="rounded-3xl bg-stone-50 dark:bg-[#1a1a1c] p-6"
            >
              <h2 className="text-lg font-semibold text-neutral-900 dark:text-white mb-6">
                {locale === 'es' ? 'Historial de la aplicación' : 'Application history'}
              </h2>

              <div className="relative">
                {/* Timeline line */}
                <div className="absolute left-5 top-5 bottom-5 w-0.5 bg-stone-200 dark:bg-neutral-700" />

                {/* Events */}
                <div className="space-y-6">
                  {[...events].reverse().map((event, index) => {
                    const EventIcon = getEventIcon(event.type);
                    const isFirst = index === 0;

                    return (
                      <motion.div
                        key={event.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.3 + index * 0.05 }}
                        className="relative flex gap-4"
                      >
                        {/* Icon */}
                        <div className={cn(
                          'w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 z-10 transition-all',
                          isFirst
                            ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20'
                            : 'bg-white dark:bg-[#2a2a2c] border-2 border-stone-200 dark:border-neutral-600 text-neutral-500 dark:text-neutral-400'
                        )}>
                          <EventIcon className="w-4 h-4" />
                        </div>

                        {/* Content */}
                        <div className="flex-1 pt-2">
                          <p className={cn(
                            'text-sm',
                            isFirst ? 'font-semibold text-neutral-900 dark:text-white' : 'text-neutral-600 dark:text-neutral-300'
                          )}>
                            {event.description}
                          </p>
                          <p className="text-xs text-neutral-400 mt-1 flex items-center gap-1.5">
                            <Clock className="w-3 h-3" />
                            {formatDate(event.timestamp)} · {formatTime(event.timestamp)}
                          </p>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            </motion.section>

            {/* Property Info Card */}
            {property && (
              <motion.section
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="rounded-3xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-[#1a1a1c] p-6"
              >
                <h2 className="text-lg font-semibold text-neutral-900 dark:text-white mb-4">
                  {locale === 'es' ? 'Propiedad' : 'Property'}
                </h2>

                <div className="flex items-center gap-4 mb-4">
                  <div className="relative w-20 h-20 rounded-2xl overflow-hidden flex-shrink-0">
                    <Image
                      src={property.thumbnail}
                      alt={property.title}
                      fill
                      className="object-cover"
                      sizes="80px"
                    />
                  </div>
                  <div>
                    <h3 className="font-semibold text-neutral-900 dark:text-white">{property.title}</h3>
                    <p className="text-sm text-neutral-500 dark:text-neutral-400 flex items-center gap-1 mt-1">
                      <MapPin className="w-3.5 h-3.5" />
                      {property.neighborhood}, {property.city}
                    </p>
                    <p className="text-lg font-bold text-neutral-900 dark:text-white mt-1">
                      {formatCurrency(property.monthlyRent)}
                      <span className="text-xs font-normal text-neutral-500 dark:text-neutral-400">/mes</span>
                    </p>
                  </div>
                </div>

                <Link
                  href={`/propiedades/${property.id}`}
                  className="flex items-center justify-center gap-2 w-full py-3 rounded-full border border-neutral-200 dark:border-neutral-600 text-sm font-medium text-neutral-700 dark:text-neutral-200 hover:bg-neutral-50 dark:hover:bg-[#2a2a2c] hover:border-neutral-300 dark:hover:border-neutral-500 transition-colors"
                >
                  {locale === 'es' ? 'Ver propiedad completa' : 'View full property'}
                  <ArrowUpRight className="w-4 h-4" />
                </Link>
              </motion.section>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Quick Actions */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 }}
              className="rounded-3xl bg-gradient-to-br from-indigo-50 to-indigo-100/50 dark:from-indigo-950/60 dark:to-indigo-900/40 border border-indigo-100 dark:border-indigo-800/60 p-6"
            >
              <h3 className="font-semibold text-neutral-900 dark:text-white mb-4">
                {locale === 'es' ? 'Acciones' : 'Actions'}
              </h3>

              <div className="space-y-3">
                <button
                  onClick={() => router.push('/inquilino/mensajes')}
                  className="flex items-center gap-3 w-full p-3 rounded-2xl bg-white dark:bg-[#1a1a1c] hover:shadow-md transition-all group"
                >
                  <div className="w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center group-hover:bg-indigo-600 transition-colors">
                    <ChatCircle className="w-5 h-5 text-indigo-600 dark:text-indigo-400 group-hover:text-white transition-colors" />
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-medium text-neutral-900 dark:text-white">
                      {locale === 'es' ? 'Contactar propietario' : 'Contact landlord'}
                    </p>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400">
                      {locale === 'es' ? 'Envía un mensaje' : 'Send a message'}
                    </p>
                  </div>
                </button>

                <button className="flex items-center gap-3 w-full p-3 rounded-2xl bg-white dark:bg-[#1a1a1c] hover:shadow-md transition-all group">
                  <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center group-hover:bg-emerald-600 transition-colors">
                    <Phone className="w-5 h-5 text-emerald-600 dark:text-emerald-400 group-hover:text-white transition-colors" />
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-medium text-neutral-900 dark:text-white">
                      {locale === 'es' ? 'Llamar' : 'Call'}
                    </p>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400">
                      {locale === 'es' ? 'Contacto directo' : 'Direct contact'}
                    </p>
                  </div>
                </button>

                {!isFinalStatus && (
                  <button className="flex items-center gap-3 w-full p-3 rounded-2xl bg-white/50 dark:bg-[#1a1a1c]/50 hover:bg-red-50 dark:hover:bg-red-950/40 transition-all group border border-transparent hover:border-red-200 dark:hover:border-red-800/60">
                    <div className="w-10 h-10 rounded-xl bg-red-50 dark:bg-red-900/30 flex items-center justify-center group-hover:bg-red-100 dark:group-hover:bg-red-900/50 transition-colors">
                      <XCircle className="w-5 h-5 text-red-500" />
                    </div>
                    <div className="text-left">
                      <p className="text-sm font-medium text-red-600 dark:text-red-400">
                        {locale === 'es' ? 'Retirar aplicación' : 'Withdraw application'}
                      </p>
                      <p className="text-xs text-neutral-500 dark:text-neutral-400">
                        {locale === 'es' ? 'Cancelar solicitud' : 'Cancel request'}
                      </p>
                    </div>
                  </button>
                )}
              </div>
            </motion.div>

            {/* Status Tips */}
            {application.status === 'under_review' && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.35 }}
                className="rounded-3xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 p-6"
              >
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center flex-shrink-0">
                    <Sparkle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                  </div>
                  <div>
                    <p className="font-semibold text-amber-800 dark:text-amber-300 mb-1">
                      {locale === 'es' ? 'En proceso de revisión' : 'Under review'}
                    </p>
                    <p className="text-sm text-amber-700 dark:text-amber-400">
                      {locale === 'es'
                        ? 'El propietario está evaluando tu aplicación. Normalmente toma entre 24-48 horas.'
                        : 'The landlord is evaluating your application. This typically takes 24-48 hours.'}
                    </p>
                  </div>
                </div>
              </motion.div>
            )}

            {application.status === 'pre_approved' && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.35 }}
                className="rounded-3xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/60 p-6"
              >
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center flex-shrink-0">
                    <ThumbsUp className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                  </div>
                  <div>
                    <p className="font-semibold text-indigo-800 dark:text-indigo-300 mb-1">
                      {locale === 'es' ? '¡Vas muy bien!' : 'Looking good!'}
                    </p>
                    <p className="text-sm text-indigo-700 dark:text-indigo-400">
                      {locale === 'es'
                        ? 'El propietario está interesado en tu perfil. Espera la confirmación final.'
                        : 'The landlord is interested in your profile. Await final confirmation.'}
                    </p>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Quick Stats */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="rounded-3xl bg-stone-50 dark:bg-[#1a1a1c] p-6"
            >
              <h3 className="font-semibold text-neutral-900 dark:text-white mb-4">
                {locale === 'es' ? 'Resumen' : 'Summary'}
              </h3>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-neutral-500 dark:text-neutral-400">
                    {locale === 'es' ? 'Código' : 'Code'}
                  </span>
                  <span className="text-sm font-mono font-medium text-neutral-900 dark:text-white">{application.trackingCode}</span>
                </div>
                <div className="h-px bg-stone-200 dark:bg-neutral-700" />
                <div className="flex items-center justify-between">
                  <span className="text-sm text-neutral-500 dark:text-neutral-400">
                    {locale === 'es' ? 'Enviada' : 'Submitted'}
                  </span>
                  <span className="text-sm font-medium text-neutral-900 dark:text-white">{formatShortDate(application.submittedAt)}</span>
                </div>
                <div className="h-px bg-stone-200 dark:bg-neutral-700" />
                <div className="flex items-center justify-between">
                  <span className="text-sm text-neutral-500 dark:text-neutral-400">
                    {locale === 'es' ? 'Estado actual' : 'Current status'}
                  </span>
                  <span className={cn('text-sm font-medium', status.color)}>{status.label}</span>
                </div>
                <div className="h-px bg-stone-200 dark:bg-neutral-700" />
                <div className="flex items-center justify-between">
                  <span className="text-sm text-neutral-500 dark:text-neutral-400">
                    {locale === 'es' ? 'Ubicación' : 'Location'}
                  </span>
                  <span className="text-sm font-medium text-neutral-900 dark:text-white">{property?.city || '-'}</span>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}
