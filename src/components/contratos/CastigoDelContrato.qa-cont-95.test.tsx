/**
 * QA-CONT-95 r3 · D-24: la ficha del contrato dice que su cartera está castigada
 * y que sigue debiéndose (o que hay un castigo propuesto esperando firmas).
 */
import * as React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const listar = vi.fn();
vi.mock('@/lib/api/castigo.service', () => ({ castigoApi: { listar: (...a: unknown[]) => listar(...a) } }));

import { CastigoDelContrato } from './CastigoDelContrato';

const castigo = (extra: Record<string, unknown> = {}) => ({
  id: 'k1', contractId: 'c1', estado: 'CASTIGADA', capitalCop: 3_600_000, interesCop: 0, cuotas: 2,
  motivo: 'Incobrable', propuestoPor: { userId: 'u', nombre: 'Ana', at: '2026-10-01T15:00:00Z' },
  admin: null, contador: null, castigadaAt: '2026-10-02T15:00:00Z', rechazo: null, reversa: null, notas: null,
  recuperadoCop: 0, anuladoCop: 0, sinRecuperarCop: 3_600_000, queFalta: null, ...extra,
});

let container: HTMLDivElement;
let root: Root;
beforeEach(() => {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  listar.mockReset();
});
afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

async function pintar() {
  await act(async () => {
    root.render(React.createElement(CastigoDelContrato, { contractId: 'c1' }));
  });
  await act(async () => { await Promise.resolve(); });
}

describe('<CastigoDelContrato> (D-24)', () => {
  it('🔴 castigada: lo dice con la fecha, la cifra y que sigue debiéndose', async () => {
    listar.mockResolvedValue({ disponible: true, motivo: null, castigos: [castigo()] });
    await pintar();
    const t = container.querySelector('[data-testid="castigo-del-contrato"]');
    expect(listar).toHaveBeenCalledWith({ contractId: 'c1' });
    expect(t?.getAttribute('data-estado')).toBe('CASTIGADA');
    expect(t?.textContent).toContain('Cartera castigada');
    expect(t?.textContent).toContain('2 cuotas');
    expect(t?.textContent).toContain('Sigue debiéndose');
  });

  it('propuesta: dice qué falta para quedar castigada', async () => {
    listar.mockResolvedValue({ disponible: true, motivo: null, castigos: [castigo({ estado: 'PROPUESTO', castigadaAt: null, queFalta: 'Falta la firma del contador.' })] });
    await pintar();
    const t = container.querySelector('[data-testid="castigo-del-contrato"]');
    expect(t?.getAttribute('data-estado')).toBe('PROPUESTO');
    expect(t?.textContent).toContain('Falta la firma del contador.');
  });

  it('sin castigos, sin permiso o sin la migración: nada', async () => {
    listar.mockResolvedValue({ disponible: true, motivo: null, castigos: [castigo({ estado: 'REVERSADO' })] });
    await pintar();
    expect(container.querySelector('[data-testid="castigo-del-contrato"]')).toBeNull();
    listar.mockRejectedValue(new Error('403'));
    await pintar();
    expect(container.querySelector('[data-testid="castigo-del-contrato"]')).toBeNull();
  });
});
