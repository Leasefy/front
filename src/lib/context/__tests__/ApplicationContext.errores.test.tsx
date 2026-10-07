/**
 * ApplicationContext — los errores del envío con la regla de oro (02-10-2026).
 *
 * Antes, cualquier fallo que no fuera uno de los tres códigos conocidos
 * (`IDENTIDAD_NO_COINCIDE`, `INICIA_SESION`, `PROPIEDAD_EN_VENTA`) mostraba
 * `err.message` tal cual: un 5xx en inglés, un volcado, y un documento que no
 * subió decía `No pudimos subir el documento "ID_DOCUMENT". <crudo>`. Ahora:
 *  · lo que el back rechazó por campo va a SU campo y el asistente vuelve al
 *    paso de ese campo;
 *  · un 5xx dice que fue nuestro, con la referencia; «conexión» sólo sin respuesta;
 *  · las referencias del prellenado se atajan con los topes del back.
 */

import * as React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';

void React; // jsx-preserve

const { mockGetConsentText, mockCreate, mockUploadDocument, mockGetPrefill } = vi.hoisted(() => ({
  mockGetConsentText: vi.fn(),
  mockCreate: vi.fn(),
  mockUploadDocument: vi.fn(),
  mockGetPrefill: vi.fn(),
}));

vi.mock('@/lib/api/legal.service', () => ({
  getConsentText: mockGetConsentText,
  ConsentTextNotFoundError: class ConsentTextNotFoundError extends Error {},
}));

vi.mock('@/lib/api/applications.service', () => ({
  applicationsApi: {
    create: mockCreate,
    createGuest: vi.fn(),
    uploadDocument: mockUploadDocument,
    updateStep: vi.fn(),
    respondToInfoRequest: vi.fn(),
    reuseDocuments: vi.fn().mockResolvedValue({ copiados: [], yaEstaban: [], fallaron: [] }),
    getPrefill: mockGetPrefill,
  },
}));

vi.mock('@/lib/utils/storage', () => ({
  StorageManager: class StorageManager {
    get() { return null; }
    set() { /* noop */ }
    remove() { /* noop */ }
  },
}));

vi.mock('@/lib/api/client', () => ({
  getAccessToken: () => 'fake-token',
  setAccessToken: vi.fn(),
  ApiError: class ApiError extends Error {
    constructor(public status: number, msg: string, public code?: string) { super(msg); }
  },
}));

vi.mock('@/lib/utils/logger', () => ({
  contextLogger: { error: vi.fn(), info: vi.fn(), warn: vi.fn() },
}));

import { ApplicationProvider, useApplication } from '@/lib/context/ApplicationContext';

/** Un error con la forma de `ApiError` (el cliente está mockeado en esta suite). */
function errorDelBack(status: number, cuerpo: Record<string, unknown>) {
  const mensaje = Array.isArray(cuerpo.message) ? cuerpo.message.join(' · ') : String(cuerpo.message ?? '');
  return Object.assign(new Error(mensaje), {
    name: 'ApiError',
    status,
    code: cuerpo.code,
    messages: Array.isArray(cuerpo.message) ? cuerpo.message : undefined,
    detalle: cuerpo,
  });
}

const SAMPLE_CONSENT = {
  version: 'habeas-data-centrales-v1',
  type: 'habeas-data-centrales',
  lang: 'es',
  title: 'Autorización',
  text: 'Autorizo…',
  effective_from: '2026-06-08',
  supersedes: null,
};

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  vi.clearAllMocks();
  mockGetConsentText.mockResolvedValue(SAMPLE_CONSENT);
  mockCreate.mockResolvedValue({ id: 'app-123' });
  mockUploadDocument.mockResolvedValue(undefined);
  mockGetPrefill.mockResolvedValue({ hasPreviousApplication: false });
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => { root.unmount(); });
  container.remove();
  vi.restoreAllMocks();
});

async function renderProvider() {
  let ctx: ReturnType<typeof useApplication> | null = null;
  function Probe() {
    ctx = useApplication();
    return null;
  }
  await act(async () => {
    root.render(
      <ApplicationProvider propertyId="prop-test" mode="create">
        <Probe />
      </ApplicationProvider>,
    );
  });
  return () => ctx!;
}

async function enviar(getCtx: () => ReturnType<typeof useApplication>) {
  await act(async () => { getCtx().setAcceptTerms(true); });
  await act(async () => { getCtx().setAuthorizeVerification(true); });
  await act(async () => { await getCtx().submitApplication(); });
}

const TOPE = 'El salario no puede pasar de $2.000.000.000.';

