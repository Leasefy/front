/**
 * ExtractoPropietario — lo que se ve sale del extracto, y los botones hacen
 * lo que dicen.
 *
 * Reventaba con «reading 'bank'» al leer `bankAccount` de la lista de
 * propietarios (que llega con el banco plano); «Enviar por Email» esperaba un
 * segundo de mentira y decía «enviado» sin mandar nada; «Descargar PDF» decía
 * «descargado» antes de que bajara.
 */

import * as React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';
import type { ExtractoPropietario as Extracto } from '@/lib/types/inmobiliaria';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const { toast } = vi.hoisted(() => ({ toast: { success: vi.fn(), error: vi.fn() } }));

vi.mock('sonner', () => ({ toast }));
vi.mock('@/lib/i18n', () => ({ useI18n: () => ({ t: (k: string) => k, locale: 'es' }) }));
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, initial: _i, animate: _a, ...props }: React.ComponentProps<'div'> & Record<string, unknown>) =>
      React.createElement('div', props, children),
  },
}));
// La lista de propietarios llega SIN `bankAccount` (banco plano, como el back
// la manda cuando algo se salta la normalización): el extracto no debe depender de eso.
vi.mock('@/lib/hooks/useInmobiliaria', () => ({
  usePropietarios: () => ({
    propietarios: [{ id: 'p1', name: 'Rentas', email: 'pagos@rentas.co', phone: '601', documentType: 'NIT', documentNumber: '9' }],
  }),
  useInmobiliariaConfig: () => ({ config: { agency: { name: 'portofinoqaprb', nit: '1', address: null, city: null } } }),
}));

import { ExtractoPropietario } from './ExtractoPropietario';

const extracto: Extracto = {
  propietarioId: 'p1',
  propietarioName: 'Rentas',
  month: '2026-09',
  generatedAt: '2026-09-02T18:00:00.000Z',
  lineItems: [],
  totals: {
    totalRent: 0, totalAdmin: 0, totalPaid: 0, totalCommission: 0, totalNet: 0,
    totalConceptosAFavor: 0, totalConceptosACargo: 0, totalDeTerceros: 0,
  },
  bankInfo: { bankName: 'Banco Caja Social', bankAccountType: 'Corriente', bankAccountNumber: '36500386693', bankAccountHolder: 'Rentas' },
};

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
  vi.clearAllMocks();
});

async function render(props: Partial<React.ComponentProps<typeof ExtractoPropietario>> = {}) {
  await act(async () => {
    root.render(React.createElement(ExtractoPropietario, { extracto, ...props }));
  });
}

async function clickTestId(id: string) {
  const el = container.querySelector<HTMLButtonElement>(`[data-testid="${id}"]`);
  if (!el) throw new Error(`no está ${id}`);
  await act(async () => {
    el.click();
    await new Promise((r) => setTimeout(r, 0));
  });
}

describe('<ExtractoPropietario>', () => {
  it('la cuenta bancaria sale del extracto, aunque la lista de propietarios venga sin bankAccount', async () => {
    await render();
    const banco = container.querySelector('[data-testid="extracto-banco"]')!.textContent;
    expect(banco).toContain('Banco Caja Social');
    expect(banco).toContain('36500386693');
  });

  it('sin cuenta registrada lo dice, no deja el bloque en blanco', async () => {
    await render({ extracto: { ...extracto, bankInfo: { bankName: null, bankAccountType: null, bankAccountNumber: null, bankAccountHolder: null } } });
    expect(container.querySelector('[data-testid="extracto-banco"]')!.textContent).toBe('inmobiliaria.propietario.extracto.sinCuenta');
  });

  it('el mes va con la inicial en mayúscula, no «Septiembre De 2026»', async () => {
    await render();
    expect(container.textContent).toContain('Septiembre de 2026');
    expect(container.textContent).not.toContain('Septiembre De 2026');
  });

  it('sin handlers no hay botones de PDF ni de correo: un botón que no hace nada no se muestra', async () => {
    await render();
    expect(container.querySelector('[data-testid="extracto-descargar"]')).toBeNull();
    expect(container.querySelector('[data-testid="extracto-enviar"]')).toBeNull();
  });

  it('«Descargar PDF» espera al handler y sólo entonces dice «descargado»', async () => {
    const onDownloadPDF = vi.fn(async () => undefined);
    await render({ onDownloadPDF });
    await clickTestId('extracto-descargar');
    expect(onDownloadPDF).toHaveBeenCalledTimes(1);
    expect(toast.success).toHaveBeenCalledWith('inmobiliaria.propietario.extracto.pdfDownloaded', expect.anything());
  });

  it('si el PDF falla no dice «descargado»: dice qué pasó', async () => {
    await render({ onDownloadPDF: vi.fn(async () => { throw new Error('503'); }) });
    await clickTestId('extracto-descargar');
    expect(toast.success).not.toHaveBeenCalled();
    expect(toast.error).toHaveBeenCalledWith('inmobiliaria.propietario.extracto.pdfError', { description: '503' });
  });

  it('«Enviar por Email» manda de verdad y sólo dice «enviado» si el envío resolvió', async () => {
    const onEmail = vi.fn(async () => { throw new Error('El propietario no tiene correo registrado'); });
    await render({ onEmail });
    await clickTestId('extracto-enviar');
    expect(onEmail).toHaveBeenCalledTimes(1);
    expect(toast.success).not.toHaveBeenCalled();
    expect(toast.error).toHaveBeenCalledWith('inmobiliaria.propietario.extracto.emailError', {
      description: 'El propietario no tiene correo registrado',
    });
  });
});
