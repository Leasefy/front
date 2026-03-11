'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Buildings,
  Gear,
  UserPlus,
  Check,
  CaretLeft,
  CaretRight,
  SpinnerGap,
  X,
} from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import { apiClient } from '@/lib/api/client';
import { AgencyBasicForm, type AgencyBasicFormData } from './wizard/AgencyBasicForm';
import { AgencyOperationsForm, type AgencyOperationsFormData } from './wizard/AgencyOperationsForm';
import { InviteFirstMemberForm, type InviteFirstMemberFormData } from './wizard/InviteFirstMemberForm';
import { isValidEmail, isValidNit } from '@/lib/validation/inmobiliariaValidation';

// ============================================================================
// Wizard Steps Config
// ============================================================================

const STEPS = [
  {
    id: 1,
    title: 'Información básica',
    description: 'Completa el perfil de tu agencia',
    icon: Buildings,
  },
  {
    id: 2,
    title: 'Configuración operacional',
    description: 'Define tus parámetros de operación',
    icon: Gear,
  },
  {
    id: 3,
    title: 'Invitar primer miembro',
    description: 'Opcional — agrega a tu equipo',
    icon: UserPlus,
    optional: true,
  },
];

// ============================================================================
// Form Data Types
// ============================================================================

interface WizardFormData {
  basic: AgencyBasicFormData;
  operations: AgencyOperationsFormData;
  invite: InviteFirstMemberFormData;
}

interface AgencySetupWizardProps {
  /** Pre-filled agency name from registration */
  agencyName?: string;
  /** Pre-filled city from registration */
  agencyCity?: string;
  /** Called when wizard is completed or dismissed */
  onComplete: () => void;
  /** Called when user dismisses/skips the entire wizard */
  onDismiss?: () => void;
}

// ============================================================================
// Step Progress Indicator
// ============================================================================