describe('ApplicationContext — errores del envío (02-10-2026)', () => {
  it('🔴 un 400 con campos: el error va a su campo y el asistente vuelve a ese paso', async () => {
    mockCreate.mockRejectedValue(
      errorDelBack(400, {
        statusCode: 400,
        code: 'DATOS_INVALIDOS',
        message: [TOPE],
        campos: [{ campo: 'monthlySalary', regla: 'maximo', mensaje: TOPE }],
      }),
    );
    const getCtx = await renderProvider();
    await enviar(getCtx);

    expect(getCtx().erroresDelServidor).toEqual({ monthlySalary: TOPE });
    expect(getCtx().currentStep).toBe(3);
    // Todo quedó en su campo: el aviso sólo invita a mirarlo, sin repetir el texto.
    expect(getCtx().submissionError).toBe('Revisa los datos marcados antes de enviar.');

    // Al corregir el salario, el error del servidor se va.
    await act(async () => { getCtx().updateIncome({ monthlySalary: 3_000_000 }); });
    expect(getCtx().erroresDelServidor).toEqual({});
  });

  it('un campo que el asistente no muestra va al aviso general', async () => {
    mockCreate.mockRejectedValue(
      errorDelBack(400, {
        code: 'DATOS_INVALIDOS',
        message: ['Elige un código de agente válido.'],
        campos: [{ campo: 'agentCode', regla: 'formato', mensaje: 'Elige un código de agente válido.' }],
      }),
    );
    const getCtx = await renderProvider();
    await enviar(getCtx);
    expect(getCtx().erroresDelServidor).toEqual({});
    expect(getCtx().submissionError).toBe('Elige un código de agente válido.');
  });

  it('🔴 un 5xx dice que fue nuestro, con la referencia, sin culpar a la conexión', async () => {
    mockCreate.mockRejectedValue(
      errorDelBack(500, {
        statusCode: 500,
        code: 'ERROR_INTERNO',
        message: 'Internal server error',
        referencia: 'ab12cd34',
      }),
    );
    const getCtx = await renderProvider();
    await enviar(getCtx);
    const texto = String(getCtx().submissionError);
    expect(texto).toMatch(/^No pudimos enviar tu postulación: algo falló de nuestro lado/);
    expect(texto).toContain('ab12cd34');
    expect(texto).not.toMatch(/conexi[oó]n|Internal server error/);
  });

  it('sin respuesta (la red): ahí sí se habla de la conexión', async () => {
    mockCreate.mockRejectedValue(new TypeError('Failed to fetch'));
    const getCtx = await renderProvider();
    await enviar(getCtx);
    expect(String(getCtx().submissionError)).toMatch(/conexión/);
  });

  it('🔴 un documento que no subió lo nombra en español, sin el código ni el texto crudo', async () => {
    mockUploadDocument.mockRejectedValue(
      errorDelBack(400, { code: 'ARCHIVO_INVALIDO', message: 'El archivo supera los 10 MB.' }),
    );
    const getCtx = await renderProvider();
    await act(async () => {
      getCtx().updateDocuments({
        idDocument: {
          file: new File(['x'], 'cedula.pdf', { type: 'application/pdf' }),
          fileName: 'cedula.pdf',
          uploadedAt: new Date().toISOString(),
        },
      });
    });
    await enviar(getCtx);
    expect(getCtx().submissionError).toBe(
      'No pudimos subir tu documento de identidad: El archivo supera los 10 MB.',
    );
    expect(getCtx().submissionError).not.toContain('ID_DOCUMENT');
  });

  it('🔴 más de 10 referencias del prellenado se atajan con la frase del back, sin enviar', async () => {
    mockGetPrefill.mockResolvedValue({
      hasPreviousApplication: true,
      fullName: 'Ana Pérez',
      email: 'ana@correo.com',
      references: {
        previousLandlords: Array.from({ length: 11 }, (_, i) => ({
          name: `Arrendador ${i}`,
          phone: '3001112233',
          address: 'Calle 5',
          duration: 12,
          relationship: 'landlord',
        })),
        employmentReferences: [],
        personalReferences: [],
      },
    });
    const getCtx = await renderProvider();
    await act(async () => { await new Promise((r) => setTimeout(r, 0)); });
    expect(getCtx().application.references.previousLandlords).toHaveLength(11);
    await enviar(getCtx);
    expect(mockCreate).not.toHaveBeenCalled();
    expect(getCtx().submissionError).toBe('Puedes agregar hasta 10 arrendadores anteriores.');
  });
});
