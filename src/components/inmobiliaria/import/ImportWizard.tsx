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
                {/* Step Circle */}
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
                        : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-400'
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
              {t('inmobiliaria.import.wizard.mobileProgress', {
                current: currentStep,
                total: visibleSteps.length,
                label: t(visibleSteps[currentStep - 1]?.labelKey ?? ''),
              })}
            </span>
            <span className="text-sm text-neutral-500">{Math.round((currentStep / visibleSteps.length) * 100)}%</span>
          </div>
          <div className="h-2 bg-neutral-100 dark:bg-neutral-800 rounded-full overflow-hidden">
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
      <div className="bg-white dark:bg-[#1a1a1c] rounded-xl border border-neutral-200 dark:border-neutral-700">
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
          <div className="px-6 py-4 border-t border-neutral-100 dark:border-neutral-800 bg-neutral-50 dark:bg-[#141416] flex items-center justify-between">
            {/* Cancel Button */}
            <button
              type="button"
              onClick={handleCancel}
              className="px-4 py-2 rounded-xl text-neutral-600 dark:text-neutral-400 font-medium text-sm hover:text-neutral-900 dark:hover:text-white transition-colors"
            >
              {t('inmobiliaria.import.wizard.cancel')}
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
                  {t('inmobiliaria.import.wizard.previous')}
                </button>
              )}

              {/* Portal terminal step: show "Volver al portafolio" instead of "Siguiente" */}
              {wizardState.method === 'portal' && currentStep === 2 ? (
                <button
                  type="button"
                  onClick={confirmCancel}
                  className="inline-flex items-center gap-2 px-5 py-2 rounded-xl font-medium transition-all text-sm border border-neutral-200 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800"
                >
                  {t('inmobiliaria.import.portal.backToPortfolio')}
                </button>
              ) : currentStep < visibleSteps.length ? (
                <button
                  type="button"
                  onClick={goToNextStep}
                  disabled={!isStepValid}
                  className={cn(
                    'inline-flex items-center gap-2 px-5 py-2 rounded-xl font-medium transition-all text-sm',
                    isStepValid
                      ? 'bg-primary text-white hover:opacity-90'
                      : 'bg-neutral-200 dark:bg-neutral-800 text-neutral-400 dark:text-neutral-500 cursor-not-allowed'
                  )}
                >
                  {t('inmobiliaria.import.wizard.next')}
                  <CaretRight className="w-4 h-4" />
                </button>
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
              className="w-full max-w-md p-6 rounded-xl bg-white dark:bg-[#1a1a1c] border border-neutral-200 dark:border-neutral-700"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-warning-soft flex items-center justify-center">
                  <X className="w-5 h-5 text-warning" />
                </div>
                <div>
                  <h3 className="font-semibold text-neutral-900 dark:text-white">
                    {t('inmobiliaria.import.wizard.cancelDialog.title')}
                  </h3>
                  <p className="text-sm text-neutral-500 dark:text-neutral-400">
                    {t('inmobiliaria.import.wizard.cancelDialog.description')}
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3">
                <button
                  onClick={() => setShowCancelDialog(false)}
                  className="px-4 py-2 rounded-xl border border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-400 font-medium text-sm hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                >
                  {t('inmobiliaria.import.wizard.cancelDialog.continueEditing')}
                </button>
                <button
                  onClick={confirmCancel}
                  className="px-4 py-2 rounded-xl bg-danger text-white font-medium hover:bg-danger transition-colors"
                >
                  {t('inmobiliaria.import.wizard.cancelDialog.yesCancel')}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default ImportWizard;
