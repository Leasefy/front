/**
 * ApplicationContext.staleDocuments.test.tsx
 *
 * Coverage:
 *   (a) create mode + stale slot → guard fires, create NOT called
 *   (b) create mode + real File → create called, uploadDocument called with application id
 *   (c) update mode + stale slot → no error, respondToInfoRequest called
 *   (d) create mode + slot REUSABLE → no guard, create + reuseDocuments
 *
 * (d) es el caso que se rompía: un documento traído de una postulación anterior
 * también llega sin `File`, y el guard lo confundía con uno perdido al recargar.
 * A quien reusaba sus documentos se le bloqueaba el envío pidiéndole adjuntar de
 * nuevo lo que ya había dado.
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
  mockUploadDocument,
  mockReuseDocuments,
} = vi.hoisted(() => ({
  mockGetConsentText: vi.fn(),
  mockCreate: vi.fn(),
  mockCreateGuest: vi.fn(),
  mockUpdateStep: vi.fn().mockResolvedValue(undefined),
  mockRespondToInfoRequest: vi.fn().mockResolvedValue(undefined),
  mockUploadDocument: vi.fn().mockResolvedValue(undefined),
  mockReuseDocuments: vi.fn().mockResolvedValue({ copiados: [], yaEstaban: [], fallaron: [] }),
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
    uploadDocument: mockUploadDocument,
    updateStep: mockUpdateStep,
    respondToInfoRequest: mockRespondToInfoRequest,
    reuseDocuments: mockReuseDocuments,
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

// Mock getAccessToken — always authenticated for these tests
vi.mock('@/lib/api/client', () => ({
  getAccessToken: () => 'fake-token',
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
  text: 'Autorizo de manera libre, previa, expresa e informada...',
  effective_from: '2026-06-08',
  supersedes: null,
};

/**
 * A minimal application satisfying all 5 getCompletedSteps checks with a
 * STALE idDocument (fileName present, file: null). This is the exact state
 * produced by a page reload after the user uploaded a file in a prior session.
 */
function makeStaleApplication() {
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
      // Stale slot: fileName present but file is null (serialised from localStorage)
      idDocument: { fileName: 'cedula.pdf', file: null, uploadedAt: new Date().toISOString() },
    },
    hasCoSigner: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Application with a real File object attached to idDocument.
 */
function makeValidApplication() {
  const app = makeStaleApplication();
  return {
    ...app,
    documents: {
      idDocument: {
        fileName: 'cedula.pdf',
        file: new File(['x'], 'cedula.pdf', { type: 'application/pdf' }),
        uploadedAt: new Date().toISOString(),
      },
    },
  };
}

