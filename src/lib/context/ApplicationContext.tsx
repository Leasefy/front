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
import { applicationsApi } from '@/lib/api/applications.service';
import { getAccessToken } from '@/lib/api/client';
import { getConsentText, type ConsentTextResponse } from '@/lib/api/legal.service';
import type { ApplicationPrefillData } from '@/lib/api/applications.types';

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
  mode: 'create' | 'update';
  /** Present only when mode === 'update' — the backend id of the application being edited */
  existingApplicationId?: string;

  // Compass
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

  // Habeas-data consent text (fetched once on mount)
  consentText: ConsentTextResponse | null;
  authorizationVersion: string | undefined;

  // Actions
  clearApplication: () => void;
  submitApplication: () => Promise<void>;
  submissionError: string | null;
  isGuestSubmission: boolean;

  // Computed values
  completedSteps: number[];
  isStepCompleted: (step: number) => boolean;

  // Prefill disclosure: true when data was prefilled from a previous
  // application and the user has not dismissed the notice yet
  showPrefillNotice: boolean;
  dismissPrefillNotice: () => void;

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
  // Optional so the classic JSX runtime (children passed positionally, not in
  // the props object) typechecks when the provider is rendered with children.
  children?: ReactNode;
  initialName?: string;
  initialEmail?: string;
  // Agent attribution (from shareable links)
  agentCode?: string;
  linkCode?: string;
  // Update mode (NEEDS_INFO flow)
  mode?: 'create' | 'update';
  existingApplicationId?: string;
  initialApplication?: Application;
}

// ============================================================================
// Provider component
// ============================================================================

