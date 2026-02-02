'use client';

import Link from 'next/link';
import { CheckCircle2, Clock, Search, Bell, FileText, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { Property } from '@/lib/types/property';

// ============================================================================
// Types
// ============================================================================

interface ConfirmationScreenProps {
  property: Property;
  trackingCode: string;
}

// ============================================================================
// Component
// ============================================================================

/**
 * ConfirmationScreen - Shown after successful application submission
 * Displays tracking code and next steps
 */
export function ConfirmationScreen({ property, trackingCode }: ConfirmationScreenProps) {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-8">
      <div className="max-w-lg w-full">
        {/* Success card */}
        <div className="bg-white rounded-sm border border-gray-200 shadow-sm overflow-hidden">
          {/* Success header */}
          <div className="bg-green-50 px-6 py-8 text-center border-b border-green-100">
            <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
              <CheckCircle2 className="h-10 w-10 text-green-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Aplicacion enviada!
            </h1>
            <p className="text-gray-600">
              Tu aplicacion para{' '}
              <span className="font-medium text-gray-900">
                {property.title}
              </span>{' '}
              ha sido recibida.
            </p>
          </div>

          {/* Next steps */}
          <div className="px-6 py-6">
            <h2 className="text-sm font-medium text-gray-900 mb-4 flex items-center gap-2">
              <FileText className="h-4 w-4 text-blue-600" />
              Que sigue:
            </h2>

            <div className="space-y-4">
              <TimelineItem
                icon={<Search className="h-4 w-4" />}
                title="Verificacion de documentos"
                description="Revisaremos tus documentos en las proximas 24 horas."
                number={1}
              />
              <TimelineItem
                icon={<Clock className="h-4 w-4" />}
                title="Evaluacion AI"
                description="Nuestro sistema evaluara tu perfil de riesgo automaticamente."
                number={2}
              />
              <TimelineItem
                icon={<Bell className="h-4 w-4" />}
                title="Resultado"
                description="Te contactaremos por email y WhatsApp con la decision."
                number={3}
                isLast
              />
            </div>
          </div>

          {/* Tracking code */}
          <div className="mx-6 mb-6 p-4 bg-gray-50 border border-gray-200 rounded-sm">
            <p className="text-xs text-gray-500 mb-1">Codigo de seguimiento</p>
            <p className="text-lg font-mono font-bold text-gray-900 tracking-wider">
              {trackingCode}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              Guarda este codigo para consultar el estado de tu aplicacion.
            </p>
          </div>

          {/* Actions */}
          <div className="px-6 pb-6 flex flex-col sm:flex-row gap-3">
            <Link href="/inquilino/aplicaciones" className="flex-1">
              <Button variant="outline" className="w-full">
                Ver mis aplicaciones
              </Button>
            </Link>
            <Link href="/propiedades" className="flex-1">
              <Button className="w-full">
                Volver a propiedades
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </Link>
          </div>
        </div>

        {/* Save indicator */}
        <p className="text-center text-xs text-gray-400 mt-4">
          Los datos de esta aplicacion han sido guardados.
        </p>
      </div>
    </div>
  );
}

// ============================================================================
// TimelineItem Component
// ============================================================================

interface TimelineItemProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  number: number;
  isLast?: boolean;
}

function TimelineItem({
  icon,
  title,
  description,
  number,
  isLast = false,
}: TimelineItemProps) {
  return (
    <div className="relative flex gap-4">
      {/* Timeline line */}
      {!isLast && (
        <div className="absolute left-4 top-10 bottom-0 w-px bg-gray-200" />
      )}

      {/* Number circle */}
      <div className="relative flex-shrink-0">
        <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-sm font-medium">
          {number}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 pb-4">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-gray-400">{icon}</span>
          <h3 className="text-sm font-medium text-gray-900">{title}</h3>
        </div>
        <p className="text-sm text-gray-600">{description}</p>
      </div>
    </div>
  );
}

// ============================================================================
// Helper function to generate tracking code
// ============================================================================

export function generateTrackingCode(): string {
  const digits = Math.floor(1000 + Math.random() * 9000);
  return `APP-${digits}`;
}
