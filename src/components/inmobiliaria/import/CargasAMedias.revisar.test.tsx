/**
 * Revisora r25 (Importar): la carga terminada decía «19 por revisar» y su único botón era «Ver resumen». Ahora la
 * acción dice cuántas («Revisar las 19») y le pide al asistente abrir esa revisión; el resumen sigue al lado.
 */
import * as React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';

void React;
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

vi.mock('@/components/ui/toast', () => ({ toast: { success: vi.fn(), error: vi.fn(), warning: vi.fn(), info: vi.fn() } }));

import { CargasAMedias } from './CargasAMedias';
import type { EstadoDeLoteInmuebles } from '@/lib/api/inmuebles-importacion.service';

const TERMINADA: EstadoDeLoteInmuebles = {
  lote: 'lote-9',
  estado: 'LISTO',
  total: 2939,
  procesadas: 2939,
  pendientes: 19,
  listos: 0,
  activados: 2920,
  descartados: 0,
  jobId: null,
  error: null,
  creadoEn: '2026-10-14T18:32:00.000Z',
  fase: 'TERMINADA',
  puedeReintentar: false,
} as EstadoDeLoteInmuebles;

let container: HTMLDivElement;
let root: Root;

function montar(lote: EstadoDeLoteInmuebles, onRetomar = vi.fn()) {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => {
    root.render(<CargasAMedias lotes={[lote]} onRetomar={onRetomar} onDescartada={() => {}} onCambio={() => {}} />);
  });
  return onRetomar;
}

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

describe('CargasAMedias · carga terminada con filas por revisar', () => {
  it('«Revisar las 19» dice cuántas y pide abrir la revisión de ESA carga', () => {
    const onRetomar = montar(TERMINADA);
    const boton = container.querySelector<HTMLButtonElement>('[data-testid="revisar-lote-9"]')!;
    expect(boton.textContent).toBe('Revisar las 19');
    act(() => boton.click());
    expect(onRetomar).toHaveBeenCalledWith(expect.objectContaining({ lote: 'lote-9' }), { revisar: true });
    // El resumen sigue a la mano.
    expect(container.querySelector('[data-testid="retomar-lote-9"]')!.textContent).toBe('Ver resumen');
  });

  it('sin filas por revisar no ofrece revisar: sólo el resumen', () => {
    montar({ ...TERMINADA, pendientes: 0, porRevisar: 0 } as EstadoDeLoteInmuebles);
    expect(container.querySelector('[data-testid="revisar-lote-9"]')).toBeNull();
    expect(container.querySelector('[data-testid="retomar-lote-9"]')).not.toBeNull();
  });
});
