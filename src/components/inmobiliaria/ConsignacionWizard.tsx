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
} from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useI18n } from '@/lib/i18n';
import { toast } from '@/components/ui/toast';
import { useAuth } from '@/lib/auth/use-auth';
import { usePermissions } from '@/lib/hooks/usePermissions';
import { propertiesApi } from '@/lib/api/properties.service';
import { TYPE_TO_BACKEND } from '@/lib/api/properties.mapper';
import { consignacionesApi } from '@/lib/api/inmobiliaria.service';
import type { PropertyType } from '@/lib/types/property';
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
 * Used at /panel/inmobiliaria/inmuebles/nuevo
 */

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
        // Must have property details — thresholds mirror CreatePropertyDto
        // (contract.md §3.2): bedrooms 0-20, bathrooms 1-10, area 10-10000 m²,
        // description 20-5000 chars.
        return Boolean(
          formData.propertyTitle &&
          formData.propertyAddress &&
          formData.propertyCity &&
          formData.propertyZone &&
          formData.propertyType &&
          formData.monthlyRent && formData.monthlyRent > 0 &&
          formData.bedrooms != null && formData.bedrooms >= 0 && formData.bedrooms <= 20 &&
          formData.bathrooms != null && formData.bathrooms >= 1 && formData.bathrooms <= 10 &&
          formData.area != null && formData.area >= 10 && formData.area <= 10000 &&
          formData.propertyDescription &&
          formData.propertyDescription.length >= 20 &&
          formData.propertyDescription.length <= 5000
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

  /**
   * Crea el inmueble Y el mandato. Son dos cosas.
   *
   * Durante meses esto sólo creó el inmueble: las seis pantallas preguntaban
   * propietario, comisión, agente, fecha y término mínimo, y al final llamaba
   * a `propertiesApi.create` y navegaba diciendo «listo». Todo lo que hace que
   * una consignación sea una consignación se descartaba en silencio, y la
   * liquidación quedaba corriendo al 0% de comisión.
   *
   * Se veía perfecto porque el inmueble SÍ aparecía en el catálogo. Medido
   * antes de arreglarlo: de las 19 consignaciones de la base, 15 las había
   * creado el sincronizador del pipeline (con `commissionPercent: 0`, que es
   * el valor que hornea al auto-crear) y 4 la migración de cartera. Ninguna
   * salió de acá.
   *
   * El orden importa: primero el inmueble, porque el mandato lo referencia con
   * llave foránea. Si el segundo paso falla se avisa que el inmueble quedó
   * creado sin mandato en vez de decir «listo» — media verdad se lee como
   * mentira entera cuando aparece la factura.
   */
  const handleSubmit = useCallback(async () => {
    if (!isStepValid) return;
    setIsSubmitting(true);

    try {
      /**
       * Contract.md §3.2 (T-0011) — no silent coercion. The wizard's 6 UI
       * options (apartment/house/studio/commercial/office/warehouse) all
       * have an entry in TYPE_TO_BACKEND; an unmapped value is a bug that
       * must surface as an error, not get quietly rewritten to 'apartment'
       * the way it used to (a consigned warehouse was stored as an
       * apartment).
       */
      const wizardType = formData.propertyType as PropertyType | undefined;
      if (!wizardType || !(wizardType in TYPE_TO_BACKEND)) {
        throw new Error(
          `Tipo de inmueble no soportado: "${wizardType ?? ''}". Volvé al paso 2 y elegí un tipo válido.`,
        );
      }

      const property = await propertiesApi.create({
        title:        formData.propertyTitle ?? '',
        description:  formData.propertyDescription ?? '',
        type:         wizardType,
        city:         formData.propertyCity ?? '',
        neighborhood: formData.propertyZone ?? '',
        address:      formData.propertyAddress ?? '',
        latitude:     formData.propertyLatitude,
        longitude:    formData.propertyLongitude,
        monthlyRent:  formData.monthlyRent ?? 0,
        bedrooms:     formData.bedrooms ?? 0,
        bathrooms:    formData.bathrooms ?? 1,
        area:         formData.area ?? 10,
        adminFee:     formData.adminFee,
      });

      // Assign agent
      const selectedAgente = agentes.find((a) => a.id === formData.agenteId);
      if (isAgentRole && user?.email) {
        // Agent creating → auto-assign to themselves
        await propertiesApi.assignAgent(property.id, user.email);
      } else if (!isAgentRole && selectedAgente?.email) {
        // Admin → assign the selected agent by email
        await propertiesApi.assignAgent(property.id, selectedAgente.email);
      }

      // El mandato. `agenteUserId` es un User.id: el `Agente.id` del front es
      // un AgencyMember.id y mandarlo acá no falla, asigna a nadie.
      const agenteUserId = isAgentRole ? user?.id : selectedAgente?.userId;
      try {
        await consignacionesApi.create({
          propietarioId: formData.propietarioId ?? '',
          propertyId: property.id,
          ...(agenteUserId ? { agenteUserId } : {}),
          propertyTitle: formData.propertyTitle ?? '',
          propertyAddress: formData.propertyAddress ?? '',
          propertyCity: formData.propertyCity ?? '',
          propertyZone: formData.propertyZone ?? '',
          propertyType: formData.propertyType ?? 'apartment',
          monthlyRent: formData.monthlyRent ?? 0,
          ...(formData.adminFee != null ? { adminFee: formData.adminFee } : {}),
          commissionPercent: formData.commissionPercent ?? 0,
          contractDate: formData.contractStartDate ?? new Date().toISOString().split('T')[0],
          ...(formData.minimumTerm != null ? { minimumTerm: formData.minimumTerm } : {}),
          agenteId: formData.agenteId ?? '',
        });
      } catch (error) {
        // El inmueble YA existe. Decirlo es la diferencia entre que alguien lo
        // busque en la lista y lo complete, o que lo dé por perdido y lo cargue
        // de nuevo — y termine con dos.
        console.error('Error creating consignacion:', error);
        toast.error(t('inmobiliaria.consignaciones.wizard.toasts.mandateErrorTitle'), {
          description: t('inmobiliaria.consignaciones.wizard.toasts.mandateErrorDesc'),
        });
        router.push('/panel/inmobiliaria/inmuebles');
        return;
      }

      toast.success(t('inmobiliaria.consignaciones.wizard.toasts.successTitle'), {
        description: t('inmobiliaria.consignaciones.wizard.toasts.successDesc', {
          title: formData.propertyTitle || '',
        }),
      });

      router.push('/panel/inmobiliaria/inmuebles');
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
    router.push('/panel/inmobiliaria/inmuebles');
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
                {/* allowlist: clickable wizard step-navigator (icon-per-step circle + label-below,
                    completed/current/upcoming). Cadence Stepper is display-only — can't model this. Native. */}
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
                        ? 'bg-primary text-primary-fg uppercase tracking-wide font-mono ring-4 ring-primary/30'
                        : 'bg-surface-muted dark:bg-ink text-fg-subtle'
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
                        ? 'text-fg dark:text-white'
                        : 'text-fg-subtle'
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
                      : 'bg-surface-muted dark:bg-ink'
                  )} />
                )}
              </div>
            );
          })}
        </div>

        {/* Mobile Progress */}
        <div className="md:hidden">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-fg dark:text-white">
              {t('inmobiliaria.consignaciones.wizard.mobileProgress', {
                current: currentVisibleIndex + 1,
                total: totalVisible,
                label: t(visibleSteps[currentVisibleIndex]?.labelKey ?? ''),
              })}
            </span>
            <span className="text-sm text-fg-muted">
              {Math.round(((currentVisibleIndex + 1) / totalVisible) * 100)}%
            </span>
          </div>
          <div className="h-2 bg-surface-muted dark:bg-ink rounded-full overflow-hidden">
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
      <div className="bg-surface dark:bg-[#14130F] rounded-xl border border-border dark:border-border-strong overflow-hidden">
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
        <div className="px-6 py-4 border-t border-border-faint dark:border-border-strong bg-surface-muted dark:bg-[#14130F] flex items-center justify-between">
          {/* Cancel Button */}
          <Button
            type="button"
            variant="ghost"
            hideArrow
            size="sm"
            onClick={handleCancel}
            className="text-fg-muted dark:text-fg-subtle"
          >
            {t('inmobiliaria.consignaciones.wizard.cancel')}
          </Button>

          {/* Navigation Buttons */}
          <div className="flex items-center gap-3">
            {currentStep > 1 && (
              <Button
                type="button"
                variant="outline"
                hideArrow
                onClick={goToPreviousStep}
              >
                <CaretLeft className="w-4 h-4" />
                {t('inmobiliaria.consignaciones.wizard.previous')}
              </Button>
            )}

            {currentStep < 6 ? (
              <Button
                type="button"
                hideArrow
                onClick={goToNextStep}
                disabled={!isStepValid}
              >
                {t('inmobiliaria.consignaciones.wizard.next')}
                <CaretRight className="w-4 h-4" />
              </Button>
            ) : (
              <Button
                type="button"
                hideArrow
                onClick={handleSubmit}
                disabled={!isStepValid || isSubmitting}
                isLoading={isSubmitting}
              >
                {isSubmitting ? (
                  t('inmobiliaria.consignaciones.wizard.creating')
                ) : (
                  <>
                    <Check className="w-4 h-4" weight="bold" />
                    {t('inmobiliaria.consignaciones.wizard.confirmConsignment')}
                  </>
                )}
              </Button>
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
              className="w-full max-w-md p-6 rounded-xl bg-surface dark:bg-[#14130F] border border-border dark:border-border-strong"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-warning-soft flex items-center justify-center">
                  <X className="w-5 h-5 text-warning" />
                </div>
                <div>
                  <h3 className="font-semibold text-fg dark:text-white">
                    {t('inmobiliaria.consignaciones.wizard.cancelDialog.title')}
                  </h3>
                  <p className="text-sm text-fg-muted dark:text-fg-subtle">
                    {t('inmobiliaria.consignaciones.wizard.cancelDialog.description')}
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3">
                <Button
                  type="button"
                  variant="outline"
                  hideArrow
                  size="sm"
                  onClick={() => setShowCancelDialog(false)}
                >
                  {t('inmobiliaria.consignaciones.wizard.cancelDialog.continueEditing')}
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  hideArrow
                  size="sm"
                  onClick={confirmCancel}
                >
                  {t('inmobiliaria.consignaciones.wizard.cancelDialog.yesCancel')}
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default ConsignacionWizard;
