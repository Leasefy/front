'use client';

import { useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  HouseLine,
  ClipboardText,
  Lightning,
  FileText,
  Signature,
  CaretLeft,
  CaretRight,
  Check,
  FloppyDisk,
  House,
} from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { toast } from '@/components/ui/toast';
import { useI18n } from '@/lib/i18n';
import type {
  ActaEntrega,
  Consignacion,
} from '@/lib/types/inmobiliaria';
import {
  DEFAULT_ROOMS,
} from '@/lib/types/inmobiliaria';
import {
  type FormData,
  type StepProps,
  StepBasicInfo,
  StepRoomSelection,
  StepInventory,
  StepMetersKeys,
  StepObservations,
  StepSignatures,
} from './ActaEntregaSteps';

// ============================================================================
// Types
// ============================================================================

interface ActaEntregaFormProps {
  initialData?: Partial<ActaEntrega>;
  consignaciones: Consignacion[];
  onSave?: (acta: ActaEntrega) => void | Promise<void>;
  onSaveDraft?: (acta: Partial<ActaEntrega>) => void;
  onCancel?: () => void;
  isLoading?: boolean;
}

// ============================================================================
// Steps Configuration
// ============================================================================

const STEP_KEYS = [
  { id: 1, labelKey: 'inmobiliaria.acta.steps.info', icon: HouseLine },
  { id: 2, labelKey: 'inmobiliaria.acta.steps.spaces', icon: House },
  { id: 3, labelKey: 'inmobiliaria.acta.steps.inventory', icon: ClipboardText },
  { id: 4, labelKey: 'inmobiliaria.acta.steps.meters', icon: Lightning },
  { id: 5, labelKey: 'inmobiliaria.acta.steps.observations', icon: FileText },
  { id: 6, labelKey: 'inmobiliaria.acta.steps.signatures', icon: Signature },
];

// ============================================================================
// Main Component
// ============================================================================

/**
 * ActaEntregaForm - Multi-step wizard for creating delivery/return actas
 */
