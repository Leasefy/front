/**
 * ApplicationContext.prefill.test.tsx — TDD tests for wizard prefill feature
 *
 * Coverage:
 *   (1) create mode + authenticated + pristine draft → prefill fields applied
 *   (2) hasPreviousApplication: false → state unchanged
 *   (3) update mode → getPrefill NOT called
 *   (4) consent (authorizeVerification) remains false even with prefill applied
 *   (5) fetch rejects → no crash, state unchanged
 *   (6) user already typed (dirty draft) before response lands → prefill not applied
 */

import * as React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';

void React; // jsx-preserve

// ---------------------------------------------------------------------------
// Mocks — hoisted so vi.fn() refs are available before module imports
// ---------------------------------------------------------------------------

const {
  mockGetConsentText,
  mockCreate,
  mockCreateGuest,
  mockUpdateStep,
  mockRespondToInfoRequest,
  mockGetPrefill,
} = vi.hoisted(() => ({
  mockGetConsentText: vi.fn(),
  mockCreate: vi.fn(),
  mockCreateGuest: vi.fn(),
  mockUpdateStep: vi.fn().mockResolvedValue(undefined),
  mockRespondToInfoRequest: vi.fn().mockResolvedValue(undefined),
  mockGetPrefill: vi.fn(),
}));

vi.mock('@/lib/api/legal.service', () => ({
  getConsentText: mockGetConsentText,
  ConsentTextNotFoundError: class ConsentTextNotFoundError extends Error {
    constructor(msg = 'not found') { super(msg); this.name = 'ConsentTextNotFoundError'; }
  },
}));

vi.mock('@/lib/api/applications.service', () => ({
  applicationsApi: {
    create: mockCreate,
    createGuest: mockCreateGuest,
    uploadDocument: vi.fn().mockResolvedValue(undefined),
    updateStep: mockUpdateStep,
    respondToInfoRequest: mockRespondToInfoRequest,
    getPrefill: mockGetPrefill,
  },
}));

// Mock localStorage — controls "pristine" vs "dirty" per test
let _storedDraft: Record<string, unknown> | null = null;

vi.mock('@/lib/utils/storage', () => ({
  StorageManager: class StorageManager {
    get() { return _storedDraft; }
    set() { /* noop */ }
    remove() { /* noop */ }
  },
}));

// Mock getAccessToken — controlled per test
let _isAuthenticated = true;
vi.mock('@/lib/api/client', () => ({
  getAccessToken: () => (_isAuthenticated ? 'fake-token' : null),
  setAccessToken: vi.fn(),
  ApiError: class ApiError extends Error {
    constructor(public status: number, msg: string) { super(msg); }
  },
}));

vi.mock('@/lib/utils/logger', () => ({
  contextLogger: { error: vi.fn(), info: vi.fn(), warn: vi.fn() },
}));

import { ApplicationProvider, useApplication } from '@/lib/context/ApplicationContext';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const SAMPLE_CONSENT = {
  version: 'habeas-data-centrales-v1',
  type: 'habeas-data-centrales',
  lang: 'es',
  title: 'Autorización de tratamiento de datos',
  text: 'Autorizo de manera libre...',
  effective_from: '2026-06-08',
  supersedes: null,
};

/** Full prefill response from a previous application */
const SAMPLE_PREFILL_WITH_DATA = {
  hasPreviousApplication: true,
  fullName: 'Maria Lopez',
  documentType: 'CC',
  documentNumber: '987654321',
  dateOfBirth: '1990-03-15',
  phone: '3109876543',
  email: 'maria@example.com',
  currentAddress: 'Calle 10 # 20-30, Bogotá',
  timeAtCurrentAddress: 24,
  maritalStatus: 'single',
  dependents: 0,
  employmentStatus: 'employed',
  companyName: 'Acme SAS',
  industry: 'technology',
  position: 'Desarrolladora Senior',
  contractType: 'indefinite',
  timeAtJob: 36,
  employerPhone: '6011234567',
  employerAddress: 'Carrera 7 # 100-50, Bogotá',
  monthlySalary: 8_000_000,
  additionalIncome: 500_000,
  additionalIncomeSource: 'Freelance',
  totalMonthlyIncome: 8_500_000,
  monthlyObligations: 1_000_000,
  availableForRent: 7_500_000,
  references: {
    previousLandlords: [
      { name: 'Carlos Ruiz', phone: '3001112233', address: 'Calle 5', duration: 12, relationship: 'landlord' },
    ],
    employmentReferences: [],
    personalReferences: [],
  },
  hasCoSigner: false,
  coSigner: null,
};

