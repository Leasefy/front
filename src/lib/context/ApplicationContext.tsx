'use client';

import {
  createContext,
  useContext,
  useCallback,
  useEffect,
  useState,
  useMemo,
  type ReactNode,
} from 'react';
import {
  Application,
  PersonalInfo,
  EmploymentInfo,
  IncomeInfo,
  ReferenceInfo,
  DocumentInfo,
  CoSignerInfo,
  createEmptyApplication,
  computeTotalIncome,
  computeAvailableForRent,
  WIZARD_STEPS,
  type ValidationResult,
} from '@/lib/types/application';
import {
  validateStep,
  getMissingFieldsList,
} from '@/lib/validation/applicationValidation';
import { StorageManager } from '@/lib/utils/storage';
import { contextLogger } from '@/lib/utils/logger';

// ============================================================================
// Local storage key
// ============================================================================

const STORAGE_KEY_PREFIX = 'arriendo-facil-application-';

function getStorageKey(propertyId: string): string {
  return `${STORAGE_KEY_PREFIX}${propertyId}`;
}

function createApplicationStorage(propertyId: string): StorageManager<Application> {
  return new StorageManager<Application>(getStorageKey(propertyId));
}

// ============================================================================
// Context types
// ============================================================================

interface ApplicationContextValue {
  // State
  application: Application;
  isLoading: boolean;
  isHydrated: boolean;

  // Navigation
  currentStep: number;
  totalSteps: number;
  canGoBack: boolean;
  canGoNext: boolean;
  goToStep: (step: number) => void;
  nextStep: () => void;
  prevStep: () => void;

  // Section updates
  updatePersonal: (data: Partial<PersonalInfo>) => void;
  updateEmployment: (data: Partial<EmploymentInfo>) => void;
  updateIncome: (data: Partial<IncomeInfo>) => void;
  updateReferences: (data: Partial<ReferenceInfo>) => void;
  updateDocuments: (data: Partial<DocumentInfo>) => void;

  // Co-signer
  setHasCoSigner: (value: boolean) => void;
  updateCoSigner: (data: Partial<CoSignerInfo>) => void;

  // Terms acceptance
  acceptTerms: boolean;
  setAcceptTerms: (value: boolean) => void;
  authorizeVerification: boolean;
  setAuthorizeVerification: (value: boolean) => void;
  canSubmit: boolean;

  // Actions
  clearApplication: () => void;
  submitApplication: () => Promise<void>;

  // Computed values
  completedSteps: number[];
  isStepCompleted: (step: number) => boolean;

  // Step validation
  validateCurrentStep: () => ValidationResult;
  currentStepValidation: ValidationResult;
  currentStepMissingFields: string[];
  attemptedAdvance: boolean;
  setAttemptedAdvance: (value: boolean) => void;
  tryAdvanceStep: () => boolean;
}

// ============================================================================
// Context
// ============================================================================

const ApplicationContext = createContext<ApplicationContextValue | null>(null);

// ============================================================================
// Provider props
// ============================================================================

interface ApplicationProviderProps {
  propertyId: string;
  children: ReactNode;
  initialName?: string;
  initialEmail?: string;
}

// ============================================================================
// Provider component
// ============================================================================

