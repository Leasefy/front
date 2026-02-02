'use client';

import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import {
  ArrowLeft,
  FileText,
  MapPin,
  Calendar,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  MessageCircle,
  Phone,
  Building2,
  Copy,
  Check,
} from 'lucide-react';
import { useState } from 'react';

import { getTenantApplicationById } from '@/lib/data/mock-tenant-applications';
import { mockProperties } from '@/lib/data/mock-properties';
import { PlanStatusBadge, getApplicationStatus } from '@/components/ui/plan/PlanStatusBadge';
import { PlanProgressBar } from '@/components/ui/plan/PlanProgressBar';
import { Button } from '@/components/ui/button';

/**
 * Application Detail Page - Shows full application info with timeline
 */
export default function ApplicationDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [copied, setCopied] = useState(false);

  const applicationId = params.applicationId as string;
  const application = getTenantApplicationById(applicationId);
  const property = application
    ? mockProperties.find((p) => p.id === application.propertyId)
    : null;

  if (!application || !property) {
    return (
      <div className="min-h-screen bg-plan-page flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
            <FileText className="w-8 h-8 text-plan-muted" />
          </div>
          <h2 className="text-lg font-semibold text-plan-primary mb-2">
            Aplicacion no encontrada
          </h2>
          <p className="text-plan-secondary mb-4">
            No pudimos encontrar esta aplicacion
          </p>
          <Button onClick={() => router.push('/inquilino/aplicaciones')}>
            Ver mis aplicaciones
          </Button>
        </div>
      </div>
    );
  }

  const statusLabels: Record<string, string> = {
    submitted: 'Enviada',
    under_review: 'En revision',
    pre_approved: 'Pre-aprobada',
    approved: 'Aprobada',
    rejected: 'Rechazada',
    withdrawn: 'Retirada',
  };

  const progressMap: Record<string, number> = {
    submitted: 25,
    under_review: 50,
    pre_approved: 75,
    approved: 100,
    rejected: 100,
    withdrawn: 100,
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-CL', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('es-CL', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getEventIcon = (type: string) => {
    switch (type) {
      case 'created':
        return <FileText className="w-4 h-4" />;
      case 'submitted':
        return <Clock className="w-4 h-4" />;
      case 'under_review':
        return <AlertCircle className="w-4 h-4" />;
      case 'documents_verified':
        return <CheckCircle className="w-4 h-4" />;
      case 'pre_approved':
        return <CheckCircle className="w-4 h-4" />;
      case 'approved':
        return <CheckCircle className="w-4 h-4 text-emerald-500" />;
      case 'rejected':
        return <XCircle className="w-4 h-4 text-red-500" />;
      case 'withdrawn':
        return <XCircle className="w-4 h-4 text-slate-500" />;
      default:
        return <Clock className="w-4 h-4" />;
    }
  };

  const copyTrackingCode = () => {
    navigator.clipboard.writeText(application.trackingCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const isFinalStatus = ['approved', 'rejected', 'withdrawn'].includes(
    application.status
  );

  return (
    <div className="min-h-screen bg-plan-page">
      <div className="max-w-4xl mx-auto px-6 py-8">
        {/* Back Button */}
        <button
          onClick={() => router.back()}
          className="inline-flex items-center gap-2 text-sm text-plan-secondary hover:text-plan-primary transition-colors mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Volver a aplicaciones
        </button>

        {/* Header */}
        <div className="bg-white border border-plan-border overflow-hidden mb-6">
          <div className="p-6">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <h1 className="text-xl font-semibold text-plan-primary">
                    Aplicacion {application.trackingCode}
                  </h1>
                  <button
                    onClick={copyTrackingCode}
                    className="p-1.5 rounded-sm hover:bg-gray-100 text-plan-secondary transition-colors"
                    title="Copiar codigo"
                  >
                    {copied ? (
                      <Check className="w-4 h-4 text-emerald-500" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </button>
                </div>
                <p className="text-sm text-plan-secondary">
                  Enviada el {formatDate(application.submittedAt)}
                </p>
              </div>
              <PlanStatusBadge
                status={getApplicationStatus(application.status)}
                label={statusLabels[application.status]}
              />
            </div>

            {/* Progress Bar */}
            <div className="mt-6">
              <div className="flex items-center justify-between text-xs text-plan-secondary mb-2">
                <span>Progreso de la aplicacion</span>
                <span>{progressMap[application.status]}%</span>
              </div>
              <PlanProgressBar
                value={progressMap[application.status]}
                size="md"
                variant={
                  application.status === 'approved'
                    ? 'success'
                    : application.status === 'rejected'
                    ? 'danger'
                    : 'default'
                }
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Property Info */}
            <div className="bg-white border border-plan-border overflow-hidden">
              <div className="px-5 py-4 border-b border-plan-border">
                <h2 className="font-semibold text-plan-primary">Propiedad</h2>
              </div>
              <Link href={`/propiedades/${property.id}`}>
                <div className="p-5 hover:bg-gray-50 transition-colors">
                  <div className="flex gap-4">
                    <div className="relative w-24 h-24 overflow-hidden flex-shrink-0 bg-gray-100">
                      <Image
                        src={property.images[0]}
                        alt={property.title}
                        fill
                        className="object-cover"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-plan-primary">
                        {property.title}
                      </h3>
                      <p className="text-sm text-plan-secondary mt-1 flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5" />
                        {property.address}, {property.neighborhood}
                      </p>
                      <p className="text-lg font-semibold text-plan-primary mt-2">
                        ${property.monthlyRent.toLocaleString('es-CL')}
                        <span className="text-sm text-plan-muted font-normal">
                          /mes
                        </span>
                      </p>
                    </div>
                  </div>
                </div>
              </Link>
            </div>

            {/* Timeline */}
            <div className="bg-white border border-plan-border overflow-hidden">
              <div className="px-5 py-4 border-b border-plan-border">
                <h2 className="font-semibold text-plan-primary">
                  Historial de la aplicacion
                </h2>
              </div>
              <div className="p-5">
                <div className="relative">
                  {/* Timeline line */}
                  <div className="absolute left-4 top-2 bottom-2 w-px bg-gray-200" />

                  {/* Events */}
                  <div className="space-y-6">
                    {[...application.events].reverse().map((event, index) => (
                      <div key={event.id} className="relative flex gap-4">
                        {/* Icon */}
                        <div
                          className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 z-10 ${
                            index === 0
                              ? 'bg-plan-primary text-white'
                              : 'bg-gray-100 text-plan-secondary'
                          }`}
                        >
                          {getEventIcon(event.type)}
                        </div>

                        {/* Content */}
                        <div className="flex-1 pt-1">
                          <p
                            className={`text-sm ${
                              index === 0
                                ? 'font-medium text-plan-primary'
                                : 'text-plan-secondary'
                            }`}
                          >
                            {event.description}
                          </p>
                          <p className="text-xs text-plan-muted mt-1 flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {formatDate(event.timestamp)} a las{' '}
                            {formatTime(event.timestamp)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Actions */}
            <div className="bg-white border border-plan-border overflow-hidden">
              <div className="px-5 py-4 border-b border-plan-border">
                <h2 className="font-semibold text-plan-primary">Acciones</h2>
              </div>
              <div className="p-4 space-y-3">
                <Button
                  variant="outline"
                  className="w-full justify-start gap-2"
                  onClick={() => router.push('/inquilino/mensajes')}
                >
                  <MessageCircle className="w-4 h-4" />
                  Contactar propietario
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start gap-2"
                >
                  <Phone className="w-4 h-4" />
                  Llamar
                </Button>
                {!isFinalStatus && (
                  <Button
                    variant="outline"
                    className="w-full justify-start gap-2 text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    <XCircle className="w-4 h-4" />
                    Retirar aplicacion
                  </Button>
                )}
              </div>
            </div>

            {/* Property Quick Info */}
            <div className="bg-white border border-plan-border overflow-hidden">
              <div className="px-5 py-4 border-b border-plan-border">
                <h2 className="font-semibold text-plan-primary">
                  Detalles de la propiedad
                </h2>
              </div>
              <div className="p-4 space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-plan-secondary">Tipo</span>
                  <span className="text-plan-primary capitalize">
                    {property.type}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-plan-secondary">Habitaciones</span>
                  <span className="text-plan-primary">{property.bedrooms}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-plan-secondary">Banos</span>
                  <span className="text-plan-primary">{property.bathrooms}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-plan-secondary">Area</span>
                  <span className="text-plan-primary">{property.area} m2</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-plan-secondary">Ciudad</span>
                  <span className="text-plan-primary">{property.city}</span>
                </div>
              </div>
            </div>

            {/* Status Info */}
            {application.status === 'approved' && (
              <div className="bg-emerald-50 border border-emerald-200 p-4">
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-emerald-800">
                      Aplicacion aprobada
                    </p>
                    <p className="text-sm text-emerald-700 mt-1">
                      El propietario te contactara para coordinar la firma del
                      contrato.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {application.status === 'rejected' && (
              <div className="bg-red-50 border border-red-200 p-4">
                <div className="flex items-start gap-3">
                  <XCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-red-800">
                      Aplicacion rechazada
                    </p>
                    <p className="text-sm text-red-700 mt-1">
                      Puedes explorar otras propiedades disponibles.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {application.status === 'pre_approved' && (
              <div className="bg-amber-50 border border-amber-200 p-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-amber-800">Pre-aprobada</p>
                    <p className="text-sm text-amber-700 mt-1">
                      El propietario esta interesado. Espera la confirmacion
                      final.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
