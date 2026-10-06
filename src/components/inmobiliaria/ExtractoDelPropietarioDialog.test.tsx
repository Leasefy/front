/**
 * «Generar extracto» desde la ficha del propietario.
 *
 * 🔴 P-23 (QA-PROP, 03-10): el mes se elegía con el `<input type="month">` del
 * navegador («October 2026» en un panel en español) y las acciones (Imprimir /
 * Enviar por email / Descargar PDF) quedaban al final del documento, detrás
 * del scroll del diálogo. Ahora el mes es el selector de la casa y las
 * acciones van en el pie fijo del diálogo.
 */

import * as React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';
import type { ExtractoPropietario as Extracto } from '@/lib/types/inmobiliaria';

void React;
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const api = vi.hoisted(() => ({ getExtracto: vi.fn(), getExtractoPdf: vi.fn(), enviarExtracto: vi.fn() }));
vi.mock('@/lib/api/inmobiliaria.service', () => ({ propietariosApi: api }));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
// `t` estable, como el de la app (`useCallback`): el efecto que pide el extracto lo tiene en sus dependencias.
const i18n = vi.hoisted(() => ({ t: (k: string) => k, locale: 'es' }));
vi.mock('@/lib/i18n', () => ({ useI18n: () => i18n }));
vi.mock('@/lib/hooks/useInmobiliaria', () => ({
  usePropietarios: () => ({ propietarios: [{ id: 'p1', name: 'Rentas', email: 'pagos@rentas.co', phone: '601', documentType: 'CC', documentNumber: '9' }] }),
  useInmobiliariaConfig: () => ({ config: { agency: { name: 'Inmobiliaria', nit: '1', address: null, city: null } } }),
}));

import { ExtractoDelPropietarioDialog } from './ExtractoDelPropietarioDialog';

const EXTRACTO: Extracto = {
  propietarioId: 'p1',
  propietarioName: 'Rentas',
  month: '2026-10',
  generatedAt: '2026-10-03T18:00:00.000Z',
  lineItems: [],
  sinMovimiento: null,
  totals: {
    totalRent: 0, totalAdmin: 0, totalPaid: 0, totalCommission: 0, totalNet: 0,
    totalConceptosAFavor: 0, totalConceptosACargo: 0, totalDeTerceros: 0,
    totalGirado: 0, totalEnGiro: 0, totalPorGirar: 0,
  },
  bankInfo: { bankName: 'Bancolombia', bankAccountType: 'Ahorros', bankAccountNumber: '20345678912', bankAccountHolder: null },
};

let host: HTMLDivElement;
let root: Root;

beforeEach(() => {
  api.getExtracto.mockReset().mockResolvedValue(EXTRACTO);
  host = document.createElement('div');
  document.body.appendChild(host);
  root = createRoot(host);
});

afterEach(() => {
  act(() => root.unmount());
  host.remove();
});

async function abrir() {
  await act(async () => {
    root.render(
      <ExtractoDelPropietarioDialog propietarioId="p1" propietarioName="Rentas" abierto onOpenChange={() => {}} />,
    );
  });
  await act(async () => {
    await new Promise((r) => setTimeout(r, 0));
  });
}

describe('<ExtractoDelPropietarioDialog> (P-23)', () => {
  it('🔴 el mes se elige con el selector de la casa, no con el del navegador', async () => {
    await abrir();
    expect(document.body.querySelector('input[type="month"]')).toBeNull();
    const selector = document.body.querySelector('[data-testid="extracto-mes"]')!;
    expect(selector.getAttribute('data-mes')).toMatch(/^\d{4}-\d{2}$/);
    expect(document.body.querySelector('[aria-label="Mes anterior"]')).not.toBeNull();
  });

  it('cambiar de mes pide el extracto de ese mes', async () => {
    await abrir();
    const mesInicial = document.body.querySelector('[data-testid="extracto-mes"]')!.getAttribute('data-mes')!;
    await act(async () => {
      (document.body.querySelector('[aria-label="Mes anterior"]') as HTMLButtonElement).click();
      await new Promise((r) => setTimeout(r, 0));
    });
    const pedido = api.getExtracto.mock.calls.at(-1)![1] as string;
    expect(pedido).not.toBe(mesInicial);
    expect(pedido).toMatch(/^\d{4}-\d{2}$/);
  });

  it('🔴 Imprimir / Enviar / Descargar van en el pie del diálogo, fuera del documento que se desplaza', async () => {
    await abrir();
    const descargar = document.body.querySelector('[data-testid="extracto-descargar"]');
    expect(descargar).not.toBeNull();
    expect(document.body.querySelectorAll('[data-testid="extracto-descargar"]')).toHaveLength(1);
    const documento = document.body.querySelector('[data-testid="extracto-banco"]')!.closest('div.min-w-0')!;
    expect(documento.contains(descargar)).toBe(false);
  });

  it('el número de la cuenta va enmascarado', async () => {
    await abrir();
    const banco = document.body.querySelector('[data-testid="extracto-banco"]')!.textContent;
    expect(banco).toContain('****8912');
    expect(banco).not.toContain('20345678912');
  });
});
