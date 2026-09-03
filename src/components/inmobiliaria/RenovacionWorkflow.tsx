'use client';

import { useState, useMemo, useEffect } from 'react';
import { useI18n } from '@/lib/i18n';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  ClipboardText,
  Bell,
  Handshake,
  CheckCircle,
  PenNib,
  FlagCheckered,
  ArrowLeft,
  ArrowRight,
} from '@phosphor-icons/react';
import type {
  Renovacion,
  RenovacionStatus,
} from '@/lib/types/inmobiliaria';
import {
  WorkflowStepper,
  StepNotification,
  StepAceptacion,
  StepSignature,
  StepCompleted,
  WorkflowSidebar,
} from './RenovacionWorkflowSteps';
import type { WorkflowStep } from './RenovacionWorkflowSteps';
import { agencyApi } from '@/lib/api/inmobiliaria.service';

// ============================================================================
// Types
// ============================================================================

interface RenovacionWorkflowProps {
  renovacion: Renovacion;
  onStepComplete?: (step: RenovacionStatus, negotiatedRent?: number, negotiatedAdminFee?: number, notificationMessage?: string) => void;
  onSendNotification?: (
    message: string,
    newRent: number,
    newAdminFee: number,
    ipcRate?: number | null,
  ) => Promise<void>;
  onUploadDocument?: (file: File) => Promise<void>;
  onTerminate?: (reason: string) => void;
  onNoteAdd?: (note: string) => void;
  onClose?: () => void;
  open?: boolean;
}

// ============================================================================
// Main Component
// ============================================================================

