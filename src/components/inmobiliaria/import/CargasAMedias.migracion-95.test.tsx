/**
 * 🔴 06-10-2026 (Nico, con captura): la migración NO va al centro de procesos
 * («todo al centro, menos migración», 01-10). Cada paso de la Puesta en
 * marcha muestra SUS cargas: aquí, la de inmuebles dice quién la subió, cuándo
 * y cuánto lleva o tardó (antes eso sólo lo decía el centro). QA-MIGRACION-95.
 */
import * as React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';

void React;
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

vi.mock('@/components/ui/toast', () => ({ toast: { success: vi.fn(), error: vi.fn(), warning: vi.fn(), info: vi.fn() } }));
vi.mock('@/lib/api/inmuebles-importacion.service', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api/inmuebles-importacion.service')>(
    '@/lib/api/inmuebles-importacion.service',
  );
  return { ...actual, inmueblesImportacionApi: { reintentar: vi.fn(), descartarLote: vi.fn() } };
});

import { CargasAMedias } from './CargasAMedias';
import type { EstadoDeLoteInmuebles } from '@/lib/api/inmuebles-importacion.service';

const CREANDO: EstadoDeLoteInmuebles = {
  lote: 'lote-20261006-aaaa1111',
  estado: 'PROCESANDO',
  total: 12,
  procesadas: 12,
  pendientes: 0,
  listos: 7,
  activados: 5,
  descartados: 0,
  jobId: null,
  error: null,
  creadoEn: '2026-10-06T13:31:00.000Z',
  actualizadoEn: '2026-10-06T13:34:00.000Z',
  fase: 'CREANDO',
  subidoPor: 'Mariana Migración Admin',
  origen: 'puesta-en-marcha',
} as EstadoDeLoteInmuebles;

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  vi.useFakeTimers({ now: new Date('2026-10-06T08:35:00-05:00') });
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});
afterEach(() => {
  act(() => root.unmount());
  container.remove();
  vi.useRealTimers();
});

describe('Las cargas del paso de inmuebles (fuera del centro de procesos)', () => {
  it('dice quién subió la carga, cuándo y cuánto lleva, en la misma tarjeta del paso', () => {
    act(() => {
      root.render(<CargasAMedias lotes={[CREANDO]} onRetomar={() => {}} onDescartada={() => {}} onCambio={() => {}} />);
    });
    const datos = container.querySelector(`[data-testid="datos-de-la-carga-${CREANDO.lote}"]`);
    expect(datos).not.toBeNull();
    expect(datos!.textContent).toBe('Subida por Mariana Migración Admin · el 6 de octubre, 8:31 a. m. · lleva 4 minutos');
    expect(container.textContent).not.toContain('centro de procesos');
  });
});
