'use client';

import { useState } from 'react';
import Image from 'next/image';
import { MapPin, Hash, Warning, X } from '@phosphor-icons/react';
import { MonoLabel } from '@leasefy/cadence';

import { cn } from '@/lib/utils';
import { formatCurrency, formatDate } from '@/lib/format';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetClose,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ApplicationStatusBadge } from './ApplicationStatusBadge';
import { ApplicationTimeline } from './ApplicationTimeline';
import { getStatusProgress, canWithdraw } from '@/lib/types/tenant-application';
import type { TenantApplication } from '@/lib/types/tenant-application';
import type { Property } from '@/lib/types/property';

// ============================================================================
// Status Explanations
// ============================================================================

const STATUS_EXPLANATIONS: Record<string, string> = {
  submitted: 'Tu aplicación ha sido recibida y está en cola para revisión.',
  under_review: 'El propietario está revisando tu aplicación.',
  pre_approved: '¡El propietario está interesado! Te contactarán pronto.',
  approved: '¡Felicitaciones! Tu aplicación ha sido aprobada.',
  rejected: 'Lo sentimos, tu aplicación no fue aprobada esta vez.',
  withdrawn: 'Has retirado esta aplicación.',
};

// ============================================================================
// TextTs
// ============================================================================

export interface ApplicationDetailProps {
  /** The application to display */
  application: TenantApplication | null;
  /** The property associated with the application */
  property: Property | null;
  /** Whether the drawer is open */
  open: boolean;
  /** Callback to close the drawer */
  onClose: () => void;
  /** Callback when user confirms withdrawal */
  onWithdraw: (id: string) => void;
}

// ============================================================================
// Component
// ============================================================================

/**
 * ApplicationDetail - Full application view drawer with timeline and withdraw action
 *
 * Layout:
 * - Header: Property title, status badge
 * - Property info: Image, address, rent
 * - Tracking code display
 * - Timeline of events
 * - Status explanation text
 * - Withdraw button (only if status allows)
 */
