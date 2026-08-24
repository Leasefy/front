/**
 * Application and scoring types for the rental application wizard
 * Used throughout the wizard flow for form state and data submission
 */

// ============================================================================
// Constants for dropdown options
// ============================================================================

export const DOCUMENT_TYPES = [
  { value: 'cc', label: 'Cedula de Ciudadania' },
  { value: 'ce', label: 'Cedula de Extranjeria' },
  { value: 'passport', label: 'Pasaporte' },
] as const;

export const MARITAL_STATUS_OPTIONS = [
  { value: 'single', label: 'Soltero/a' },
  { value: 'married', label: 'Casado/a' },
  { value: 'divorced', label: 'Divorciado/a' },
  { value: 'widowed', label: 'Viudo/a' },
] as const;

export const EMPLOYMENT_STATUS_OPTIONS = [
  { value: 'employed', label: 'Empleado' },
  { value: 'self-employed', label: 'Independiente' },
  { value: 'unemployed', label: 'Desempleado' },
  { value: 'retired', label: 'Pensionado' },
  { value: 'student', label: 'Estudiante' },
] as const;

export const CONTRACT_TYPE_OPTIONS = [
  { value: 'indefinite', label: 'Termino indefinido' },
  { value: 'fixed-term', label: 'Termino fijo' },
  { value: 'contractor', label: 'Prestacion de servicios' },
  { value: 'freelance', label: 'Freelance' },
] as const;

export const INDUSTRY_OPTIONS = [
  { value: 'technology', label: 'Tecnologia' },
  { value: 'finance', label: 'Finanzas y Banca' },
  { value: 'healthcare', label: 'Salud' },
  { value: 'education', label: 'Educacion' },
  { value: 'retail', label: 'Comercio' },
  { value: 'manufacturing', label: 'Manufactura' },
  { value: 'construction', label: 'Construccion' },
  { value: 'hospitality', label: 'Hoteleria y Turismo' },
  { value: 'government', label: 'Gobierno' },
  { value: 'legal', label: 'Legal' },
  { value: 'other', label: 'Otro' },
] as const;

// ============================================================================
// Type definitions
// ============================================================================

export type DocumentType = 'cc' | 'ce' | 'passport';
export type MaritalStatus = 'single' | 'married' | 'divorced' | 'widowed';
export type EmploymentStatus = 'employed' | 'self-employed' | 'unemployed' | 'retired' | 'student';
export type ContractType = 'indefinite' | 'fixed-term' | 'contractor' | 'freelance';
export type ApplicationStatus = 'draft' | 'submitted' | 'under_review' | 'approved' | 'rejected';

// ============================================================================
// Personal information (Step 1)
// ============================================================================

export interface PersonalInfo {
  fullName: string;
  documentType: DocumentType;
  documentNumber: string;
  dateOfBirth: string;
  phone: string;
  email: string;
  currentAddress: string;
  timeAtCurrentAddress: number; // months (stability indicator)
  maritalStatus: MaritalStatus;
  dependents: number;
}

// ============================================================================
// Employment information (Step 2)
// ============================================================================

export interface EmploymentInfo {
  employmentStatus: EmploymentStatus;
  companyName?: string;
}

// ============================================================================
// Income information (Step 3)
// ============================================================================

export interface IncomeInfo {
  monthlySalary: number;
  additionalIncome: number;
  additionalIncomeSource?: string;
  totalMonthlyIncome: number; // computed
  monthlyObligations: number; // debts, credits, other rents
  availableForRent: number; // computed: income - obligations
}

// ============================================================================
// Reference information (Step 4)
// ============================================================================

export interface PreviousLandlordReference {
  name: string;
  phone: string;
  address: string;
  duration: number; // months
  relationship: string;
}

export interface EmploymentReference {
  name: string;
  phone: string;
  company: string;
  relationship: string;
}

export interface ReferenceInfo {
  previousLandlords: PreviousLandlordReference[];
  employmentReferences: EmploymentReference[];
}

// ============================================================================
// Document information (Step 5)
// ============================================================================

export interface DocumentUpload {
  file: File | null;
  fileName?: string;
  uploadedAt?: string;
  /**
   * Backend document id — present when the doc already lives on the server.
   * Used to enable "delete" against DELETE /applications/:id/documents/:id
   * without needing a re-upload.
   */
  remoteId?: string;
  /**
   * El documento viene de una postulación ANTERIOR de esta misma persona: existe
   * en el servidor, pero todavía no en ESTA postulación. Lo adjunta de verdad
   * `POST /applications/:id/documents/reuse`, después de crearla.
   *
   * Distinto de `remoteId`, que significa "ya es de esta postulación". La
   * diferencia importa: sin la marca, un `fileName` sin `File` se lee como un
   * archivo perdido al serializar a localStorage y el envío se bloquea pidiendo
   * adjuntar de nuevo lo que la persona ya nos dio.
   */
  reusable?: boolean;
}