// ---------------------------------------------------------------------------
// Test scaffolding
// ---------------------------------------------------------------------------

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  vi.clearAllMocks();

  mockGetConsentText.mockResolvedValue(SAMPLE_CONSENT);

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
  mockUploadDocument.mockResolvedValue(undefined);

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
  initialApplication?: ReturnType<typeof makeStaleApplication> | ReturnType<typeof makeValidApplication>;
  propertyId?: string;
}) {
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

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('ApplicationContext — stale document guard', () => {
  // (a) create mode + stale slot → guard fires, create NOT called
  it('sets submissionError and does not call create when a slot has fileName but no file', async () => {
    const { getCtx } = await renderProvider({
      mode: 'create',
    });

    // Simulate the stale state produced by localStorage rehydration:
    // the document slot has a fileName but no File object.
    await act(async () => {
      getCtx().updateDocuments({
        idDocument: { fileName: 'cedula.pdf', file: null, uploadedAt: new Date().toISOString() },
      });
    });

    await act(async () => { getCtx().setAcceptTerms(true); });
    await act(async () => { getCtx().setAuthorizeVerification(true); });
    await act(async () => { await getCtx().submitApplication(); });

    expect(mockCreate).not.toHaveBeenCalled();
    expect(getCtx().submissionError).toBeTruthy();
  });

  // (b) create mode + real File → create called, uploadDocument called with application id
  it('calls create then uploadDocument with the application id when a real File is present', async () => {
    const realFile = new File(['x'], 'cedula.pdf', { type: 'application/pdf' });
    const { getCtx } = await renderProvider({
      mode: 'create',
    });

    // Set a real File object on the idDocument slot (not stale)
    await act(async () => {
      getCtx().updateDocuments({
        idDocument: { file: realFile, fileName: 'cedula.pdf', uploadedAt: new Date().toISOString() },
      });
    });

    await act(async () => { getCtx().setAcceptTerms(true); });
    await act(async () => { getCtx().setAuthorizeVerification(true); });
    await act(async () => { await getCtx().submitApplication(); });

    expect(mockCreate).toHaveBeenCalledTimes(1);
    expect(mockUploadDocument).toHaveBeenCalledWith('app-123', realFile, 'ID_DOCUMENT');
  });

  // (c) update mode + stale slot → no stale-doc error, respondToInfoRequest called
  it('does not error in update mode when a slot has fileName but no file', async () => {
    const { getCtx } = await renderProvider({
      mode: 'update',
      existingApplicationId: 'app-existing',
      initialApplication: makeStaleApplication(),
    });

    await act(async () => { getCtx().setAcceptTerms(true); });
    await act(async () => { getCtx().setAuthorizeVerification(true); });
    await act(async () => { await getCtx().submitApplication(); });

    // The stale-doc error must NOT be set — in update mode fileName-without-file
    // means the document lives on the server; no upload is attempted, which is correct.
    const error = getCtx().submissionError;
    const isStaleDocError = typeof error === 'string' && error.includes('desconectaron');
    expect(isStaleDocError).toBe(false);

    expect(mockRespondToInfoRequest).toHaveBeenCalledWith(
      'app-existing',
      expect.any(String),
      true
    );
  });

  // (d) create mode + slot reusable → NO guard, create + reuseDocuments
  it('deja enviar y copia los documentos cuando la ranura viene de una postulación anterior', async () => {
    const { getCtx } = await renderProvider({ mode: 'create' });

    // Misma forma que la ranura "perdida" del caso (a) —fileName sin File—,
    // pero marcada como reusable: el documento vive en el servidor.
    await act(async () => {
      getCtx().updateDocuments({
        idDocument: {
          fileName: 'cedula.pdf',
          file: null,
          uploadedAt: new Date().toISOString(),
          reusable: true,
        },
      });
    });

    await act(async () => { getCtx().setAcceptTerms(true); });
    await act(async () => { getCtx().setAuthorizeVerification(true); });
    await act(async () => { await getCtx().submitApplication(); });

    expect(getCtx().submissionError).toBeNull();
    expect(mockCreate).toHaveBeenCalledTimes(1);
    // Sin esta llamada la postulación se crea VACÍA: la inmobiliaria no podría
    // evaluarla, y la pantalla igual diría que quedó enviada.
    expect(mockReuseDocuments).toHaveBeenCalledWith('app-123');
    // No hay File que subir: la copia la hace el back.
    expect(mockUploadDocument).not.toHaveBeenCalled();
  });

  // Un archivo recién adjuntado le gana al reusado: se sube ANTES de pedir la
  // copia, y el back sólo copia los tipos que falten.
  it('sube el archivo nuevo antes de copiar los anteriores', async () => {
    const orden: string[] = [];
    mockUploadDocument.mockImplementation(async () => { orden.push('upload'); });
    mockReuseDocuments.mockImplementation(async () => {
      orden.push('reuse');
      return { copiados: [], yaEstaban: [], fallaron: [] };
    });

    const realFile = new File(['x'], 'extracto.pdf', { type: 'application/pdf' });
    const { getCtx } = await renderProvider({ mode: 'create' });

    await act(async () => {
      getCtx().updateDocuments({
        idDocument: { fileName: 'cedula.pdf', file: null, reusable: true },
        bankStatement: { fileName: 'extracto.pdf', file: realFile },
      });
    });

    await act(async () => { getCtx().setAcceptTerms(true); });
    await act(async () => { getCtx().setAuthorizeVerification(true); });
    await act(async () => { await getCtx().submitApplication(); });

    expect(orden).toEqual(['upload', 'reuse']);
  });
});