export function ApplicationProvider({
  propertyId,
  children,
  initialName,
  initialEmail,
}: ApplicationProviderProps) {
  const [application, setApplication] = useState<Application>(() => {
    const emptyApp = createEmptyApplication(propertyId);
    // Pre-fill name and email if provided from lead capture
    if (initialName || initialEmail) {
      emptyApp.personal.fullName = initialName || '';
      emptyApp.personal.email = initialEmail || '';
    }
    return emptyApp;
  });
  const [isHydrated, setIsHydrated] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [authorizeVerification, setAuthorizeVerification] = useState(false);
  const [attemptedAdvance, setAttemptedAdvance] = useState(false);

  const totalSteps = WIZARD_STEPS.length;

  // ========================================================================
  // Load from localStorage on mount
  // ========================================================================

  useEffect(() => {
    const storage = createApplicationStorage(propertyId);
    const stored = storage.get({
      suppressErrors: true, // Silently fail for parse errors
      onError: (error) => {
        contextLogger.error('Failed to load application from localStorage', error);
      },
    });

    if (stored && stored.propertyId === propertyId) {
      setApplication(stored);
    }

    setIsHydrated(true);
  }, [propertyId]);

  // ========================================================================
  // Save to localStorage on changes (after hydration)
  // ========================================================================

  useEffect(() => {
    if (!isHydrated) return;

    const storage = createApplicationStorage(propertyId);
    // Don't save File objects to localStorage (they can't be serialized)
    const toSave = {
      ...application,
      documents: sanitizeDocumentsForStorage(application.documents),
      updatedAt: new Date().toISOString(),
    };

    storage.set(toSave, {
      onError: (error) => {
        contextLogger.error('Failed to save application to localStorage', error);
      },
    });
  }, [application, isHydrated, propertyId]);

  // ========================================================================
  // Navigation helpers
  // ========================================================================

  const currentStep = application.currentStep;
  const canGoBack = currentStep > 1;
  const canGoNext = currentStep < totalSteps;

  const goToStep = useCallback((step: number) => {
    if (step >= 1 && step <= totalSteps) {
      setApplication((prev) => ({
        ...prev,
        currentStep: step,
        updatedAt: new Date().toISOString(),
      }));
    }
  }, [totalSteps]);

  const nextStep = useCallback(() => {
    setApplication((prev) => {
      const next = Math.min(prev.currentStep + 1, totalSteps);
      return {
        ...prev,
        currentStep: next,
        updatedAt: new Date().toISOString(),
      };
    });
  }, [totalSteps]);

  const prevStep = useCallback(() => {
    setApplication((prev) => {
      const previous = Math.max(prev.currentStep - 1, 1);
      return {
        ...prev,
        currentStep: previous,
        updatedAt: new Date().toISOString(),
      };
    });
  }, []);

  // ========================================================================
  // Section update handlers
  // ========================================================================

  const updatePersonal = useCallback((data: Partial<PersonalInfo>) => {
    setApplication((prev) => ({
      ...prev,
      personal: { ...prev.personal, ...data },
      updatedAt: new Date().toISOString(),
    }));
  }, []);

  const updateEmployment = useCallback((data: Partial<EmploymentInfo>) => {
    setApplication((prev) => ({
      ...prev,
      employment: { ...prev.employment, ...data },
      updatedAt: new Date().toISOString(),
    }));
  }, []);

  const updateIncome = useCallback((data: Partial<IncomeInfo>) => {
    setApplication((prev) => {
      const newIncome = { ...prev.income, ...data };
      // Auto-compute totals
      newIncome.totalMonthlyIncome = computeTotalIncome(newIncome);
      newIncome.availableForRent = computeAvailableForRent(newIncome);
      return {
        ...prev,
        income: newIncome,
        updatedAt: new Date().toISOString(),
      };
    });
  }, []);

  const updateReferences = useCallback((data: Partial<ReferenceInfo>) => {
    setApplication((prev) => ({
      ...prev,
      references: { ...prev.references, ...data },
      updatedAt: new Date().toISOString(),
    }));
  }, []);

  const updateDocuments = useCallback((data: Partial<DocumentInfo>) => {
    setApplication((prev) => ({
      ...prev,
      documents: { ...prev.documents, ...data },
      updatedAt: new Date().toISOString(),
    }));
  }, []);

  // ========================================================================
  // Co-signer handlers
  // ========================================================================

  const setHasCoSigner = useCallback((value: boolean) => {
    setApplication((prev) => ({
      ...prev,
      hasCoSigner: value,
      coSigner: value ? prev.coSigner || { personal: {}, employment: {}, income: {} } : undefined,
      updatedAt: new Date().toISOString(),
    }));
  }, []);

  const updateCoSigner = useCallback((data: Partial<CoSignerInfo>) => {
    setApplication((prev) => ({
      ...prev,
      coSigner: prev.coSigner
        ? {
            personal: { ...prev.coSigner.personal, ...data.personal },
            employment: { ...prev.coSigner.employment, ...data.employment },
            income: { ...prev.coSigner.income, ...data.income },
          }
        : { personal: data.personal || {}, employment: data.employment || {}, income: data.income || {} },
      updatedAt: new Date().toISOString(),
    }));
  }, []);

  // ========================================================================
  // Actions
  // ========================================================================

  const clearApplication = useCallback(() => {
    const storage = createApplicationStorage(propertyId);
    storage.remove({
      onError: (error) => {
        contextLogger.error('Failed to clear application from localStorage', error);
      },
    });
    setApplication(createEmptyApplication(propertyId));
  }, [propertyId]);

  const submitApplication = useCallback(async () => {
    setIsLoading(true);
    try {
      // In frontend-only mode, simulate submission
      await new Promise((resolve) => setTimeout(resolve, 1500));

      setApplication((prev) => ({
        ...prev,
        status: 'submitted',
        updatedAt: new Date().toISOString(),
      }));

      // Clear from localStorage after successful submission
      const storage = createApplicationStorage(propertyId);
      storage.remove({
        onError: (error) => {
          contextLogger.error('Failed to clear application from localStorage after submission', error);
        },
      });
    } finally {
      setIsLoading(false);
    }
  }, [propertyId]);

  // ========================================================================
  // Computed: completed steps
  // ========================================================================

  const completedSteps = getCompletedSteps(application);

  const isStepCompleted = useCallback(
    (step: number) => completedSteps.includes(step),
    [completedSteps]
  );

  // ========================================================================
  // Step validation
  // ========================================================================

  const validateCurrentStep = useCallback((): ValidationResult => {
    return validateStep(
      application.currentStep,
      {
        personal: application.personal,
        employment: application.employment,
        income: application.income,
        references: application.references,
        documents: application.documents,
      },
      { acceptTerms, authorizeVerification }
    );
  }, [application, acceptTerms, authorizeVerification]);

  const currentStepValidation = useMemo(() => validateCurrentStep(), [validateCurrentStep]);

  const currentStepMissingFields = useMemo(() => {
    return getMissingFieldsList(application.currentStep, currentStepValidation.errors);
  }, [application.currentStep, currentStepValidation.errors]);

  const tryAdvanceStep = useCallback((): boolean => {
    const validation = validateCurrentStep();
    if (validation.isValid) {
      setAttemptedAdvance(false);
      nextStep();
      return true;
    } else {
      setAttemptedAdvance(true);
      return false;
    }
  }, [validateCurrentStep, nextStep]);

  // Reset attemptedAdvance when changing steps
  useEffect(() => {
    setAttemptedAdvance(false);
  }, [application.currentStep]);

  // ========================================================================
  // Computed: can submit (all steps complete + terms accepted)
  // ========================================================================

  const canSubmit =
    completedSteps.length >= 5 && acceptTerms && authorizeVerification;

  // ========================================================================
  // Context value
  // ========================================================================

  const value: ApplicationContextValue = {
    application,
    isLoading,
    isHydrated,

    currentStep,
    totalSteps,
    canGoBack,
    canGoNext,
    goToStep,
    nextStep,
    prevStep,

    updatePersonal,
    updateEmployment,
    updateIncome,
    updateReferences,
    updateDocuments,

    setHasCoSigner,
    updateCoSigner,

    acceptTerms,
    setAcceptTerms,
    authorizeVerification,
    setAuthorizeVerification,
    canSubmit,

    clearApplication,
    submitApplication,

    completedSteps,
    isStepCompleted,

    validateCurrentStep,
    currentStepValidation,
    currentStepMissingFields,
    attemptedAdvance,
    setAttemptedAdvance,
    tryAdvanceStep,
  };

  return (
    <ApplicationContext.Provider value={value}>
      {children}
    </ApplicationContext.Provider>
  );
}

