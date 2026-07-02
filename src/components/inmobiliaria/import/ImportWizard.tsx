'use client';

import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FileArrowUp,
  UploadSimple,
  ArrowsLeftRight,
  MagicWand,
  CheckCircle,
  CaretLeft,
  CaretRight,
  Check,
  X,
} from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import { useI18n } from '@/lib/i18n';
import { Button } from '@/components/ui/button';
import { StepChooseMethod } from './steps/StepChooseMethod';
import { StepUploadFile } from './steps/StepUploadFile';
import { StepColumnMapping } from './steps/StepColumnMapping';
import { StepAIReview } from './steps/StepAIReview';
import { StepConfirmImport } from './steps/StepConfirmImport';
import { StepSoftwareMigration } from './steps/StepSoftwareMigration';
import { StepPortalImport } from './steps/StepPortalImport';
import { TARGET_FIELDS } from './lib/importTypes';
import type { ImportWizardState } from './lib/importTypes';

const STEPS = [
  { id: 1, labelKey: 'inmobiliaria.import.steps.method', icon: FileArrowUp },
  { id: 2, labelKey: 'inmobiliaria.import.steps.upload', icon: UploadSimple },
  { id: 3, labelKey: 'inmobiliaria.import.steps.mapping', icon: ArrowsLeftRight },
  { id: 4, labelKey: 'inmobiliaria.import.steps.review', icon: MagicWand },
  { id: 5, labelKey: 'inmobiliaria.import.steps.confirm', icon: CheckCircle },
];


const INITIAL_STATE: ImportWizardState = {
  method: null,
  file: null,
  fileName: '',
  rawRows: [],
  headers: [],
  sheetNames: [],
  selectedSheet: '',
  columnMappings: [],
  properties: [],
  aiAnalyzed: false,
  importProgress: 0,
  importedCount: 0,
};

export interface ImportStepProps {
  state: ImportWizardState;
  updateState: (partial: Partial<ImportWizardState>) => void;
}

