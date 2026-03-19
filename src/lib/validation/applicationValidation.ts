/**
 * Validation utilities for application wizard forms
 * Handles Colombian-specific formats and business rules
 */

import type {
  PersonalInfo,
  EmploymentInfo,
  IncomeInfo,
  ValidationResult,
  EmploymentStatus,
} from '@/lib/types/application';

// ============================================================================
// Helper functions
// ============================================================================

/**
 * Check if a date makes the person at least 18 years old
 */
export function isAdult(dateOfBirth: string): boolean {
  if (!dateOfBirth) return false;
  const birth = new Date(dateOfBirth);
  const today = new Date();
  const age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    return age - 1 >= 18;
  }
  return age >= 18;
}

/**
 * Validate Colombian phone number (starts with 3, 10 digits)
 */
export function isValidColombianPhone(phone: string): boolean {
  if (!phone) return false;
  const cleaned = phone.replace(/\D/g, '');
  return /^3\d{9}$/.test(cleaned);
}

/**
 * Validate Colombian document number (CC: 6-10 digits, CE: alphanumeric, Passport: alphanumeric)
 */
export function isValidDocument(documentNumber: string, documentType: string): boolean {
  if (!documentNumber) return false;
  const cleaned = documentNumber.trim();

  switch (documentType) {
    case 'cc':
      // CC: 6-10 digits only
      return /^\d{6,10}$/.test(cleaned);
    case 'ce':
      // CE: 6-10 alphanumeric characters
      return /^[A-Za-z0-9]{6,10}$/.test(cleaned);
    case 'passport':
      // Passport: 6-12 alphanumeric characters
      return /^[A-Za-z0-9]{6,12}$/.test(cleaned);
    default:
      return cleaned.length >= 6;
  }
}

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
  if (!email) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// ============================================================================
// Currency formatting helpers
// ============================================================================

/**
 * Parse a currency string to number
 * "$ 2.500.000" or "2500000" -> 2500000
 */
export function parseCurrency(value: string | number | undefined): number {
  if (typeof value === 'number') return value;
  if (!value) return 0;

  // Remove currency symbol, spaces, dots (thousand separators)
  const cleaned = value
    .toString()
    .replace(/[$\s.]/g, '')
    .replace(/,/g, ''); // Handle comma decimals if any

  const parsed = parseInt(cleaned, 10);
  return isNaN(parsed) ? 0 : parsed;
}

/**
 * Format number as Colombian currency input value
 * 2500000 -> "2.500.000"
 */
export function formatCurrencyInput(value: number | undefined): string {
  if (value === undefined || value === 0) return '';
  return value.toLocaleString('es-CL');
}

// ============================================================================
// Step 1: Personal Information Validation
// ============================================================================

