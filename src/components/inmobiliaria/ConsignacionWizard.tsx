'use client';

import { useState, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  User,
  HouseLine,
  Percent,
  UserCircle,
  ClipboardText,
  CheckCircle,
  CaretLeft,
  CaretRight,
  Check,
  X,
  SpinnerGap,
} from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import { toast } from '@/components/ui/toast';
import type { Propietario, Agente, InventoryItem } from '@/lib/types/inmobiliaria';
import {
  StepSelectPropietario,
  StepPropertyData,
  StepCommissionTerms,
  StepAssignAgent,
  StepActaEntrega,
  StepConfirmation,
  type WizardFormData,
} from './ConsignacionWizardSteps';

interface ConsignacionWizardProps {
  propietarios: Propietario[];
  agentes: Agente[];
}

const STEPS = [
  { id: 1, label: 'Propietario', icon: User },
  { id: 2, label: 'Propiedad', icon: HouseLine },
  { id: 3, label: 'Comision', icon: Percent },
  { id: 4, label: 'Agente', icon: UserCircle },
  { id: 5, label: 'Inventario', icon: ClipboardText },
  { id: 6, label: 'Confirmar', icon: CheckCircle },
];

/**
 * ConsignacionWizard - 6-step wizard for creating new property consignments
 * Used at /panel/inmobiliaria/portafolio/nuevo
 */
