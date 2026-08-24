/**
 * applicationValidation.test.ts — coverage for the T-0020 slimming of the
 * tenant application wizard.
 *
 * Step 2 (employment) keeps only employmentStatus + companyName; step 4
 * (references) drops the personalReferences min-1 rule; step 5 (documents)
 * drops the employmentLetter/incomeProof "one of two" requirement and the
 * payStub/creditReport optional slots. Arrendadores Anteriores and
 * Referencias Laborales keep their min-1 rule untouched.
 */

import { describe, it, expect } from 'vitest';

import {
  validateEmploymentStep,
  validateReferencesStep,
  validateDocumentsStep,
} from './applicationValidation';

describe('validateEmploymentStep — slimmed to employmentStatus + companyName', () => {
  it('is valid for an employed tenant with only status and company set', () => {
    const result = validateEmploymentStep({
      employmentStatus: 'employed',
      companyName: 'Acme SAS',
    });
    expect(result).toEqual({ isValid: true, errors: {} });
  });

  it('still requires companyName when employed', () => {
    const result = validateEmploymentStep({ employmentStatus: 'employed' });
    expect(result.isValid).toBe(false);
    expect(result.errors.companyName).toBeTruthy();
  });

  it('still requires companyName when self-employed', () => {
    const result = validateEmploymentStep({ employmentStatus: 'self-employed' });
    expect(result.isValid).toBe(false);
    expect(result.errors.companyName).toBeTruthy();
  });

  it('does not require companyName for unemployed/retired/student', () => {
    expect(validateEmploymentStep({ employmentStatus: 'unemployed' })).toEqual({
      isValid: true,
      errors: {},
    });
    expect(validateEmploymentStep({ employmentStatus: 'retired' })).toEqual({
      isValid: true,
      errors: {},
    });
    expect(validateEmploymentStep({ employmentStatus: 'student' })).toEqual({
      isValid: true,
      errors: {},
    });
  });

  it('never produces errors for the removed fields (industry/position/contractType/etc.)', () => {
    const result = validateEmploymentStep({ employmentStatus: 'employed', companyName: 'Acme' });
    expect(result.errors).not.toHaveProperty('industry');
    expect(result.errors).not.toHaveProperty('position');
    expect(result.errors).not.toHaveProperty('contractType');
    expect(result.errors).not.toHaveProperty('timeAtJob');
    expect(result.errors).not.toHaveProperty('employerPhone');
  });

  it('still requires employmentStatus', () => {
    const result = validateEmploymentStep({});
    expect(result.isValid).toBe(false);
    expect(result.errors.employmentStatus).toBeTruthy();
  });
});

describe('validateReferencesStep — Referencias Personales removed', () => {
  const validLandlord = {
    name: 'Jorge Pérez',
    phone: '3125551234',
    address: 'Calle 100 # 10-10',
    duration: 24,
    relationship: 'Arrendador',
  };
  const validEmploymentRef = {
    name: 'Ana Gómez',
    phone: '3135551234',
    company: 'Acme SAS',
    relationship: 'Jefe',
  };

  it('is valid with only a landlord and an employment reference — no personal reference needed', () => {
    const result = validateReferencesStep({
      previousLandlords: [validLandlord],
      employmentReferences: [validEmploymentRef],
    });
    expect(result).toEqual({ isValid: true, errors: {} });
  });

  it('never produces a personalReferences error — the field no longer exists', () => {
    const result = validateReferencesStep({
      previousLandlords: [],
      employmentReferences: [],
    });
    expect(result.errors).not.toHaveProperty('personalReferences');
  });

  it('still requires at least one previous landlord (min-1 intact)', () => {
    const result = validateReferencesStep({
      previousLandlords: [],
      employmentReferences: [validEmploymentRef],
    });
    expect(result.isValid).toBe(false);
    expect(result.errors.previousLandlords).toBeTruthy();
  });

  it('still requires at least one employment reference (min-1 intact)', () => {
    const result = validateReferencesStep({
      previousLandlords: [validLandlord],
      employmentReferences: [],
    });
    expect(result.isValid).toBe(false);
    expect(result.errors.employmentReferences).toBeTruthy();
  });
});

describe('validateDocumentsStep — only cédula and extracto bancario', () => {
  const uploaded = { file: null, fileName: 'archivo.pdf' };

  it('is valid with only idDocument and bankStatement', () => {
    const result = validateDocumentsStep({
      idDocument: uploaded,
      bankStatement: uploaded,
    });
    expect(result).toEqual({ isValid: true, errors: {} });
  });

  it('still requires idDocument', () => {
    const result = validateDocumentsStep({ bankStatement: uploaded });
    expect(result.isValid).toBe(false);
    expect(result.errors.idDocument).toBeTruthy();
  });

  it('still requires bankStatement', () => {
    const result = validateDocumentsStep({ idDocument: uploaded });
    expect(result.isValid).toBe(false);
    expect(result.errors.bankStatement).toBeTruthy();
  });

  it('never produces an incomeProof "one of two" error — the requirement is gone', () => {
    const result = validateDocumentsStep({ idDocument: uploaded, bankStatement: uploaded });
    expect(result.errors).not.toHaveProperty('incomeProof');
  });
});