function StepIndicator({
  steps,
  currentStep,
}: {
  steps: typeof STEPS;
  currentStep: number;
}) {
  return (
    <div className="flex items-center justify-center gap-0">
      {steps.map((step, index) => {
        const isCompleted = currentStep > step.id;
        const isCurrent = currentStep === step.id;
        const Icon = step.icon;

        return (
          <div key={step.id} className="flex items-center">
            {/* Step circle */}
            <div className="flex flex-col items-center">
              <div
                className={cn(
                  'w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all',
                  isCompleted
                    ? 'border-indigo-600 bg-indigo-600'
                    : isCurrent
                    ? 'border-indigo-600 bg-white'
                    : 'border-neutral-200 bg-white'
                )}
              >
                {isCompleted ? (
                  <Check className="w-5 h-5 text-white" weight="bold" />
                ) : (
                  <Icon
                    className={cn(
                      'w-5 h-5',
                      isCurrent ? 'text-indigo-600' : 'text-neutral-400'
                    )}
                  />
                )}
              </div>
              <p
                className={cn(
                  'text-xs font-medium mt-1.5 text-center max-w-[80px]',
                  isCurrent ? 'text-indigo-600' : isCompleted ? 'text-neutral-600' : 'text-neutral-400'
                )}
              >
                {step.title}
              </p>
            </div>

            {/* Connector line */}
            {index < steps.length - 1 && (
              <div
                className={cn(
                  'w-16 h-0.5 mx-2 mb-5 transition-colors',
                  isCompleted ? 'bg-indigo-600' : 'bg-neutral-200'
                )}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

/**
 * AgencySetupWizard — 3-step setup wizard shown after inmobiliaria registration
 *
 * Step 1: Basic agency info (name, NIT, address, city, phone, email)
 * Step 2: Operations config (commission %, collection day, dispersion day)
 * Step 3: Optional — invite first team member
 *
 * Can be used as a modal overlay or standalone page section.
 */
export function AgencySetupWizard({
  agencyName = '',
  agencyCity = '',
  onComplete,
  onDismiss,
}: AgencySetupWizardProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState<WizardFormData>({
    basic: {
      name: agencyName,
      nit: '',
      address: '',
      city: agencyCity,
      phone: '',
      email: '',
    },
    operations: {
      defaultCommission: 10,
      collectionDay: 5,
      dispersionDay: 15,
    },
    invite: {
      email: '',
      role: 'AGENTE',
    },
  });

  const updateBasic = (updates: Partial<AgencyBasicFormData>) => {
    setFormData((prev) => ({ ...prev, basic: { ...prev.basic, ...updates } }));
  };

  const updateOperations = (updates: Partial<AgencyOperationsFormData>) => {
    setFormData((prev) => ({ ...prev, operations: { ...prev.operations, ...updates } }));
  };

  const updateInvite = (updates: Partial<InviteFirstMemberFormData>) => {
    setFormData((prev) => ({ ...prev, invite: { ...prev.invite, ...updates } }));
  };

  const isStep1Valid =
    formData.basic.name.trim().length >= 2 &&
    isValidNit(formData.basic.nit) &&
    isValidEmail(formData.basic.email);
  // Step 2 always valid (all optional with defaults)
  const isStep2Valid = true;
  // Step 3 valid if empty (skippable) or has valid email
  const isStep3Valid =
    !formData.invite.email ||
    isValidEmail(formData.invite.email);

  const canProceed = currentStep === 1 ? isStep1Valid : currentStep === 2 ? isStep2Valid : isStep3Valid;

  const handleNext = async () => {
    setError(null);

    if (currentStep === 1) {
      // Save basic info to backend
      setIsSubmitting(true);
      try {
        await apiClient.put('/inmobiliaria/agency', {
          name: formData.basic.name,
          nit: formData.basic.nit || undefined,
          address: formData.basic.address || undefined,
          city: formData.basic.city || undefined,
          phone: formData.basic.phone || undefined,
          email: formData.basic.email || undefined,
        });
        setCurrentStep(2);
      } catch (err) {
        console.error('[AgencySetupWizard] Failed to update agency profile:', err);
        // Non-blocking: proceed anyway (backend may not be deployed yet)
        setCurrentStep(2);
      } finally {
        setIsSubmitting(false);
      }
    } else if (currentStep === 2) {
      // Save operations config to backend
      setIsSubmitting(true);
      try {
        await apiClient.put('/inmobiliaria/agency/settings', {
          defaultCommissionRate: formData.operations.defaultCommission,
          collectionDay: formData.operations.collectionDay,
          dispersionDay: formData.operations.dispersionDay,
        });
        setCurrentStep(3);
      } catch (err) {
        console.error('[AgencySetupWizard] Failed to save operations settings:', err);
        // Non-blocking: proceed anyway
        setCurrentStep(3);
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  const handleBack = () => {
    setError(null);
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleFinish = async () => {
    setError(null);
    setIsSubmitting(true);

    try {
      // Send invitation if email was provided
      if (formData.invite.email) {
        await apiClient.post('/inmobiliaria/agency/members', {
          email: formData.invite.email,
          role: formData.invite.role,
        });
      }
      setIsComplete(true);
      setTimeout(onComplete, 1500);
    } catch (err) {
      console.error('[AgencySetupWizard] Failed to invite member:', err);
      setError('No se pudo enviar la invitación. Puedes intentarlo más tarde desde Configuración.');
      // Still mark complete after showing error briefly
      setIsComplete(true);
      setTimeout(onComplete, 2500);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSkipInvite = () => {
    setIsComplete(true);
    setTimeout(onComplete, 1000);
  };

  // ============================================================================
  // Render: Complete State
  // ============================================================================

  if (isComplete) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 200, damping: 15 }}
          className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mb-5"
        >
          <Check className="w-8 h-8 text-emerald-600" weight="bold" />
        </motion.div>
        <h3 className="text-xl font-semibold text-neutral-900 mb-2">
          ¡Agencia configurada!
        </h3>
        <p className="text-neutral-500 text-sm">
          Tu agencia está lista. Redirigiendo al panel...
        </p>
      </div>
    );
  }

  // ============================================================================
  // Render: Wizard
  // ============================================================================

  const currentStepConfig = STEPS.find((s) => s.id === currentStep)!;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h2 className="text-xl font-semibold text-neutral-900">
            Configura tu agencia
          </h2>
          <p className="text-sm text-neutral-500 mt-1">
            Solo tomará un par de minutos
          </p>
        </div>
        {onDismiss && (
          <button
            type="button"
            onClick={onDismiss}
            className="p-2 rounded-lg hover:bg-neutral-100 transition-colors text-neutral-400 hover:text-neutral-600"
            aria-label="Cerrar wizard"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Step Indicator */}
      <StepIndicator steps={STEPS} currentStep={currentStep} />

      {/* Step Content */}
      <div className="mt-8 flex-1">
        <div className="mb-6">
          <h3 className="text-base font-semibold text-neutral-900">
            {currentStepConfig.title}
            {currentStepConfig.optional && (
              <span className="ml-2 text-xs font-normal text-neutral-400 bg-neutral-100 px-2 py-0.5 rounded-full">
                Opcional
              </span>
            )}
          </h3>
          <p className="text-sm text-neutral-500 mt-0.5">{currentStepConfig.description}</p>
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -16 }}
            transition={{ duration: 0.2 }}
          >
            {currentStep === 1 && (
              <AgencyBasicForm data={formData.basic} onChange={updateBasic} />
            )}
            {currentStep === 2 && (
              <AgencyOperationsForm data={formData.operations} onChange={updateOperations} />
            )}
            {currentStep === 3 && (
              <InviteFirstMemberForm data={formData.invite} onChange={updateInvite} />
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Error message */}
      {error && (
        <p className="mt-4 text-sm text-red-600 bg-red-50 px-4 py-2 rounded-lg">{error}</p>
      )}

      {/* Navigation */}
      <div className="mt-8 flex gap-3">
        {currentStep > 1 && (
          <button
            type="button"
            onClick={handleBack}
            disabled={isSubmitting}
            className="flex items-center gap-1.5 px-4 py-3 rounded-xl border border-neutral-200 text-neutral-600 text-sm font-medium hover:bg-neutral-50 transition-colors disabled:opacity-50"
          >
            <CaretLeft className="w-4 h-4" />
            Anterior
          </button>
        )}

        {currentStep < 3 ? (
          <button
            type="button"
            onClick={handleNext}
            disabled={!canProceed || isSubmitting}
            className={cn(
              'flex-1 flex items-center justify-center gap-1.5 py-3 rounded-xl text-sm font-semibold transition-all',
              canProceed && !isSubmitting
                ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                : 'bg-neutral-100 text-neutral-400 cursor-not-allowed'
            )}
          >
            {isSubmitting ? (
              <>
                <SpinnerGap className="w-4 h-4 animate-spin" />
                Guardando...
              </>
            ) : (
              <>
                Siguiente
                <CaretRight className="w-4 h-4" />
              </>
            )}
          </button>
        ) : (
          <div className="flex-1 flex gap-3">
            <button
              type="button"
              onClick={handleSkipInvite}
              disabled={isSubmitting}
              className="flex-1 py-3 rounded-xl border border-neutral-200 text-neutral-600 text-sm font-medium hover:bg-neutral-50 transition-colors disabled:opacity-50"
            >
              Omitir por ahora
            </button>
            <button
              type="button"
              onClick={handleFinish}
              disabled={!isStep3Valid || !formData.invite.email || isSubmitting}
              className={cn(
                'flex-1 flex items-center justify-center gap-1.5 py-3 rounded-xl text-sm font-semibold transition-all',
                isStep3Valid && formData.invite.email && !isSubmitting
                  ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                  : 'bg-neutral-100 text-neutral-400 cursor-not-allowed'
              )}
            >
              {isSubmitting ? (
                <>
                  <SpinnerGap className="w-4 h-4 animate-spin" />
                  Enviando...
                </>
              ) : (
                'Enviar invitación'
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
