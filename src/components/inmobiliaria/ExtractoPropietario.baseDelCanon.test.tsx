/**
 * ExtractoPropietario — «Canon recaudado» que nadie pagó.
 *
 * 🔴 El resumen decía «Canon recaudado» y la columna «Recaudado» sobre el canon
 * de las cuotas del mes: lo que el contrato CAUSA ese mes, haya pagado el
 * inquilino o no. Este extracto se le manda por correo al propietario.
 *
 * Con el diccionario REAL (es.json): con base CAUSADO la pantalla no puede
 * decir «recaudado» ni «recibido» en ningún lado; con RECAUDADO sí; con las dos
 * bases cada fila dice la suya. El número del canon no cambia.
 */

import * as React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';
import type { ExtractoPropietario as Extracto } from '@/lib/types/inmobiliaria';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock('@/lib/i18n', async () => await import('@/lib/i18n/i18n-test-stub'));
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, initial: _i, animate: _a, ...props }: React.ComponentProps<'div'> & Record<string, unknown>) =>
      React.createElement('div', props, children),
    tr: ({ children, initial: _i, animate: _a, transition: _t, ...props }: React.ComponentProps<'tr'> & Record<string, unknown>) =>
      React.createElement('tr', props, children),
  },
}));
vi.mock('@/lib/hooks/useInmobiliaria', () => ({
  usePropietarios: () => ({ propietarios: [] }),
  useInmobiliariaConfig: () => ({ config: { agency: { name: 'Inmobiliaria', nit: '1', address: null, city: null } } }),
}));

import { ExtractoPropietario } from './ExtractoPropietario';

type Linea = Extracto['lineItems'][number];

/** Una cuota del mes que el inquilino NO pagó: con base CAUSADO entra igual. */
const linea = (over: Partial<Linea> = {}): Linea => ({
  cuotaId: 'q-1', cobroId: null, contractId: 'ct-1', consignacionId: 'c-1',
  propertyTitle: 'Apartamento 301', propertyAddress: 'Cra 42',
  tenantName: 'Juan', rentAmount: 2_000_000, adminAmount: 150_000, totalAmount: 2_150_000, paidAmount: 0,
  status: 'COBRO_PENDING', commissionPercent: 10, commissionAmount: 200_000, netAmount: 1_800_000,
  rentCollected: 2_000_000, conceptosAFavor: 0, conceptosACargo: 0, deTerceros: 150_000,
  dispersionId: null, giradoCop: 0, enGiroCop: 0, porGirarCop: 1_800_000,
  estadoDelGiro: 'POR_GIRAR', renglones: [], ...over,
});

const extracto = (over: Partial<Extracto> = {}): Extracto => ({
  propietarioId: 'p1',
  propietarioName: 'Ana',
  month: '2026-09',
  generatedAt: '2026-09-16T18:00:00.000Z',
  lineItems: [linea({ baseDelCanon: 'CAUSADO' })],
  sinMovimiento: null,
  baseDelCanon: 'CAUSADO',
  totals: {
    totalRent: 2_000_000, totalAdmin: 150_000, totalPaid: 0, totalCommission: 200_000, totalNet: 1_800_000,
    totalConceptosAFavor: 0, totalConceptosACargo: 0, totalDeTerceros: 150_000,
    totalGirado: 0, totalEnGiro: 0, totalPorGirar: 1_800_000,
  },
  bankInfo: { bankName: null, bankAccountType: null, bankAccountNumber: null, bankAccountHolder: null },
  ...over,
});

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

async function render(e: Extracto) {
  await act(async () => {
    root.render(React.createElement(ExtractoPropietario, { extracto: e }));
  });
}

const porId = (id: string) => container.querySelector(`[data-testid="${id}"]`)?.textContent ?? '';

describe('<ExtractoPropietario> rotula el canon con su base', () => {
  it('🔴 con base CAUSADO no dice «recaudado» ni «recibido» en ningún lado, y explica qué es', async () => {
    await render(extracto());

    expect(container.textContent).not.toMatch(/recaud|recibid/i);
    expect(porId('extracto-columna-canon')).toBe('Causado');
    expect(porId('extracto-rotulo-canon')).toBe('Canon causado');
    expect(porId('extracto-que-es-el-canon')).toContain(
      'lo que el contrato cobra ese mes, aunque el inquilino no haya pagado',
    );
    expect(porId('extracto-de-terceros')).toContain('Además del canon, el contrato cobra');
  });

  it('🔴 un back que todavía no manda la base: las líneas de cuota igual se rotulan «causado»', async () => {
    await render(extracto({ baseDelCanon: undefined, lineItems: [linea()] }));

    expect(container.textContent).not.toMatch(/recaud|recibid/i);
    expect(porId('extracto-rotulo-canon')).toBe('Canon causado');
  });

  it('con base RECAUDADO (líneas viejas por cobro) sí dice «Canon recaudado»', async () => {
    await render(
      extracto({
        baseDelCanon: 'RECAUDADO',
        lineItems: [linea({ cuotaId: null, cobroId: 'cob-1', baseDelCanon: 'RECAUDADO', status: 'PAID', paidAmount: 2_150_000 })],
      }),
    );

    expect(porId('extracto-columna-canon')).toBe('Recaudado');
    expect(porId('extracto-rotulo-canon')).toBe('Canon recaudado');
    expect(container.querySelector('[data-testid="extracto-que-es-el-canon"]')).toBeNull();
    expect(porId('extracto-de-terceros')).toContain('Además se recaudaron');
    expect(container.textContent).not.toContain('Canon causado');
  });

  it('con las dos bases la columna dice «Canon» y cada fila la suya', async () => {
    await render(
      extracto({
        baseDelCanon: 'MIXTA',
        lineItems: [
          linea({ baseDelCanon: 'CAUSADO' }),
          linea({ cuotaId: null, cobroId: 'cob-1', consignacionId: 'c-2', propertyTitle: 'Local 5', baseDelCanon: 'RECAUDADO' }),
        ],
      }),
    );

    expect(porId('extracto-columna-canon')).toBe('Canon');
    expect(porId('extracto-rotulo-canon')).toBe('Canon causado y recaudado');
    const porFila = Array.from(container.querySelectorAll('[data-testid="extracto-base-de-la-fila"]')).map(
      (el) => [el.closest('tr')?.textContent?.includes('Local 5') ? 'local' : 'apto', el.textContent],
    );
    expect(porFila).toEqual([
      ['apto', 'causado'],
      ['local', 'recaudado'],
    ]);
    expect(porId('extracto-de-terceros')).toContain('Además del canon hay');
  });

  it('el número del canon es el mismo con cualquier rótulo', async () => {
    await render(extracto());
    const causado = container.querySelector('[data-testid="extracto-rotulo-canon"]')!.nextElementSibling!.textContent;
    await render(extracto({ baseDelCanon: 'RECAUDADO', lineItems: [linea({ baseDelCanon: 'RECAUDADO' })] }));
    const recaudado = container.querySelector('[data-testid="extracto-rotulo-canon"]')!.nextElementSibling!.textContent;

    expect(causado).toBe(recaudado);
    expect(causado).toMatch(/2\.000\.000/);
  });
});
