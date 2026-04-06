'use client';

import { useState, useCallback, useMemo } from 'react';
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
import type { ImportWizardState } from './lib/importTypes';

const STEPS = [
  { id: 1, labelKey: 'inmobiliaria.import.steps.method', icon: FileArrowUp },
  { id: 2, labelKey: 'inmobiliaria.import.steps.upload', icon: UploadSimple },
  { id: 3, labelKey: 'inmobiliaria.import.steps.mapping', icon: ArrowsLeftRight },
  { id: 4, labelKey: 'inmobiliaria.import.steps.review', icon: MagicWand },
  { id: 5, labelKey: 'inmobiliaria.import.steps.confirm', icon: CheckCircle },
];

const TOTAL_STEPS = STEPS.length;

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

  // Step validation
  const isStepValid = useMemo(() => {
    switch (currentStep) {
      case 1:
        return wizardState.method !== null;
      case 2:
        return wizardState.rawRows.length > 0;
      case 3: {
        // At least propertyAddress and monthlyRent must be mapped
        const mappings = wizardState.columnMappings;
        const hasAddress = mappings.some((m) => m.targetField === 'propertyAddress');
        const hasRent = mappings.some((m) => m.targetField === 'monthlyRent');
        return hasAddress && hasRent;
      }
      case 4:
        return true;
      case 5:
        return true;
      default:
        return false;
    }
  }, [currentStep, wizardState]);

  // Navigation handlers
  const goToNextStep = useCallback(() => {
    if (currentStep < TOTAL_STEPS && isStepValid) {
      setCurrentStep((prev) => prev + 1);
    }
  }, [currentStep, isStepValid]);

  const goToPreviousStep = useCallback(() => {
    if (currentStep > 1) {
      setCurrentStep((prev) => prev - 1);
    }
  }, [currentStep]);

  const goToStep = useCallback((step: number) => {
    if (step >= 1 && step <= TOTAL_STEPS) {
      setCurrentStep(step);
    }
  }, []);

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
        return <StepUploadFile {...stepProps} />;
      case 3:
        return <StepColumnMapping {...stepProps} />;
      case 4:
        return (
          <div className="py-12 text-center text-neutral-400">
            <MagicWand className="w-12 h-12 mx-auto mb-4 text-neutral-300" />
            <p className="text-sm font-mono uppercase tracking-wide">Revisión AI — Coming in plan 33-02</p>
          </div>
        );
      case 5:
        return (
          <div className="py-12 text-center text-neutral-400">
            <CheckCircle className="w-12 h-12 mx-auto mb-4 text-neutral-300" />
            <p className="text-sm font-mono uppercase tracking-wide">Confirmación — Coming in plan 33-02</p>
          </div>
        );
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
          {STEPS.map((step, index) => {
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
                      ? 'bg-emerald-500 text-white'
                      : status === 'current'
                        ? 'bg-indigo-600 text-white ring-4 ring-indigo-500/20'
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
                      ? 'text-indigo-600 dark:text-indigo-400'
                      : status === 'completed'
                        ? 'text-neutral-900 dark:text-white'
                        : 'text-neutral-400'
                  )}>
                    {t(step.labelKey)}
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
              {t('inmobiliaria.import.wizard.mobileProgress', {
                current: currentStep,
                total: TOTAL_STEPS,
                label: t(STEPS[currentStep - 1]?.labelKey),
              })}
            </span>
            <span className="text-sm text-neutral-500">{Math.round((currentStep / TOTAL_STEPS) * 100)}%</span>
          </div>
          <div className="h-2 bg-neutral-100 dark:bg-neutral-800 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-indigo-600"
              initial={false}
              animate={{ width: `${(currentStep / TOTAL_STEPS) * 100}%` }}
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
            className="px-4 py-2 rounded-xl text-neutral-600 dark:text-neutral-400 font-medium font-mono uppercase tracking-wide text-sm hover:text-neutral-900 dark:hover:text-white transition-colors"
          >
            {t('inmobiliaria.import.wizard.cancel')}
          </button>

          {/* Navigation Buttons */}
          <div className="flex items-center gap-3">
            {currentStep > 1 && (
              <button
                type="button"
                onClick={goToPreviousStep}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-neutral-200 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 font-medium font-mono uppercase tracking-wide text-sm hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
              >
                <CaretLeft className="w-4 h-4" />
                {t('inmobiliaria.import.wizard.previous')}
              </button>
            )}

            <button
              type="button"
              onClick={goToNextStep}
              disabled={!isStepValid}
              className={cn(
                'inline-flex items-center gap-2 px-5 py-2 rounded-xl font-medium transition-all font-mono uppercase tracking-wide text-sm',
                isStepValid
                  ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                  : 'bg-neutral-200 dark:bg-neutral-800 text-neutral-400 dark:text-neutral-500 cursor-not-allowed'
              )}
            >
              {t('inmobiliaria.import.wizard.next')}
              <CaretRight className="w-4 h-4" />
            </button>
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
                  className="px-4 py-2 rounded-xl border border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-400 font-medium font-mono uppercase tracking-wide text-sm hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                >
                  {t('inmobiliaria.import.wizard.cancelDialog.continueEditing')}
                </button>
                <button
                  onClick={confirmCancel}
                  className="px-4 py-2 rounded-xl bg-red-500 text-white uppercase tracking-wide font-mono font-medium hover:bg-red-600 transition-colors"
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
