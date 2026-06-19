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
import { useI18n } from '@/lib/i18n';
import { toast } from '@/components/ui/toast';
import { useAuth } from '@/lib/auth/use-auth';
import { usePermissions } from '@/lib/hooks/usePermissions';
import { propertiesApi } from '@/lib/api/properties.service';
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
  { id: 1, labelKey: 'inmobiliaria.consignaciones.wizard.steps.owner', icon: User },
  { id: 2, labelKey: 'inmobiliaria.consignaciones.wizard.steps.property', icon: HouseLine },
  { id: 3, labelKey: 'inmobiliaria.consignaciones.wizard.steps.commission', icon: Percent },
  { id: 4, labelKey: 'inmobiliaria.consignaciones.wizard.steps.agent', icon: UserCircle },
  { id: 5, labelKey: 'inmobiliaria.consignaciones.wizard.steps.inventory', icon: ClipboardText },
  { id: 6, labelKey: 'inmobiliaria.consignaciones.wizard.steps.confirm', icon: CheckCircle },
];

/**
 * ConsignacionWizard - 6-step wizard for creating new property consignments
 * Used at /panel/inmobiliaria/portafolio/nuevo
 */
// PropertyType values supported by the backend
const SUPPORTED_TYPES = ['apartment', 'house', 'studio', 'room'] as const;

