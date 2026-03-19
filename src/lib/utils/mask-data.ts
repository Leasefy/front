/**
 * Data masking utilities for protecting sensitive candidate information
 *
 * Business logic: Sensitive data is only revealed after contract is signed
 * to prevent landlords from bypassing the platform.
 */

import type { LandlordCandidateStatus } from '@/lib/types/landlord';

// ============================================================================
// Types
// ============================================================================

export interface MaskingConfig {
  /** Show first N characters */
  showFirst?: number;
  /** Show last N characters */
  showLast?: number;
  /** Character to use for masking */
  maskChar?: string;
  /** Minimum masked characters */
  minMasked?: number;
}

// ============================================================================
// Constants
// ============================================================================

/** Statuses where data can be revealed */
const REVEAL_STATUSES: LandlordCandidateStatus[] = ['approved'];

/** Default masking character */
const DEFAULT_MASK_CHAR = '•';

// ============================================================================
// Core Masking Functions
// ============================================================================

/**
 * Mask a string with configurable options
 */
export function maskString(
  value: string,
  config: MaskingConfig = {}
): string {
  const {
    showFirst = 0,
    showLast = 0,
    maskChar = DEFAULT_MASK_CHAR,
    minMasked = 4,
  } = config;

  if (!value || value.length <= showFirst + showLast) {
    return maskChar.repeat(Math.max(minMasked, value?.length || minMasked));
  }

  const first = value.slice(0, showFirst);
  const last = showLast > 0 ? value.slice(-showLast) : '';
  const middleLength = Math.max(minMasked, value.length - showFirst - showLast);
  const middle = maskChar.repeat(middleLength);

  return `${first}${middle}${last}`;
}

/**
 * Mask an email address
 * Example: j••••@g••••.com
 */
export function maskEmail(email: string): string {
  if (!email || !email.includes('@')) {
    return DEFAULT_MASK_CHAR.repeat(10);
  }

  const [localPart, domain] = email.split('@');
  const [domainName, ...tldParts] = domain.split('.');
  const tld = tldParts.join('.');

  const maskedLocal = maskString(localPart, { showFirst: 1, minMasked: 4 });
  const maskedDomain = maskString(domainName, { showFirst: 1, minMasked: 4 });

  return `${maskedLocal}@${maskedDomain}.${tld}`;
}

/**
 * Mask a phone number
 * Example: +57 ••• ••• ••67
 */
export function maskPhone(phone: string): string {
  if (!phone) {
    return DEFAULT_MASK_CHAR.repeat(10);
  }

  // Remove all non-digit characters for processing
  const digits = phone.replace(/\D/g, '');

  if (digits.length < 4) {
    return DEFAULT_MASK_CHAR.repeat(10);
  }

  // Show last 2 digits
  const lastDigits = digits.slice(-2);
  const maskedLength = digits.length - 2;

  // Format: ••• ••• ••XX
  const masked = DEFAULT_MASK_CHAR.repeat(maskedLength);

  // Try to preserve some formatting
  if (phone.startsWith('+')) {
    return `+•• ${DEFAULT_MASK_CHAR.repeat(3)} ${DEFAULT_MASK_CHAR.repeat(3)} ${DEFAULT_MASK_CHAR.repeat(2)}${lastDigits}`;
  }

  return `${masked}${lastDigits}`;
}

/**
 * Mask a document number (ID, passport, etc.)
 * Example: ••••••4567
 */
export function maskDocument(documentNumber: string): string {
  if (!documentNumber) {
    return DEFAULT_MASK_CHAR.repeat(8);
  }

  return maskString(documentNumber, { showLast: 4, minMasked: 6 });
}

/**
 * Mask an address
 * Example: Calle ••• #••-••, Bogotá
 */
export function maskAddress(address: string): string {
  if (!address) {
    return DEFAULT_MASK_CHAR.repeat(15);
  }

  // Split by comma to potentially keep city/area visible
  const parts = address.split(',');

  if (parts.length > 1) {
    const lastPart = parts[parts.length - 1].trim();
    const maskedStart = DEFAULT_MASK_CHAR.repeat(15);
    return `${maskedStart}, ${lastPart}`;
  }

  return DEFAULT_MASK_CHAR.repeat(20);
}

// ============================================================================
// Status-Based Reveal Logic
// ============================================================================

/**
 * Check if sensitive data should be revealed based on candidate status
 */
export function shouldRevealData(status: LandlordCandidateStatus): boolean {
  return REVEAL_STATUSES.includes(status);
}

/**
 * Get masked or real value based on status
 */
export function getMaskedValue(
  value: string,
  status: LandlordCandidateStatus,
  maskFn: (val: string) => string
): string {
  if (shouldRevealData(status)) {
    return value;
  }
  return maskFn(value);
}

// ============================================================================
// Convenience Functions
// ============================================================================

/**
 * Get masked email based on status
 */
export function getDisplayEmail(email: string, status: LandlordCandidateStatus): string {
  return getMaskedValue(email, status, maskEmail);
}

/**
 * Get masked phone based on status
 */
export function getDisplayPhone(phone: string, status: LandlordCandidateStatus): string {
  return getMaskedValue(phone, status, maskPhone);
}

/**
 * Get masked document number based on status
 */
export function getDisplayDocument(
  documentNumber: string,
  status: LandlordCandidateStatus
): string {
  return getMaskedValue(documentNumber, status, maskDocument);
}

/**
 * Get masked address based on status
 */
export function getDisplayAddress(address: string, status: LandlordCandidateStatus): string {
  return getMaskedValue(address, status, maskAddress);
}

// ============================================================================
// UI Helper
// ============================================================================

/**
 * Message to show when data is masked
 */
export const MASKED_DATA_MESSAGE = 'Disponible después de firmar contrato';

/**
 * Check if a displayed value is masked (contains mask characters)
 */
export function isMasked(value: string): boolean {
  return value.includes(DEFAULT_MASK_CHAR);
}
