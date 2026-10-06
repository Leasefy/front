/**
 * QA-CONT-95 r3 · el extracto en pantalla:
 *  - C-06: la cuota de un inmueble con varios dueños e impuestos de un solo
 *    perfil sale en su fila con el aviso en palabras, y el resto carga;
 *  - E-10: el mes de una cesión dice los días del dueño, no «% del inmueble».
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


const AVISO = 'La cuota de octubre de 2026 de «Bodega 7» no se reparte en este extracto: el inmueble tiene 3 dueños y la cuota lleva IVA o retenciones liquidados para un solo perfil tributario. Hay que decidir a nombre de quién queda cada retención y liquidarla por fuera de la corrida del mes.';

describe('<ExtractoPropietario> · QA-CONT-95 r3', () => {
  it('🔴 C-06: la cuota sin repartir sale con su aviso y la otra línea carga', async () => {
    await render(
      extracto({
        lineItems: [linea({ propertyTitle: 'Oficina 801' })],
        cuotasSinRepartir: [{ cuotaId: 'q5', contractId: 'c5', mes: '2026-10', propertyTitle: 'Bodega 7', motivo: AVISO }],
      }),
    );
    const fila = container.querySelector('[data-testid="cuota-sin-repartir"]');
    expect(fila?.textContent).toContain('Bodega 7');
    expect(fila?.textContent).toContain('no se reparte en este extracto');
    expect(container.textContent).toContain('Oficina 801');
  });

  it('C-06: sin ninguna otra línea, sale el aviso y no «sin movimiento»', async () => {
    await render(
      extracto({
        lineItems: [],
        sinMovimiento: { codigo: 'SIN_MOVIMIENTO_DEL_MES', mensaje: 'Este mes no tuvo movimiento' },
        cuotasSinRepartir: [{ cuotaId: 'q5', contractId: 'c5', mes: '2026-10', propertyTitle: 'Bodega 7', motivo: AVISO }],
      }),
    );
    expect(container.querySelector('[data-testid="cuota-sin-repartir"]')).not.toBeNull();
    expect(container.textContent).not.toContain('Este mes no tuvo movimiento');
  });

  it('🔴 E-10: el mes de una cesión dice sus días', async () => {
    await render(extracto({ lineItems: [linea({ participacionLabel: '15 de 30 días' })] }));
    expect(porId('participacion-en-el-extracto')).toBe('15 de 30 días del mes (cesión)');
  });

  it('la copropiedad de siempre sigue diciendo «% del inmueble»', async () => {
    await render(extracto({ lineItems: [linea({ participacionLabel: '33,33 %' })] }));
    expect(porId('participacion-en-el-extracto')).toMatch(/^33,33 % /);
    expect(porId('participacion-en-el-extracto')).not.toContain('cesión');
  });
});
