/**
 * Validation utilities for inmobiliaria registration and onboarding
 * Follows the same pattern as applicationValidation.ts
 */

// ============================================================================
// Types
// ============================================================================

export interface ValidationError {
  field: string;
  message: string;
}

export interface InmobiliariaOnboardingData {
  firstName: string;
  lastName: string;
  phone?: string;
  agencyName: string;
  agencyNit?: string;
  agencyCity?: string;
}

// ============================================================================
// Field validators
// ============================================================================

/**
 * Validates a Colombian NIT/RUT format (e.g. 900.123.456-7)
 * Also accepts plain numbers without formatting
 */
export function isValidNit(nit: string): boolean {
  if (!nit) return true; // Optional field — empty is valid
  const clean = nit.replace(/[\s.-]/g, '');
  return /^\d{6,12}(-\d)?$/.test(clean);
}

/**
 * Validates a Colombian phone number (10 digits, starts with 3 for mobile or 6 for landline)
 */
export function isValidColombianPhone(phone: string): boolean {
  if (!phone) return true; // Optional field
  const clean = phone.replace(/\s/g, '');
  return /^[36]\d{9}$/.test(clean);
}

/**
 * Validates an email address
 */
export function isValidEmail(email: string): boolean {
  if (!email) return true; // Optional field
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// ============================================================================
// Schema validators
// ============================================================================

/**
 * Validate inmobiliaria onboarding data.
 * Returns an array of validation errors (empty = valid).
 */
export function validateInmobiliariaOnboarding(
  data: InmobiliariaOnboardingData
): ValidationError[] {
  const errors: ValidationError[] = [];

  if (!data.firstName || data.firstName.trim().length < 2) {
    errors.push({ field: 'firstName', message: 'El nombre debe tener al menos 2 caracteres' });
  }

  if (!data.lastName || data.lastName.trim().length < 2) {
    errors.push({ field: 'lastName', message: 'El apellido debe tener al menos 2 caracteres' });
  }

  if (data.phone && !isValidColombianPhone(data.phone)) {
    errors.push({ field: 'phone', message: 'Número de teléfono inválido (debe tener 10 dígitos)' });
  }

  if (!data.agencyName || data.agencyName.trim().length < 2) {
    errors.push({ field: 'agencyName', message: 'El nombre de la agencia es requerido (mínimo 2 caracteres)' });
  }

  if (data.agencyNit && !isValidNit(data.agencyNit)) {
    errors.push({ field: 'agencyNit', message: 'Formato de NIT inválido (ej: 900.123.456-7)' });
  }

  if (!data.agencyCity || data.agencyCity.trim().length < 1) {
    errors.push({ field: 'agencyCity', message: 'Selecciona una ciudad' });
  }

  return errors;
}

/**
 * Quick check: returns true if the inmobiliaria onboarding data is valid
 */
export function isInmobiliariaOnboardingValid(data: InmobiliariaOnboardingData): boolean {
  return validateInmobiliariaOnboarding(data).length === 0;
}

/**
 * Get first error message for a specific field
 */
export function getFieldError(
  errors: ValidationError[],
  field: string
): string | undefined {
  return errors.find((e) => e.field === field)?.message;
}
