/**
 * @vitest-environment happy-dom
 *
 * 02-10-2026 (Nico) · El análisis de documentos del propietario se tragaba en
 * silencio un fallo al cargar que no era 404: la sección decía «Inicia el
 * analisis…» como si no hubiera nada y ofrecía analizar de nuevo. Ahora:
 *  · 404 → «todavía no hay análisis», como siempre (sin cartel de fallo);
 *  · 500 → `FalloDeCarga`: «de nuestro lado» con la referencia del back y
 *    «Intentar de nuevo»;
 *  · reintentar vuelve a pedir los resultados.
 */
import * as React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const api = vi.hoisted(() => ({ getResults: vi.fn(), triggerAnalysis: vi.fn() }));
vi.mock('@/lib/api/ai-analysis.service', () => ({ aiAnalysisApi: api }));

import { ApiError } from '@/lib/api/client';
import { DocumentAnalysisSection } from './DocumentAnalysisSection';

const ERROR_500_CON_REFERENCIA = new ApiError(500, 'Error interno del servidor.', 'ERROR_INTERNO', {
  statusCode: 500,
  code: 'ERROR_INTERNO',
  message: 'Error interno del servidor.',
  referencia: 'ab12cd34',
});

/** Un análisis terminado con un documento: lo que se ve cuando la carga sale bien. */
const TERMINADO = {
  applicationId: 'app-1',
  results: [
    {
      id: 'r-1',
      documentId: 'd-1',
      documentType: 'CEDULA',
      status: 'COMPLETED',
      scoreFinal: 80,
      nivelRiesgo: 'BAJO',
      justificacion: null,
      recomendacion: null,
      flags: [],
      errorMessage: null,
      processingTimeMs: null,
      confidence: null,
    },
  ],
  crossValidation: null,
  summary: { total: 1, completed: 1, processing: 0, failed: 0, pending: 0, averageScore: 80 },
};

let container: HTMLDivElement;
let root: Root;

async function montar() {
  await act(async () => {
    root.render(<DocumentAnalysisSection applicationId="app-1" />);
  });
  await act(async () => {
    await Promise.resolve();
  });
}

const fallo = () => container.querySelector('[data-testid="fallo-de-carga"]');
const botonReintentar = () => container.querySelector<HTMLButtonElement>('[data-testid="reintentar"]');
const botonAnalizar = () =>
  Array.from(container.querySelectorAll('button')).find((b) => /Analizar documentos/.test(b.textContent ?? ''));

beforeEach(() => {
  api.getResults.mockReset();
  api.triggerAnalysis.mockReset();
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

describe('DocumentAnalysisSection — el fallo al cargar', () => {
  it('un 404 (todavía no hay análisis) no muestra fallo: invita a analizar, como siempre', async () => {
    api.getResults.mockRejectedValueOnce(new ApiError(404, 'No encontrado'));
    await montar();

    expect(fallo()).toBeNull();
    expect(container.textContent).toContain('Inicia el analisis para verificar los documentos');
    expect(botonAnalizar()).toBeTruthy();
  });

  it('🔴 un 500 muestra el fallo «de nuestro lado» con la referencia y «Intentar de nuevo»', async () => {
    api.getResults.mockRejectedValueOnce(ERROR_500_CON_REFERENCIA);
    await montar();

    expect(fallo()).not.toBeNull();
    expect(fallo()?.getAttribute('data-tipo')).toBe('servidor');
    expect(fallo()?.textContent).toContain('ab12cd34');
    expect(fallo()?.textContent).not.toMatch(/conexi[oó]n/i);
    expect(botonReintentar()).not.toBeNull();
    // Ni el texto crudo a la vista ni el «Inicia el análisis» de cuando no hay nada.
    expect(container.textContent).not.toContain('Inicia el analisis');
    // No se ofrece analizar a ciegas: no sabemos si ya hay un análisis.
    expect(botonAnalizar()).toBeUndefined();
  });

  it('sin respuesta (status 0) no muestra referencia', async () => {
    api.getResults.mockRejectedValueOnce(new ApiError(0, 'No pudimos conectarnos al servidor.'));
    await montar();

    expect(fallo()).not.toBeNull();
    expect(fallo()?.getAttribute('data-tipo')).toBe('red');
    expect(fallo()?.textContent).not.toContain('Referencia');
  });

  it('«Intentar de nuevo» vuelve a pedir y, si sale bien, pinta los resultados', async () => {
    api.getResults.mockRejectedValueOnce(ERROR_500_CON_REFERENCIA);
    await montar();
    expect(api.getResults).toHaveBeenCalledTimes(1);

    api.getResults.mockResolvedValueOnce(TERMINADO);
    await act(async () => {
      botonReintentar()?.click();
    });
    await act(async () => {
      await Promise.resolve();
    });

    expect(api.getResults).toHaveBeenCalledTimes(2);
    expect(api.getResults).toHaveBeenLastCalledWith('app-1');
    expect(fallo()).toBeNull();
    expect(container.textContent).toContain('Cedula');
    expect(container.textContent).toContain('Score: 80/100');
  });
});