/** Prefill response when no previous application exists */
const SAMPLE_PREFILL_EMPTY = { hasPreviousApplication: false };

// ---------------------------------------------------------------------------
// Test scaffolding
// ---------------------------------------------------------------------------

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  _isAuthenticated = true;
  _storedDraft = null;
  vi.clearAllMocks();

  // Default consent returns successfully
  mockGetConsentText.mockResolvedValue(SAMPLE_CONSENT);

  // Default create resolves
  mockCreate.mockResolvedValue({
    id: 'app-123',
    propertyId: 'prop-test',
    status: 'submitted',
    currentStep: 6,
    personal: {},
    employment: {},
    income: { monthlySalary: 0, totalMonthlyIncome: 0, monthlyObligations: 0, availableForRent: 0 },
    references: {},
    documents: {},
    hasCoSigner: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });
  mockCreateGuest.mockResolvedValue({
    applicationId: 'app-456',
    trackingCode: 'AF-ABC',
    userAlreadyExisted: false,
  });
  mockUpdateStep.mockResolvedValue(undefined);
  mockRespondToInfoRequest.mockResolvedValue(undefined);

  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => { root.unmount(); });
  container.remove();
  vi.restoreAllMocks();
});

// ── Helper: render provider + capture context ─────────────────────────────

type ProviderProps = {
  mode?: 'create' | 'update';
  existingApplicationId?: string;
  initialApplication?: Record<string, unknown>;
  propertyId?: string;
};

async function renderProvider(props: ProviderProps) {
  let ctx: ReturnType<typeof useApplication> | null = null;

  function Probe() {
    ctx = useApplication();
    return null;
  }

  await act(async () => {
    root.render(
      <ApplicationProvider
        propertyId={props.propertyId ?? 'prop-test'}
        mode={props.mode ?? 'create'}
        existingApplicationId={props.existingApplicationId}
        initialApplication={props.initialApplication as never}
      >
        <Probe />
      </ApplicationProvider>
    );
  });

  return { getCtx: () => ctx! };
}

// ── (1) create mode + authenticated + pristine → prefill applied ──────────

describe('ApplicationContext — prefill: create mode authenticated pristine', () => {
  it('applies prefill fields to the form when hasPreviousApplication is true', async () => {
    mockGetPrefill.mockResolvedValueOnce(SAMPLE_PREFILL_WITH_DATA);

    const { getCtx } = await renderProvider({ mode: 'create' });

    expect(mockGetPrefill).toHaveBeenCalledTimes(1);

    // Spot-check personal
    expect(getCtx().application.personal.fullName).toBe('Maria Lopez');
    expect(getCtx().application.personal.documentNumber).toBe('987654321');
    expect(getCtx().application.personal.phone).toBe('3109876543');

    // Spot-check income
    expect(getCtx().application.income.monthlySalary).toBe(8_000_000);

    // Spot-check references
    expect(getCtx().application.references.previousLandlords).toHaveLength(1);
    expect(getCtx().application.references.previousLandlords?.[0].name).toBe('Carlos Ruiz');
  });

  it('maps null scalars to empty string defaults (no literal nulls in string fields)', async () => {
    mockGetPrefill.mockResolvedValueOnce({
      ...SAMPLE_PREFILL_WITH_DATA,
      companyName: null,
      additionalIncomeSource: null,
    });

    const { getCtx } = await renderProvider({ mode: 'create' });

    // null strings must map to the empty-string default, not literal null
    expect(getCtx().application.employment.companyName).not.toBeNull();
    expect(getCtx().application.income.additionalIncomeSource).not.toBeNull();
  });
});

// ── (2) hasPreviousApplication: false → state unchanged ──────────────────

describe('ApplicationContext — prefill: hasPreviousApplication false', () => {
  it('leaves the form pristine when server returns hasPreviousApplication: false', async () => {
    mockGetPrefill.mockResolvedValueOnce(SAMPLE_PREFILL_EMPTY);

    const { getCtx } = await renderProvider({ mode: 'create' });

    expect(getCtx().application.personal.fullName).toBeFalsy();
    expect(getCtx().application.income.monthlySalary).toBeFalsy();
  });
});

// ── (3) update mode → getPrefill NOT called ───────────────────────────────

