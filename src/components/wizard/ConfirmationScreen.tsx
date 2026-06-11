'use client';

import Link from 'next/link';
import { CheckCircle, Clock, MagnifyingGlass, Bell, FileText } from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import type { Property } from '@/lib/types/property';

// ============================================================================
// TextTs
// ============================================================================

interface ConfirmationScreenProps {
  property: Property;
  trackingCode: string;
  isGuest?: boolean;
  guestEmail?: string;
}

// ============================================================================
// Component
// ============================================================================

/**
 * ConfirmationScreen - Shown after successful application submission
 * Displays tracking code and next steps
 */
export function ConfirmationScreen({ property, trackingCode, isGuest, guestEmail }: ConfirmationScreenProps) {
  void isGuest; void guestEmail; // available for future use
  return (
    <div className="min-h-screen bg-muted flex items-center justify-center px-4 py-8">
      <div className="max-w-lg w-full">
        {/* Success card */}
        <div className="bg-card rounded-sm border border-border overflow-hidden">
          {/* Success header */}
          <div className="bg-[#E8F3EC] px-6 py-8 text-center border-b border-[#2C7A53]/30">
            <div className="mx-auto w-16 h-16 bg-[#E8F3EC] rounded-full flex items-center justify-center mb-4">
              <CheckCircle className="h-10 w-10 text-[#2C7A53]" />
            </div>
            <h1 className="text-2xl font-bold text-foreground mb-2">
              Aplicación enviada!
            </h1>
            <p className="text-muted-foreground">
              Tu aplicación para{' '}
              <span className="font-medium text-foreground">
                {property.title}
              </span>{' '}
              ha sido recibida.
            </p>
          </div>

          {/* Next steps */}
          <div className="px-6 py-6">
            <h2 className="text-sm font-medium text-foreground mb-4 flex items-center gap-2">
              <FileText className="h-4 w-4 text-[#1A40FF]" />
              ¿Qué sigue?
            </h2>

            <div className="space-y-4">
              <TimelineItem
                icon={<MagnifyingGlass className="h-4 w-4" />}
                title="Verificación de documentos"
                description="Revisaremos tus documentos en las próximas 24 horas."
                number={1}
              />
              <TimelineItem
                icon={<Clock className="h-4 w-4" />}
                title="Evaluación AI"
                description="Nuestro sistema evaluará tu perfil de riesgo automáticamente."
                number={2}
              />
              <TimelineItem
                icon={<Bell className="h-4 w-4" />}
                title="Resultado"
                description="Te contactaremos por email y WhatsApp con la decisión."
                number={3}
                isLast
              />
            </div>
          </div>

          {/* Tracking code */}
          <div className="mx-6 mb-6 p-4 bg-muted border border-border rounded-sm">
            <p className="text-xs text-muted-foreground mb-1">Código de seguimiento</p>
            <p className="text-lg font-mono font-bold text-foreground tracking-wider">
              {trackingCode}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Guarda este código para consultar el estado de tu aplicación.
            </p>
          </div>

          {/* Actions */}
          <div className="px-6 pb-6">
            <Link href="/inquilino/aplicaciones" className="block">
              <Button className="w-full">
                Ver mi aplicación
              </Button>
            </Link>
          </div>
        </div>

        {/* FloppyDisk indicator */}
        <p className="text-center text-xs text-muted-foreground mt-4">
          Los datos de esta aplicación han sido guardados.
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
        <div className="absolute left-4 top-10 bottom-0 w-px bg-muted" />
      )}

      {/* Number circle */}
      <div className="relative flex-shrink-0">
        <div className="w-8 h-8 rounded-full bg-[#EEF1FF] text-[#1A40FF] flex items-center justify-center text-sm font-medium">
          {number}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 pb-4">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-muted-foreground">{icon}</span>
          <h3 className="text-sm font-medium text-foreground">{title}</h3>
        </div>
        <p className="text-sm text-muted-foreground">{description}</p>
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
