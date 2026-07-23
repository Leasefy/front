/**
 * ApplicationContext.consent.test.tsx — TDD tests for habeas-data consent integration
 *
 * Coverage:
 *   (1) consentText and authorizationVersion exposed in context after fetch succeeds
 *   (2) consentText null + authorizationVersion undefined when fetch fails
 *   (3) habeasDataConsent mirrors authorizeVerification in create payload
 *   (4) authorizationVersion included in create payload when fetch succeeded
 *   (5) authorizationVersion OMITTED from create payload when fetch failed
 *   (6) submit not hard-blocked when consent fetch failed
 *   (7) canSubmit still gated by acceptTerms && authorizeVerification
 *   (8) guest path also receives consent fields
 */

import * as React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';

void React; // jsx-preserve

// ---------------------------------------------------------------------------
// Mocks — hoisted so vi.fn() refs are available before module imports
// ---------------------------------------------------------------------------

const { mockGetConsentText, mockCreate, mockCreateGuest, mockUpdateStep, mockRespondToInfoRequest } = vi.hoisted(() => ({
  mockGetConsentText: vi.fn(),
  mockCreate: vi.fn(),
  mockCreateGuest: vi.fn(),
  mockUpdateStep: vi.fn().mockResolvedValue(undefined),
  mockRespondToInfoRequest: vi.fn().mockResolvedValue(undefined),
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
    // getPrefill added so the prefill effect in ApplicationContext doesn't
    // leave dangling promises in consent tests (hasPreviousApplication: false
    // → context state unchanged, no interference).
    getPrefill: vi.fn().mockResolvedValue({ hasPreviousApplication: false }),
  },
}));

