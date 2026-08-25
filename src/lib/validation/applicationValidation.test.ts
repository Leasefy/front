/**
 * applicationValidation.test.ts — coverage for the T-0020 slimming of the
 * tenant application wizard.
 *
 * Step 2 (employment) keeps only employmentStatus + companyName; step 4
 * (documents, since T-0025 dropped the references step) drops the
 * employmentLetter/incomeProof "one of two" requirement and the
 * payStub/creditReport optional slots.
 *
 * T-0025 removed the references step (Arrendadores Anteriores / Referencias
 * Laborales) entirely — `validateReferencesStep` no longer exists.
 */

import { describe, it, expect } from 'vitest';

import {
  validateEmploymentStep,
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