export function RenovacionWorkflow({
  renovacion,
  onStepComplete,
  onSendNotification,
  onUploadDocument,
  onTerminate,
  onNoteAdd,
  onClose,
  open = false,
}: RenovacionWorkflowProps) {
  const { t } = useI18n();
  const [currentStep, setCurrentStep] = useState<RenovacionStatus>(renovacion.status);

  // The AGENCY sets the new values. Lifted to the workflow so the price
  // chosen flows into the notification message and persists through the
  // whole flow. Nada se prellena con un IPC inventado: arranca en lo que ya
  // se negoció o propuso, y si no, en el canon actual.
  const [newRent, setNewRent] = useState<number>(
    renovacion.negotiatedRent || renovacion.proposedRent || renovacion.currentRent,
  );
  const [newAdminFee, setNewAdminFee] = useState<number>(
    renovacion.negotiatedAdminFee ?? renovacion.currentAdminFee ?? 0,
  );
  const [ipcRate, setIpcRate] = useState<number | null>(renovacion.ipcRate ?? null);

  // Con qué se firma el mensaje al inquilino: el nombre real de la agencia,
  // no uno escrito en el código.
  const [agencyName, setAgencyName] = useState('');
  useEffect(() => {
    let vigente = true;
    agencyApi
      .getMyAgency()
      .then((a) => {
        if (vigente) setAgencyName(a.razonSocial || a.name || '');
      })
      .catch(() => {
        // Sin nombre, el mensaje sale sin firma: se ve, no se inventa.
      });
    return () => {
      vigente = false;
    };
  }, []);

  const WORKFLOW_STEPS: WorkflowStep[] = useMemo(() => [
    {
      status: 'pending' as RenovacionStatus,
      label: 'Propuesta',
      icon: <ClipboardText className="h-5 w-5" />,
      description: 'La inmobiliaria define el precio y envía la propuesta',
    },
    {
      status: 'notified' as RenovacionStatus,
      label: 'Aceptación',
      icon: <CheckCircle className="h-5 w-5" />,
      description: 'El inquilino acepta la renovación',
    },
    {
      status: 'signed' as RenovacionStatus,
      label: 'Firma del contrato',
      icon: <PenNib className="h-5 w-5" />,
      description: 'Se firma el nuevo contrato',
    },
  ], []);

  const currentStepIndex = WORKFLOW_STEPS.findIndex((s) => s.status === currentStep);
  const currentStepInfo = WORKFLOW_STEPS[currentStepIndex];

  const goToNextStep = (negotiatedRent?: number, negotiatedAdminFee?: number, notificationMessage?: string) => {
    const nextIndex = currentStepIndex + 1;
    if (nextIndex < WORKFLOW_STEPS.length) {
      const nextStatus = WORKFLOW_STEPS[nextIndex].status;
      setCurrentStep(nextStatus);
      onStepComplete?.(nextStatus, negotiatedRent, negotiatedAdminFee, notificationMessage);
    }
  };

  const goToPreviousStep = () => {
    const prevIndex = currentStepIndex - 1;
    if (prevIndex >= 0) {
      setCurrentStep(WORKFLOW_STEPS[prevIndex].status);
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      // ── 1) PROPUESTA — the agency sets the price and sends it to the tenant ──
      case 'pending':
        return (
          <StepNotification
            renovacion={renovacion}
            newRent={newRent}
            newAdminFee={newAdminFee}
            ipcRate={ipcRate}
            agencyName={agencyName}
            onNewRentChange={setNewRent}
            onNewAdminFeeChange={setNewAdminFee}
            onIpcRateChange={setIpcRate}
            onNotify={async (channel, message) => {
              if (channel === 'whatsapp') {
                const phone = (renovacion.tenantPhone || '').replace(/\D/g, '');
                const url = phone
                  ? `https://wa.me/57${phone}?text=${encodeURIComponent(message)}`
                  : `https://wa.me/?text=${encodeURIComponent(message)}`;
                window.open(url, '_blank');
              }
              await onSendNotification?.(message, newRent, newAdminFee, ipcRate);
              goToNextStep(newRent, newAdminFee);
            }}
          />
        );
      // ── 2) ACEPTACIÓN — read-only; the tenant accepts from their own panel ──
      case 'notified':
        return (
          <StepAceptacion
            renovacion={renovacion}
            onContinue={() => goToNextStep(newRent, newAdminFee)}
          />
        );
      // ── 3) FIRMA — upload the signed new contract, then complete ──
      case 'signed':
        return (
          <StepSignature
            renovacion={renovacion}
            onSignatureComplete={async (file) => {
              await onUploadDocument?.(file);
              setCurrentStep('completed');
              onStepComplete?.('completed', newRent, newAdminFee);
            }}
          />
        );
      case 'completed':
        return <StepCompleted renovacion={renovacion} />;
      default:
        return null;
    }
  };

  return (
    <>
      <Sheet open={open} onOpenChange={(o) => !o && onClose?.()}>
        <SheetContent className="w-full sm:max-w-4xl overflow-y-auto">
          <SheetHeader className="border-b pb-4">
            <SheetTitle className="flex items-center gap-3 text-lg font-semibold text-fg">
              <div className="p-2 rounded-md bg-success-soft">
                <ArrowRight className="h-5 w-5 text-success" />
              </div>
              {t('inmobiliaria.operaciones.renovacion.sheetTitle')}
            </SheetTitle>
          </SheetHeader>

          <div className="py-6">
            {/* Stepper */}
            <div className="mb-8">
              <WorkflowStepper
                currentStatus={currentStep}
                onStepClick={setCurrentStep}
                steps={WORKFLOW_STEPS}
              />
            </div>

            {/* Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Main Content */}
              <div className="lg:col-span-2">
                <Card>
                  <CardHeader>
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-md bg-primary-soft text-primary">
                        {currentStepInfo?.icon}
                      </div>
                      <div>
                        <CardTitle className="text-lg">{currentStepInfo?.label}</CardTitle>
                        <p className="text-sm text-muted-foreground">
                          {currentStepInfo?.description}
                        </p>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>{renderStepContent()}</CardContent>
                </Card>

                {/* Navigation */}
                {currentStep !== 'completed' && (
                  <div className="flex justify-between mt-4">
                    <Button
                      variant="outline"
                      onClick={goToPreviousStep}
                      disabled={currentStepIndex === 0}
                    >
                      <ArrowLeft className="h-4 w-4 mr-2" />
                      {t('inmobiliaria.operaciones.renovacion.navigation.previous')}
                    </Button>
                    <Button variant="outline" onClick={onClose}>
                      {t('inmobiliaria.operaciones.renovacion.navigation.saveAndExit')}
                    </Button>
                  </div>
                )}

                {currentStep === 'completed' && (
                  <Button className="w-full mt-4" onClick={onClose}>
                    {t('inmobiliaria.operaciones.renovacion.navigation.close')}
                  </Button>
                )}
              </div>

              {/* Sidebar */}
              <div className="lg:col-span-1">
                <WorkflowSidebar
                  renovacion={renovacion}
                  onAddNote={(note) => onNoteAdd?.(note)}
                />
              </div>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