export function ConsignacionWizard({ propietarios, agentes }: ConsignacionWizardProps) {
  const router = useRouter();
  const { t } = useI18n();
  const { user } = useAuth();
  const { isAdmin } = usePermissions();
  // Agents skip the "Assign agent" step — they get auto-assigned
  const isAgentRole = !isAdmin;
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
        // Agents skip this step; admins must assign an agent
        if (isAgentRole) return true;
        return Boolean(formData.agenteId);
      case 5:
        // Inventory is optional
        return true;
      case 6:
        // Confirmation step - agenteId not required for agents (auto-assigned)
        return Boolean(
          formData.propietarioId &&
          formData.propertyTitle &&
          formData.propertyAddress &&
          formData.propertyCity &&
          formData.propertyZone &&
          (isAgentRole || formData.agenteId)
        );
      default:
        return false;
    }
  }, [currentStep, formData]);

  // Navigation helpers — agents skip step 4
  const getNextStep = useCallback((step: number) => {
    const next = step + 1;
    if (isAgentRole && next === 4) return 5;
    return next;
  }, [isAgentRole]);

  const getPrevStep = useCallback((step: number) => {
    const prev = step - 1;
    if (isAgentRole && prev === 4) return 3;
    return prev;
  }, [isAgentRole]);

  const goToNextStep = useCallback(() => {
    if (currentStep < 6 && isStepValid) {
      setCurrentStep(getNextStep(currentStep));
    }
  }, [currentStep, isStepValid, getNextStep]);

  const goToPreviousStep = useCallback(() => {
    if (currentStep > 1) {
      setCurrentStep(getPrevStep(currentStep));
    }
  }, [currentStep, getPrevStep]);

  const goToStep = useCallback((step: number) => {
    if (step >= 1 && step <= 6) {
      setCurrentStep(step);
    }
  }, []);

  // Submit handler — creates the property and assigns the agent
  const handleSubmit = useCallback(async () => {
    if (!isStepValid) return;
    setIsSubmitting(true);

    try {
      // Map wizard type to backend-supported values
      const rawType = formData.propertyType ?? 'apartment';
      const type = (SUPPORTED_TYPES as readonly string[]).includes(rawType)
        ? (rawType as typeof SUPPORTED_TYPES[number])
        : 'apartment';

      const property = await propertiesApi.create({
        title:        formData.propertyTitle ?? '',
        description:  formData.propertyTitle ?? '', // wizard has no description field
        type,
        city:         formData.propertyCity ?? '',
        neighborhood: formData.propertyZone ?? '',
        address:      formData.propertyAddress ?? '',
        monthlyRent:  formData.monthlyRent ?? 0,
        bedrooms:     0, // wizard doesn't collect this — update after creation
        bathrooms:    0,
        area:         0,
        adminFee:     formData.adminFee,
      });

      // Assign agent
      if (isAgentRole && user?.email) {
        // Agent creating → auto-assign to themselves
        await propertiesApi.assignAgent(property.id, user.email);
      } else if (!isAgentRole && formData.agenteId) {
        // Admin → assign the selected agent by email
        const selectedAgente = agentes.find((a) => a.id === formData.agenteId);
        if (selectedAgente?.email) {
          await propertiesApi.assignAgent(property.id, selectedAgente.email);
        }
      }

      toast.success(t('inmobiliaria.consignaciones.wizard.toasts.successTitle'), {
        description: t('inmobiliaria.consignaciones.wizard.toasts.successDesc', {
          title: formData.propertyTitle || '',
        }),
      });

      router.push('/panel/inmobiliaria/propiedades');
    } catch (error) {
      console.error('Error creating property:', error);
      toast.error(t('inmobiliaria.consignaciones.wizard.toasts.errorTitle'), {
        description: t('inmobiliaria.consignaciones.wizard.toasts.errorDesc'),
      });
    } finally {
      setIsSubmitting(false);
    }
  }, [formData, isStepValid, isAgentRole, user, agentes, router, t]);

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

  // Visible steps depend on role
  const visibleSteps = isAgentRole ? STEPS.filter((s) => s.id !== 4) : STEPS;
  const totalVisible = visibleSteps.length;
  // Position of current step among visible steps (1-based)
  const currentVisibleIndex = visibleSteps.findIndex((s) => s.id === currentStep);

  return (
    <div className="max-w-4xl mx-auto">
      {/* Step Indicator */}
      <div className="mb-8">
        {/* Desktop Steps */}
        <div className="hidden md:flex items-center justify-between">
          {visibleSteps.map((step, index) => {
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
                      ? 'bg-success text-white'
                      : status === 'current'
                        ? 'bg-primary text-white uppercase tracking-wide font-mono ring-4 ring-primary/30'
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
                      ? 'text-primary'
                      : status === 'completed'
                        ? 'text-neutral-900 dark:text-white'
                        : 'text-neutral-400'
                  )}>
                    {t(step.labelKey)}
                  </span>
                </button>

                {/* Connector Line */}
                {index < visibleSteps.length - 1 && (
                  <div className={cn(
                    'flex-1 h-0.5 mx-2',
                    step.id < currentStep
                      ? 'bg-success'
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
              {t('inmobiliaria.consignaciones.wizard.mobileProgress', {
                current: currentVisibleIndex + 1,
                total: totalVisible,
                label: t(visibleSteps[currentVisibleIndex]?.labelKey ?? ''),
              })}
            </span>
            <span className="text-sm text-neutral-500">
              {Math.round(((currentVisibleIndex + 1) / totalVisible) * 100)}%
            </span>
          </div>
          <div className="h-2 bg-neutral-100 dark:bg-neutral-800 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-primary"
              initial={false}
              animate={{ width: `${((currentVisibleIndex + 1) / totalVisible) * 100}%` }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
            />
          </div>
        </div>
      </div>

      {/* Step Content */}
      <div className="bg-white dark:bg-[#1a1a1c] rounded-xl border border-neutral-200 dark:border-neutral-700 overflow-hidden">
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
            className="px-4 py-2 rounded-xl text-neutral-600 dark:text-neutral-400 font-medium text-sm hover:text-neutral-900 dark:hover:text-white transition-colors"
          >
            {t('inmobiliaria.consignaciones.wizard.cancel')}
          </button>

          {/* Navigation Buttons */}
          <div className="flex items-center gap-3">
            {currentStep > 1 && (
              <button
                type="button"
                onClick={goToPreviousStep}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-neutral-200 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 font-medium text-sm hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
              >
                <CaretLeft className="w-4 h-4" />
                {t('inmobiliaria.consignaciones.wizard.previous')}
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
                    ? 'bg-primary text-white hover:opacity-90'
                    : 'bg-neutral-200 dark:bg-neutral-800 text-neutral-400 dark:text-neutral-500 cursor-not-allowed'
                )}
              >
                {t('inmobiliaria.consignaciones.wizard.next')}
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
                    ? 'bg-primary text-white hover:opacity-90'
                    : 'bg-neutral-200 dark:bg-neutral-800 text-neutral-400 dark:text-neutral-500 cursor-not-allowed'
                )}
              >
                {isSubmitting ? (
                  <>
                    <SpinnerGap className="w-4 h-4 animate-spin" />
                    {t('inmobiliaria.consignaciones.wizard.creating')}
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" weight="bold" />
                    {t('inmobiliaria.consignaciones.wizard.confirmConsignment')}
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
              className="w-full max-w-md p-6 rounded-xl bg-white dark:bg-[#1a1a1c] border border-neutral-200 dark:border-neutral-700"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-warning-soft flex items-center justify-center">
                  <X className="w-5 h-5 text-warning" />
                </div>
                <div>
                  <h3 className="font-semibold text-neutral-900 dark:text-white">
                    {t('inmobiliaria.consignaciones.wizard.cancelDialog.title')}
                  </h3>
                  <p className="text-sm text-neutral-500 dark:text-neutral-400">
                    {t('inmobiliaria.consignaciones.wizard.cancelDialog.description')}
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3">
                <button
                  onClick={() => setShowCancelDialog(false)}
                  className="px-4 py-2 rounded-xl border border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-400 font-medium text-sm hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                >
                  {t('inmobiliaria.consignaciones.wizard.cancelDialog.continueEditing')}
                </button>
                <button
                  onClick={confirmCancel}
                  className="px-4 py-2 rounded-xl bg-danger text-white font-medium hover:bg-danger transition-colors"
                >
                  {t('inmobiliaria.consignaciones.wizard.cancelDialog.yesCancel')}
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