// ============================================================================
// Hook
// ============================================================================

export function useApplication(): ApplicationContextValue {
  const context = useContext(ApplicationContext);
  if (!context) {
    throw new Error('useApplication must be used within an ApplicationProvider');
  }
  return context;
}

// ============================================================================
// Helper functions
// ============================================================================

/**
 * Remove File objects from documents for localStorage storage
 */
function sanitizeDocumentsForStorage(
  documents: Partial<DocumentInfo>
): Partial<DocumentInfo> {
  const sanitized: Partial<DocumentInfo> = {};

  if (documents.idDocument) {
    sanitized.idDocument = {
      file: null,
      fileName: documents.idDocument.fileName,
      uploadedAt: documents.idDocument.uploadedAt,
    };
  }
  if (documents.incomeProof) {
    sanitized.incomeProof = {
      file: null,
      fileName: documents.incomeProof.fileName,
      uploadedAt: documents.incomeProof.uploadedAt,
    };
  }
  if (documents.employmentLetter) {
    sanitized.employmentLetter = {
      file: null,
      fileName: documents.employmentLetter.fileName,
      uploadedAt: documents.employmentLetter.uploadedAt,
    };
  }
  if (documents.bankStatements) {
    sanitized.bankStatements = {
      file: null,
      fileName: documents.bankStatements.fileName,
      uploadedAt: documents.bankStatements.uploadedAt,
    };
  }
  if (documents.creditReport) {
    sanitized.creditReport = {
      file: null,
      fileName: documents.creditReport.fileName,
      uploadedAt: documents.creditReport.uploadedAt,
    };
  }

  return sanitized;
}

/**
 * Determine which steps have been started/completed
 * For MVP, we consider a step completed if it has some data
 */
function getCompletedSteps(application: Application): number[] {
  const completed: number[] = [];

  // Step 1: Personal - has at least name and document
  if (
    application.personal.fullName &&
    application.personal.documentNumber
  ) {
    completed.push(1);
  }

  // Step 2: Employment - has employment status
  if (application.employment.employmentStatus) {
    completed.push(2);
  }

  // Step 3: Income - has salary info
  if (
    application.income.monthlySalary !== undefined &&
    application.income.monthlySalary > 0
  ) {
    completed.push(3);
  }

  // Step 4: References - has at least one reference
  const refs = application.references;
  if (
    (refs.previousLandlords && refs.previousLandlords.length > 0) ||
    (refs.personalReferences && refs.personalReferences.length > 0)
  ) {
    completed.push(4);
  }

  // Step 5: Documents - has ID document
  if (
    application.documents.idDocument?.fileName ||
    application.documents.idDocument?.file
  ) {
    completed.push(5);
  }

  // Step 6: Review - all previous steps completed
  if (completed.length === 5) {
    completed.push(6);
  }

  return completed;
}