describe('ApplicationContext — prefill: update mode skips prefill', () => {
  it('does not call getPrefill when mode is update', async () => {
    mockGetPrefill.mockResolvedValue(SAMPLE_PREFILL_WITH_DATA);

    const initialApplication = {
      id: 'app-existing',
      propertyId: 'prop-test',
      status: 'draft' as const,
      currentStep: 6,
      personal: { fullName: 'Existing User', documentNumber: '111' },
      employment: { employmentStatus: 'employed' as const },
      income: { monthlySalary: 3_000_000, totalMonthlyIncome: 3_000_000, monthlyObligations: 0, availableForRent: 3_000_000 },
      references: {
        previousLandlords: [{ name: 'L', phone: '1', address: 'A', duration: 1, relationship: 'r' }],
        employmentReferences: [],
        personalReferences: [],
      },
      documents: { idDocument: { fileName: 'id.pdf', file: null, uploadedAt: new Date().toISOString() } },
      hasCoSigner: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await renderProvider({
      mode: 'update',
      existingApplicationId: 'app-existing',
      initialApplication,
    });

    expect(mockGetPrefill).not.toHaveBeenCalled();
  });
});

// ── (4) consent remains false even with prefill applied ──────────────────

describe('ApplicationContext — prefill: consent stays false', () => {
  it('authorizeVerification is false even after prefill is applied', async () => {
    mockGetPrefill.mockResolvedValueOnce(SAMPLE_PREFILL_WITH_DATA);

    const { getCtx } = await renderProvider({ mode: 'create' });

    expect(getCtx().authorizeVerification).toBe(false);
  });

  it('acceptTerms is false even after prefill is applied', async () => {
    mockGetPrefill.mockResolvedValueOnce(SAMPLE_PREFILL_WITH_DATA);

    const { getCtx } = await renderProvider({ mode: 'create' });

    expect(getCtx().acceptTerms).toBe(false);
  });
});

// ── (5) fetch rejects → no crash, state unchanged ────────────────────────

describe('ApplicationContext — prefill: fetch failure is silent', () => {
  it('does not crash when getPrefill rejects', async () => {
    mockGetPrefill.mockRejectedValueOnce(new Error('network error'));

    // Should not throw
    const { getCtx } = await renderProvider({ mode: 'create' });

    // Form should remain in empty/default state
    expect(getCtx().application.personal.fullName).toBeFalsy();
  });

  it('leaves state unchanged when getPrefill rejects', async () => {
    mockGetPrefill.mockRejectedValueOnce(new Error('500 Internal Server Error'));

    const { getCtx } = await renderProvider({ mode: 'create' });

    expect(getCtx().application.income.monthlySalary).toBeFalsy();
    expect(getCtx().application.references.previousLandlords).toHaveLength(0);
  });
});

// ── (6) dirty draft → prefill not applied ────────────────────────────────
//
// The StorageManager mock returns _storedDraft. When set to a draft with
// meaningful user input (fullName present), the context hydrates from the
// stored draft instead. Prefill must NOT overwrite the user's own data.

describe('ApplicationContext — prefill: dirty draft takes precedence', () => {
  it('does not apply prefill when a locally saved draft with user input exists', async () => {
    // Simulate a draft the user already started filling
    _storedDraft = {
      id: 'app-draft-local',
      propertyId: 'prop-test',
      status: 'draft',
      currentStep: 2,
      personal: { fullName: 'Usuario Existente', documentNumber: '55555' },
      employment: {},
      income: {},
      references: { previousLandlords: [], employmentReferences: [], personalReferences: [] },
      documents: {},
      hasCoSigner: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    mockGetPrefill.mockResolvedValueOnce(SAMPLE_PREFILL_WITH_DATA);

    const { getCtx } = await renderProvider({ mode: 'create' });

    // The user's own draft name must NOT be overwritten by prefill
    expect(getCtx().application.personal.fullName).toBe('Usuario Existente');
    // The prefill's salary should NOT be applied
    expect(getCtx().application.income.monthlySalary).not.toBe(8_000_000);
  });
});

// ── (guest) no authenticated session → getPrefill skipped ────────────────

describe('ApplicationContext — prefill: unauthenticated guest skips fetch', () => {
  it('does not call getPrefill when there is no auth token', async () => {
    _isAuthenticated = false;
    mockGetPrefill.mockResolvedValue(SAMPLE_PREFILL_WITH_DATA);

    await renderProvider({ mode: 'create' });

    expect(mockGetPrefill).not.toHaveBeenCalled();
  });
});