// Mock localStorage so we don't bleed state between tests
vi.mock('@/lib/utils/storage', () => ({
  StorageManager: class StorageManager {
    get() { return null; }
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

// Mock contextLogger to suppress noise
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
  text: 'Autorizo de manera libre, previa, expresa e informada...',
  effective_from: '2026-06-08',
  supersedes: null,
};

/**
 * A minimal application that satisfies all 5 getCompletedSteps checks:
 * step 1: fullName + documentNumber
 * step 2: employmentStatus
 * step 3: monthlySalary > 0
 * step 4: previousLandlords.length > 0
 * step 5: idDocument.fileName
 */
function makeMinimalApplication() {
  return {
    id: undefined,
    propertyId: 'prop-test',
    status: 'draft' as const,
    currentStep: 6,
    personal: {
      fullName: 'Juan Perez',
      documentNumber: '12345678',
      documentType: 'CC' as const,
      email: 'juan@test.com',
      phone: '3001234567',
    },
    employment: { employmentStatus: 'employed' as const },
    income: {
      monthlySalary: 3_000_000,
      totalMonthlyIncome: 3_000_000,
      monthlyObligations: 0,
      availableForRent: 3_000_000,
    },
    references: {
      previousLandlords: [{ name: 'Luis', phone: '123', address: 'Calle 1', duration: 12, relationship: 'landlord' }],
      employmentReferences: [],
      personalReferences: [],
    },
    documents: {
      idDocument: { fileName: 'cedula.pdf', file: new File(['x'], 'cedula.pdf', { type: 'application/pdf' }), uploadedAt: new Date().toISOString() },
    },
    hasCoSigner: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

// ---------------------------------------------------------------------------
// Test scaffolding
// ---------------------------------------------------------------------------

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  _isAuthenticated = true;
  vi.clearAllMocks();
  // Restore default return values after clearAllMocks
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
  mockCreateGuest.mockResolvedValue({ applicationId: 'app-456', trackingCode: 'AF-ABC', userAlreadyExisted: false });
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

async function renderProvider(props: {
  mode?: 'create' | 'update';
  existingApplicationId?: string;
  initialApplication?: ReturnType<typeof makeMinimalApplication>;
  propertyId?: string;
}) {
  let ctx: ReturnType<typeof useApplication> | null = null;

  function Probe() {
    ctx = useApplication();
    return null;
  }

  const probe = React.createElement(Probe);

  await act(async () => {
    root.render(
      React.createElement(
        ApplicationProvider,
        {
          propertyId: props.propertyId ?? 'prop-test',
          mode: props.mode ?? 'create',
          existingApplicationId: props.existingApplicationId,
          initialApplication: props.initialApplication as never,
        },
        probe,
      )
    );
  });

  return { getCtx: () => ctx! };
}

// ── (1) consentText exposed after fetch ────────────────────────────────────

describe('ApplicationContext — consent text fetch success', () => {
  it('exposes consentText and authorizationVersion when fetch succeeds', async () => {
    mockGetConsentText.mockResolvedValueOnce(SAMPLE_CONSENT);

    const { getCtx } = await renderProvider({});

    expect(getCtx().consentText).toMatchObject({
      version: 'habeas-data-centrales-v1',
      title: 'Autorización de tratamiento de datos',
    });
    expect(getCtx().authorizationVersion).toBe('habeas-data-centrales-v1');
  });
});

// ── (2) consentText null when fetch fails ────────────────────────────────

describe('ApplicationContext — consent text fetch failure', () => {
  it('consentText is null and authorizationVersion is undefined when fetch fails', async () => {
    mockGetConsentText.mockRejectedValueOnce(new Error('not found'));

    const { getCtx } = await renderProvider({});

    expect(getCtx().consentText).toBeNull();
    expect(getCtx().authorizationVersion).toBeUndefined();
  });
});

// ── (3 + 4) habeasDataConsent and authorizationVersion in create payload ──

describe('ApplicationContext — create payload consent fields', () => {
  it('habeasDataConsent: true and authorizationVersion in payload when both set', async () => {
    mockGetConsentText.mockResolvedValueOnce(SAMPLE_CONSENT);

    const { getCtx } = await renderProvider({ mode: 'create' });

    await act(async () => { getCtx().setAcceptTerms(true); });
    await act(async () => { getCtx().setAuthorizeVerification(true); });
    await act(async () => { await getCtx().submitApplication(); });

    expect(mockCreate).toHaveBeenCalledTimes(1);
    const payload = mockCreate.mock.calls[0][0];
    expect(payload.habeasDataConsent).toBe(true);
    expect(payload.authorizationVersion).toBe('habeas-data-centrales-v1');
  });

  it('habeasDataConsent: false in payload when authorizeVerification is false', async () => {
    mockGetConsentText.mockResolvedValueOnce(SAMPLE_CONSENT);

    const { getCtx } = await renderProvider({ mode: 'create' });

    // Do NOT set authorizeVerification — leave it false
    await act(async () => { await getCtx().submitApplication(); });

    expect(mockCreate).toHaveBeenCalledTimes(1);
    const payload = mockCreate.mock.calls[0][0];
    expect(payload.habeasDataConsent).toBe(false);
  });
});

// ── (5 + 6) submit BLOCKED when consent text unavailable ─────────────────
// The backend rejects a consent without authorizationVersion (400), so when the
// legal text fails to load the front must block the submit rather than send a
// versionless consent.

describe('ApplicationContext — submit blocked when consent text unavailable', () => {
  it('does not call create and surfaces an error when authorized but version missing', async () => {
    mockGetConsentText.mockRejectedValueOnce(new Error('endpoint down'));

    const { getCtx } = await renderProvider({ mode: 'create' });

    await act(async () => { getCtx().setAcceptTerms(true); });
    await act(async () => { getCtx().setAuthorizeVerification(true); });
    await act(async () => { await getCtx().submitApplication(); });

    expect(mockCreate).not.toHaveBeenCalled();
    expect(getCtx().submissionError).toBeTruthy();
  });

  it('canSubmit is false when authorized but consent text failed to load', async () => {
    mockGetConsentText.mockRejectedValueOnce(new Error('down'));

    const { getCtx } = await renderProvider({
      mode: 'update',
      existingApplicationId: 'app-existing',
      initialApplication: makeMinimalApplication(),
    });

    await act(async () => { getCtx().setAcceptTerms(true); });
    await act(async () => { getCtx().setAuthorizeVerification(true); });

    expect(getCtx().authorizationVersion).toBeUndefined();
    expect(getCtx().canSubmit).toBe(false);
  });
});

// ── (7) canSubmit gate ────────────────────────────────────────────────────

describe('ApplicationContext — canSubmit gate', () => {
  it('canSubmit is false when acceptTerms is false', async () => {
    mockGetConsentText.mockResolvedValueOnce(SAMPLE_CONSENT);

    const { getCtx } = await renderProvider({
      mode: 'update',
      existingApplicationId: 'app-existing',
      initialApplication: makeMinimalApplication(),
    });

    await act(async () => { getCtx().setAuthorizeVerification(true); });

    expect(getCtx().acceptTerms).toBe(false);
    expect(getCtx().canSubmit).toBe(false);
  });

  it('canSubmit is false when authorizeVerification is false', async () => {
    mockGetConsentText.mockResolvedValueOnce(SAMPLE_CONSENT);

    const { getCtx } = await renderProvider({
      mode: 'update',
      existingApplicationId: 'app-existing',
      initialApplication: makeMinimalApplication(),
    });

    await act(async () => { getCtx().setAcceptTerms(true); });

    expect(getCtx().authorizeVerification).toBe(false);
    expect(getCtx().canSubmit).toBe(false);
  });

  it('canSubmit is true when both checkboxes are true and all 5 steps complete', async () => {
    mockGetConsentText.mockResolvedValueOnce(SAMPLE_CONSENT);

    const { getCtx } = await renderProvider({
      mode: 'update',
      existingApplicationId: 'app-existing',
      initialApplication: makeMinimalApplication(),
    });

    await act(async () => { getCtx().setAcceptTerms(true); });
    await act(async () => { getCtx().setAuthorizeVerification(true); });

    expect(getCtx().canSubmit).toBe(true);
  });
});

// ── (8) guest path ────────────────────────────────────────────────────────

describe('ApplicationContext — guest submit with authorizationVersion', () => {
  it('includes authorizationVersion in createGuest payload when text loaded', async () => {
    _isAuthenticated = false;
    mockGetConsentText.mockResolvedValueOnce(SAMPLE_CONSENT);

    const { getCtx } = await renderProvider({ mode: 'create' });

    await act(async () => { getCtx().setAcceptTerms(true); });
    await act(async () => { getCtx().setAuthorizeVerification(true); });
    await act(async () => { await getCtx().submitApplication(); });

    expect(mockCreateGuest).toHaveBeenCalledTimes(1);
    const payload = mockCreateGuest.mock.calls[0][0];
    expect(payload.habeasDataConsent).toBe(true);
    expect(payload.authorizationVersion).toBe('habeas-data-centrales-v1');
  });

  it('blocks the guest submit when authorized but consent text failed to load', async () => {
    _isAuthenticated = false;
    mockGetConsentText.mockRejectedValueOnce(new Error('down'));

    const { getCtx } = await renderProvider({ mode: 'create' });

    await act(async () => { getCtx().setAcceptTerms(true); });
    await act(async () => { getCtx().setAuthorizeVerification(true); });
    await act(async () => { await getCtx().submitApplication(); });

    expect(mockCreateGuest).not.toHaveBeenCalled();
    expect(getCtx().submissionError).toBeTruthy();
  });
});
