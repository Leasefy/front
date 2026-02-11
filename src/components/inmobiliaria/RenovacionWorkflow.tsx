'use client';

import { useState, useMemo } from 'react';
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
  StepRevision,
  StepNotification,
  StepNegotiation,
  StepApproval,
  StepSignature,
  StepCompleted,
  WorkflowSidebar,
} from './RenovacionWorkflowSteps';
import type { WorkflowStep } from './RenovacionWorkflowSteps';

// ============================================================================
// Types
// ============================================================================

interface RenovacionWorkflowProps {
  renovacion: Renovacion;
  onStepComplete?: (step: RenovacionStatus) => void;
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
  onTerminate,
  onNoteAdd,
  onClose,
  open = false,
}: RenovacionWorkflowProps) {
  const { t } = useI18n();
  const [currentStep, setCurrentStep] = useState<RenovacionStatus>(renovacion.status);
  const [showTerminateDialog, setShowTerminateDialog] = useState(false);
  const [terminateReason, setTerminateReason] = useState('');

  const WORKFLOW_STEPS: WorkflowStep[] = useMemo(() => [
    {
      status: 'pending' as RenovacionStatus,
      label: t('inmobiliaria.operaciones.renovacion.steps.revision.label'),
      icon: <ClipboardText className="h-5 w-5" />,
      description: t('inmobiliaria.operaciones.renovacion.steps.revision.desc'),
    },
    {
      status: 'notified' as RenovacionStatus,
      label: t('inmobiliaria.operaciones.renovacion.steps.notification.label'),
      icon: <Bell className="h-5 w-5" />,
      description: t('inmobiliaria.operaciones.renovacion.steps.notification.desc'),
    },
    {
      status: 'negotiating' as RenovacionStatus,
      label: t('inmobiliaria.operaciones.renovacion.steps.negotiation.label'),
      icon: <Handshake className="h-5 w-5" />,
      description: t('inmobiliaria.operaciones.renovacion.steps.negotiation.desc'),
    },
    {
      status: 'approved' as RenovacionStatus,
      label: t('inmobiliaria.operaciones.renovacion.steps.approval.label'),
      icon: <CheckCircle className="h-5 w-5" />,
      description: t('inmobiliaria.operaciones.renovacion.steps.approval.desc'),
    },
    {
      status: 'signed' as RenovacionStatus,
      label: t('inmobiliaria.operaciones.renovacion.steps.signature.label'),
      icon: <PenNib className="h-5 w-5" />,
      description: t('inmobiliaria.operaciones.renovacion.steps.signature.desc'),
    },
    {
      status: 'completed' as RenovacionStatus,
      label: t('inmobiliaria.operaciones.renovacion.steps.completed.label'),
      icon: <FlagCheckered className="h-5 w-5" />,
      description: t('inmobiliaria.operaciones.renovacion.steps.completed.desc'),
    },
  ], [t]);

  const currentStepIndex = WORKFLOW_STEPS.findIndex((s) => s.status === currentStep);
  const currentStepInfo = WORKFLOW_STEPS[currentStepIndex];

  const goToNextStep = () => {
    const nextIndex = currentStepIndex + 1;
    if (nextIndex < WORKFLOW_STEPS.length) {
      const nextStatus = WORKFLOW_STEPS[nextIndex].status;
      setCurrentStep(nextStatus);
      onStepComplete?.(nextStatus);
    }
  };

  const goToPreviousStep = () => {
    const prevIndex = currentStepIndex - 1;
    if (prevIndex >= 0) {
      setCurrentStep(WORKFLOW_STEPS[prevIndex].status);
    }
  };

  const handleTerminate = () => {
    if (terminateReason.trim()) {
      onTerminate?.(terminateReason);
      setShowTerminateDialog(false);
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 'pending':
        return <StepRevision renovacion={renovacion} onContinue={goToNextStep} />;
      case 'notified':
        return (
          <StepNotification
            renovacion={renovacion}
            onNotify={(channel) => {
              // Handle notification
              console.log('Notifying via:', channel);
            }}
            onMarkNotified={goToNextStep}
          />
        );
      case 'negotiating':
        return (
          <StepNegotiation
            renovacion={renovacion}
            onAccept={(finalRent) => {
              console.log('Accepted rent:', finalRent);
              goToNextStep();
            }}
            onContinueNegotiation={(note) => {
              onNoteAdd?.(note);
            }}
          />
        );
      case 'approved':
        return (
          <StepApproval
            renovacion={renovacion}
            onOwnerApproved={() => console.log('Owner approved')}
            onTenantApproved={goToNextStep}
          />
        );
      case 'signed':
        return (
          <StepSignature
            renovacion={renovacion}
            onSignatureComplete={goToNextStep}
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
            <SheetTitle className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-900/30">
                <ArrowRight className="h-5 w-5 text-emerald-600" />
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
                      <div className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800">
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
                  onTerminate={() => setShowTerminateDialog(true)}
                />
              </div>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Terminate Dialog */}
      <Dialog open={showTerminateDialog} onOpenChange={setShowTerminateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('inmobiliaria.operaciones.renovacion.terminateDialog.title')}</DialogTitle>
            <DialogDescription>
              {t('inmobiliaria.operaciones.renovacion.terminateDialog.desc')}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="terminateReason">{t('inmobiliaria.operaciones.renovacion.terminateDialog.reason')}</Label>
              <Textarea
                id="terminateReason"
                value={terminateReason}
                onChange={(e) => setTerminateReason(e.target.value)}
                placeholder={t('inmobiliaria.operaciones.renovacion.terminateDialog.reasonPlaceholder')}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowTerminateDialog(false)}>
              {t('inmobiliaria.operaciones.renovacion.terminateDialog.cancel')}
            </Button>
            <Button
              variant="destructive"
              onClick={handleTerminate}
              disabled={!terminateReason.trim()}
            >
              {t('inmobiliaria.operaciones.renovacion.terminateDialog.terminate')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