export function ConsignacionWizard({ propietarios, agentes }: ConsignacionWizardProps) {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);

  // Form data state
  const [formData, setFormData] = useState<Partial<WizardFormData>>({
    propertyType: 'apartment',
    commissionPercent: 10,
    minimumTerm: 12,
    inventoryItems: [],
    inventoryNotes: '',
    contractStartDate: new Date().toISOString().split('T')[0],
  });

  // Update form data helper
  const updateFormData = useCallback((data: Partial<WizardFormData>) => {
    setFormData((prev) => ({ ...prev, ...data }));
  }, []);

  // Step validation
  const isStepValid = useMemo(() => {
    switch (currentStep) {
      case 1:
        // Must have selected or created a propietario
        return Boolean(formData.propietarioId);
      case 2:
        // Must have property details
        return Boolean(
          formData.propertyTitle &&
          formData.propertyAddress &&
          formData.propertyCity &&
          formData.propertyZone &&
          formData.propertyType &&
          formData.monthlyRent && formData.monthlyRent > 0
        );
      case 3:
        // Commission terms always valid with defaults
        return true;
      case 4:
        // Must have assigned an agent
        return Boolean(formData.agenteId);
      case 5:
        // Inventory is optional
        return true;
      case 6:
        // Confirmation step - all previous steps must be valid
        return Boolean(
          formData.propietarioId &&
          formData.propertyTitle &&
          formData.propertyAddress &&
          formData.propertyCity &&
          formData.propertyZone &&
          formData.agenteId
        );
      default:
        return false;
    }
  }, [currentStep, formData]);

  // Navigation handlers
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

  // Submit handler
  const handleSubmit = useCallback(async () => {
    if (!isStepValid) return;

    setIsSubmitting(true);

    try {
      // Simulate API call - log data to console
      console.log('Creating new consignacion:', formData);

      // Simulate network delay
      await new Promise((resolve) => setTimeout(resolve, 1500));

      toast.success({
        title: 'Consignacion creada exitosamente',
        description: `Se ha registrado "${formData.propertyTitle}" en el portafolio.`,
      });

      // Redirect to portafolio
      router.push('/panel/inmobiliaria/portafolio');
    } catch (error) {
      console.error('Error creating consignacion:', error);
      toast.error({
        title: 'Error al crear consignacion',
        description: 'Ocurrio un error. Por favor intenta de nuevo.',
      });
    } finally {
      setIsSubmitting(false);
    }
  }, [formData, isStepValid, router]);

  // Cancel handler
  const handleCancel = useCallback(() => {
    setShowCancelDialog(true);
  }, []);

  const confirmCancel = useCallback(() => {
    router.push('/panel/inmobiliaria/portafolio');
  }, [router]);

  // Render step content
  const renderStepContent = () => {
    const stepProps = {
      formData,
      updateFormData,
      propietarios,
      agentes,
    };

    switch (currentStep) {
      case 1:
        return <StepSelectPropietario {...stepProps} />;
      case 2:
        return <StepPropertyData {...stepProps} />;
      case 3:
        return <StepCommissionTerms {...stepProps} />;
      case 4:
        return <StepAssignAgent {...stepProps} />;
      case 5:
        return <StepActaEntrega {...stepProps} />;
      case 6:
        return <StepConfirmation {...stepProps} onGoToStep={goToStep} />;
      default:
        return null;
    }
  };

  // Calculate completed steps
  const getStepStatus = (stepId: number) => {
    if (stepId < currentStep) return 'completed';
    if (stepId === currentStep) return 'current';
    return 'upcoming';
  };

  return (
    <div className="max-w-4xl mx-auto">
      {/* Step Indicator */}
      <div className="mb-8">
        {/* Desktop Steps */}
        <div className="hidden md:flex items-center justify-between">
          {STEPS.map((step, index) => {
            const status = getStepStatus(step.id);
            const StepIcon = step.icon;

            return (
              <div key={step.id} className="flex items-center">
                {/* Step Circle */}
                <button
                  onClick={() => status !== 'upcoming' && goToStep(step.id)}
                  disabled={status === 'upcoming'}
                  className={cn(
                    'flex flex-col items-center gap-2 transition-all',
                    status === 'upcoming' ? 'cursor-not-allowed' : 'cursor-pointer'
                  )}
                >
                  <div className={cn(
                    'w-12 h-12 rounded-full flex items-center justify-center transition-all',
                    status === 'completed'
                      ? 'bg-emerald-500 text-white'
                      : status === 'current'
                        ? 'bg-indigo-500 text-white ring-4 ring-indigo-500/20'
                        : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-400'
                  )}>
                    {status === 'completed' ? (
                      <Check className="w-5 h-5" weight="bold" />
                    ) : (
                      <StepIcon className="w-5 h-5" />
                    )}
                  </div>
                  <span className={cn(
                    'text-xs font-medium',
                    status === 'current'
                      ? 'text-indigo-600 dark:text-indigo-400'
                      : status === 'completed'
                        ? 'text-neutral-900 dark:text-white'
                        : 'text-neutral-400'
                  )}>
                    {step.label}
                  </span>
                </button>

                {/* Connector Line */}
                {index < STEPS.length - 1 && (
                  <div className={cn(
                    'flex-1 h-0.5 mx-2',
                    step.id < currentStep
                      ? 'bg-emerald-500'
                      : 'bg-neutral-200 dark:bg-neutral-700'
                  )} />
                )}
              </div>
            );
          })}
        </div>

        {/* Mobile Progress */}
        <div className="md:hidden">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-neutral-900 dark:text-white">
              Paso {currentStep} de 6: {STEPS[currentStep - 1]?.label}
            </span>
            <span className="text-sm text-neutral-500">{Math.round((currentStep / 6) * 100)}%</span>
          </div>
          <div className="h-2 bg-neutral-100 dark:bg-neutral-800 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-indigo-500"
              initial={false}
              animate={{ width: `${(currentStep / 6) * 100}%` }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
            />
          </div>
        </div>
      </div>

      {/* Step Content */}
      <div className="bg-white dark:bg-[#1a1a1c] rounded-2xl border border-neutral-200 dark:border-neutral-700 overflow-hidden">
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
        <div className="px-6 py-4 border-t border-neutral-100 dark:border-neutral-800 bg-neutral-50 dark:bg-[#141416] flex items-center justify-between">
          {/* Cancel Button */}
          <button
            type="button"
            onClick={handleCancel}
            className="px-4 py-2 rounded-xl text-neutral-600 dark:text-neutral-400 font-medium hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
          >
            Cancelar
          </button>

          {/* Navigation Buttons */}
          <div className="flex items-center gap-3">
            {currentStep > 1 && (
              <button
                type="button"
                onClick={goToPreviousStep}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-neutral-200 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 font-medium hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
              >
                <CaretLeft className="w-4 h-4" />
                Anterior
              </button>
            )}

            {currentStep < 6 ? (
              <button
                type="button"
                onClick={goToNextStep}
                disabled={!isStepValid}
                className={cn(
                  'inline-flex items-center gap-2 px-5 py-2 rounded-xl font-medium transition-all',
                  isStepValid
                    ? 'bg-indigo-500 text-white hover:bg-indigo-600 shadow-lg shadow-indigo-500/25'
                    : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-400 cursor-not-allowed'
                )}
              >
                Siguiente
                <CaretRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={!isStepValid || isSubmitting}
                className={cn(
                  'inline-flex items-center gap-2 px-6 py-2 rounded-xl font-medium transition-all',
                  isStepValid && !isSubmitting
                    ? 'bg-emerald-500 text-white hover:bg-emerald-600 shadow-lg shadow-emerald-500/25'
                    : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-400 cursor-not-allowed'
                )}
              >
                {isSubmitting ? (
                  <>
                    <SpinnerGap className="w-4 h-4 animate-spin" />
                    Creando...
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" weight="bold" />
                    Confirmar Consignacion
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Cancel Confirmation Dialog */}
      <AnimatePresence>
        {showCancelDialog && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
            onClick={() => setShowCancelDialog(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md p-6 rounded-2xl bg-white dark:bg-[#1a1a1c] border border-neutral-200 dark:border-neutral-700 shadow-xl"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                  <X className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-neutral-900 dark:text-white">
                    Cancelar consignacion?
                  </h3>
                  <p className="text-sm text-neutral-500 dark:text-neutral-400">
                    Se perdera toda la informacion ingresada
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3">
                <button
                  onClick={() => setShowCancelDialog(false)}
                  className="px-4 py-2 rounded-xl text-neutral-600 dark:text-neutral-400 font-medium hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                >
                  Continuar editando
                </button>
                <button
                  onClick={confirmCancel}
                  className="px-4 py-2 rounded-xl bg-red-500 text-white font-medium hover:bg-red-600 transition-colors"
                >
                  Si, cancelar
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default ConsignacionWizard;