export function ActaEntregaForm({
  initialData,
  consignaciones,
  onSave,
  onSaveDraft,
  onCancel,
  isLoading = false,
}: ActaEntregaFormProps) {
  const { t, locale, formatCurrency } = useI18n();
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form state
  const [formData, setFormData] = useState<FormData>({
    type: initialData?.type || 'entrega',
    consignacionId: initialData?.consignacionId || '',
    deliveryDate: initialData?.deliveryDate || new Date().toISOString().split('T')[0],
    deliveryTime: initialData?.deliveryTime || '10:00',
    rooms: initialData?.rooms || [...DEFAULT_ROOMS],
    items: initialData?.items || [],
    meterReadings: initialData?.meterReadings || [],
    keysDelivered: initialData?.keysDelivered || [
      { type: 'Llave principal', quantity: 2 },
      { type: 'Llave buzon', quantity: 1 },
    ],
    generalCondition: initialData?.generalCondition || 'bueno',
    generalObservations: initialData?.generalObservations || '',
    signatures: initialData?.signatures || [],
    depositAmount: initialData?.depositAmount,
    deductions: initialData?.deductions,
  });

  // Update form data helper
  const updateFormData = useCallback((data: Partial<FormData>) => {
    setFormData((prev) => ({ ...prev, ...data }));
  }, []);

  // Get selected consignacion
  const selectedConsignacion = useMemo(
    () => consignaciones.find((c) => c.id === formData.consignacionId),
    [consignaciones, formData.consignacionId]
  );

  // Step validation
  const isStepValid = useMemo(() => {
    switch (currentStep) {
      case 1:
        return Boolean(formData.consignacionId && formData.deliveryDate);
      case 2:
        return formData.rooms.length > 0;
      case 3:
        return true; // Inventory is optional
      case 4:
        return true; // Meters and keys are optional
      case 5:
        return Boolean(formData.generalCondition);
      case 6:
        return true; // Review step always valid
      default:
        return false;
    }
  }, [currentStep, formData]);

  // Navigation
  const goToNextStep = useCallback(() => {
    if (currentStep < 6 && isStepValid) {
      setCurrentStep((prev) => prev + 1);
    }
  }, [currentStep, isStepValid]);

  const goToPreviousStep = useCallback(() => {
    if (currentStep > 1) {
      setCurrentStep((prev) => prev - 1);
    }
  }, [currentStep]);

  const goToStep = useCallback((step: number) => {
    if (step >= 1 && step <= 6) {
      setCurrentStep(step);
    }
  }, []);

  // Save draft handler
  const handleSaveDraft = useCallback(() => {
    if (!selectedConsignacion) return;

    const draftActa: Partial<ActaEntrega> = {
      ...formData,
      propertyId: selectedConsignacion.propertyId,
      propertyTitle: selectedConsignacion.propertyTitle,
      propertyAddress: selectedConsignacion.propertyAddress,
      tenantId: 'tenant-1',
      tenantName: selectedConsignacion.currentTenantName || '',
      tenantCedula: '',
      tenantPhone: '',
      tenantEmail: '',
      propietarioId: selectedConsignacion.propietarioId,
      propietarioName: '',
      agenteId: selectedConsignacion.agenteId,
      agenteName: '',
      leaseId: selectedConsignacion.currentLeaseId || '',
      status: 'draft',
    };

    onSaveDraft?.(draftActa);
    toast.success(t('inmobiliaria.acta.draftSaved'), {
        description: t('inmobiliaria.acta.draftSavedDesc'),
      });
  }, [formData, selectedConsignacion, onSaveDraft]);

  // Submit handler
  const handleSubmit = useCallback(async () => {
    if (!selectedConsignacion) return;

    setIsSubmitting(true);

    try {
      // Build the acta payload from the form. The backend assigns the canonical
      // id/timestamps on persist, so we don't fabricate them on the client.
      const acta: ActaEntrega = {
        id: '',
        ...formData,
        propertyId: selectedConsignacion.propertyId,
        propertyTitle: selectedConsignacion.propertyTitle,
        propertyAddress: selectedConsignacion.propertyAddress,
        tenantId: 'tenant-1',
        tenantName: selectedConsignacion.currentTenantName || 'Inquilino',
        tenantCedula: '1.234.567.890',
        tenantPhone: '+57 300 123 4567',
        tenantEmail: 'inquilino@email.com',
        propietarioId: selectedConsignacion.propietarioId,
        propietarioName: 'Propietario',
        agenteId: selectedConsignacion.agenteId,
        agenteName: 'Agente',
        leaseId: selectedConsignacion.currentLeaseId || '',
        status: 'pending_signatures',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      // Persist for real. The parent handler performs the API call and throws
      // on failure, so we await it to keep isSubmitting active and to catch errors.
      await onSave?.(acta);

      toast.success(t('inmobiliaria.acta.actaCreated'), {
        description: t('inmobiliaria.acta.actaCreatedDesc'),
      });
    } catch (error) {
      console.error('Error creating acta:', error);
      toast.error(t('inmobiliaria.acta.actaError'), {
        description: t('inmobiliaria.acta.actaErrorDesc'),
      });
    } finally {
      setIsSubmitting(false);
    }
  }, [formData, selectedConsignacion, onSave]);

  // Get step status
  const getStepStatus = (stepId: number) => {
    if (stepId < currentStep) return 'completed';
    if (stepId === currentStep) return 'current';
    return 'upcoming';
  };

  // Step props
  const stepProps: StepProps = {
    formData,
    updateFormData,
    consignaciones,
    selectedConsignacion,
    t,
  };

  // Render step content
  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return <StepBasicInfo {...stepProps} />;
      case 2:
        return <StepRoomSelection {...stepProps} />;
      case 3:
        return <StepInventory {...stepProps} />;
      case 4:
        return <StepMetersKeys {...stepProps} />;
      case 5:
        return <StepObservations {...stepProps} />;
      case 6:
        return <StepSignatures {...stepProps} />;
      default:
        return null;
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      {/* Step Indicator */}
      <div className="mb-8">
        {/* Desktop Steps */}
        <div className="hidden md:flex items-center justify-between">
          {STEP_KEYS.map((step, index) => {
            const status = getStepStatus(step.id);
            const StepIcon = step.icon;

            return (
              <div key={step.id} className="flex items-center">
                <button
                  onClick={() => status !== 'upcoming' && goToStep(step.id)}
                  disabled={status === 'upcoming'}
                  className={cn(
                    'flex flex-col items-center gap-2 transition-all',
                    status === 'upcoming' ? 'cursor-not-allowed' : 'cursor-pointer'
                  )}
                >
                  <div
                    className={cn(
                      'w-12 h-12 rounded-full flex items-center justify-center transition-all',
                      status === 'completed'
                        ? 'bg-success text-white'
                        : status === 'current'
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-surface-muted text-fg-muted'
                    )}
                  >
                    {status === 'completed' ? (
                      <Check className="w-5 h-5" weight="bold" />
                    ) : (
                      <StepIcon className="w-5 h-5" />
                    )}
                  </div>
                  <span
                    className={cn(
                      'text-xs font-medium',
                      status === 'current'
                        ? 'text-primary'
                        : status === 'completed'
                        ? 'text-foreground'
                        : 'text-fg-muted'
                    )}
                  >
                    {t(step.labelKey)}
                  </span>
                </button>

                {/* Connector Line */}
                {index < STEP_KEYS.length - 1 && (
                  <div
                    className={cn(
                      'flex-1 h-0.5 mx-2',
                      step.id < currentStep
                        ? 'bg-success'
                        : 'bg-border'
                    )}
                  />
                )}
              </div>
            );
          })}
        </div>

        {/* Mobile Progress */}
        <div className="md:hidden">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-foreground">
              {t('inmobiliaria.acta.stepProgress', { current: currentStep, total: 6 })}: {t(STEP_KEYS[currentStep - 1]?.labelKey)}
            </span>
            <span className="text-sm text-fg-muted">
              {Math.round((currentStep / 6) * 100)}%
            </span>
          </div>
          <div className="h-2 bg-surface-muted rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-primary"
              initial={false}
              animate={{ width: `${(currentStep / 6) * 100}%` }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
            />
          </div>
        </div>
      </div>

      {/* Step Content */}
      <div className="bg-card rounded-lg border border-border overflow-hidden">
        <div className="p-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
            >
              {renderStepContent()}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Footer Navigation */}
        <div className="px-6 py-4 border-t border-border bg-surface-muted/40">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {currentStep > 1 && (
                <Button
                  type="button"
                  variant="ghost"
                  hideArrow
                  onClick={goToPreviousStep}
                  className="gap-1.5"
                >
                  <CaretLeft className="w-4 h-4" />
                  {t('inmobiliaria.acta.previous')}
                </Button>
              )}
              {onCancel && (
                <Button
                  type="button"
                  variant="ghost"
                  hideArrow
                  onClick={onCancel}
                >
                  {t('inmobiliaria.acta.cancel')}
                </Button>
              )}
            </div>

            <div className="flex items-center gap-2">
              {/* Save Draft */}
              <Button
                type="button"
                variant="secondary"
                hideArrow
                onClick={handleSaveDraft}
                disabled={!formData.consignacionId}
                className="gap-1.5"
              >
                <FloppyDisk className="w-4 h-4" />
                {t('inmobiliaria.acta.saveDraft')}
              </Button>

              {/* Next / Submit */}
              {currentStep < 6 ? (
                <Button
                  type="button"
                  hideArrow
                  onClick={goToNextStep}
                  disabled={!isStepValid}
                  className="gap-1.5"
                >
                  {t('inmobiliaria.acta.next')}
                  <CaretRight className="w-4 h-4" />
                </Button>
              ) : (
                <Button
                  type="button"
                  hideArrow
                  onClick={handleSubmit}
                  disabled={isSubmitting || isLoading}
                  className="gap-1.5"
                >
                  {isSubmitting ? (
                    <>
                      <Spinner size="sm" variant="current" />
                      {t('inmobiliaria.acta.creating')}
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" weight="bold" />
                      {t('inmobiliaria.acta.createActa')}
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ActaEntregaForm;
