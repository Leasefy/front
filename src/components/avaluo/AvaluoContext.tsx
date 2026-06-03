'use client';

import {
  createContext,
  useCallback,
  useContext,
  useState,
  useMemo,
  type ReactNode,
} from 'react';
import { useRouter } from 'next/navigation';
import {
  type AvaluoFormData,
  createEmptyAvaluoFormData,
} from '@/lib/types/avaluo';
import { submitIntake } from '@/lib/api/avaluo.service';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const TOTAL_STEPS = 4;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// ---------------------------------------------------------------------------
// Context value type
// ---------------------------------------------------------------------------

interface AvaluoContextValue {
  // Form data
  formData: AvaluoFormData;
  updateFormData: (partial: Partial<AvaluoFormData>) => void;

  // Navigation
  currentStep: number;
  totalSteps: number;
  nextStep: () => void;
  prevStep: () => void;
  goToStep: (n: number) => void;

  // Validation
  isStepValid: (step: number) => boolean;
  canProceed: boolean;
  completedSteps: number[];

  // Submission
  isSubmitting: boolean;
  submitError: string | null;
  submitAvaluo: () => Promise<void>;
}

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

const AvaluoContext = createContext<AvaluoContextValue | null>(null);

// ---------------------------------------------------------------------------
// Provider props
// ---------------------------------------------------------------------------

interface AvaluoProviderProps {
  children: ReactNode;
  initialEmail?: string;
}

// ---------------------------------------------------------------------------
// Provider component
// ---------------------------------------------------------------------------

export function AvaluoProvider({ children, initialEmail }: AvaluoProviderProps) {
  const router = useRouter();

  const [formData, setFormData] = useState<AvaluoFormData>(() =>
    createEmptyAvaluoFormData(initialEmail)
  );
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // ──────────────────────────────────────────────────────────────────────────
  // Form data updater — shallow merge
  // ──────────────────────────────────────────────────────────────────────────

  const updateFormData = useCallback((partial: Partial<AvaluoFormData>) => {
    setFormData((prev) => ({ ...prev, ...partial }));
  }, []);

  // ──────────────────────────────────────────────────────────────────────────
  // Navigation — clamped to 1..TOTAL_STEPS
  // ──────────────────────────────────────────────────────────────────────────

  const nextStep = useCallback(() => {
    setCurrentStep((prev) => Math.min(prev + 1, TOTAL_STEPS));
  }, []);

  const prevStep = useCallback(() => {
    setCurrentStep((prev) => Math.max(prev - 1, 1));
  }, []);

  const goToStep = useCallback((n: number) => {
    setCurrentStep(Math.max(1, Math.min(n, TOTAL_STEPS)));
  }, []);

  // ──────────────────────────────────────────────────────────────────────────
  // Validation
  // ──────────────────────────────────────────────────────────────────────────

  const isStepValid = useCallback(
    (step: number): boolean => {
      switch (step) {
        case 1:
          return (
            !!formData.address &&
            !!formData.city &&
            !!formData.propertyType &&
            formData.areaM2 !== '' &&
            Number(formData.areaM2) > 0
          );
        case 2:
          return (
            EMAIL_RE.test(formData.identity) && formData.purposeAvaluo === true
          );
        case 3:
          // Photos are optional — always valid
          return true;
        case 4:
          // Confirmation — always valid (user reviews before submitting)
          return true;
        default:
          return false;
      }
    },
    [formData]
  );

  const canProceed = useMemo(
    () => isStepValid(currentStep),
    [isStepValid, currentStep]
  );

  const completedSteps = useMemo(() => {
    const completed: number[] = [];
    for (let i = 1; i <= TOTAL_STEPS; i++) {
      if (isStepValid(i)) completed.push(i);
    }
    return completed;
  }, [isStepValid]);

  // ──────────────────────────────────────────────────────────────────────────
  // Submission
  // ──────────────────────────────────────────────────────────────────────────

  const submitAvaluo = useCallback(async () => {
    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const { id } = await submitIntake(formData);
      router.push(`/avaluo/estado/${id}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : '';
      let friendlyMessage: string;

      if (msg === 'rate_limit') {
        friendlyMessage =
          'Demasiadas solicitudes. Por favor, intentá de nuevo en unos minutos.';
      } else if (msg === 'validation_error') {
        friendlyMessage = 'Revisá los datos del formulario.';
      } else if (msg === 'service_unavailable') {
        friendlyMessage =
          'El servicio no está disponible en este momento. Intentá más tarde.';
      } else {
        friendlyMessage =
          'No pudimos enviar tu solicitud. Intentá de nuevo.';
      }

      setSubmitError(friendlyMessage);
    } finally {
      setIsSubmitting(false);
    }
  }, [formData, router]);

  // ──────────────────────────────────────────────────────────────────────────
  // Context value
  // ──────────────────────────────────────────────────────────────────────────

  const value: AvaluoContextValue = {
    formData,
    updateFormData,
    currentStep,
    totalSteps: TOTAL_STEPS,
    nextStep,
    prevStep,
    goToStep,
    isStepValid,
    canProceed,
    completedSteps,
    isSubmitting,
    submitError,
    submitAvaluo,
  };

  return (
    <AvaluoContext.Provider value={value}>{children}</AvaluoContext.Provider>
  );
}

// ---------------------------------------------------------------------------
// Hook — throws if used outside provider
// ---------------------------------------------------------------------------

export function useAvaluo(): AvaluoContextValue {
  const context = useContext(AvaluoContext);
  if (!context) {
    throw new Error('useAvaluo must be used within an AvaluoProvider');
  }
  return context;
}
