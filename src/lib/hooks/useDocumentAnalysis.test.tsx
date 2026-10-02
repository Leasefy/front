/**
 * @vitest-environment happy-dom
 *
 * 02-10-2026 · «Arréglalos con el traductor» (Nico). El hook guardaba el
 * `err.message` crudo y `DocumentAnalysisSection` lo pintaba tal cual: un
 * «Internal error: …» en inglés, o el texto de un 500 sin la referencia. Ahora
 * guarda la frase del traductor: «conexión» sólo sin respuesta, un 4xx dice qué
 * está mal y un 5xx, «de nuestro lado» con la referencia.
 */
import * as React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const api = vi.hoisted(() => ({ getResults: vi.fn(), triggerAnalysis: vi.fn() }));
vi.mock('@/lib/api/ai-analysis.service', () => ({ aiAnalysisApi: api }));

import { ApiError } from '@/lib/api/client';
import { useDocumentAnalysis } from './useDocumentAnalysis';

type Hook = ReturnType<typeof useDocumentAnalysis>;

let ultimo: Hook | null = null;
function Sonda() {
  ultimo = useDocumentAnalysis('app-1');
  return null;
}

let container: HTMLDivElement;
let root: Root;

/** Resultados con todo terminado: el montaje no deja un sondeo corriendo. */
const TERMINADO = {
  applicationId: 'app-1',
  results: [],
  crossValidation: null,
  summary: { total: 1, completed: 1, processing: 0, failed: 0, pending: 0, averageScore: 80 },
};

const ERROR_500_CON_REFERENCIA = new ApiError(500, 'Error interno del servidor.', 'ERROR_INTERNO', {
  statusCode: 500,
  code: 'ERROR_INTERNO',
  message: 'Error interno del servidor.',
  referencia: 'ab12cd34',
});

async function montar() {
  await act(async () => {
    root.render(<Sonda />);
  });
  await act(async () => {
    await Promise.resolve();
  });
}

async function traerResultados() {
  await act(async () => {
    await ultimo?.fetchResults();
  });
}

async function iniciarAnalisis() {
  await act(async () => {
    await ultimo?.triggerAnalysis().catch(() => undefined);
  });
}

beforeEach(() => {
  api.getResults.mockReset();
  api.triggerAnalysis.mockReset();
  api.getResults.mockResolvedValueOnce(TERMINADO);
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  ultimo = null;
});

describe('useDocumentAnalysis — el error pasa por el traductor', () => {
  it('🔴 un Error(«Internal error: …») no deja el texto crudo en inglés: es nuestro', async () => {
    await montar();
    api.getResults.mockRejectedValueOnce(
      new Error("Internal error: Cannot read properties of undefined (reading 'summary')"),
    );
    await traerResultados();

    expect(ultimo?.error).not.toBeNull();
    expect(ultimo?.error).not.toMatch(/Internal error|Cannot read/);
    expect(ultimo?.error).toMatch(/^No pudimos traer los resultados del análisis: algo falló de nuestro lado/);
  });

  it('🔴 un 500 con referencia dice «de nuestro lado» y la referencia', async () => {
    await montar();
    api.getResults.mockRejectedValueOnce(ERROR_500_CON_REFERENCIA);
    await traerResultados();

    expect(ultimo?.error).toMatch(/^No pudimos traer los resultados del análisis: algo falló de nuestro lado/);
    expect(ultimo?.error).toContain('ab12cd34');
    expect(ultimo?.error).not.toMatch(/conexi[oó]n/i);
  });

  it('iniciar el análisis: un 4xx dice qué está mal (el message del back), no «conexión»', async () => {
    await montar();
    api.triggerAnalysis.mockRejectedValueOnce(
      new ApiError(400, 'La postulación no tiene documentos para analizar.', 'SIN_DOCUMENTOS'),
    );
    await iniciarAnalisis();

    expect(ultimo?.error).toBe('La postulación no tiene documentos para analizar.');
    expect(ultimo?.isAnalyzing).toBe(false);
  });

  it('iniciar el análisis: un 5xx con referencia dice «de nuestro lado» con la acción', async () => {
    await montar();
    api.triggerAnalysis.mockRejectedValueOnce(ERROR_500_CON_REFERENCIA);
    await iniciarAnalisis();

    expect(ultimo?.error).toMatch(/^No pudimos iniciar el análisis de los documentos: algo falló de nuestro lado/);
    expect(ultimo?.error).toContain('ab12cd34');
  });

  it('sólo sin respuesta (status 0) habla de la conexión', async () => {
    await montar();
    api.getResults.mockRejectedValueOnce(new ApiError(0, 'No pudimos conectarnos al servidor.'));
    await traerResultados();

    expect(ultimo?.error).toMatch(/conexi[oó]n/i);
  });

  it('un 404 sigue sin ser un error (todavía no hay análisis)', async () => {
    await montar();
    api.getResults.mockRejectedValueOnce(new ApiError(404, 'No encontrado'));
    await traerResultados();

    expect(ultimo?.error).toBeNull();
    expect(ultimo?.results).toBeNull();
  });
});