export function validatePersonalStep(data: Partial<PersonalInfo>): ValidationResult {
  const errors: Record<string, string> = {};

  // Full name - required, min 3 characters
  if (!data.fullName || data.fullName.trim().length < 3) {
    errors.fullName = 'Nombre debe tener al menos 3 caracteres';
  }

  // Document type - required
  if (!data.documentType) {
    errors.documentType = 'Selecciona un tipo de documento';
  }

  // Document number - required, format validation
  if (!data.documentNumber) {
    errors.documentNumber = 'Numero de documento requerido';
  } else if (data.documentType && !isValidDocument(data.documentNumber, data.documentType)) {
    if (data.documentType === 'cc') {
      errors.documentNumber = 'Cedula debe tener entre 6 y 10 digitos';
    } else {
      errors.documentNumber = 'Formato de documento invalido';
    }
  }

  // Date of birth - required, must be adult
  if (!data.dateOfBirth) {
    errors.dateOfBirth = 'Fecha de nacimiento requerida';
  } else if (!isAdult(data.dateOfBirth)) {
    errors.dateOfBirth = 'Debes ser mayor de 18 años';
  }

  // Phone - required, Colombian format
  if (!data.phone) {
    errors.phone = 'Telefono requerido';
  } else if (!isValidColombianPhone(data.phone)) {
    errors.phone = 'Telefono debe empezar con 3 y tener 10 digitos';
  }

  // Email - required, valid format
  if (!data.email) {
    errors.email = 'Email requerido';
  } else if (!isValidEmail(data.email)) {
    errors.email = 'Email invalido';
  }

  // Current address - required, min 10 characters
  if (!data.currentAddress || data.currentAddress.trim().length < 10) {
    errors.currentAddress = 'Direccion debe tener al menos 10 caracteres';
  }

  // Time at current address - optional but if provided must be >= 0
  if (data.timeAtCurrentAddress !== undefined && data.timeAtCurrentAddress < 0) {
    errors.timeAtCurrentAddress = 'El tiempo no puede ser negativo';
  }

  // Marital status - required
  if (!data.maritalStatus) {
    errors.maritalStatus = 'Selecciona tu estado civil';
  }

  // Dependents - optional but must be >= 0 and reasonable
  if (data.dependents !== undefined) {
    if (data.dependents < 0) {
      errors.dependents = 'No puede ser negativo';
    } else if (data.dependents > 20) {
      errors.dependents = 'Valor no valido';
    }
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}

// ============================================================================
// Step 2: Employment Information Validation
// ============================================================================

/**
 * Check if employment status requires job details
 */
export function requiresJobDetails(status: EmploymentStatus | undefined): boolean {
  return status === 'employed' || status === 'self-employed';
}

export function validateEmploymentStep(data: Partial<EmploymentInfo>): ValidationResult {
  const errors: Record<string, string> = {};

  // Employment status - required
  if (!data.employmentStatus) {
    errors.employmentStatus = 'Selecciona tu situacion laboral';
  }

  // If employed or self-employed, require additional fields
  if (requiresJobDetails(data.employmentStatus)) {
    // Company name - required
    if (!data.companyName || data.companyName.trim().length < 2) {
      errors.companyName = 'Nombre de empresa requerido';
    }

    // Industry - required
    if (!data.industry) {
      errors.industry = 'Selecciona una industria';
    }

    // Position - required
    if (!data.position || data.position.trim().length < 2) {
      errors.position = 'Cargo requerido';
    }

    // Contract type - required for employed
    if (data.employmentStatus === 'employed' && !data.contractType) {
      errors.contractType = 'Selecciona tipo de contrato';
    }

    // Time at job - optional but if provided must be >= 0
    if (data.timeAtJob !== undefined && data.timeAtJob < 0) {
      errors.timeAtJob = 'El tiempo no puede ser negativo';
    }

    // Employer phone - optional but if provided must be valid
    if (data.employerPhone && !isValidColombianPhone(data.employerPhone)) {
      errors.employerPhone = 'Telefono invalido';
    }
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}

// ============================================================================
// Step 3: Income Information Validation
// ============================================================================

export function validateIncomeStep(data: Partial<IncomeInfo>): ValidationResult {
  const errors: Record<string, string> = {};

  // Monthly salary - required, > 0
  if (data.monthlySalary === undefined || data.monthlySalary <= 0) {
    errors.monthlySalary = 'Ingresa tu salario mensual';
  }

  // Additional income - optional but must be >= 0
  if (data.additionalIncome !== undefined && data.additionalIncome < 0) {
    errors.additionalIncome = 'No puede ser negativo';
  }

  // Additional income source - required if additional income > 0
  if (data.additionalIncome && data.additionalIncome > 0 && !data.additionalIncomeSource) {
    errors.additionalIncomeSource = 'Especifica la fuente del ingreso adicional';
  }

  // Monthly obligations - required, >= 0
  if (data.monthlyObligations === undefined) {
    errors.monthlyObligations = 'Ingresa tus obligaciones mensuales (puede ser 0)';
  } else if (data.monthlyObligations < 0) {
    errors.monthlyObligations = 'No puede ser negativo';
  }

  // Check that obligations don't exceed income
  const totalIncome = (data.monthlySalary || 0) + (data.additionalIncome || 0);
  if (data.monthlyObligations !== undefined && data.monthlyObligations > totalIncome) {
    errors.monthlyObligations = 'Las obligaciones superan los ingresos totales';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}

// ============================================================================
// Step 4: References Validation
// ============================================================================

import type { ReferenceInfo, PreviousLandlordReference, EmploymentReference, PersonalReference } from '@/lib/types/application';

function isValidLandlordRef(ref: Partial<PreviousLandlordReference>): boolean {
  return !!(
    ref.name && ref.name.trim().length >= 2 &&
    ref.phone && isValidColombianPhone(ref.phone) &&
    ref.address && ref.address.trim().length >= 5 &&
    ref.duration && ref.duration > 0
  );
}

function isValidEmploymentRef(ref: Partial<EmploymentReference>): boolean {
  return !!(
    ref.name && ref.name.trim().length >= 2 &&
    ref.phone && isValidColombianPhone(ref.phone) &&
    ref.company && ref.company.trim().length >= 2 &&
    ref.relationship && ref.relationship.trim().length >= 2
  );
}

function isValidPersonalRef(ref: Partial<PersonalReference>): boolean {
  return !!(
    ref.name && ref.name.trim().length >= 2 &&
    ref.phone && isValidColombianPhone(ref.phone) &&
    ref.relationship && ref.relationship.trim().length >= 2
  );
}

export function validateReferencesStep(data: Partial<ReferenceInfo>): ValidationResult {
  const errors: Record<string, string> = {};

  // Check landlord references (min 1)
  const landlords = data.previousLandlords || [];
  if (landlords.length === 0) {
    errors.previousLandlords = 'Agrega al menos un arrendador anterior';
  } else {
    const invalidLandlords = landlords.filter((ref, idx) => !isValidLandlordRef(ref));
    if (invalidLandlords.length > 0) {
      errors.previousLandlords = 'Completa todos los campos de los arrendadores anteriores';
    }
  }

  // Check employment references (min 1)
  const employmentRefs = data.employmentReferences || [];
  if (employmentRefs.length === 0) {
    errors.employmentReferences = 'Agrega al menos una referencia laboral';
  } else {
    const invalidEmployment = employmentRefs.filter((ref, idx) => !isValidEmploymentRef(ref));
    if (invalidEmployment.length > 0) {
      errors.employmentReferences = 'Completa todos los campos de las referencias laborales';
    }
  }

  // Check personal references (min 1)
  const personalRefs = data.personalReferences || [];
  if (personalRefs.length === 0) {
    errors.personalReferences = 'Agrega al menos una referencia personal';
  } else {
    const invalidPersonal = personalRefs.filter((ref, idx) => !isValidPersonalRef(ref));
    if (invalidPersonal.length > 0) {
      errors.personalReferences = 'Completa todos los campos de las referencias personales';
    }
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}

// ============================================================================
// Step 5: Documents Validation
// ============================================================================

import type { DocumentInfo, DocumentUpload } from '@/lib/types/application';

function hasDocument(doc: DocumentUpload | null | undefined): boolean {
  return !!(doc && (doc.file || doc.fileName));
}

export function validateDocumentsStep(data: Partial<DocumentInfo>): ValidationResult {
  const errors: Record<string, string> = {};

  // ID Document - required
  if (!hasDocument(data.idDocument)) {
    errors.idDocument = 'Documento de identidad es requerido';
  }

  // Income proof - required
  if (!hasDocument(data.incomeProof)) {
    errors.incomeProof = 'Comprobante de ingresos es requerido';
  }

  // Optional documents don't need validation

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}

// ============================================================================
// Step 6: Review Validation (terms acceptance)
// ============================================================================

export function validateReviewStep(acceptTerms: boolean, authorizeVerification: boolean): ValidationResult {
  const errors: Record<string, string> = {};

  if (!acceptTerms) {
    errors.acceptTerms = 'Debes aceptar los terminos y condiciones';
  }

  if (!authorizeVerification) {
    errors.authorizeVerification = 'Debes autorizar la verificacion de datos';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}

// ============================================================================
// Master validation function for any step
// ============================================================================

export function validateStep(
  step: number,
  data: {
    personal: Partial<PersonalInfo>;
    employment: Partial<EmploymentInfo>;
    income: Partial<IncomeInfo>;
    references: Partial<ReferenceInfo>;
    documents: Partial<DocumentInfo>;
  },
  terms?: { acceptTerms: boolean; authorizeVerification: boolean }
): ValidationResult {
  switch (step) {
    case 1:
      return validatePersonalStep(data.personal);
    case 2:
      return validateEmploymentStep(data.employment);
    case 3:
      return validateIncomeStep(data.income);
    case 4:
      return validateReferencesStep(data.references);
    case 5:
      return validateDocumentsStep(data.documents);
    case 6:
      return terms
        ? validateReviewStep(terms.acceptTerms, terms.authorizeVerification)
        : { isValid: false, errors: { general: 'Faltan terminos' } };
    default:
      return { isValid: true, errors: {} };
  }
}

// ============================================================================
// Get missing fields list for user-friendly display
// ============================================================================

export function getMissingFieldsList(step: number, errors: Record<string, string>): string[] {
  const fieldLabels: Record<string, string> = {
    // Personal
    fullName: 'Nombre completo',
    documentType: 'Tipo de documento',
    documentNumber: 'Numero de documento',
    dateOfBirth: 'Fecha de nacimiento',
    phone: 'Telefono celular',
    email: 'Email',
    currentAddress: 'Direccion actual',
    maritalStatus: 'Estado civil',
    // Employment
    employmentStatus: 'Situacion laboral',
    companyName: 'Nombre de la empresa',
    industry: 'Industria',
    position: 'Cargo',
    contractType: 'Tipo de contrato',
    // Income
    monthlySalary: 'Salario mensual',
    additionalIncomeSource: 'Fuente de ingreso adicional',
    monthlyObligations: 'Obligaciones mensuales',
    // References
    previousLandlords: 'Arrendadores anteriores',
    employmentReferences: 'Referencias laborales',
    personalReferences: 'Referencias personales',
    // Documents
    idDocument: 'Documento de identidad',
    incomeProof: 'Comprobante de ingresos',
    // Review
    acceptTerms: 'Terminos y condiciones',
    authorizeVerification: 'Autorizacion de verificacion',
  };

  return Object.keys(errors).map(key => fieldLabels[key] || key);
}

// ============================================================================
// Combined validation for step completion check
// ============================================================================

/**
 * Check if step has minimum required fields for completion
 * This is used by the context to determine step completion status
 */
export function isStepMinimallyComplete(step: number, data: {
  personal: Partial<PersonalInfo>;
  employment: Partial<EmploymentInfo>;
  income: Partial<IncomeInfo>;
}): boolean {
  switch (step) {
    case 1:
      // Personal: need name and document
      return !!(data.personal.fullName && data.personal.documentNumber);
    case 2:
      // Employment: need status
      return !!data.employment.employmentStatus;
    case 3:
      // Income: need salary
      return data.income.monthlySalary !== undefined && data.income.monthlySalary > 0;
    default:
      return false;
  }
}
