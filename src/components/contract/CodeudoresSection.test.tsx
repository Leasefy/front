/**
 * T-0109 contract.md §3.1.E1–E4 — CodeudoresSection. Coverage:
 *   (1) hides on a 404 (back sin WU-4)
 *   (2) lists codeudores, "En pagaré" badge
 *   (3) add/edit/delete hidden without puedeEditar
 *   (4) opens the form and creates a codeudor
 */
import * as React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';
import { ApiError } from '@/lib/api/client';
import type { CodeudorResponse } from '@/lib/api/pagare.types';

void React;

const list = vi.fn();
const create = vi.fn();
const update = vi.fn();
const remove = vi.fn();

vi.mock('@/lib/api/pagare.service', () => ({
  codeudoresApi: {
    list: (...a: unknown[]) => list(...a),
    create: (...a: unknown[]) => create(...a),
    update: (...a: unknown[]) => update(...a),
    remove: (...a: unknown[]) => remove(...a),
  },
}));

import { CodeudoresSection } from './CodeudoresSection';

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  [list, create, update, remove].forEach((m) => m.mockReset());
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  vi.restoreAllMocks();
});

async function montar(puedeEditar = true) {
  await act(async () => {
    root.render(<CodeudoresSection contractId="c-1" puedeEditar={puedeEditar} />);
    await Promise.resolve();
    await Promise.resolve();
  });
}

function codeudor(overrides: Partial<CodeudorResponse> = {}): CodeudorResponse {
  return {
    id: 'k-1',
    contractId: 'c-1',
    nombre: 'Pedro Pérez',
    tipoDeDocumento: 'CC',
    documento: '123456',
    email: 'pedro@x.com',
    celular: '+573001234567',
    enPagare: false,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

describe('<CodeudoresSection>', () => {
  it('renders nothing on a 404', async () => {
    list.mockRejectedValueOnce(new ApiError(404, 'not found'));
    await montar();
    expect(container.querySelector('[data-testid="codeudores-section"]')).toBeNull();
  });

  it('lists codeudores with the "En pagaré" badge', async () => {
    list.mockResolvedValueOnce([codeudor({ enPagare: true })]);
    await montar();
    const item = container.querySelector('[data-testid="codeudor-item"]');
    expect(item?.textContent).toContain('Pedro Pérez');
    expect(item?.textContent).toContain('En pagaré');
  });

  it('shows an empty state with no codeudores', async () => {
    list.mockResolvedValueOnce([]);
    await montar();
    expect(container.textContent).toContain('no tiene codeudores');
  });

  it('hides add/edit/delete without puedeEditar', async () => {
    list.mockResolvedValueOnce([codeudor()]);
    await montar(false);
    expect(container.querySelector('[data-testid="agregar-codeudor"]')).toBeNull();
    expect(container.querySelector('[data-testid="editar-codeudor"]')).toBeNull();
    expect(container.querySelector('[data-testid="eliminar-codeudor"]')).toBeNull();
  });

  it('opens the form and creates a codeudor', async () => {
    list.mockResolvedValueOnce([]);
    create.mockResolvedValueOnce(codeudor());
    await montar(true);

    act(() => {
      (container.querySelector('[data-testid="agregar-codeudor"]') as HTMLButtonElement).click();
    });
    expect(container.querySelector('[data-testid="formulario-codeudor"]')).not.toBeNull();

    const set = (testid: string, value: string) => {
      const el = container.querySelector(`[data-testid="${testid}"]`) as HTMLInputElement;
      const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')!.set!;
      setter.call(el, value);
      el.dispatchEvent(new Event('input', { bubbles: true }));
    };
    act(() => {
      set('codeudor-nombre', 'Pedro Pérez');
      set('codeudor-documento', '123456');
      set('codeudor-email', 'pedro@x.com');
      set('codeudor-celular', '+573001234567');
    });

    list.mockResolvedValueOnce([codeudor()]);
    await act(async () => {
      (container.querySelector('[data-testid="guardar-codeudor"]') as HTMLButtonElement).click();
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(create).toHaveBeenCalledWith('c-1', expect.objectContaining({ nombre: 'Pedro Pérez', documento: '123456' }));
  });
});
