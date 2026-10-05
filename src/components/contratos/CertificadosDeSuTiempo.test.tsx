/**
 * QA-INQ-95 ronda 2 (decisión de Nico, 04-10): la inmobiliaria ve en la ficha
 * del contrato a quien salió por un cambio de inquilino y su «Certificado de
 * que no debe nada por el tiempo en que fue inquilino».
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const { api, pdf } = vi.hoisted(() => ({ api: { enLaFicha: vi.fn(), emitir: vi.fn() }, pdf: vi.fn() }));
vi.mock('@/lib/api/certificado-de-su-tiempo.service', () => ({ certificadoDeSuTiempoApi: api }));
vi.mock('@/lib/api/documentos.service', () => ({ documentosLegalesApi: { pdf } }));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

import { CertificadosDeSuTiempo } from './CertificadosDeSuTiempo';

const SARA = {
  parte: { id: 'p-sara', nombre: 'Sara QI95 Saliente', documento: '1017969501', desde: '2026-08-01', hasta: '2026-10-03' },
  revision: { puedeEmitirse: true, impedimentos: [], faltaCop: 0, canceladoCop: 4_500_000 },
  ultimo: null,
};

let root: Root | null = null;
async function montar(puedeEmitir = true) {
  const host = document.createElement('div');
  document.body.appendChild(host);
  root = createRoot(host);
  await act(async () => {
    root!.render(<CertificadosDeSuTiempo contractId="c-59" puedeEmitir={puedeEmitir} />);
  });
  await act(async () => {
    await new Promise((r) => setTimeout(r, 0));
  });
}
const texto = () => document.body.textContent ?? '';

beforeEach(() => {
  api.enLaFicha.mockReset().mockResolvedValue([SARA]);
  api.emitir.mockReset().mockResolvedValue({ documentoId: 'doc-1' });
  pdf.mockReset().mockResolvedValue(new Blob(['%PDF']));
  globalThis.URL.createObjectURL = vi.fn(() => 'blob:x');
  globalThis.URL.revokeObjectURL = vi.fn();
});
afterEach(async () => {
  await act(async () => root?.unmount());
  root = null;
  document.body.innerHTML = '';
});

describe('los inquilinos que salieron, en la ficha del contrato', () => {
  it('dice quién salió, de cuándo a cuándo (como días), y deja emitir su certificado', async () => {
    await montar();
    expect(texto()).toContain('Sara QI95 Saliente');
    expect(texto()).toContain('1 de agosto de 2026');
    expect(texto()).toContain('3 de octubre de 2026');
    expect(texto()).toContain('Certificado de que no debe nada por el tiempo en que fue inquilino');
    await act(async () => {
      (document.querySelector('[data-testid="emitir-certificado-de-su-tiempo"]') as HTMLButtonElement).click();
    });
    expect(api.emitir).toHaveBeenCalledWith('c-59', 'p-sara');
    expect(pdf).toHaveBeenCalledWith('doc-1');
  });

  it('con algo de su tiempo sin pagar, lo dice y no ofrece emitir', async () => {
    api.enLaFicha.mockResolvedValue([
      { ...SARA, revision: { puedeEmitirse: false, faltaCop: 1_520_000, canceladoCop: 0, impedimentos: [{ code: 'QUEDA_SALDO_DE_SU_TIEMPO', mensaje: 'quedan $1.520.000 sin pagar' }] } },
    ]);
    await montar();
    expect(texto()).toContain('quedan $1.520.000 sin pagar');
    expect(document.querySelector('[data-testid="emitir-certificado-de-su-tiempo"]')).toBeNull();
  });

  it('sin nadie que haya salido del contrato no se pinta nada', async () => {
    api.enLaFicha.mockResolvedValue([]);
    await montar();
    expect(document.querySelector('[data-testid="certificados-de-su-tiempo"]')).toBeNull();
  });
});