export interface DocumentInfo {
  idDocument: DocumentUpload | null;
  /** Required — extracto bancario (últimos 3 meses) */
  bankStatement: DocumentUpload | null;
}

// ============================================================================
// Co-signer information
// ============================================================================

export interface CoSignerInfo {
  personal: Partial<PersonalInfo>;
  employment: Partial<EmploymentInfo>;
  income: Partial<IncomeInfo>;
}

// ============================================================================
// Full application
// ============================================================================

export interface Application {
  id: string;
  propertyId: string;
  status: ApplicationStatus;
  currentStep: number;
  personal: Partial<PersonalInfo>;
  employment: Partial<EmploymentInfo>;
  income: Partial<IncomeInfo>;
  references: Partial<ReferenceInfo>;
  documents: Partial<DocumentInfo>;
  hasCoSigner: boolean;
  coSigner?: CoSignerInfo;
  /** Steps the user explicitly advanced through (a step never counts as
   *  completed from mere data presence — prefilled data must be reviewed). */
  confirmedSteps?: number[];
  /** Set when data was prefilled from a previous application — drives the
   *  "revisa tus datos" notice in the wizard. */
  prefilledAt?: string;
  /** True once the user dismissed the prefill notice. */
  prefillNoticeDismissed?: boolean;
  /**
   * Identidad derivada del estudio de pre-scoring vigente
   * (`.orchestration/tasks/T-0001-prescoring-prefill/contract.md` §3.2).
   * Sólo para correlación/telemetría — NUNCA se manda de vuelta en un body.
   */
  preScoringOrderId?: string;
  /** Campos de `personal` que vienen del estudio y el front debe bloquear. */
  preScoringLockedFields?: Array<'fullName' | 'documentType' | 'documentNumber' | 'email'>;
  /** true cuando la identidad de este envío viene del estudio de pre-scoring. */
  preScoringIdentityApplied?: boolean;
  /** true cuando (además o en cambio) se precargaron datos de una postulación anterior. */
  previousApplicationDataApplied?: boolean;
  createdAt: string;
  updatedAt: string;
}

// ============================================================================
// Wizard step configuration
// ============================================================================

export const WIZARD_STEPS = [
  { id: 1, key: 'personal', label: 'Personal', description: 'Datos personales' },
  { id: 2, key: 'employment', label: 'Empleo', description: 'Información laboral' },
  { id: 3, key: 'income', label: 'Ingresos', description: 'Capacidad de pago' },
  { id: 4, key: 'references', label: 'Referencias', description: 'Referencias personales' },
  { id: 5, key: 'documents', label: 'Documentos', description: 'Documentos requeridos' },
  { id: 6, key: 'review', label: 'Revisión', description: 'Revisar y enviar' },
] as const;

export type WizardStepKey = typeof WIZARD_STEPS[number]['key'];

// ============================================================================
// Validation helper types
// ============================================================================

export interface ValidationResult {
  isValid: boolean;
  errors: Record<string, string>;
}

export interface StepValidation {
  personal: (data: Partial<PersonalInfo>) => ValidationResult;
  employment: (data: Partial<EmploymentInfo>) => ValidationResult;
  income: (data: Partial<IncomeInfo>) => ValidationResult;
  references: (data: Partial<ReferenceInfo>) => ValidationResult;
  documents: (data: Partial<DocumentInfo>) => ValidationResult;
}

// ============================================================================
// Helper functions
// ============================================================================

/**
 * Create a new empty application
 */
export function createEmptyApplication(propertyId: string): Application {
  return {
    id: `app-${Date.now()}`,
    propertyId,
    status: 'draft',
    currentStep: 1,
    personal: {},
    employment: {},
    income: {},
    references: {
      previousLandlords: [],
      employmentReferences: [],
    },
    documents: {},
    hasCoSigner: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Compute total monthly income
 */
export function computeTotalIncome(income: Partial<IncomeInfo>): number {
  const salary = income.monthlySalary || 0;
  const additional = income.additionalIncome || 0;
  return salary + additional;
}

/**
 * Compute available for rent
 */
export function computeAvailableForRent(income: Partial<IncomeInfo>): number {
  const total = computeTotalIncome(income);
  const obligations = income.monthlyObligations || 0;
  return total - obligations;
}
