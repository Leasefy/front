/**
 * Copropiedades, QA de Contabilidad (CB-29, 03-10-2026). El armado es el de
 * `Copropiedades.test.tsx`. La fila no abre nada: la pantalla dice dónde se
 * asignan los inmuebles (en el contrato) con su enlace, y la fila no parece un
 * botón.
 */
import { describe, expect, it, afterEach, beforeEach, vi } from 'vitest';
import * as React from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';

void React;
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

vi.mock('@/lib/i18n', () => ({
  useI18n: () => ({
    t: (k: string) => k,
    locale: 'es',
    formatCurrency: (n: number) => `$ ${n}`,
    formatDate: (d: unknown) => String(d),
    formatNumber: (n: number) => String(n),
  }),
}));

const listar = vi.fn();
const crear = vi.fn();
vi.mock('@/lib/api/copropiedades.service', async () => {
  const real = await vi.importActual<typeof import('@/lib/api/copropiedades.service')>(
    '@/lib/api/copropiedades.service',
  );
  return {
    ...real,
    copropiedadesApi: {
      listar: (...a: unknown[]) => listar(...a),
      crear: (...a: unknown[]) => crear(...a),
      asignarAMandato: vi.fn(),
    },
  };
});

const toastError = vi.fn();
vi.mock('@/components/ui/toast', () => ({
  toast: { success: vi.fn(), error: (...a: unknown[]) => toastError(...a), info: vi.fn(), warning: vi.fn() },
}));

import { ApiError } from '@/lib/api/client';
import { Copropiedades } from './Copropiedades';

let host: HTMLDivElement | null = null;
let root: Root | null = null;

const esperar = () => act(async () => { await Promise.resolve(); });

async function montar() {
  host = document.createElement('div');
  document.body.appendChild(host);
  root = createRoot(host);
  await act(async () => { root!.render(<Copropiedades />); });
  await esperar();
  await esperar();
}

beforeEach(() => {
  listar.mockReset();
  crear.mockReset();
});

afterEach(() => {
  act(() => root?.unmount());
  host?.remove();
  host = null;
  root = null;
});

const $ = (s: string) => document.querySelector<HTMLElement>(s);
const texto = () => document.body.textContent ?? '';

describe('Copropiedades · CB-29', () => {
  it('🔴 dice dónde se asignan los inmuebles, con el enlace, y la fila no parece un botón', async () => {
    listar.mockResolvedValue({
      faltaLaMigracion: false,
      migracion: 'm',
      copropiedades: [
        {
          id: 'c-1',
          nombre: 'Conjunto Altos del Poblado',
          nit: '900123456',
          digitoVerificacion: 7,
          direccion: 'Cra. 43A #7-50',
          activa: true,
          inmuebles: 12,
        },
      ],
    });
    await montar();
    const nota = $('[data-testid="donde-se-asignan-los-inmuebles"]')!;
    expect(nota.textContent).toContain('ficha de su contrato');
    expect(nota.querySelector('a')!.getAttribute('href')).toBe('/panel/inmobiliaria/contratos');
    expect($('[data-testid="fila-de-copropiedad"]')!.className).toContain('hover:bg-transparent');
    void texto;
  });
});