export function ImportWizard() {
  const router = useRouter();
  const { t } = useI18n();
  const [currentStep, setCurrentStep] = useState(1);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [wizardState, setWizardState] = useState<ImportWizardState>(INITIAL_STATE);

  const updateState = useCallback((partial: Partial<ImportWizardState>) => {
    setWizardState((prev) => ({ ...prev, ...partial }));
  }, []);

  // When method changes (e.g. from software → excel), reset to step 1
  const prevMethodRef = useRef(wizardState.method);
  useEffect(() => {
    if (prevMethodRef.current !== wizardState.method && wizardState.method !== null) {
      prevMethodRef.current = wizardState.method;
      setCurrentStep(1);
    }
  }, [wizardState.method]);

  // Visible steps based on method
  const visibleSteps = useMemo(() => {
    if (wizardState.method === 'portal') return STEPS.slice(0, 2);
    return STEPS;
  }, [wizardState.method]);

  // Step validation
  const isStepValid = useMemo(() => {
    switch (currentStep) {
      case 1:
        return wizardState.method !== null;
      case 2:
        // Software and portal steps are always "valid" for navigation purposes
        if (wizardState.method === 'software') return true;
        if (wizardState.method === 'portal') return true;
        return wizardState.rawRows.length > 0;
      case 3: {
        // All required TARGET_FIELDS must be mapped
        const mappings = wizardState.columnMappings;
        const requiredKeys = TARGET_FIELDS.filter((f) => f.required).map((f) => f.key);
        return requiredKeys.every((key) => mappings.some((m) => m.targetField === key));
      }
      case 4:
        // Valid when analysis is done and at least 1 property is selected
        return wizardState.aiAnalyzed && wizardState.properties.some((p) => p.selected && !p.hasErrors);
      case 5:
        // Always valid — step manages its own submit
        return true;
      default:
        return false;
    }
  }, [currentStep, wizardState]);

  // Navigation handlers
  const goToNextStep = useCallback(() => {
    if (currentStep < visibleSteps.length && isStepValid) {
      setCurrentStep((prev) => prev + 1);
    }
  }, [currentStep, isStepValid, visibleSteps.length]);

  const goToPreviousStep = useCallback(() => {
    if (currentStep > 1) {
      if (currentStep === 4) {
        updateState({ aiAnalyzed: false, properties: [] });
      }
      setCurrentStep((prev) => prev - 1);
    }
  }, [currentStep, updateState]);

  const goToStep = useCallback((step: number) => {
    if (step >= 1 && step <= currentStep) {
      if (currentStep === 4 && step < 4) {
        updateState({ aiAnalyzed: false, properties: [] });
      }
      setCurrentStep(step);
    }
  }, [currentStep, updateState]);

  const handleCancel = useCallback(() => {
    setShowCancelDialog(true);
  }, []);

  const confirmCancel = useCallback(() => {
    router.push('/panel/inmobiliaria/portafolio');
  }, [router]);

  // Step status helper
  const getStepStatus = (stepId: number) => {
    if (stepId < currentStep) return 'completed';
    if (stepId === currentStep) return 'current';
    return 'upcoming';
  };

  // Render step content
  const renderStepContent = () => {
    const stepProps: ImportStepProps = {
      state: wizardState,
      updateState,
    };

    switch (currentStep) {
      case 1:
        return <StepChooseMethod {...stepProps} />;
      case 2:
        if (wizardState.method === 'software') return <StepSoftwareMigration {...stepProps} />;
        if (wizardState.method === 'portal') return <StepPortalImport {...stepProps} />;
        return <StepUploadFile {...stepProps} />;
      case 3:
        return <StepColumnMapping {...stepProps} />;
      case 4:
        return <StepAIReview {...stepProps} />;
      case 5:
        return <StepConfirmImport {...stepProps} />;
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
          {visibleSteps.map((step, index) => {
            const status = getStepStatus(step.id);
            const StepIcon = step.icon;

            return (
              <div key={step.id} className="flex items-center flex-1">
                {/* allowlist: clickable wizard step navigator (icon-per-step, label-below,
                    done/active/upcoming) — Cadence Stepper is display-only; kept native */}
                <button
                  onClick={() => status !== 'upcoming' && goToStep(step.id)}
                  disabled={status === 'upcoming'}
                  className={cn(
                    'flex flex-col items-center gap-2 transition-all shrink-0',
                    status === 'upcoming' ? 'cursor-not-allowed' : 'cursor-pointer'
                  )}
                >
                  <div className={cn(
                    'w-12 h-12 rounded-full flex items-center justify-center transition-all',
                    status === 'completed'
                      ? 'bg-success text-white'
                      : status === 'current'
                        ? 'bg-primary text-white ring-4 ring-primary/30'
                        : 'bg-surface-muted dark:bg-ink text-fg-subtle'
                  )}>
                    {status === 'completed' ? (
                      <Check className="w-5 h-5" weight="bold" />
                    ) : (
                      <StepIcon className="w-5 h-5" />
                    )}
                  </div>
                  <span className={cn(
                    'text-xs font-medium whitespace-nowrap',
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
              {t('inmobiliaria.import.wizard.mobileProgress', {
                current: currentStep,
                total: visibleSteps.length,
                label: t(visibleSteps[currentStep - 1]?.labelKey ?? ''),
              })}
            </span>
            <span className="text-sm text-fg-muted">{Math.round((currentStep / visibleSteps.length) * 100)}%</span>
          </div>
          <div className="h-2 bg-surface-muted dark:bg-ink rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-primary"
              initial={false}
              animate={{ width: `${(currentStep / visibleSteps.length) * 100}%` }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
            />
          </div>
        </div>
      </div>

      {/* Step Content */}
      <div className="bg-surface dark:bg-[#14130F] rounded-xl border border-border dark:border-strong">
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

        {/* Footer Navigation — hidden when import is complete */}
        {!(currentStep === 5 && wizardState.importedCount > 0) && (
          <div className="px-6 py-4 border-t border-faint dark:border-strong bg-surface-muted dark:bg-[#14130F] flex items-center justify-between">
            {/* Cancel Button */}
            <Button
              type="button"
              variant="ghost"
              hideArrow
              onClick={handleCancel}
            >
              {t('inmobiliaria.import.wizard.cancel')}
            </Button>

            {/* Navigation Buttons */}
            <div className="flex items-center gap-3">
              {currentStep > 1 && (
                <Button
                  type="button"
                  variant="outline"
                  hideArrow
                  onClick={goToPreviousStep}
                  className="gap-2"
                >
                  <CaretLeft className="w-4 h-4" />
                  {t('inmobiliaria.import.wizard.previous')}
                </Button>
              )}

              {/* Portal terminal step: show "Volver al portafolio" instead of "Siguiente" */}
              {wizardState.method === 'portal' && currentStep === 2 ? (
                <Button
                  type="button"
                  variant="outline"
                  hideArrow
                  onClick={confirmCancel}
                >
                  {t('inmobiliaria.import.portal.backToPortfolio')}
                </Button>
              ) : currentStep < visibleSteps.length ? (
                <Button
                  type="button"
                  hideArrow
                  onClick={goToNextStep}
                  disabled={!isStepValid}
                  className="gap-2"
                >
                  {t('inmobiliaria.import.wizard.next')}
                  <CaretRight className="w-4 h-4" />
                </Button>
              ) : null}
            </div>
          </div>
        )}
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
              className="w-full max-w-md p-6 rounded-xl bg-surface dark:bg-[#14130F] border border-border dark:border-strong"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-warning-soft flex items-center justify-center">
                  <X className="w-5 h-5 text-warning" />
                </div>
                <div>
                  <h3 className="font-semibold text-fg dark:text-white">
                    {t('inmobiliaria.import.wizard.cancelDialog.title')}
                  </h3>
                  <p className="text-sm text-fg-muted dark:text-fg-subtle">
                    {t('inmobiliaria.import.wizard.cancelDialog.description')}
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3">
                <Button
                  variant="outline"
                  hideArrow
                  onClick={() => setShowCancelDialog(false)}
                >
                  {t('inmobiliaria.import.wizard.cancelDialog.continueEditing')}
                </Button>
                <Button
                  variant="destructive"
                  hideArrow
                  onClick={confirmCancel}
                >
                  {t('inmobiliaria.import.wizard.cancelDialog.yesCancel')}
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default ImportWizard;