export function ApplicationProvider({
  propertyId,
  children,
  initialName,
  initialEmail,
  agentCode,
  linkCode,
  mode = 'create',
  existingApplicationId,
  initialApplication,
}: ApplicationProviderProps) {
  const [application, setApplication] = useState<Application>(() => {
    // Update mode: start from the existing application data. Its steps were
    // genuinely completed by the user on first submission, so seed them as
    // confirmed from data presence (the application already passed validation).
    if (mode === 'update' && initialApplication) {
      return {
        ...initialApplication,
        currentStep: 1,
        confirmedSteps:
          initialApplication.confirmedSteps ?? getDataCompleteSteps(initialApplication),
      };
    }
    const emptyApp = createEmptyApplication(propertyId);
    // Pre-fill name and email if provided from lead capture
    if (initialName || initialEmail) {
      emptyApp.personal.fullName = initialName || '';
      emptyApp.personal.email = initialEmail || '';
    }
    // Store agent attribution if present
    if (agentCode || linkCode) {
      (emptyApp as Application & { agentCode?: string; linkCode?: string }).agentCode = agentCode;
      (emptyApp as Application & { agentCode?: string; linkCode?: string }).linkCode = linkCode;
    }
    return emptyApp;
  });
  const [isHydrated, setIsHydrated] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  const [isGuestSubmission, setIsGuestSubmission] = useState(false);
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [authorizeVerification, setAuthorizeVerification] = useState(false);
  const [attemptedAdvance, setAttemptedAdvance] = useState(false);
  const [consentText, setConsentText] = useState<ConsentTextResponse | null>(null);
  const [authorizationVersion, setAuthorizationVersion] = useState<string | undefined>(undefined);

  const totalSteps = WIZARD_STEPS.length;

  // ========================================================================
  // Load from localStorage on mount (skip in update mode — data comes from backend)
  // ========================================================================

  useEffect(() => {
    if (mode === 'update') {
      setIsHydrated(true);
      return;
    }

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
  }, [propertyId, mode]);

  // ========================================================================
  // FloppyDisk to localStorage on changes (after hydration, skip in update mode)
  // ========================================================================

  useEffect(() => {
    if (!isHydrated || mode === 'update') return;

    const storage = createApplicationStorage(propertyId);
    // Don't save File objects to localStorage (they can't be serialized)
    const toFloppyDisk = {
      ...application,
      documents: sanitizeDocumentsForStorage(application.documents),
      updatedAt: new Date().toISOString(),
    };

    storage.set(toFloppyDisk, {
      onError: (error) => {
        contextLogger.error('Failed to save application to localStorage', error);
      },
    });
  }, [application, isHydrated, propertyId]);

  // ========================================================================
  // Fetch habeas-data consent text once on mount (graceful fallback on failure)
  // ========================================================================

  useEffect(() => {
    let cancelled = false;
    getConsentText()
      .then((data) => {
        if (!cancelled) {
          setConsentText(data);
          setAuthorizationVersion(data.version);
        }
      })
      .catch(() => {
        // Endpoint may not be deployed yet or is temporarily down.
        // Graceful fallback: leave consentText null and authorizationVersion undefined.
        // The UI will fall back to static copy; the submit payload omits authorizationVersion.
      });
    return () => { cancelled = true; };
  }, []);

  // ========================================================================
  // Prefill from previous application (create mode + authenticated only)
  // ========================================================================
  //
  // Pristine rule: a locally saved draft is considered dirty if it has a
  // non-empty `personal.fullName`. That field is the first thing a tenant
  // types and serves as a reliable signal that the user already started
  // filling the form. When dirty, we skip prefill entirely to never
  // overwrite the user's own input.
  //
  // Race-condition guard: we re-read the current `application` state at the
  // moment the response arrives (via the functional-update form of
  // setApplication). If `personal.fullName` is already set by then (e.g. the
  // user typed while the fetch was in flight), we silently discard the prefill.

  useEffect(() => {
    if (mode !== 'create') return;
    if (!getAccessToken()) return;

    let cancelled = false;

    applicationsApi.getPrefill()
      .then((prefill) => {
        if (cancelled) return;
        if (!prefill.hasPreviousApplication) return;

        const data = prefill as ApplicationPrefillData;

        setApplication((prev) => {
          // If the state is no longer pristine (user typed something), bail out.
          if (prev.personal.fullName) return prev;

          return {
            ...prev,
            personal: {
              ...prev.personal,
              fullName: data.fullName ?? prev.personal.fullName ?? '',
              documentType: (data.documentType as Application['personal']['documentType']) ?? prev.personal.documentType,
              documentNumber: data.documentNumber ?? prev.personal.documentNumber ?? '',
              dateOfBirth: data.dateOfBirth ?? prev.personal.dateOfBirth ?? '',
              phone: data.phone ?? prev.personal.phone ?? '',
              email: data.email ?? prev.personal.email ?? '',
              currentAddress: data.currentAddress ?? prev.personal.currentAddress ?? '',
              timeAtCurrentAddress: data.timeAtCurrentAddress ?? prev.personal.timeAtCurrentAddress,
              maritalStatus: (data.maritalStatus as Application['personal']['maritalStatus']) ?? prev.personal.maritalStatus,
              dependents: data.dependents ?? prev.personal.dependents,
            },
            employment: {
              ...prev.employment,
              employmentStatus: (data.employmentStatus as Application['employment']['employmentStatus']) ?? prev.employment.employmentStatus,
              companyName: data.companyName ?? prev.employment.companyName ?? '',
              industry: data.industry ?? prev.employment.industry ?? '',
              position: data.position ?? prev.employment.position ?? '',
              contractType: (data.contractType as Application['employment']['contractType']) ?? prev.employment.contractType,
              timeAtJob: data.timeAtJob ?? prev.employment.timeAtJob,
              employerPhone: data.employerPhone ?? prev.employment.employerPhone ?? '',
              employerAddress: data.employerAddress ?? prev.employment.employerAddress ?? '',
            },
            income: {
              ...prev.income,
              monthlySalary: data.monthlySalary ?? prev.income.monthlySalary ?? 0,
              additionalIncome: data.additionalIncome ?? prev.income.additionalIncome ?? 0,
              additionalIncomeSource: data.additionalIncomeSource ?? prev.income.additionalIncomeSource ?? '',
              totalMonthlyIncome: data.totalMonthlyIncome ?? prev.income.totalMonthlyIncome ?? 0,
              monthlyObligations: data.monthlyObligations ?? prev.income.monthlyObligations ?? 0,
              availableForRent: data.availableForRent ?? prev.income.availableForRent ?? 0,
            },
            references: data.references ?? prev.references,
            hasCoSigner: data.hasCoSigner ?? prev.hasCoSigner,
            coSigner: (data.coSigner as unknown as Application['coSigner']) ?? prev.coSigner,
            // Prefilled data is a convenience, not a confirmation: steps stay
            // unconfirmed and the wizard shows a notice asking to review them.
            prefilledAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
        });
      })
      .catch(() => {
        // Prefill is best-effort: network errors or 4xx are silently swallowed.
        // The wizard continues with an empty form as if prefill was not available.
        contextLogger.warn('Prefill fetch failed — starting with empty form');
      });

    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, propertyId]);

  // ========================================================================
  // Compass helpers
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
    // Habeas-data: the backend requires authorizationVersion whenever consent is
    // true. If the legal text failed to load we cannot register a valid consent,
    // so we block the submit instead of sending a versionless true (backend 400).
    if (authorizeVerification && !authorizationVersion) {
      setSubmissionError(
        'No pudimos cargar el texto de autorización de datos. Recargá la página e intentá de nuevo.',
      );
      return;
    }

    // Stale-document guard (create mode only): if a slot has a fileName but no
    // File object the document was dropped during serialisation to localStorage.
    // Uploading is impossible without the File — block early with a clear message.
    // In update mode, fileName-without-file means the document already exists on
    // the server and skipping the upload is intentional, so the guard is skipped.
    if (mode !== 'update') {
      const docs = application.documents;
      const staleSlots = [
        docs.idDocument,
        docs.bankStatement,
        docs.incomeProof,
        docs.employmentLetter,
        docs.payStub,
        docs.creditReport,
      ];
      const hasStaleSlot = staleSlots.some((slot) => slot?.fileName && !slot?.file);
      if (hasStaleSlot) {
        setSubmissionError(
          'Algunos documentos se desconectaron al recargar la página. Volvé al paso de documentos y adjuntalos de nuevo.',
        );
        return;
      }
    }

    setIsLoading(true);
    setSubmissionError(null);

    const payload = {
      propertyId,
      // Personal
      fullName: application.personal.fullName,
      documentType: application.personal.documentType,
      documentNumber: application.personal.documentNumber,
      dateOfBirth: application.personal.dateOfBirth,
      phone: application.personal.phone,
      email: application.personal.email,
      currentAddress: application.personal.currentAddress,
      timeAtCurrentAddress: application.personal.timeAtCurrentAddress,
      maritalStatus: application.personal.maritalStatus,
      dependents: application.personal.dependents,
      // Employment
      employmentStatus: application.employment.employmentStatus,
      companyName: application.employment.companyName,
      industry: application.employment.industry,
      position: application.employment.position,
      contractType: application.employment.contractType,
      timeAtJob: application.employment.timeAtJob,
      employerPhone: application.employment.employerPhone,
      employerAddress: application.employment.employerAddress,
      // Income
      monthlySalary: application.income.monthlySalary,
      additionalIncome: application.income.additionalIncome,
      additionalIncomeSource: application.income.additionalIncomeSource,
      totalMonthlyIncome: application.income.totalMonthlyIncome,
      monthlyObligations: application.income.monthlyObligations,
      availableForRent: application.income.availableForRent,
      // References
      references: application.references as Record<string, unknown>,
      // Co-signer
      hasCoSigner: application.hasCoSigner,
      coSigner: application.coSigner as unknown as Record<string, unknown>,
      // Agent attribution
      agentCode: (application as Application & { agentCode?: string }).agentCode,
      linkCode: (application as Application & { linkCode?: string }).linkCode,
      // Habeas-data consent
      habeasDataConsent: authorizeVerification,
      ...(authorizationVersion ? { authorizationVersion } : {}),
    };

    try {
      const isAuthenticated = !!getAccessToken();

      let applicationId: string;

      if (mode === 'update' && existingApplicationId) {
        // Update mode: PATCH per-step (backend requires step-specific DTOs)
        applicationId = existingApplicationId;

        // Step 1 — Personal
        await applicationsApi.updateStep(existingApplicationId, 1, {
          fullName: application.personal.fullName,
          documentType: application.personal.documentType,
          documentNumber: application.personal.documentNumber,
          dateOfBirth: application.personal.dateOfBirth,
          phone: application.personal.phone,
          email: application.personal.email,
          currentAddress: application.personal.currentAddress,
          timeAtCurrentAddress: application.personal.timeAtCurrentAddress,
          maritalStatus: application.personal.maritalStatus,
          dependents: application.personal.dependents,
        });

        // Step 2 — Employment
        await applicationsApi.updateStep(existingApplicationId, 2, {
          employmentStatus: application.employment.employmentStatus,
          companyName: application.employment.companyName,
          industry: application.employment.industry,
          position: application.employment.position,
          contractType: application.employment.contractType,
          timeAtJob: application.employment.timeAtJob,
          employerPhone: application.employment.employerPhone,
          employerAddress: application.employment.employerAddress,
        });

        // Step 3 — Income
        await applicationsApi.updateStep(existingApplicationId, 3, {
          monthlySalary: application.income.monthlySalary,
          additionalIncome: application.income.additionalIncome,
          additionalIncomeSource: application.income.additionalIncomeSource,
          totalMonthlyIncome: application.income.totalMonthlyIncome,
          monthlyObligations: application.income.monthlyObligations,
          availableForRent: application.income.availableForRent,
        });

        // Step 4 — References
        await applicationsApi.updateStep(existingApplicationId, 4, {
          references: application.references as Record<string, unknown>,
        });

        // Upload any new documents — in update mode we do NOT silently swallow
        // upload errors. If an upload fails, the whole flow fails so we don't
        // notify the agency of a partial update.
        const docs = application.documents;
        const docEntries: Array<{ file: File | null | undefined; type: string }> = [
          { file: docs.idDocument?.file, type: 'ID_DOCUMENT' },
          { file: docs.bankStatement?.file, type: 'BANK_STATEMENT' },
          { file: docs.incomeProof?.file, type: 'INCOME_PROOF' },
          { file: docs.employmentLetter?.file, type: 'EMPLOYMENT_LETTER' },
          { file: docs.payStub?.file, type: 'PAY_STUB' },
          { file: docs.creditReport?.file, type: 'CREDIT_REPORT' },
        ];
        for (const { file, type } of docEntries) {
          if (file) {
            try {
              await applicationsApi.uploadDocument(existingApplicationId, file, type);
            } catch (uploadErr) {
              const msg = uploadErr instanceof Error ? uploadErr.message : 'Error subiendo documento';
              throw new Error(`No pudimos subir el documento "${type}". ${msg}`);
            }
          }
        }

        // Notify agency and mark ready — backend transitions NEEDS_INFO → UNDER_REVIEW
        await applicationsApi.respondToInfoRequest(
          existingApplicationId,
          'El solicitante actualizó su información y documentos.',
          true
        );
      } else if (isAuthenticated) {
        // 1a. Authenticated: create via authenticated endpoint
        const created = await applicationsApi.create(payload);
        applicationId = created.id;

        // Upload documents (only possible when authenticated)
        const docs = application.documents;
        const docEntries: Array<{ file: File | null | undefined; type: string }> = [
          { file: docs.idDocument?.file, type: 'ID_DOCUMENT' },
          { file: docs.bankStatement?.file, type: 'BANK_STATEMENT' },
          { file: docs.incomeProof?.file, type: 'INCOME_PROOF' },
          { file: docs.employmentLetter?.file, type: 'EMPLOYMENT_LETTER' },
          { file: docs.payStub?.file, type: 'PAY_STUB' },
          { file: docs.creditReport?.file, type: 'CREDIT_REPORT' },
        ];
        for (const { file, type } of docEntries) {
          if (file) {
            try {
              await applicationsApi.uploadDocument(created.id, file, type);
            } catch (uploadErr) {
              // Do NOT swallow: a failed upload must block the 'submitted' transition.
              // The outer catch maps this to setSubmissionError so the user can retry.
              // NOTE: the application row already exists from create() above, so a full
              // re-submit could 409; retry should re-run uploads only, not create.
              const msg = uploadErr instanceof Error ? uploadErr.message : 'Error subiendo documento';
              throw new Error(`No pudimos subir el documento "${type}". ${msg}`);
            }
          }
        }
      } else {
        // 1b. Guest: create via public endpoint — backend sends invite email.
        // NOTE: guest documents are NOT uploaded here. Upload requires Bearer auth,
        // which the guest only gains after accepting the invite email and creating
        // an account. The ConfirmationScreen reflects this (directs guests to email).
        const result = await applicationsApi.createGuest(payload);
        applicationId = result.applicationId;
        setIsGuestSubmission(true);
      }

      setApplication((prev) => ({
        ...prev,
        id: applicationId,
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
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al enviar la aplicación';
      setSubmissionError(message);
    } finally {
      setIsLoading(false);
    }
  }, [propertyId, application, authorizeVerification, authorizationVersion]);

  // ========================================================================
  // Computed: completed steps
  // ========================================================================

  const completedSteps = getCompletedSteps(application);

  const isStepCompleted = useCallback(
    (step: number) => completedSteps.includes(step),
    [completedSteps]
  );

  // ========================================================================
  // Prefill disclosure notice
  // ========================================================================

  const showPrefillNotice =
    mode === 'create' && !!application.prefilledAt && !application.prefillNoticeDismissed;

  const dismissPrefillNotice = useCallback(() => {
    setApplication((prev) => ({
      ...prev,
      prefillNoticeDismissed: true,
      updatedAt: new Date().toISOString(),
    }));
  }, []);

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
      // Advancing is the user's explicit confirmation of the current step —
      // record it together with the navigation so both persist atomically.
      setApplication((prev) => {
        const confirmed = prev.confirmedSteps ?? [];
        return {
          ...prev,
          confirmedSteps: confirmed.includes(prev.currentStep)
            ? confirmed
            : [...confirmed, prev.currentStep],
          currentStep: Math.min(prev.currentStep + 1, totalSteps),
          updatedAt: new Date().toISOString(),
        };
      });
      return true;
    } else {
      setAttemptedAdvance(true);
      return false;
    }
  }, [validateCurrentStep, totalSteps]);

  // Reset attemptedAdvance when changing steps
  useEffect(() => {
    setAttemptedAdvance(false);
  }, [application.currentStep]);

  // ========================================================================
  // Computed: can submit (all steps complete + terms accepted)
  // ========================================================================

  // authorizationVersion must be present whenever the user authorizes: the
  // backend rejects a consent without its version, so the legal text must have
  // loaded before submit is allowed.
  const canSubmit =
    completedSteps.length >= 5 &&
    acceptTerms &&
    authorizeVerification &&
    !!authorizationVersion;

  // ========================================================================
  // Context value
  // ========================================================================

  const value: ApplicationContextValue = {
    application,
    isLoading,
    isHydrated,
    mode,
    existingApplicationId,

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

    consentText,
    authorizationVersion,

    clearApplication,
    submitApplication,
    submissionError,
    isGuestSubmission,

    completedSteps,
    isStepCompleted,

    showPrefillNotice,
    dismissPrefillNotice,

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
  if (documents.bankStatement) {
    sanitized.bankStatement = {
      file: null,
      fileName: documents.bankStatement.fileName,
      uploadedAt: documents.bankStatement.uploadedAt,
    };
  }
  if (documents.payStub) {
    sanitized.payStub = {
      file: null,
      fileName: documents.payStub.fileName,
      uploadedAt: documents.payStub.uploadedAt,
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
 * Steps the wizard shows as completed: the user must have explicitly advanced
 * through the step (confirmedSteps) AND its data must still be present. Data
 * presence alone is NOT enough — prefilled data requires user review, so a
 * freshly prefilled wizard starts with zero completed steps.
 */
function getCompletedSteps(application: Application): number[] {
  const confirmed = application.confirmedSteps ?? [];
  const dataComplete = getDataCompleteSteps(application);
  const completed = dataComplete.filter((step) => step < 6 && confirmed.includes(step));

  // Step 6: Review - all previous steps confirmed with their data intact
  if (completed.length === 5) {
    completed.push(6);
  }

  return completed;
}

/**
 * Steps whose data is present (the pre-confirmation notion of "complete").
 * Used to seed confirmedSteps in update mode, where the data was genuinely
 * entered and validated by the user on first submission.
 */
function getDataCompleteSteps(application: Application): number[] {
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