export function ApplicationDetail({
  application,
  property,
  open,
  onClose,
  onWithdraw,
}: ApplicationDetailProps) {
  const [showWithdrawConfirm, setShowWithdrawConfirm] = useState(false);

  // Don't render content if no application or property
  if (!application || !property) {
    return (
      <Sheet open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
        <SheetContent className="w-full sm:max-w-lg">
          <div className="flex h-full items-center justify-center text-fg-muted">
            No hay aplicación seleccionada
          </div>
        </SheetContent>
      </Sheet>
    );
  }

  const {
    id,
    status,
    trackingCode,
    submittedAt,
    events,
  } = application;

  const {
    title,
    thumbnailUrl,
    neighborhood,
    city,
    address,
    monthlyRent,
    adminFee,
  } = property;

  const progress = getStatusProgress(status);
  const showWithdrawButton = canWithdraw(status);
  const statusExplanation = STATUS_EXPLANATIONS[status] || '';

  // ---------------------------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------------------------

  const handleWithdrawClick = () => {
    setShowWithdrawConfirm(true);
  };

  const handleWithdrawConfirm = () => {
    onWithdraw(id);
    setShowWithdrawConfirm(false);
    onClose();
  };

  const handleWithdrawCancel = () => {
    setShowWithdrawConfirm(false);
  };

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <>
      <Sheet open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
        <SheetContent className="flex w-full flex-col overflow-hidden p-0 sm:max-w-xl">
          {/* Close Button */}
          <SheetClose asChild>
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-4 top-4 z-10 rounded-full bg-surface/80 backdrop-blur-sm"
            >
              <X className="h-4 w-4" />
              <span className="sr-only">Cerrar</span>
            </Button>
          </SheetClose>

          {/* Scrollable Content */}
          <div className="flex-1 overflow-y-auto">
            {/* Property Header with Image */}
            <div className="relative">
              {/* Property Image */}
              <div className="relative aspect-[16/9] w-full">
                <Image
                  src={thumbnailUrl}
                  alt={title}
                  fill
                  className="object-cover"
                  sizes="(max-width: 640px) 100vw, 640px"
                  priority
                />
                {/* Gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

                {/* Status badge overlay */}
                <div className="absolute bottom-4 left-4">
                  <ApplicationStatusBadge status={status} size="md" />
                </div>
              </div>
            </div>

            {/* Property Info */}
            <SheetHeader className="border-b border-border px-6 py-4">
              <SheetTitle className="text-lg font-semibold text-fg">
                {title}
              </SheetTitle>
              <div className="space-y-1">
                <p className="flex items-center gap-1.5 text-sm text-fg-muted">
                  <MapPin className="h-4 w-4 flex-shrink-0" />
                  <span>{address}, {neighborhood}, {city}</span>
                </p>
                <p className="text-base font-medium text-fg">
                  {formatCurrency(monthlyRent)}
                  <span className="text-fg-muted text-sm font-normal">/mes</span>
                  {adminFee > 0 && (
                    <span className="text-fg-muted text-sm font-normal">
                      {' '}+ {formatCurrency(adminFee)} admin
                    </span>
                  )}
                </p>
              </div>
            </SheetHeader>

            {/* Tracking Info */}
            <div className="border-b border-border px-6 py-4">
              <div className="flex items-center justify-between">
                <div>
                  <MonoLabel className="block text-xs text-fg-muted tracking-wide">
                    Código de seguimiento
                  </MonoLabel>
                  <p className="flex items-center gap-1.5 text-base font-mono font-semibold text-fg mt-0.5">
                    <Hash className="h-4 w-4 text-fg-muted" />
                    {trackingCode}
                  </p>
                </div>
                <div className="text-right">
                  <MonoLabel className="block text-xs text-fg-muted tracking-wide">
                    Aplicaste el
                  </MonoLabel>
                  <p className="text-sm font-medium text-fg mt-0.5">
                    {formatDate(submittedAt)}
                  </p>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="mt-4">
                <div className="flex items-center justify-between text-xs text-fg-muted mb-1.5">
                  <span>Progreso</span>
                  <span>{progress}%</span>
                </div>
                <div className="h-2 w-full rounded-full bg-surface-muted overflow-hidden">
                  <div
                    className={cn(
                      'h-full rounded-full transition-all duration-500',
                      status === 'approved' && 'bg-success',
                      status === 'rejected' && 'bg-danger',
                      status === 'withdrawn' && 'bg-fg-subtle',
                      ['submitted', 'under_review', 'pre_approved'].includes(status) && 'bg-primary'
                    )}
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Status Explanation */}
            <div className="border-b border-border px-6 py-4">
              <h3 className="text-sm font-semibold text-fg mb-2">
                Estado actual
              </h3>
              <p className="text-sm text-fg-muted">
                {statusExplanation}
              </p>
            </div>

            {/* Timeline */}
            <div className="px-6 py-4">
              <h3 className="text-sm font-semibold text-fg mb-4">
                Historial
              </h3>
              <ApplicationTimeline events={events} />
            </div>
          </div>

          {/* Footer: Withdraw Button (sticky) */}
          {showWithdrawButton && (
            <div className="border-t border-border bg-bg p-4">
              <Button
                variant="destructive"
                className="w-full"
                onClick={handleWithdrawClick}
              >
                <Warning className="h-4 w-4 mr-2" />
                Retirar postulación
              </Button>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Withdraw Confirmation Dialog */}
      <Dialog open={showWithdrawConfirm} onOpenChange={setShowWithdrawConfirm}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Confirmar retiro</DialogTitle>
            <DialogDescription>
              ¿Estás seguro de que quieres retirar tu aplicación para{' '}
              <span className="font-medium text-fg">{title}</span>?
              Esta acción no se puede deshacer.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-col-reverse sm:flex-row gap-2">
            <Button variant="outline" onClick={handleWithdrawCancel}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleWithdrawConfirm}
            >
              Sí, retirar aplicación
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
