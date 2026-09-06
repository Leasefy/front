'use client';

import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { FileText, MapPin, Calendar, Clock, CheckCircle, XCircle, ChatCircle, Phone, Copy, Check, ArrowUpRight, Sparkle, PaperPlaneTilt, SealCheck, Eye, Confetti, PenNib, Warning, ArrowClockwise } from '@phosphor-icons/react';
import { useState } from 'react';
import { toast } from 'sonner';

import { BackButton } from '@/components/ui/back-button';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useTenantApplication } from '@/lib/hooks/useApplications';
import { useContractByApplication } from '@/lib/hooks/useContracts';
import { applicationsApi } from '@/lib/api/applications.service';
import { ChatThread } from '@/components/messages/ChatThread';
import { cn } from '@/lib/utils';
import { useI18n } from '@/lib/i18n';
import { FalloDeCarga } from '@/components/estado/FalloDeCarga';

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

  if (status === 'needs_info') {
    const d = new Date(baseDate);
    d.setDate(d.getDate() + 1);
    events.push({
      id: `evt-${eventId++}`,
      type: 'needs_info',
      timestamp: d.toISOString(),
      description: locale === 'es'
        ? 'La inmobiliaria solicitó información adicional'
        : 'The agency requested additional information',
    });
    return events;
  }

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
  const searchParams = useSearchParams();
  const [copied, setCopied] = useState(false);
  const [confirmWithdrawOpen, setConfirmWithdrawOpen] = useState(false);
  const [isWithdrawing, setIsWithdrawing] = useState(false);
  // ?chat=1 (e.g. arriving from a new-message notification) opens the conversation directly.
  const [showChat, setShowChat] = useState(searchParams.get('chat') === '1');

  const applicationId = params.applicationId as string;
  const { application, isLoading, error, errorCrudo, refetch } = useTenantApplication(applicationId);
  const responseSubmitted = false; // will be true after navigating to /completar and coming back
  const { contract: linkedContract } = useContractByApplication(applicationId);

  const handleWithdraw = async () => {
    setIsWithdrawing(true);
    try {
      await applicationsApi.withdraw(applicationId);
      toast.success(locale === 'es' ? 'Postulación retirada' : 'Application withdrawn');
      setConfirmWithdrawOpen(false);
      await refetch();
    } catch (e) {
      toast.error(
        e instanceof Error
          ? e.message
          : locale === 'es'
            ? 'No se pudo retirar'
            : 'Could not withdraw'
      );
    } finally {
      setIsWithdrawing(false);
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center">
        <Spinner size="lg" variant="current" className="text-primary" />
      </div>
    );
  }

    /*
   * «No existe» y «no se pudo cargar» eran la misma pantalla: `if (!x || error)`.
   * Le decía a alguien con mala conexión que tu postulación había sido eliminada, y sin
   * ofrecer reintentar — porque sobre algo que no existe reintentar no tiene
   * sentido. Las dos señales ya estaban por separado; se juntaban a mano.
   */
  if (error) {
    return (
      <div className="mx-auto w-full max-w-2xl px-4 py-16 sm:px-6">
        <FalloDeCarga
          error={errorCrudo ?? error}
          queEs="tu postulación"
            onReintentar={refetch}
          volverA={{ label: 'Mis postulaciones', href: '/inquilino/aplicaciones' }}
        />
      </div>
    );
  }

  if (!application) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center px-6"
        >
          <div className="w-20 h-20 rounded-full bg-surface-muted flex items-center justify-center mx-auto mb-6">
            <FileText className="w-10 h-10 text-fg-subtle" />
          </div>
          <h2 className="text-2xl font-semibold text-fg mb-3">
            {locale === 'es' ? 'Postulación no encontrada' : 'Application not found'}
          </h2>
          <p className="text-fg-muted mb-6 max-w-sm">
            {error || (locale === 'es'
              ? 'No pudimos encontrar esta postulación. Es posible que haya sido eliminada o el enlace sea incorrecto.'
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
    submitted: { label: locale === 'es' ? 'Enviada' : 'Submitted', color: 'text-primary', bgColor: 'bg-primary-soft', icon: PaperPlaneTilt },
    under_review: { label: locale === 'es' ? 'En revisión' : 'Under review', color: 'text-warning', bgColor: 'bg-warning-soft', icon: Eye },
    needs_info: { label: locale === 'es' ? 'Info. requerida' : 'Info required', color: 'text-warning', bgColor: 'bg-warning-soft', icon: Warning },
    approved: { label: locale === 'es' ? 'Aprobada' : 'Approved', color: 'text-success', bgColor: 'bg-success-soft', icon: Confetti },
    rejected: { label: locale === 'es' ? 'Rechazada' : 'Rejected', color: 'text-danger', bgColor: 'bg-danger-soft', icon: XCircle },
    withdrawn: { label: locale === 'es' ? 'Retirada' : 'Withdrawn', color: 'text-fg-muted', bgColor: 'bg-surface-muted', icon: XCircle },
  };

  const progressSteps = [
    { key: 'submitted', label: locale === 'es' ? 'Enviada' : 'Submitted', icon: PaperPlaneTilt },
    { key: 'under_review', label: locale === 'es' ? 'En revisión' : 'Under review', icon: Eye },
    { key: 'approved', label: locale === 'es' ? 'Aprobada' : 'Approved', icon: Confetti },
  ];

  const getCurrentStepIndex = () => {
    const statusOrder = ['submitted', 'under_review', 'approved'];
    if (application.status === 'needs_info') return 0; // stays at "submitted" in the stepper
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
      case 'needs_info':
        return Warning;
      case 'documents_verified':
        return SealCheck;
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

  // Use the contract tied to this application directly via GET /contracts/by-application/:id.
  // Antes se buscaba por propertyId, lo que podía traer un contrato equivocado.
  const contract = application.status === 'approved' ? linkedContract : null;

  // Generate timeline from status
  const events = generateTimelineFromStatus(application.status, application.submittedAt, locale);

  return (
    <div className="min-h-screen bg-bg">
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
          className="relative rounded-xl overflow-hidden bg-surface-muted border border-transparent mb-8"
        >
          <div className="flex flex-col lg:flex-row">
            {/* Property Image */}
            <div className="relative w-full lg:w-[400px] h-64 lg:h-auto flex-shrink-0">
              <Image
                src={property?.thumbnail || '/placeholder-property.svg'}
                alt={property?.title || 'Propiedad'}
                fill
                className="object-cover"
                priority
              />
              {/* Gradient overlay */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-transparent to-surface-muted/80 hidden lg:block" />
              <div className="absolute inset-0 bg-gradient-to-t from-surface-muted/80 via-transparent to-transparent lg:hidden" />
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
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={copyTrackingCode}
                  className="rounded-full bg-surface/80 hover:bg-surface-muted text-fg-muted"
                >
                  {copied ? (
                    <>
                      <Check className="w-4 h-4 text-success" />
                      {locale === 'es' ? 'Copiado' : 'Copied'}
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      {application.trackingCode}
                    </>
                  )}
                </Button>
              </div>

              {/* Property Info */}
              {property && (
                <Link href={`/propiedades/${property.id}`} className="group">
                  <h1 className="text-2xl lg:text-3xl font-semibold text-fg group-hover:text-primary transition-colors mb-2">
                    {property.title}
                  </h1>
                  <p className="text-fg-muted flex items-center gap-1.5 mb-4">
                    <MapPin className="w-4 h-4" />
                    {property.neighborhood}, {property.city}
                  </p>
                </Link>
              )}

              {/* Price and Date */}
              <div className="flex flex-wrap items-center gap-6 mb-6">
                <div>
                  <p className="text-sm text-fg-muted mb-1">
                    {locale === 'es' ? 'Arriendo mensual' : 'Monthly rent'}
                  </p>
                  <p className="text-2xl font-bold text-fg">
                    {formatCurrency(property?.monthlyRent || 0)}
                  </p>
                </div>
                <div className="h-10 w-px bg-surface-muted hidden sm:block" />
                <div>
                  <p className="text-sm text-fg-muted mb-1">
                    {locale === 'es' ? 'Fecha de envío' : 'Submitted on'}
                  </p>
                  <p className="text-lg font-medium text-fg flex items-center gap-1.5">
                    <Calendar className="w-4 h-4" />
                    {formatShortDate(application.submittedAt)}
                  </p>
                </div>
              </div>

              {/* Progress Steps */}
              {!isFinalStatus && (
                <div className="pt-6 border-t border-border">
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
                                  ? 'bg-primary text-white'
                                  : 'bg-success text-white'
                                : 'bg-surface-muted text-fg-subtle'
                            )}>
                              {isCompleted && !isCurrent ? (
                                <CheckCircle className="w-5 h-5" />
                              ) : (
                                <StepIcon className="w-5 h-5" />
                              )}
                            </div>
                            <span className={cn(
                              'text-xs mt-2 font-medium hidden sm:block',
                              isCurrent ? 'text-primary' : isCompleted ? 'text-success' : 'text-fg-subtle'
                            )}>
                              {step.label}
                            </span>
                          </div>
                          {index < progressSteps.length - 1 && (
                            <div className={cn(
                              'w-8 sm:w-16 lg:w-24 h-1 mx-2 rounded-full transition-colors',
                              index < currentStep ? 'bg-success' : 'bg-surface-muted'
                            )} />
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Final Status Message — approved: depende del contrato */}
              {application.status === 'approved' && (() => {
                const contractStatus = contract?.status;

                // Sin contrato todavía: el landlord no lo creó.
                if (!contract) {
                  return (
                    <div className="mt-6 p-4 rounded-xl bg-success-soft border border-success/30">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-full bg-success flex items-center justify-center flex-shrink-0">
                          <Confetti className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <p className="font-semibold text-success">
                            {locale === 'es' ? '¡Felicidades! Tu postulación fue aprobada' : 'Congratulations! Your application was approved'}
                          </p>
                          <p className="text-sm text-success mt-1">
                            {locale === 'es'
                              ? 'El propietario está preparando el contrato. Te avisaremos cuando esté listo para firmar.'
                              : 'The landlord is preparing the contract. We\'ll notify you when it\'s ready to sign.'}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                }

                // Pendiente firma del tenant → CTA principal (firmá primero — flow tenant-first).
                if (contractStatus === 'pending_tenant') {
                  return (
                    <div className="mt-6 p-4 rounded-xl bg-primary-soft border border-primary/30">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                          <PenNib className="w-5 h-5 text-white" />
                        </div>
                        <div className="flex-1">
                          <p className="font-semibold text-primary">
                            {locale === 'es' ? '¡Tu contrato está listo para firmar!' : 'Your contract is ready to sign!'}
                          </p>
                          <p className="text-sm text-primary mt-1">
                            {locale === 'es'
                              ? 'Revisá el contrato y firmá. Después el propietario firmará para cerrar el proceso.'
                              : 'Review the contract and sign. Then the landlord will sign to close the process.'}
                          </p>
                          <Link
                            href={`/inquilino/contratos/${contract.id}/firmar`}
                            className="mt-3 inline-flex items-center gap-2 px-5 py-2.5 bg-primary hover:opacity-90 text-white rounded-xl text-sm font-semibold transition-colors"
                          >
                            <PenNib className="w-4 h-4" />
                            {locale === 'es' ? 'Firmar contrato' : 'Sign contract'}
                          </Link>
                        </div>
                      </div>
                    </div>
                  );
                }

                // DRAFT: landlord aún no envió el contrato.
                if (contractStatus === 'draft') {
                  return (
                    <div className="mt-6 p-4 rounded-xl bg-warning-soft border border-warning/30">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-full bg-warning flex items-center justify-center flex-shrink-0">
                          <Clock className="w-5 h-5 text-white" />
                        </div>
                        <div className="flex-1">
                          <p className="font-semibold text-warning">
                            {locale === 'es' ? 'Contrato en preparación' : 'Contract being prepared'}
                          </p>
                          <p className="text-sm text-warning mt-1">
                            {locale === 'es'
                              ? 'El propietario está preparando el contrato. Te avisamos cuando esté listo para firmar.'
                              : 'The landlord is preparing the contract. We\'ll notify you when it\'s ready to sign.'}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                }

                // PENDING_LANDLORD_SIGNATURE: tenant ya firmó, esperando al landlord.
                if (contractStatus === 'pending_landlord') {
                  return (
                    <div className="mt-6 p-4 rounded-xl bg-success-soft border border-success/30">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-full bg-success flex items-center justify-center flex-shrink-0">
                          <SealCheck className="w-5 h-5 text-white" />
                        </div>
                        <div className="flex-1">
                          <p className="font-semibold text-success">
                            {locale === 'es' ? 'Ya firmaste el contrato' : 'You already signed the contract'}
                          </p>
                          <p className="text-sm text-success mt-1">
                            {locale === 'es'
                              ? 'Esperando que el propietario firme para cerrar el proceso.'
                              : 'Waiting for the landlord to sign to close the process.'}
                          </p>
                          <Link
                            href={`/inquilino/contratos/${contract.id}/firmar`}
                            className="mt-3 inline-flex items-center gap-2 text-sm font-medium text-success hover:underline"
                          >
                            {locale === 'es' ? 'Ver contrato' : 'View contract'}
                            <ArrowUpRight className="w-4 h-4" />
                          </Link>
                        </div>
                      </div>
                    </div>
                  );
                }

                // El propietario está aplicando los cambios que pediste antes de firmar.
                if (contractStatus === 'rejected_pending_modifications') {
                  return (
                    <div className="mt-6 p-4 rounded-xl bg-warning-soft border border-warning/30">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-full bg-warning flex items-center justify-center flex-shrink-0">
                          <ArrowClockwise className="w-5 h-5 text-white" />
                        </div>
                        <div className="flex-1">
                          <p className="font-semibold text-warning">
                            {locale === 'es' ? 'El propietario está aplicando los cambios' : 'The landlord is applying the changes'}
                          </p>
                          <p className="text-sm text-warning mt-1">
                            {locale === 'es'
                              ? 'Pediste modificaciones al contrato. Te avisamos cuando el propietario las aplique así podés revisarlo y firmar.'
                              : 'You requested modifications. We\'ll notify you once the landlord applies them so you can review and sign.'}
                          </p>
                          <Link
                            href={`/inquilino/contratos/${contract.id}/firmar`}
                            className="mt-3 inline-flex items-center gap-2 text-sm font-medium text-warning hover:underline"
                          >
                            {locale === 'es' ? 'Ver contrato' : 'View contract'}
                            <ArrowUpRight className="w-4 h-4" />
                          </Link>
                        </div>
                      </div>
                    </div>
                  );
                }

                // Ambos firmaron, esperando que empiece a regir.
                if (contractStatus === 'signed') {
                  return (
                    <div className="mt-6 p-4 rounded-xl bg-success-soft border border-success/30">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-full bg-success flex items-center justify-center flex-shrink-0">
                          <SealCheck className="w-5 h-5 text-white" />
                        </div>
                        <div className="flex-1">
                          <p className="font-semibold text-success">
                            {locale === 'es' ? '¡Contrato firmado por ambas partes!' : 'Contract signed by both parties!'}
                          </p>
                          <p className="text-sm text-success mt-1">
                            {locale === 'es'
                              ? 'Esperando que el contrato comience a regir en la fecha acordada.'
                              : 'Waiting for the contract to start on the agreed date.'}
                          </p>
                          <Link
                            href={`/inquilino/contratos/${contract.id}/firmar`}
                            className="mt-3 inline-flex items-center gap-2 text-sm font-medium text-success hover:underline"
                          >
                            {locale === 'es' ? 'Ver contrato' : 'View contract'}
                            <ArrowUpRight className="w-4 h-4" />
                          </Link>
                        </div>
                      </div>
                    </div>
                  );
                }

                // Contrato vigente o expirado → acceso al detalle.
                if (contractStatus === 'active' || contractStatus === 'expired') {
                  return (
                    <div className="mt-6 p-4 rounded-xl bg-success-soft border border-success/30">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-full bg-success flex items-center justify-center flex-shrink-0">
                          <SealCheck className="w-5 h-5 text-white" />
                        </div>
                        <div className="flex-1">
                          <p className="font-semibold text-success">
                            {locale === 'es'
                              ? (contractStatus === 'active' ? 'Contrato vigente' : 'Contrato expirado')
                              : (contractStatus === 'active' ? 'Contract active' : 'Contract expired')}
                          </p>
                          <Link
                            href={`/inquilino/contratos/${contract.id}/firmar`}
                            className="mt-2 inline-flex items-center gap-2 text-sm font-medium text-success hover:underline"
                          >
                            {locale === 'es' ? 'Ver contrato' : 'View contract'}
                            <ArrowUpRight className="w-4 h-4" />
                          </Link>
                        </div>
                      </div>
                    </div>
                  );
                }

                // Cancelled (raro — normalmente el backend pasa la app a CONTRACT_FAILED).
                if (contractStatus === 'cancelled') {
                  return (
                    <div className="mt-6 p-4 rounded-xl bg-danger-soft border border-danger/30">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-full bg-danger flex items-center justify-center flex-shrink-0">
                          <XCircle className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <p className="font-semibold text-danger">
                            {locale === 'es' ? 'Contrato cancelado' : 'Contract cancelled'}
                          </p>
                          <p className="text-sm text-danger mt-1">
                            {locale === 'es'
                              ? 'El proceso se cerró. Para intentar de nuevo tienes que crear una nueva postulación.'
                              : 'The process is closed. To try again you need to create a new application.'}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                }

                return null;
              })()}

              {(application.status === 'needs_info') && !responseSubmitted && (
                <div className="mt-6 p-4 rounded-xl bg-warning-soft border border-warning/30">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-full bg-warning flex items-center justify-center flex-shrink-0">
                      <Warning className="w-5 h-5 text-white" />
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-warning">
                        {locale === 'es' ? 'La inmobiliaria solicitó más información' : 'The agency requested more information'}
                      </p>
                      <p className="text-sm text-warning mt-1">
                        {locale === 'es'
                          ? 'Revisá la sección de Acciones para completar lo que se te pidió y notificar a la inmobiliaria.'
                          : 'Check the Actions section to complete what was requested and notify the agency.'}
                      </p>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => router.push(`/inquilino/aplicaciones/${applicationId}/completar`)}
                        className="mt-3 bg-warning hover:bg-warning text-white"
                      >
                        <ArrowClockwise className="w-4 h-4" />
                        {locale === 'es' ? 'Completar información' : 'Complete information'}
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {(application.status === 'needs_info') && responseSubmitted && (
                <div className="mt-6 p-4 rounded-xl bg-success-soft border border-success/30">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-full bg-success flex items-center justify-center flex-shrink-0">
                      <CheckCircle className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <p className="font-semibold text-success">
                        {locale === 'es' ? 'Respuesta enviada a la inmobiliaria' : 'Response sent to the agency'}
                      </p>
                      <p className="text-sm text-success mt-1">
                        {locale === 'es'
                          ? 'La inmobiliaria fue notificada y revisará tu información a la brevedad.'
                          : 'The agency has been notified and will review your information shortly.'}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {application.status === 'rejected' && (
                <div className="mt-6 p-4 rounded-xl bg-danger-soft border border-danger/30">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-full bg-danger flex items-center justify-center flex-shrink-0">
                      <XCircle className="w-5 h-5 text-white" />
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-danger">
                        {locale === 'es' ? 'Proceso cerrado' : 'Process closed'}
                      </p>
                      <p className="text-sm text-danger mt-1">
                        {locale === 'es'
                          ? 'Esta postulación se cerró. Puede ser porque la propiedad fue rentada a otro candidato o porque el propietario tomó otra decisión. No es un rechazo a tu perfil — vas a recibir alternativas en breve.'
                          : 'This application was closed. The property may have been rented to another candidate or the landlord chose differently. It\'s not a rejection of your profile — you\'ll receive alternatives shortly.'}
                      </p>
                      <Link
                        href="/inquilino/explorar"
                        className="mt-3 inline-flex items-center gap-2 px-4 py-2 bg-danger hover:bg-danger text-white rounded-xl text-sm font-semibold transition-colors"
                      >
                        {locale === 'es' ? 'Explorar otras propiedades' : 'Explore other properties'}
                        <ArrowUpRight className="w-4 h-4" />
                      </Link>
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
              className="rounded-xl bg-surface-muted p-6"
            >
              <h2 className="text-lg font-semibold text-fg mb-6">
                {locale === 'es' ? 'Historial de la postulación' : 'Application history'}
              </h2>

              <div className="relative">
                {/* Timeline line */}
                <div className="absolute left-5 top-5 bottom-5 w-0.5 bg-surface-muted" />

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
                            ? 'bg-primary text-white'
                            : 'bg-surface border-2 border-border text-fg-muted'
                        )}>
                          <EventIcon className="w-4 h-4" />
                        </div>

                        {/* Content */}
                        <div className="flex-1 pt-2">
                          <p className={cn(
                            'text-sm',
                            isFirst ? 'font-semibold text-fg' : 'text-fg-muted'
                          )}>
                            {event.description}
                          </p>
                          <p className="text-xs text-fg-subtle mt-1 flex items-center gap-1.5">
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
                className="rounded-xl border border-border bg-surface p-6"
              >
                <h2 className="text-lg font-semibold text-fg mb-4">
                  {locale === 'es' ? 'Propiedad' : 'Property'}
                </h2>

                <div className="flex items-center gap-4 mb-4">
                  <div className="relative w-20 h-20 rounded-xl overflow-hidden flex-shrink-0">
                    <Image
                      src={property.thumbnail}
                      alt={property.title}
                      fill
                      className="object-cover"
                      sizes="80px"
                    />
                  </div>
                  <div>
                    <h3 className="font-semibold text-fg">{property.title}</h3>
                    <p className="text-sm text-fg-muted flex items-center gap-1 mt-1">
                      <MapPin className="w-3.5 h-3.5" />
                      {property.neighborhood}, {property.city}
                    </p>
                    <p className="text-lg font-bold text-fg mt-1">
                      {formatCurrency(property.monthlyRent)}
                      <span className="text-xs font-normal text-fg-muted">/mes</span>
                    </p>
                  </div>
                </div>

                <Link
                  href={`/propiedades/${property.id}`}
                  className="flex items-center justify-center gap-2 w-full py-3 rounded-full border border-border text-sm font-medium text-fg hover:bg-surface-muted hover:border-border-strong transition-colors"
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
              className="rounded-xl bg-primary-soft border border-primary/30 p-6"
            >
              <h3 className="font-semibold text-fg mb-4">
                {locale === 'es' ? 'Acciones' : 'Actions'}
              </h3>

              <div className="space-y-3">
                <button
                  onClick={() => setShowChat((prev) => !prev)}
                  className="flex items-center gap-3 w-full p-3 rounded-xl bg-surface hover: transition-all group"
                >
                  <div className="w-10 h-10 rounded-xl bg-primary-soft flex items-center justify-center group-hover:opacity-90 transition-colors">
                    <ChatCircle className="w-5 h-5 text-primary group-hover:text-white transition-colors" />
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-medium text-fg">
                      {locale === 'es' ? 'Contactar propietario' : 'Contact landlord'}
                    </p>
                    <p className="text-xs text-fg-muted">
                      {locale === 'es'
                        ? (showChat ? 'Ocultar conversación' : 'Envía un mensaje sin salir de aquí')
                        : (showChat ? 'Hide conversation' : 'Send a message without leaving')}
                    </p>
                  </div>
                </button>

                {showChat && <ChatThread applicationId={applicationId} />}

                <button className="flex items-center gap-3 w-full p-3 rounded-xl bg-surface hover: transition-all group">
                  <div className="w-10 h-10 rounded-xl bg-success-soft flex items-center justify-center group-hover:bg-success transition-colors">
                    <Phone className="w-5 h-5 text-success group-hover:text-white transition-colors" />
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-medium text-fg">
                      {locale === 'es' ? 'Llamar' : 'Call'}
                    </p>
                    <p className="text-xs text-fg-muted">
                      {locale === 'es' ? 'Contacto directo' : 'Direct contact'}
                    </p>
                  </div>
                </button>

                {application.status === 'needs_info' && !responseSubmitted && (
                  <button
                    onClick={() => router.push(`/inquilino/aplicaciones/${applicationId}/completar`)}
                    className="flex items-center gap-3 w-full p-3 rounded-xl bg-warning-soft transition-all group border border-warning/30"
                  >
                    <div className="w-10 h-10 rounded-xl bg-warning-soft flex items-center justify-center group-hover:bg-warning transition-colors">
                      <ArrowClockwise className="w-5 h-5 text-warning group-hover:text-white transition-colors" />
                    </div>
                    <div className="text-left">
                      <p className="text-sm font-medium text-warning">
                        {locale === 'es' ? 'Completar información' : 'Complete information'}
                      </p>
                      <p className="text-xs text-fg-muted">
                        {locale === 'es' ? 'La inmobiliaria aguarda tu respuesta' : 'Agency awaiting your response'}
                      </p>
                    </div>
                  </button>
                )}

                {!isFinalStatus && (
                  <button
                    type="button"
                    onClick={() => setConfirmWithdrawOpen(true)}
                    disabled={isWithdrawing}
                    className="flex items-center gap-3 w-full p-3 rounded-xl bg-surface/50 hover:bg-danger-soft transition-all group border border-transparent hover:border-danger/30 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <div className="w-10 h-10 rounded-xl bg-danger-soft flex items-center justify-center group-hover:bg-danger/20 transition-colors">
                      <XCircle className="w-5 h-5 text-danger" />
                    </div>
                    <div className="text-left">
                      <p className="text-sm font-medium text-danger">
                        {locale === 'es' ? 'Retirar postulación' : 'Withdraw application'}
                      </p>
                      <p className="text-xs text-fg-muted">
                        {locale === 'es' ? 'Cancelar solicitud' : 'Cancel request'}
                      </p>
                    </div>
                  </button>
                )}
              </div>
            </motion.div>

            {/* Status Tips */}
            {application.status === 'needs_info' && !responseSubmitted && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.35 }}
                className="rounded-xl bg-warning-soft border border-warning/30 p-6"
              >
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full bg-warning-soft flex items-center justify-center flex-shrink-0">
                    <Warning className="w-5 h-5 text-warning" />
                  </div>
                  <div>
                    <p className="font-semibold text-warning mb-1">
                      {locale === 'es' ? 'Acción requerida' : 'Action required'}
                    </p>
                    <p className="text-sm text-warning">
                      {locale === 'es'
                        ? 'La inmobiliaria necesita más información para continuar con tu solicitud. Hacé clic en "Completar información" para responder.'
                        : 'The agency needs more information to proceed with your application. Click "Complete information" to respond.'}
                    </p>
                  </div>
                </div>
              </motion.div>
            )}

            {application.status === 'under_review' && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.35 }}
                className="rounded-xl bg-warning-soft border border-warning/30 p-6"
              >
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full bg-warning-soft flex items-center justify-center flex-shrink-0">
                    <Sparkle className="w-5 h-5 text-warning" />
                  </div>
                  <div>
                    <p className="font-semibold text-warning mb-1">
                      {locale === 'es' ? 'En proceso de revisión' : 'Under review'}
                    </p>
                    <p className="text-sm text-warning">
                      {locale === 'es'
                        ? 'El propietario está evaluando tu postulación. Normalmente toma entre 24-48 horas.'
                        : 'The landlord is evaluating your application. This typically takes 24-48 hours.'}
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
              className="rounded-xl bg-surface-muted p-6"
            >
              <h3 className="font-semibold text-fg mb-4">
                {locale === 'es' ? 'Resumen' : 'Summary'}
              </h3>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-fg-muted">
                    {locale === 'es' ? 'Código' : 'Code'}
                  </span>
                  <span className="text-sm font-mono font-medium text-fg">{application.trackingCode}</span>
                </div>
                <div className="h-px bg-surface-muted" />
                <div className="flex items-center justify-between">
                  <span className="text-sm text-fg-muted">
                    {locale === 'es' ? 'Enviada' : 'Submitted'}
                  </span>
                  <span className="text-sm font-medium text-fg">{formatShortDate(application.submittedAt)}</span>
                </div>
                <div className="h-px bg-surface-muted" />
                <div className="flex items-center justify-between">
                  <span className="text-sm text-fg-muted">
                    {locale === 'es' ? 'Estado actual' : 'Current status'}
                  </span>
                  <span className={cn('text-sm font-medium', status.color)}>{status.label}</span>
                </div>
                <div className="h-px bg-surface-muted" />
                <div className="flex items-center justify-between">
                  <span className="text-sm text-fg-muted">
                    {locale === 'es' ? 'Ubicación' : 'Location'}
                  </span>
                  <span className="text-sm font-medium text-fg">{property?.city || '-'}</span>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>

      {/* Withdraw confirmation */}
      <AlertDialog open={confirmWithdrawOpen} onOpenChange={setConfirmWithdrawOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {locale === 'es' ? '¿Retirar tu aplicación?' : 'Withdraw your application?'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {locale === 'es'
                ? 'Esta acción no se puede deshacer. Tu solicitud quedará retirada y la inmobiliaria dejará de evaluarla.'
                : 'This action cannot be undone. Your application will be withdrawn and the agency will stop evaluating it.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isWithdrawing}>
              {locale === 'es' ? 'Cancelar' : 'Cancel'}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                void handleWithdraw();
              }}
              disabled={isWithdrawing}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/85"
            >
              {isWithdrawing
                ? locale === 'es'
                  ? 'Retirando...'
                  : 'Withdrawing...'
                : locale === 'es'
                  ? 'Retirar postulación'
                  : 'Withdraw application'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
